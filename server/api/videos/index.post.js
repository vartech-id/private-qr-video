export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  const fileName = body?.fileName?.trim();
  const localPath = body?.localPath?.trim();
  const fileSize = body?.fileSize;

  if (!fileName) {
    throw createError({
      statusCode: 400,
      statusMessage: "fileName is required",
    });
  }

  if (!localPath) {
    throw createError({
      statusCode: 400,
      statusMessage: "localPath is required",
    });
  }

  if (
    fileSize !== undefined &&
    fileSize !== null &&
    (!Number.isInteger(Number(fileSize)) || Number(fileSize) < 0)
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "fileSize must be a positive integer",
    });
  }

  try {
    const video = await prisma.video.create({
      data: {
        fileName,
        localPath,
        fileSize:
          fileSize !== undefined && fileSize !== null ? BigInt(fileSize) : null,
        status: "DETECTED",
      },
    });

    return {
      message: "Video successfully created",
      data: {
        ...video,
        fileSize: video.fileSize?.toString() ?? null,
      },
    };
  } catch (error) {
    if (error.code === "P2002") {
      throw createError({
        statusCode: 409,
        statusMessage: "Video with this local path already exists",
      });
    }

    console.error("Failed to create video:", error);

    throw createError({
      statusCode: 500,
      statusMessage: "Failed to create video",
    });
  }
});
