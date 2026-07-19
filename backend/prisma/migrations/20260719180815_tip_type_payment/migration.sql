-- CreateEnum
CREATE TYPE "TipType" AS ENUM ('tip', 'payment');

-- AlterTable
ALTER TABLE "Tip" ADD COLUMN     "type" "TipType" NOT NULL DEFAULT 'tip';

