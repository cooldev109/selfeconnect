-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "authorIpHash" TEXT;

-- CreateIndex
CREATE INDEX "Review_driverId_authorIpHash_idx" ON "Review"("driverId", "authorIpHash");

