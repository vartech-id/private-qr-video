import { S3Client } from "@aws-sdk/client-s3";

export function createR2Client({
  accountId,
  accessKeyId,
  secretAccessKey,
}) {
  if (!accountId) {
    throw new Error("R2 account ID is not configured");
  }

  if (!accessKeyId) {
    throw new Error("R2 access key ID is not configured");
  }

  if (!secretAccessKey) {
    throw new Error("R2 secret access key is not configured");
  }

  return new S3Client({
    region: "auto",

    endpoint:
      `https://${accountId}.r2.cloudflarestorage.com`,

    credentials: {
      accessKeyId,
      secretAccessKey,
    },

    /*
     * Retry dilakukan oleh upload worker dengan stream baru.
     * Jangan membiarkan SDK mencoba mengulang stream yang sama.
     */
    maxAttempts: 1,
  });
}