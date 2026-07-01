import chokidar from "chokidar";
import { mkdir, stat } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import { prisma } from "../utils/prisma.js";
import { processVideo } from "./video-processor.js";

async function registerVideo(filePath, options) {
  const absolutePath = resolve(filePath);
  const extension = extname(absolutePath).toLowerCase();

  if (extension !== ".mp4") {
    return;
  }

  try {
    const fileStat = await stat(absolutePath);

    if (!fileStat.isFile()) {
      return;
    }

    if (fileStat.size <= 0) {
      throw new Error("Video file is empty");
    }

    /*
     * Jika localPath belum ada, buat record baru.
     * Jika sudah ada, gunakan record yang lama.
     */
    const video = await prisma.video.upsert({
      where: {
        localPath: absolutePath,
      },

      update: {
        fileName: basename(absolutePath),
        fileSize: BigInt(fileStat.size),
      },

      create: {
        fileName: basename(absolutePath),
        localPath: absolutePath,
        fileSize: BigInt(fileStat.size),
        mimeType: "video/mp4",
        status: "DETECTED",
      },
    });

    console.log("[Hot Folder] Video registered:", {
      id: video.id,
      fileName: video.fileName,
      fileSize: fileStat.size,
      status: video.status,
    });

    /*
     * Jangan menunggu proses upload.
     * Tetapi validasi dan thumbnail tetap diselesaikan
     * untuk video ini sebelum status menjadi QUEUED.
     */
    await processVideo(video.id, options);
  } catch (error) {
    console.error("[Hot Folder] Failed to register video:", {
      filePath: absolutePath,
      error: error?.message ?? error,
    });
  }
}

export async function createVideoWatcher(options) {
  const {
    hotFolderPath,
  } = options;

  if (!hotFolderPath) {
    throw new Error(
      "NUXT_HOT_FOLDER_PATH is not configured",
    );
  }

  if (!options.thumbnailFolderPath) {
    throw new Error(
      "NUXT_THUMBNAIL_FOLDER_PATH is not configured",
    );
  }

  const absoluteFolderPath = resolve(hotFolderPath);

  await mkdir(absoluteFolderPath, {
    recursive: true,
  });

  const watcher = chokidar.watch(absoluteFolderPath, {
    persistent: true,
    ignoreInitial: false,
    depth: 0,

    awaitWriteFinish: {
      stabilityThreshold: 5000,
      pollInterval: 500,
    },

    ignored: (watchedPath, stats) => {
      if (!stats?.isFile()) {
        return false;
      }

      return extname(watchedPath).toLowerCase() !== ".mp4";
    },
  });

  watcher.on("add", (filePath) => {
    console.log("[Hot Folder] New video detected:", filePath);

    void registerVideo(filePath, options);
  });

  watcher.on("ready", () => {
    console.log(
      "[Hot Folder] Watcher ready:",
      absoluteFolderPath,
    );
  });

  watcher.on("error", (error) => {
    console.error("[Hot Folder] Watcher error:", error);
  });

  return watcher;
}