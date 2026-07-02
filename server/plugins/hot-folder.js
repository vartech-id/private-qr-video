import { prisma } from "#server/utils/prisma.js";

import {
  createHotFolderManager,
} from "../services/hot-folder-manager.js";

export default defineNitroPlugin(
  async (nitroApp) => {
    if (globalThis.__videoHotFolderManager) {
      console.log(
        "[Hot Folder Manager] Already running",
      );

      return;
    }

    const runtimeConfig = useRuntimeConfig();

    const manager =
      createHotFolderManager({
        thumbnailFolderPath:
          runtimeConfig.thumbnailFolderPath,

        ffmpegPath:
          runtimeConfig.ffmpegPath,

        ffprobePath:
          runtimeConfig.ffprobePath,
      });

    globalThis.__videoHotFolderManager =
      manager;

    try {
      const databaseConfig =
        await prisma.appConfig.findUnique({
          where: {
            id: 1,
          },
        });

      /*
       * Prioritas:
       * 1. SQLite
       * 2. .env
       */
      const initialHotFolderPath =
        databaseConfig?.hotFolderPath ||
        runtimeConfig.hotFolderPath;

      /*
       * Saat belum pernah disimpan lewat admin,
       * pertahankan behavior lama:
       * file existing dari folder .env ikut diperiksa.
       */
      const processExistingVideos =
        databaseConfig
          ? databaseConfig.processExistingVideos
          : true;

      if (initialHotFolderPath) {
        await manager.activate({
          hotFolderPath:
            initialHotFolderPath,

          processExistingVideos,
        });
      } else {
        console.warn(
          "[Hot Folder Manager] Hot folder belum dikonfigurasi",
        );
      }
    } catch (error) {
      /*
       * Manager tetap tersedia agar admin
       * dapat memperbaiki path.
       */
      console.error(
        "[Hot Folder Manager] Startup failed:",
        error?.message ?? error,
      );
    }

    nitroApp.hooks.hook(
      "close",
      async () => {
        if (
          globalThis.__videoHotFolderManager !==
          manager
        ) {
          return;
        }

        await manager.stop();

        globalThis.__videoHotFolderManager =
          undefined;
      },
    );
  },
);