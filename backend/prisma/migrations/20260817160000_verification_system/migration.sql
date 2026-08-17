-- M3.1 Verification system: document-backed trust checks + phone verification.

-- CreateEnum
CREATE TYPE "VerificationType" AS ENUM ('identity', 'insurance', 'qualification');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('pending', 'verified', 'rejected');

-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'verification';

-- AlterTable: phone verification fields on the professional
ALTER TABLE "Driver" ADD COLUMN     "phoneVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "phoneVerifyCodeHash" TEXT,
ADD COLUMN     "phoneVerifyExpiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "type" "VerificationType" NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'pending',
    "documentUrl" TEXT,
    "label" TEXT,
    "reference" TEXT,
    "expiresAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewerId" TEXT,
    "reviewerNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Verification_status_idx" ON "Verification"("status");
CREATE INDEX "Verification_driverId_idx" ON "Verification"("driverId");
CREATE UNIQUE INDEX "Verification_driverId_type_key" ON "Verification"("driverId", "type");

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
