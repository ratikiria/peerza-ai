-- CreateTable
CREATE TABLE "ChallengeMessage" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChallengeMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChallengeMessage_challengeId_createdAt_idx" ON "ChallengeMessage"("challengeId", "createdAt");

-- CreateIndex
CREATE INDEX "ChallengeMessage_authorId_idx" ON "ChallengeMessage"("authorId");

-- AddForeignKey
ALTER TABLE "ChallengeMessage" ADD CONSTRAINT "ChallengeMessage_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeMessage" ADD CONSTRAINT "ChallengeMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
