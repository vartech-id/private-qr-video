-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Video" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileName" TEXT NOT NULL,
    "localPath" TEXT NOT NULL,
    "thumbnailPath" TEXT,
    "mimeType" TEXT NOT NULL DEFAULT 'video/mp4',
    "fileSize" BIGINT,
    "durationMs" INTEGER,
    "objectKey" TEXT,
    "downloadUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DETECTED',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "queuedAt" DATETIME,
    "uploadStartedAt" DATETIME,
    "lastAttemptAt" DATETIME,
    "uploadedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Video" ("createdAt", "downloadUrl", "errorMessage", "fileName", "fileSize", "id", "localPath", "objectKey", "retryCount", "status", "updatedAt", "uploadedAt") SELECT "createdAt", "downloadUrl", "errorMessage", "fileName", "fileSize", "id", "localPath", "objectKey", "retryCount", "status", "updatedAt", "uploadedAt" FROM "Video";
DROP TABLE "Video";
ALTER TABLE "new_Video" RENAME TO "Video";
CREATE UNIQUE INDEX "Video_localPath_key" ON "Video"("localPath");
CREATE UNIQUE INDEX "Video_objectKey_key" ON "Video"("objectKey");
CREATE UNIQUE INDEX "Video_downloadUrl_key" ON "Video"("downloadUrl");
CREATE INDEX "Video_status_queuedAt_idx" ON "Video"("status", "queuedAt");
CREATE INDEX "Video_createdAt_idx" ON "Video"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
