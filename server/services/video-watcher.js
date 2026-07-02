import chokidar from "chokidar";
import { constants } from "node:fs";
import { access, stat } from "node:fs/promises";
import {
  basename,
  extname,
  resolve,
} from "node:path";

import { prisma } from "../utils/prisma.js";
import { processVideo } from "./video-processor.js";

async function validateHotFolder(folderPath) {
  const absolutePath = resolve(folderPath);

  let folderStat;

  try {
    folderStat = await stat(absolutePath);
  } catch {
    throw new Error(
      `Folder tidak ditemukan: ${absolutePath}`,
    );
  }

  if (!folderStat.isDirectory()) {
    throw new Error(
      `Path bukan sebuah folder: ${absolutePath}`,
    );
  }

  try {
    await access(absolutePath, constants.R_OK);
  } catch {
    throw new Error(
      `Folder tidak dapat dibaca: ${absolutePath}`,
    );
  }

  return absolutePath;
}

async function registerVideo(filePath, options) {
  const absolutePath = resolve(filePath);

  if (extname(absolutePath).toLowerCase() !== ".mp4") {
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
      status: video.status,
    });

    await processVideo(video.id, options);
  } catch (error) {
    console.error(
      "[Hot Folder] Failed to register video:",
      {
        filePath: absolutePath,
        error: error?.message ?? error,
      },
    );
  }
}

export async function createVideoWatcher(options) {
  const {
    hotFolderPath,
    processExistingVideos = false,
  } = options;

  if (!hotFolderPath?.trim()) {
    throw new Error("Hot folder path wajib diisi");
  }

  const absoluteFolderPath =
    await validateHotFolder(hotFolderPath.trim());

  const watcher = chokidar.watch(
    absoluteFolderPath,
    {
      persistent: true,

      /*
       * false:
       * file yang sudah ada ikut diproses.
       *
       * true:
       * hanya file baru setelah watcher aktif.
       */
      ignoreInitial: !processExistingVideos,

      depth: 0,

      awaitWriteFinish: {
        stabilityThreshold: 5000,
        pollInterval: 500,
      },

      ignored: (watchedPath, watchedStat) => {
        if (!watchedStat?.isFile()) {
          return false;
        }

        return (
          extname(watchedPath).toLowerCase() !==
          ".mp4"
        );
      },
    },
  );

  watcher.on("add", (filePath) => {
    console.log(
      "[Hot Folder] New video detected:",
      filePath,
    );

    void registerVideo(filePath, options);
  });

  watcher.on("error", (error) => {
    console.error(
      "[Hot Folder] Watcher error:",
      error,
    );
  });

  try {
    await new Promise((resolveReady, rejectReady) => {
      watcher.once("ready", resolveReady);
      watcher.once("error", rejectReady);
    });
  } catch (error) {
    await watcher.close();
    throw error;
  }

  console.log(
    "[Hot Folder] Watcher ready:",
    absoluteFolderPath,
  );

  return {
    watcher,
    folderPath: absoluteFolderPath,
  };
}