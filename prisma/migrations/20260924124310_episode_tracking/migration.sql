-- CreateTable
CREATE TABLE "EpisodeWatched" (
    "id" TEXT NOT NULL,
    "mediaItemId" TEXT NOT NULL,
    "seasonNumber" INTEGER NOT NULL,
    "episodeNumber" INTEGER NOT NULL,

    CONSTRAINT "EpisodeWatched_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EpisodeWatched_mediaItemId_idx" ON "EpisodeWatched"("mediaItemId");

-- CreateIndex
CREATE UNIQUE INDEX "EpisodeWatched_mediaItemId_seasonNumber_episodeNumber_key" ON "EpisodeWatched"("mediaItemId", "seasonNumber", "episodeNumber");

-- AddForeignKey
ALTER TABLE "EpisodeWatched" ADD CONSTRAINT "EpisodeWatched_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: materialize existing watched counts as watched episodes
-- (semantics were "first N episodes of each season watched").
INSERT INTO "EpisodeWatched" ("id", "mediaItemId", "seasonNumber", "episodeNumber")
SELECT gen_random_uuid()::text, ms."mediaItemId", ms."seasonNumber", gs.n
FROM "MediaSeason" ms
CROSS JOIN LATERAL generate_series(1, ms."watchedCount") AS gs(n)
ON CONFLICT DO NOTHING;
