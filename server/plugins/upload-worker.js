import {
  createUploadWorker,
} from "../services/upload-worker.js";

export default defineNitroPlugin((nitroApp) => {
  const config = useRuntimeConfig();

  if (globalThis.__videoUploadWorker) {
    console.log(
      "[Upload Worker] Worker already running",
    );

    return;
  }

  try {
    const worker = createUploadWorker({
      accountId: config.r2AccountId,
      accessKeyId: config.r2AccessKeyId,
      secretAccessKey: config.r2SecretAccessKey,

      bucketName: config.r2BucketName,
      downloadDomain: config.r2DownloadDomain,
      objectPrefix: config.r2ObjectPrefix,

      pollIntervalMs:
        Number(config.uploadPollIntervalMs) || 1000,

      maxRetries:
        Number(config.uploadMaxRetries) || 5,
    });

    globalThis.__videoUploadWorker = worker;

    nitroApp.hooks.hook("close", async () => {
      if (
        globalThis.__videoUploadWorker !== worker
      ) {
        return;
      }

      await worker.stop();

      globalThis.__videoUploadWorker = undefined;
    });
  } catch (error) {
    console.error(
      "[Upload Worker] Failed to start:",
      error?.message ?? error,
    );
  }
});