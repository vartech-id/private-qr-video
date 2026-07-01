import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { access, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { prisma } from "../utils/prisma.js";

const execFileAsync = promisify(execFile);

/**
 * Membaca metadata video menggunakan ffprobe.
 */
async function inspectVideo(filePath, ffprobePath) {
  const { stdout } = await execFileAsync(
    ffprobePath,
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=codec_name,width,height,duration:format=duration",
      "-of",
      "json",
      filePath,
    ],
    {
      windowsHide: true,
      maxBuffer: 5 * 1024 * 1024,
    },
  );

  const metadata = JSON.parse(stdout);
  const videoStream = metadata.streams?.[0];

  if (!videoStream) {
    throw new Error("Video stream was not found");
  }

  const durationSeconds = Number(
    metadata.format?.duration ?? videoStream.duration,
  );

  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error("Video duration is invalid");
  }

  if (!videoStream.width || !videoStream.height) {
    throw new Error("Video resolution is invalid");
  }

  return {
    codecName: videoStream.codec_name,
    width: videoStream.width,
    height: videoStream.height,
    durationSeconds,
    durationMs: Math.round(durationSeconds * 1000),
  };
}

/**
 * Mengambil satu frame video dan menyimpannya sebagai JPG.
 */
async function generateThumbnail({
  videoId,
  filePath,
  thumbnailFolderPath,
  ffmpegPath,
  durationSeconds,
}) {
  const absoluteThumbnailFolder = resolve(thumbnailFolderPath);

  await mkdir(absoluteThumbnailFolder, {
    recursive: true,
  });

  const thumbnailPath = join(
    absoluteThumbnailFolder,
    `${videoId}.jpg`,
  );

  // Ambil frame sekitar 10% durasi video,
  // tetapi maksimal pada detik pertama.
  const seekSeconds = Math.min(
    1,
    Math.max(0.05, durationSeconds * 0.1),
  );

  await execFileAsync(
    ffmpegPath,
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",

      "-ss",
      seekSeconds.toFixed(3),

      "-i",
      filePath,

      "-frames:v",
      "1",

      "-vf",
      "scale=480:-2",

      "-q:v",
      "3",

      thumbnailPath,
    ],
    {
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
    },
  );

  // Pastikan FFmpeg benar-benar menghasilkan file.
  await access(thumbnailPath);

  return thumbnailPath;
}

/**
 * Memvalidasi video, membuat thumbnail,
 * lalu memasukkannya ke antrean upload.
 */
export async function processVideo(videoId, options) {
  const {
    ffmpegPath,
    ffprobePath,
    thumbnailFolderPath,
  } = options;

  /*
   * Claim video agar satu video tidak diproses dua kali.
   *
   * Record lama berstatus READY juga diperbolehkan,
   * sehingga video test yang sebelumnya sudah masuk DB
   * masih bisa dibuatkan thumbnail.
   */
  const claimedVideo = await prisma.video.updateMany({
    where: {
      id: videoId,
      thumbnailPath: null,
      status: {
        in: ["DETECTED", "READY", "FAILED"],
      },
    },
    data: {
      status: "VALIDATING",
      errorMessage: null,
    },
  });

  if (claimedVideo.count === 0) {
    return;
  }

  const video = await prisma.video.findUnique({
    where: {
      id: videoId,
    },
  });

  if (!video) {
    return;
  }

  try {
    console.log("[Video Processor] Validating:", video.fileName);

    const metadata = await inspectVideo(
      video.localPath,
      ffprobePath,
    );

    console.log("[Video Processor] Metadata:", {
      fileName: video.fileName,
      codec: metadata.codecName,
      resolution: `${metadata.width}x${metadata.height}`,
      durationMs: metadata.durationMs,
    });

    const thumbnailPath = await generateThumbnail({
      videoId: video.id,
      filePath: video.localPath,
      thumbnailFolderPath,
      ffmpegPath,
      durationSeconds: metadata.durationSeconds,
    });

    await prisma.video.update({
      where: {
        id: video.id,
      },
      data: {
        thumbnailPath,
        durationMs: metadata.durationMs,

        status: "QUEUED",
        queuedAt: new Date(),

        errorMessage: null,
      },
    });

    console.log("[Video Processor] Video queued:", {
      id: video.id,
      fileName: video.fileName,
      thumbnailPath,
    });
  } catch (error) {
    const errorMessage =
      error?.stderr?.trim() ||
      error?.message ||
      "Unknown video processing error";

    await prisma.video.update({
      where: {
        id: video.id,
      },
      data: {
        status: "FAILED",
        errorMessage,
      },
    });

    console.error("[Video Processor] Failed:", {
      fileName: video.fileName,
      error: errorMessage,
    });
  }
}