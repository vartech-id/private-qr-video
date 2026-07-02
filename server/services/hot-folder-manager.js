import { resolve } from "node:path";

import {
  createVideoWatcher,
} from "./video-watcher.js";

export function createHotFolderManager(baseOptions) {
  let activeWatcher = null;
  let activePath = null;
  let activeProcessExistingVideos = false;
  let isChanging = false;

  function getStatus() {
    return {
      running: Boolean(activeWatcher),
      hotFolderPath: activePath,
      processExistingVideos:
        activeProcessExistingVideos,
      isChanging,
    };
  }

  async function activate({
    hotFolderPath,
    processExistingVideos = false,
  }) {
    if (isChanging) {
      throw new Error(
        "Hot folder sedang dalam proses perubahan",
      );
    }

    if (!hotFolderPath?.trim()) {
      throw new Error("Hot folder path wajib diisi");
    }

    const normalizedPath = resolve(
      hotFolderPath.trim(),
    );

    if (
      activeWatcher &&
      activePath === normalizedPath &&
      activeProcessExistingVideos ===
        processExistingVideos
    ) {
      return getStatus();
    }

    isChanging = true;

    try {
      /*
       * Watcher baru dibuat terlebih dahulu.
       * Jika path baru tidak valid, watcher lama
       * tetap berjalan.
       */
      const newWatcherResult =
        await createVideoWatcher({
          ...baseOptions,
          hotFolderPath: normalizedPath,
          processExistingVideos,
        });

      const previousWatcher = activeWatcher;

      activeWatcher =
        newWatcherResult.watcher;

      activePath =
        newWatcherResult.folderPath;

      activeProcessExistingVideos =
        processExistingVideos;

      if (previousWatcher) {
        try {
          await previousWatcher.close();
        } catch (error) {
          console.error(
            "[Hot Folder Manager] Failed to close previous watcher:",
            error,
          );
        }
      }

      console.log(
        "[Hot Folder Manager] Active folder:",
        activePath,
      );

      return getStatus();
    } finally {
      isChanging = false;
    }
  }

  async function stop() {
    if (activeWatcher) {
      await activeWatcher.close();
    }

    activeWatcher = null;
    activePath = null;
    activeProcessExistingVideos = false;
  }

  return {
    activate,
    stop,
    getStatus,
  };
}

export function getHotFolderManager() {
  return (
    globalThis.__videoHotFolderManager ??
    null
  );
}