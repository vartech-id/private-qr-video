import { prisma } from "#server/utils/prisma.js";
import {
  serializeVideo,
} from "#server/utils/video-response.js";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Video ID is required",
    });
  }

  const video = await prisma.video.findUnique({
    where: {
      id,
    },
  });

  if (!video) {
    throw createError({
      statusCode: 404,
      statusMessage: "Video not found",
    });
  }

  return {
    data: serializeVideo(video),
  };
});