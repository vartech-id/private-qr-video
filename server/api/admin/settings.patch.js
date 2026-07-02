import { prisma } from "#server/utils/prisma.js";

import {
  getHotFolderManager,
} from "../../services/hot-folder-manager.js";

export default defineEventHandler(
  async (event) => {
    const body = await readBody(event);

    const hotFolderPath =
      typeof body?.hotFolderPath === "string"
        ? body.hotFolderPath.trim()
        : "";

    const processExistingVideos =
      body?.processExistingVideos === true;

    if (!hotFolderPath) {
      throw createError({
        statusCode: 400,
        message: "Hot folder path wajib diisi",
      });
    }

    const manager =
      getHotFolderManager();

    if (!manager) {
      throw createError({
        statusCode: 503,
        message:
          "Hot folder manager belum tersedia",
      });
    }

    const previousStatus =
      manager.getStatus();

    /*
     * Aktifkan watcher sebelum menyimpan.
     * Jika path salah, database tidak berubah.
     */
    let watcherStatus;

    try {
      watcherStatus =
        await manager.activate({
          hotFolderPath,
          processExistingVideos,
        });
    } catch (error) {
      throw createError({
        statusCode: 400,
        message:
          error?.message ??
          "Gagal mengaktifkan hot folder",
      });
    }

    try {
      const config =
        await prisma.appConfig.upsert({
          where: {
            id: 1,
          },

          update: {
            hotFolderPath:
              watcherStatus.hotFolderPath,

            processExistingVideos,
          },

          create: {
            id: 1,

            hotFolderPath:
              watcherStatus.hotFolderPath,

            processExistingVideos,
          },
        });

      return {
        message:
          "Hot folder berhasil diperbarui",

        data: {
          hotFolderPath:
            config.hotFolderPath,

          processExistingVideos:
            config.processExistingVideos,

          updatedAt:
            config.updatedAt,

          watcher:
            manager.getStatus(),
        },
      };
    } catch (databaseError) {
      /*
       * Kembalikan watcher sebelumnya
       * jika SQLite gagal menyimpan.
       */
      try {
        if (previousStatus.hotFolderPath) {
          await manager.activate({
            hotFolderPath:
              previousStatus.hotFolderPath,

            processExistingVideos:
              previousStatus
                .processExistingVideos,
          });
        } else {
          await manager.stop();
        }
      } catch (rollbackError) {
        console.error(
          "[Hot Folder] Watcher rollback failed:",
          rollbackError,
        );
      }

      console.error(
        "[Hot Folder] Database update failed:",
        databaseError,
      );

      throw createError({
        statusCode: 500,
        message:
          "Gagal menyimpan konfigurasi hot folder",
      });
    }
  },
);