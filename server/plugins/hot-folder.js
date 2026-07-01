import { createVideoWatcher } from "../services/video-watcher.js";

export default defineNitroPlugin(async (nitroApp) => {
  const config = useRuntimeConfig();

  if (globalThis.__videoHotFolderWatcher) {
    console.log("[Hot Folder] Watcher already running");
    return;
  }

  try {
    const watcher = await createVideoWatcher({
      hotFolderPath: config.hotFolderPath,
      thumbnailFolderPath: config.thumbnailFolderPath,
      ffmpegPath: config.ffmpegPath,
      ffprobePath: config.ffprobePath,
    });

    globalThis.__videoHotFolderWatcher = watcher;

    nitroApp.hooks.hook("close", async () => {
      if (
        globalThis.__videoHotFolderWatcher !== watcher
      ) {
        return;
      }

      await watcher.close();

      globalThis.__videoHotFolderWatcher = undefined;

      console.log("[Hot Folder] Watcher stopped");
    });
  } catch (error) {
    console.error(
      "[Hot Folder] Failed to start watcher:",
      error?.message ?? error,
    );
  }
});