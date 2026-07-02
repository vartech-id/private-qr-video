-- CreateTable
CREATE TABLE "AppConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "hotFolderPath" TEXT NOT NULL,
    "processExistingVideos" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Video" (
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

-- CreateIndex
CREATE UNIQUE INDEX "Video_localPath_key" ON "Video"("localPath");

-- CreateIndex
CREATE UNIQUE INDEX "Video_objectKey_key" ON "Video"("objectKey");

-- CreateIndex
CREATE UNIQUE INDEX "Video_downloadUrl_key" ON "Video"("downloadUrl");

-- CreateIndex
CREATE INDEX "Video_status_queuedAt_idx" ON "Video"("status", "queuedAt");

-- CreateIndex
CREATE INDEX "Video_createdAt_idx" ON "Video"("createdAt");
