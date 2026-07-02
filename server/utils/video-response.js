export function serializeVideo(video) {
  const qrReady =
    video.status === "QR_READY" &&
    Boolean(video.downloadUrl);

  return {
    id: video.id,
    fileName: video.fileName,
    mimeType: video.mimeType,

    fileSize:
      video.fileSize !== null
        ? video.fileSize.toString()
        : null,

    durationMs: video.durationMs,
    status: video.status,
    retryCount: video.retryCount,
    errorMessage: video.errorMessage,

    thumbnailUrl: video.thumbnailPath
      ? `/api/videos/${video.id}/thumbnail`
      : null,

    streamUrl:
      `/api/videos/${video.id}/stream`,

    qrReady,

    downloadUrl: qrReady
      ? video.downloadUrl
      : null,

    createdAt: video.createdAt,
    queuedAt: video.queuedAt,
    uploadStartedAt: video.uploadStartedAt,
    lastAttemptAt: video.lastAttemptAt,
    uploadedAt: video.uploadedAt,
    updatedAt: video.updatedAt,
  };
}