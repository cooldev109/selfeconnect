-- AlterTable
ALTER TABLE "Tip" ADD COLUMN     "jobId" TEXT;

-- CreateIndex
CREATE INDEX "Tip_jobId_idx" ON "Tip"("jobId");

-- AddForeignKey
ALTER TABLE "Tip" ADD CONSTRAINT "Tip_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
