import { prisma } from "#server/utils/prisma.js";
import {
  serializeVideo,
} from "#server/utils/video-response.js";

export default defineEventHandler(async () => {
  const video = await prisma.video.findFirst({
    where: {
      status: {
        in: [
          "READY",
          "QUEUED",
          "UPLOADING",
          "QR_READY",
        ],
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });

  /*
   * Tidak menggunakan 404 karena saat aplikasi
   * baru dibuka mungkin belum ada video sama sekali.
   */
  if (!video) {
    return {
      data: null,
    };
  }

  return {
    data: serializeVideo(video),
  };
});