-- CreateTable
CREATE TABLE "MediaSeason" (
    "id" TEXT NOT NULL,
    "mediaItemId" TEXT NOT NULL,
    "seasonNumber" INTEGER NOT NULL,
    "episodeCount" INTEGER NOT NULL,
    "watchedCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MediaSeason_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaSeason_mediaItemId_seasonNumber_key" ON "MediaSeason"("mediaItemId", "seasonNumber");

-- AddForeignKey
ALTER TABLE "MediaSeason" ADD CONSTRAINT "MediaSeason_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
