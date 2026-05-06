-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'GAME_DUEL_INVITE';
ALTER TYPE "NotificationType" ADD VALUE 'GAME_DUEL_RESULT';

-- CreateTable
CREATE TABLE "GameDuel" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "seed" TEXT NOT NULL,
    "challengerId" TEXT NOT NULL,
    "challengeeId" TEXT NOT NULL,
    "challengerPct" DOUBLE PRECISION NOT NULL,
    "challengeePct" DOUBLE PRECISION,
    "challengeeAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameDuel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameDuel_challengerId_idx" ON "GameDuel"("challengerId");

-- CreateIndex
CREATE INDEX "GameDuel_challengeeId_idx" ON "GameDuel"("challengeeId");

-- CreateIndex
CREATE INDEX "GameDuel_expiresAt_idx" ON "GameDuel"("expiresAt");

-- AddForeignKey
ALTER TABLE "GameDuel" ADD CONSTRAINT "GameDuel_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameDuel" ADD CONSTRAINT "GameDuel_challengeeId_fkey" FOREIGN KEY ("challengeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
