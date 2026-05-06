-- CreateEnum
CREATE TYPE "OutcomeStatus" AS ENUM ('OPEN', 'TARGET_HIT');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "outcomeAt" TIMESTAMP(3),
ADD COLUMN     "outcomeCheckedAt" TIMESTAMP(3),
ADD COLUMN     "outcomeReturnPct" DOUBLE PRECISION,
ADD COLUMN     "outcomeStatus" "OutcomeStatus" NOT NULL DEFAULT 'OPEN';

-- CreateIndex
CREATE INDEX "Post_outcomeStatus_outcomeCheckedAt_idx" ON "Post"("outcomeStatus", "outcomeCheckedAt");
