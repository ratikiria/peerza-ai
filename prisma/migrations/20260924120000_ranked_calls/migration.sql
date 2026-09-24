-- Ranked Calls: deadline-based trade ideas that earn public reputation.
-- Written with IF NOT EXISTS so it is safe on databases that were synced
-- with `prisma db push` rather than migrations.

-- AlterEnum
ALTER TYPE "OutcomeStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TYPE "OutcomeStatus" ADD VALUE IF NOT EXISTS 'VOID';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RANKED_CALL_RESULT';

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "repCalls" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "repHits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "repScore" INTEGER NOT NULL DEFAULT 500,
ADD COLUMN IF NOT EXISTS "repStyle" TEXT,
ADD COLUMN IF NOT EXISTS "repTier" TEXT;

-- AlterTable
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "rankedCheckedThrough" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "rankedDeadline" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "rankedDifficulty" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "rankedEntry" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "rankedLastPrice" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "rankedPoints" INTEGER,
ADD COLUMN IF NOT EXISTS "rankedProgress" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "rankedStartsAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "rankedSymbol" TEXT,
ADD COLUMN IF NOT EXISTS "rankedTarget" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "rankedTf" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Post_outcomeStatus_rankedDeadline_idx" ON "Post"("outcomeStatus", "rankedDeadline");
