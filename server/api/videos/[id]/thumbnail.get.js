import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname } from "node:path";

import {
  createError,
  defineEventHandler,
  getRouterParam,
  sendStream,
  setResponseHeaders,
} from "h3";

import { prisma } from "#server/utils/prisma.js";

function getImageContentType(filePath) {
  const extension = extname(filePath).toLowerCase();

  switch (extension) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";

    case ".png":
      return "image/png";

    case ".webp":
      return "image/webp";

    default:
      return "application/octet-stream";
  }
}

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
    select: {
      id: true,
      thumbnailPath: true,
    },
  });

  if (!video) {
    throw createError({
      statusCode: 404,
      statusMessage: "Video not found",
    });
  }

  if (!video.thumbnailPath) {
    throw createError({
      statusCode: 404,
      statusMessage: "Thumbnail is not available",
    });
  }

  let fileStat;

  try {
    fileStat = await stat(video.thumbnailPath);
  } catch {
    throw createError({
      statusCode: 404,
      statusMessage: "Thumbnail file not found",
    });
  }

  if (!fileStat.isFile()) {
    throw createError({
      statusCode: 404,
      statusMessage: "Thumbnail file not found",
    });
  }

  setResponseHeaders(event, {
    "Content-Type": getImageContentType(
      video.thumbnailPath,
    ),
    "Content-Length": String(fileStat.size),
    "Content-Disposition":
      `inline; filename="${video.id}.jpg"`,
    "Cache-Control": "private, max-age=86400",
  });

  const thumbnailStream = createReadStream(
    video.thumbnailPath,
  );

  return sendStream(event, thumbnailStream);
});