import { prisma } from "#server/utils/prisma.js";

import {
  getHotFolderManager,
} from "../../services/hot-folder-manager.js";

export default defineEventHandler(
  async (event) => {
    const runtimeConfig =
      useRuntimeConfig(event);

    const databaseConfig =
      await prisma.appConfig.findUnique({
        where: {
          id: 1,
        },
      });

    const manager =
      getHotFolderManager();

    const watcher =
      manager?.getStatus() ?? {
        running: false,
        hotFolderPath: null,
        processExistingVideos: false,
        isChanging: false,
      };

    let source = "NONE";

    if (databaseConfig) {
      source = "DATABASE";
    } else if (runtimeConfig.hotFolderPath) {
      source = "ENV";
    }

    return {
      data: {
        hotFolderPath:
          databaseConfig?.hotFolderPath ||
          runtimeConfig.hotFolderPath ||
          "",

        processExistingVideos:
          databaseConfig
            ? databaseConfig.processExistingVideos
            : true,

        source,

        updatedAt:
          databaseConfig?.updatedAt ?? null,

        watcher,
      },
    };
  },
);