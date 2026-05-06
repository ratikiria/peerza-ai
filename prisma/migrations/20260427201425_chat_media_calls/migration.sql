-- CreateEnum
CREATE TYPE "CallKind" AS ENUM ('AUDIO', 'VIDEO');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MessageType" ADD VALUE 'IMAGE';
ALTER TYPE "MessageType" ADD VALUE 'VIDEO';

-- AlterTable
ALTER TABLE "Call" ADD COLUMN     "kind" "CallKind" NOT NULL DEFAULT 'AUDIO';

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "mediaMime" TEXT,
ADD COLUMN     "mediaUrl" TEXT;
