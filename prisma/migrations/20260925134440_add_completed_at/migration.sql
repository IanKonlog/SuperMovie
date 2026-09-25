-- AlterTable
ALTER TABLE "Book" ADD COLUMN     "completedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "MediaItem" ADD COLUMN     "completedAt" TIMESTAMP(3);

-- Backfill: legacy completions use their last status change as completion date.
UPDATE "MediaItem" SET "completedAt" = "updatedAt" WHERE "status" = 'COMPLETED';
UPDATE "Book" SET "completedAt" = "updatedAt" WHERE "status" = 'FINISHED';
