-- AlterTable
ALTER TABLE "EpisodeWatched" ADD COLUMN     "watchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "TmdbRuntime" (
    "tmdbKey" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TmdbRuntime_pkey" PRIMARY KEY ("tmdbKey")
);

-- CreateIndex
CREATE INDEX "EpisodeWatched_watchedAt_idx" ON "EpisodeWatched"("watchedAt");

-- Backfill: existing episode watches date to their item completion (or last update).
UPDATE "EpisodeWatched" ew
SET "watchedAt" = COALESCE(m."completedAt", m."updatedAt")
FROM "MediaItem" m
WHERE ew."mediaItemId" = m."id";
