-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "topics" TEXT[] DEFAULT ARRAY[]::TEXT[];
