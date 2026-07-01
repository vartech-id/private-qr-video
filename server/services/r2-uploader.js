import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname } from "node:path";

import {
  PutObjectCommand,
} from "@aws-sdk/client-s3";

const MAX_SINGLE_UPLOAD_SIZE =
  5 * 1024 * 1024 * 1024;

export class PermanentUploadError extends Error {
  constructor(message) {
    super(message);
    this.name = "PermanentUploadError";
  }
}

function normalizePrefix(prefix) {
  return String(prefix || "videos")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function buildObjectKey(video, prefix) {
  const extension =
    extname(video.fileName).toLowerCase() || ".mp4";

  return `${normalizePrefix(prefix)}/${video.id}${extension}`;
}

function buildDownloadUrl(downloadDomain, objectKey) {
  const domain = downloadDomain.replace(/\/+$/, "");

  const encodedKey = objectKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${domain}/${encodedKey}`;
}

function buildContentDisposition(fileName) {
  const fallbackName = fileName
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/["\\]/g, "_");

  const encodedName = encodeURIComponent(fileName);

  return (
    `attachment; filename="${fallbackName}"; ` +
    `filename*=UTF-8''${encodedName}`
  );
}

export async function uploadVideoToR2({
  client,
  bucketName,
  downloadDomain,
  objectPrefix,
  video,
  abortSignal,
}) {
  if (!bucketName) {
    throw new Error("R2 bucket name is not configured");
  }

  if (!downloadDomain) {
    throw new Error(
      "R2 download domain is not configured",
    );
  }

  const fileStat = await stat(video.localPath);

  if (!fileStat.isFile()) {
    throw new PermanentUploadError(
      "Local video path is not a file",
    );
  }

  if (fileStat.size <= 0) {
    throw new PermanentUploadError(
      "Local video file is empty",
    );
  }

  if (fileStat.size > MAX_SINGLE_UPLOAD_SIZE) {
    throw new PermanentUploadError(
      "Video exceeds the 5 GiB single-upload limit",
    );
  }

  const objectKey = buildObjectKey(
    video,
    objectPrefix,
  );

  const fileStream = createReadStream(video.localPath);

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,

        Body: fileStream,
        ContentLength: fileStat.size,
        ContentType: video.mimeType || "video/mp4",

        /*
         * Saat URL dibuka, browser diarahkan
         * untuk mendownload file.
         */
        ContentDisposition:
          buildContentDisposition(video.fileName),
      }),
      {
        abortSignal,
      },
    );
  } finally {
    /*
     * Memastikan file descriptor dilepas
     * ketika upload berhasil, gagal, atau dibatalkan.
     */
    fileStream.destroy();
  }

  return {
    objectKey,
    downloadUrl: buildDownloadUrl(
      downloadDomain,
      objectKey,
    ),
  };
}