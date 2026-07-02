import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";

import {
  createError,
  defineEventHandler,
  getRequestHeader,
  getRouterParam,
  sendStream,
  setResponseHeaders,
  setResponseStatus,
} from "h3";

import { prisma } from "#server/utils/prisma.js";

function parseRangeHeader(rangeHeader, fileSize) {
  if (!rangeHeader) {
    return null;
  }

  if (!rangeHeader.startsWith("bytes=")) {
    return {
      invalid: true,
    };
  }

  const rangeValue = rangeHeader.slice(6).trim();

  // Endpoint hanya mendukung satu byte range.
  if (!rangeValue || rangeValue.includes(",")) {
    return {
      invalid: true,
    };
  }

  const [startText, endText] =
    rangeValue.split("-");

  let start;
  let end;

  /*
   * Contoh:
   * Range: bytes=-500
   *
   * Meminta 500 byte terakhir.
   */
  if (!startText) {
    const suffixLength = Number(endText);

    if (
      !Number.isInteger(suffixLength) ||
      suffixLength <= 0
    ) {
      return {
        invalid: true,
      };
    }

    start = Math.max(
      fileSize - suffixLength,
      0,
    );

    end = fileSize - 1;
  } else {
    start = Number(startText);

    end = endText
      ? Number(endText)
      : fileSize - 1;
  }

  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end < 0 ||
    start >= fileSize ||
    start > end
  ) {
    return {
      invalid: true,
    };
  }

  end = Math.min(
    end,
    fileSize - 1,
  );

  return {
    invalid: false,
    start,
    end,
  };
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
      fileName: true,
      localPath: true,
      mimeType: true,
    },
  });

  if (!video) {
    throw createError({
      statusCode: 404,
      statusMessage: "Video not found",
    });
  }

  let fileStat;

  try {
    fileStat = await stat(video.localPath);
  } catch {
    throw createError({
      statusCode: 404,
      statusMessage: "Local video file not found",
    });
  }

  if (!fileStat.isFile()) {
    throw createError({
      statusCode: 404,
      statusMessage: "Local video file not found",
    });
  }

  const fileSize = fileStat.size;

  if (fileSize <= 0) {
    throw createError({
      statusCode: 422,
      statusMessage: "Video file is empty",
    });
  }

  const rangeHeader = getRequestHeader(
    event,
    "range",
  );

  const range = parseRangeHeader(
    rangeHeader,
    fileSize,
  );

  const baseHeaders = {
    "Content-Type": video.mimeType || "video/mp4",
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store",
    "Content-Disposition": "inline",
  };

  /*
   * Browser tidak mengirim Range.
   * Kirim seluruh video dengan status 200.
   */
  if (!range) {
    setResponseStatus(event, 200);

    setResponseHeaders(event, {
      ...baseHeaders,
      "Content-Length": String(fileSize),
    });

    const videoStream = createReadStream(
      video.localPath,
    );

    return sendStream(event, videoStream);
  }

  /*
   * Browser mengirim Range yang tidak valid.
   */
  if (range.invalid) {
    setResponseStatus(event, 416);

    setResponseHeaders(event, {
      ...baseHeaders,
      "Content-Range": `bytes */${fileSize}`,
    });

    return null;
  }

  /*
   * Browser meminta bagian tertentu dari video.
   */
  const chunkSize =
    range.end - range.start + 1;

  setResponseStatus(event, 206);

  setResponseHeaders(event, {
    ...baseHeaders,
    "Content-Range":
      `bytes ${range.start}-${range.end}/${fileSize}`,
    "Content-Length": String(chunkSize),
  });

  const videoStream = createReadStream(
    video.localPath,
    {
      start: range.start,
      end: range.end,
    },
  );

  return sendStream(event, videoStream);
});