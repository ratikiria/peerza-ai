-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "imageUrl" TEXT,
ALTER COLUMN "content" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Like" ADD COLUMN     "reaction" TEXT NOT NULL DEFAULT '👍';
