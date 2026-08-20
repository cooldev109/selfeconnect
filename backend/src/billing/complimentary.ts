import type { PrismaService } from '../prisma/prisma.service';

// Lazy expiry for admin-granted complimentary access: any pro whose comp period
// has lapsed (and who has no real Stripe subscription) drops back to inactive,
// so they must subscribe to keep the paid features. Called opportunistically on
// the hot paths (account load, job board, admin list) instead of a cron —
// enough for the small set of launch pros this is for. `complimentaryUntil`
// itself is kept so the UI can still show "expired".
export async function expireLapsedComplimentary(prisma: PrismaService): Promise<void> {
  await prisma.driver.updateMany({
    where: {
      isActive: true,
      stripeSubscriptionId: null,
      complimentaryUntil: { lt: new Date() },
    },
    data: { isActive: false, subscriptionStatus: 'canceled' },
  });
}
