-- AlterTable
ALTER TABLE "User" ADD COLUMN     "aiBonusQuestions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "checkinStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "genesisNo" INTEGER,
ADD COLUMN     "lastCheckinAt" TIMESTAMP(3),
ADD COLUMN     "peerzBalance" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PeerzLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PeerzLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PeerzLedger_userId_createdAt_idx" ON "PeerzLedger"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PeerzLedger_userId_reason_refId_key" ON "PeerzLedger"("userId", "reason", "refId");

-- CreateIndex
CREATE UNIQUE INDEX "User_genesisNo_key" ON "User"("genesisNo");

-- AddForeignKey
ALTER TABLE "PeerzLedger" ADD CONSTRAINT "PeerzLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

