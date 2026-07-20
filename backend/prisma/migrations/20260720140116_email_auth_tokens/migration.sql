-- CreateEnum
CREATE TYPE "TokenPurpose" AS ENUM ('password_reset', 'email_verify');

-- CreateEnum
CREATE TYPE "AccountKind" AS ENUM ('professional', 'customer');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "notifyJobUpdates" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "unsubscribeToken" TEXT;

-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "notifyNewJobs" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "unsubscribeToken" TEXT;

-- CreateTable
CREATE TABLE "AuthToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "purpose" "TokenPurpose" NOT NULL,
    "kind" "AccountKind" NOT NULL,
    "accountId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthToken_tokenHash_key" ON "AuthToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthToken_accountId_purpose_idx" ON "AuthToken"("accountId", "purpose");

-- CreateIndex
CREATE INDEX "AuthToken_expiresAt_idx" ON "AuthToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_unsubscribeToken_key" ON "Customer"("unsubscribeToken");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_unsubscribeToken_key" ON "Driver"("unsubscribeToken");

