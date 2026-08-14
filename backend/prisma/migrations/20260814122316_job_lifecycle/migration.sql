-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "JobStatus" ADD VALUE 'hired';
ALTER TYPE "JobStatus" ADD VALUE 'in_progress';
ALTER TYPE "JobStatus" ADD VALUE 'completed';
ALTER TYPE "JobStatus" ADD VALUE 'cancelled';

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "hiredAt" TIMESTAMP(3),
ADD COLUMN     "startedAt" TIMESTAMP(3);

