-- CreateTable
CREATE TABLE "JobDismissal" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobDismissal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobDismissal_driverId_idx" ON "JobDismissal"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "JobDismissal_jobId_driverId_key" ON "JobDismissal"("jobId", "driverId");

-- AddForeignKey
ALTER TABLE "JobDismissal" ADD CONSTRAINT "JobDismissal_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobDismissal" ADD CONSTRAINT "JobDismissal_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
