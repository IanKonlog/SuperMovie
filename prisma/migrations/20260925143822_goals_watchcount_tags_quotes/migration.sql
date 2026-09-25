-- CreateEnum
CREATE TYPE "GoalKind" AS ENUM ('TITLES', 'MOVIES', 'SERIES', 'BOOKS');

-- AlterTable
ALTER TABLE "MediaItem" ADD COLUMN     "tags" TEXT[],
ADD COLUMN     "watchCount" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "kind" "GoalKind" NOT NULL,
    "target" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "page" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Goal_kind_year_key" ON "Goal"("kind", "year");

-- CreateIndex
CREATE INDEX "Quote_bookId_idx" ON "Quote"("bookId");

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
