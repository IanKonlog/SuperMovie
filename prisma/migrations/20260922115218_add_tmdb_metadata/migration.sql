-- AlterTable
ALTER TABLE "MediaItem" ADD COLUMN     "genres" TEXT[],
ADD COLUMN     "overview" TEXT,
ADD COLUMN     "releaseDate" TEXT,
ADD COLUMN     "tmdbId" INTEGER,
ADD COLUMN     "voteAverage" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "MediaItem_tmdbId_idx" ON "MediaItem"("tmdbId");
