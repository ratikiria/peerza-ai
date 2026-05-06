-- CreateEnum
CREATE TYPE "AdPlacement" AS ENUM ('FEED', 'SIDEBAR', 'WORKSPACE');

-- AlterTable
ALTER TABLE "Ad" ADD COLUMN "placements" "AdPlacement"[] DEFAULT ARRAY['FEED']::"AdPlacement"[];
