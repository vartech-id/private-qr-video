import { prisma } from "#server/utils/prisma.js";

import {
  serializeVideo,
} from "#server/utils/video-response.js";

const VALID_STATUSES = new Set([
  "DETECTED",
  "VALIDATING",
  "READY",
  "QUEUED",
  "UPLOADING",
  "QR_READY",
  "FAILED",
]);

function parseDateFilter(value, endOfDay = false) {
  if (!value) {
    return null;
  }

  const dateString = endOfDay
    ? `${value}T23:59:59.999`
    : `${value}T00:00:00.000`;

  const parsedDate = new Date(dateString);

  if (Number.isNaN(parsedDate.getTime())) {
    throw createError({
      statusCode: 400,
      message: "Filter tanggal tidak valid",
    });
  }

  return parsedDate;
}

export default defineEventHandler(
  async (event) => {
    const query = getQuery(event);

    const status =
      typeof query.status === "string"
        ? query.status.trim()
        : "";

    const search =
      typeof query.search === "string"
        ? query.search.trim()
        : "";

    const dateFromValue =
      typeof query.dateFrom === "string"
        ? query.dateFrom
        : "";

    const dateToValue =
      typeof query.dateTo === "string"
        ? query.dateTo
        : "";

    if (
      status &&
      status !== "ALL" &&
      !VALID_STATUSES.has(status)
    ) {
      throw createError({
        statusCode: 400,
        message: "Status video tidak valid",
      });
    }

    const where = {};

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (search) {
      where.fileName = {
        contains: search,
      };
    }

    const dateFrom = parseDateFilter(
      dateFromValue,
    );

    const dateTo = parseDateFilter(
      dateToValue,
      true,
    );

    if (dateFrom || dateTo) {
      where.createdAt = {};

      if (dateFrom) {
        where.createdAt.gte = dateFrom;
      }

      if (dateTo) {
        where.createdAt.lte = dateTo;
      }
    }

    const videos =
      await prisma.video.findMany({
        where,

        orderBy: {
          createdAt: "desc",
        },
      });

    return {
      data: videos.map(serializeVideo),

      meta: {
        total: videos.length,
      },
    };
  },
);