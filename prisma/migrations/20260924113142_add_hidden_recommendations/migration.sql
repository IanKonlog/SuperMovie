-- CreateTable
CREATE TABLE "HiddenRecommendation" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "hiddenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HiddenRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HiddenRecommendation_key_key" ON "HiddenRecommendation"("key");
