import { prisma } from "../utils/prisma.js";

import {
  createR2Client,
} from "./r2-client.js";

import {
  PermanentUploadError,
  uploadVideoToR2,
} from "./r2-uploader.js";

function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function getErrorMessage(error) {
  if (error?.name === "AbortError") {
    return "Upload was aborted";
  }

  return (
    error?.message ||
    String(error) ||
    "Unknown upload error"
  );
}

/**
 * Mengembalikan upload yang terputus akibat
 * komputer mati atau aplikasi restart ke QUEUED.
 */
async function recoverInterruptedUploads() {
  const result = await prisma.video.updateMany({
    where: {
      status: "UPLOADING",
    },

    data: {
      status: "QUEUED",
      uploadStartedAt: null,
      errorMessage:
        "Previous upload was interrupted and re-queued",
    },
  });

  if (result.count > 0) {
    console.log(
      `[Upload Worker] Recovered ${result.count} interrupted upload(s)`,
    );
  }
}

/**
 * Mengubah FAILED menjadi QUEUED setelah
 * waktu retry terpenuhi.
 */
async function requeueRetryableFailures(
  maxRetries,
) {
  const failedVideos = await prisma.video.findMany({
    where: {
      status: "FAILED",

      /*
       * thumbnailPath terisi menandakan processing
       * lokal sudah selesai dan error berasal
       * dari tahap upload.
       */
      thumbnailPath: {
        not: null,
      },

      retryCount: {
        lt: maxRetries,
      },
    },

    orderBy: {
      lastAttemptAt: "asc",
    },

    take: 20,
  });

  const now = Date.now();

  for (const video of failedVideos) {
    /*
     * Exponential retry:
     * retry 1 = 2 detik
     * retry 2 = 4 detik
     * retry 3 = 8 detik
     * maksimal = 60 detik
     */
    const retryDelay = Math.min(
      60_000,
      2_000 * 2 ** Math.max(0, video.retryCount - 1),
    );

    const lastAttemptTime =
      video.lastAttemptAt?.getTime() ?? 0;

    if (now - lastAttemptTime < retryDelay) {
      continue;
    }

    const result = await prisma.video.updateMany({
      where: {
        id: video.id,
        status: "FAILED",
      },

      data: {
        status: "QUEUED",
        queuedAt: new Date(),
        errorMessage: null,
      },
    });

    if (result.count > 0) {
      console.log(
        "[Upload Worker] Video re-queued:",
        video.fileName,
      );
    }
  }
}

/**
 * Mengambil satu video QUEUED paling lama.
 *
 * Hanya satu video yang diklaim menjadi
 * UPLOADING dalam satu waktu.
 */
async function claimNextVideo() {
  const nextVideo = await prisma.video.findFirst({
    where: {
      status: "QUEUED",

      /*
       * Hanya video yang processing lokalnya
       * sudah selesai.
       */
      thumbnailPath: {
        not: null,
      },
    },

    orderBy: [
      {
        queuedAt: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
  });

  if (!nextVideo) {
    return null;
  }

  const now = new Date();

  const claimed = await prisma.video.updateMany({
    where: {
      id: nextVideo.id,
      status: "QUEUED",
    },

    data: {
      status: "UPLOADING",
      uploadStartedAt: now,
      lastAttemptAt: now,
      errorMessage: null,
    },
  });

  if (claimed.count === 0) {
    return null;
  }

  return prisma.video.findUnique({
    where: {
      id: nextVideo.id,
    },
  });
}

export function createUploadWorker(options) {
  const {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    downloadDomain,
    objectPrefix,
    pollIntervalMs,
    maxRetries,
  } = options;

  const r2Client = createR2Client({
    accountId,
    accessKeyId,
    secretAccessKey,
  });

  let isStopped = false;
  let activeAbortController = null;

  async function processUpload(video) {
    activeAbortController = new AbortController();

    try {
      console.log("[Upload Worker] Upload started:", {
        id: video.id,
        fileName: video.fileName,
        fileSize:
          video.fileSize?.toString() ?? null,
      });

      const uploadResult = await uploadVideoToR2({
        client: r2Client,
        bucketName,
        downloadDomain,
        objectPrefix,
        video,
        abortSignal:
          activeAbortController.signal,
      });

      await prisma.video.update({
        where: {
          id: video.id,
        },

        data: {
          objectKey: uploadResult.objectKey,
          downloadUrl: uploadResult.downloadUrl,

          status: "QR_READY",
          uploadedAt: new Date(),
          uploadStartedAt: null,
          errorMessage: null,
        },
      });

      console.log("[Upload Worker] Upload completed:", {
        id: video.id,
        fileName: video.fileName,
        objectKey: uploadResult.objectKey,
        downloadUrl: uploadResult.downloadUrl,
      });
    } catch (error) {
      /*
       * Jika aplikasi sedang ditutup, jangan
       * anggap pembatalan sebagai kegagalan.
       * Kembalikan video ke antrean.
       */
      if (
        isStopped &&
        activeAbortController.signal.aborted
      ) {
        await prisma.video.updateMany({
          where: {
            id: video.id,
            status: "UPLOADING",
          },

          data: {
            status: "QUEUED",
            uploadStartedAt: null,
            errorMessage: null,
          },
        });

        return;
      }

      const errorMessage = getErrorMessage(error);

      const isPermanentError =
        error instanceof PermanentUploadError;

      await prisma.video.update({
        where: {
          id: video.id,
        },

        data: {
          status: "FAILED",
          uploadStartedAt: null,
          lastAttemptAt: new Date(),
          errorMessage,

          /*
           * Permanent error langsung dibuat
           * mencapai batas retry.
           */
          retryCount: isPermanentError
            ? maxRetries
            : {
                increment: 1,
              },
        },
      });

      console.error("[Upload Worker] Upload failed:", {
        id: video.id,
        fileName: video.fileName,
        error: errorMessage,
      });
    } finally {
      activeAbortController = null;
    }
  }

  async function run() {
    await recoverInterruptedUploads();

    console.log(
      "[Upload Worker] Worker ready — concurrency: 1",
    );

    while (!isStopped) {
      try {
        await requeueRetryableFailures(maxRetries);

        const video = await claimNextVideo();

        if (!video) {
          await delay(pollIntervalMs);
          continue;
        }

        /*
         * Penting:
         * Upload ini di-await sampai selesai.
         *
         * Worker tidak mengambil video berikutnya
         * sebelum video aktif selesai atau gagal.
         */
        await processUpload(video);
      } catch (error) {
        console.error(
          "[Upload Worker] Worker loop error:",
          getErrorMessage(error),
        );

        await delay(pollIntervalMs);
      }
    }
  }

  const runningPromise = run();

  return {
    async stop() {
      isStopped = true;

      if (activeAbortController) {
        activeAbortController.abort();
      }

      await runningPromise;

      r2Client.destroy();

      console.log("[Upload Worker] Worker stopped");
    },
  };
}