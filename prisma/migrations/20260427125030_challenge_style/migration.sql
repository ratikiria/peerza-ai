-- CreateEnum
CREATE TYPE "ChallengeStyle" AS ENUM ('INVESTMENT', 'TRADING', 'MIXED');

-- AlterTable
ALTER TABLE "Challenge" ADD COLUMN     "style" "ChallengeStyle" NOT NULL DEFAULT 'MIXED';
