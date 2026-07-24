-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "foundingMember" BOOLEAN NOT NULL DEFAULT false;


-- Everyone who already holds a subscription signed up at the launch rate and
-- is being billed it by Stripe today, so they are founding members by
-- definition. Without this they would be counted (and shown) at the higher
-- standard rate they have never paid.
UPDATE "Driver" SET "foundingMember" = true WHERE "subscriptionStatus" <> 'none';
