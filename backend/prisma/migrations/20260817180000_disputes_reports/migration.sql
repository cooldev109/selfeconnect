-- M3.5 Disputes + abuse reports (trust & safety).

CREATE TYPE "DisputeStatus" AS ENUM ('open', 'resolved', 'rejected');
CREATE TYPE "ReportTargetType" AS ENUM ('driver', 'customer', 'job');
CREATE TYPE "ReportStatus" AS ENUM ('open', 'actioned', 'dismissed');
ALTER TYPE "NotificationKind" ADD VALUE 'dispute';

CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "raisedByKind" "ReporterKind" NOT NULL,
    "raisedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'open',
    "resolutionNotes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AbuseReport" (
    "id" TEXT NOT NULL,
    "targetType" "ReportTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reporterKind" "ReporterKind" NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AbuseReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Dispute_status_idx" ON "Dispute"("status");
CREATE INDEX "Dispute_jobId_idx" ON "Dispute"("jobId");
CREATE INDEX "AbuseReport_status_idx" ON "AbuseReport"("status");
CREATE INDEX "AbuseReport_targetType_targetId_idx" ON "AbuseReport"("targetType", "targetId");

ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
