import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Founding-member pricing.
 *
 * The first N professionals to subscribe pay a permanently lower rate. Stripe
 * grandfathers them for free — a subscription keeps billing whatever price it
 * was created with — so nothing here ever has to re-price an existing member.
 * The flag on the driver exists only to (a) allocate the remaining spots and
 * (b) label the account page.
 */

const cap = () => Number(process.env.FOUNDING_MEMBER_CAP ?? 100);

const foundingPriceId = () =>
  // Falls back to the original subscription price: that price *is* the launch
  // rate, and every professional who signed up before this feature existed is
  // already on it.
  process.env.STRIPE_FOUNDING_PRICE_ID ||
  process.env.STRIPE_SUBSCRIPTION_PRICE_ID ||
  'price_mock_founding';

const standardPriceId = () =>
  process.env.STRIPE_STANDARD_PRICE_ID || 'price_mock_standard';

const foundingGbp = () =>
  Number(process.env.FOUNDING_PRICE_GBP ?? process.env.SUBSCRIPTION_PRICE_GBP ?? 5.49);

const standardGbp = () => Number(process.env.STANDARD_PRICE_GBP ?? 9.49);

// A spot count is a reason to hurry only once it is small. Shown early it just
// advertises how few people have joined, so it stays hidden until then.
const REVEAL_SPOTS_BELOW = 25;

export type Plan = {
  founding: boolean;
  priceId: string;
  amountGbp: number;
};

export type PublicPricing = {
  amountGbp: number; // what a professional signing up right now would pay
  founding: boolean; // …and whether that is the founding rate
  standardAmountGbp: number; // the rate once the founding spots are gone
  foundingCap: number; // how many founding places exist in total
  spotsLeft: number | null; // null until it is low enough to be worth showing
};

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * A founding spot is consumed by anyone who actually reached a subscription.
   * Checkouts that were started and abandoned leave `subscriptionStatus` at
   * `none`, so they release their spot on their own.
   */
  private claimedSpots() {
    return this.prisma.driver.count({
      where: { foundingMember: true, subscriptionStatus: { not: 'none' } },
    });
  }

  async spotsLeft(): Promise<number> {
    return Math.max(0, cap() - (await this.claimedSpots()));
  }

  /** The plan a professional starting checkout right now should be put on. */
  async planForNewSubscriber(): Promise<Plan> {
    const founding = (await this.spotsLeft()) > 0;
    return founding
      ? { founding: true, priceId: foundingPriceId(), amountGbp: foundingGbp() }
      : { founding: false, priceId: standardPriceId(), amountGbp: standardGbp() };
  }

  /**
   * The rate to show a professional on their own account page. Someone who has
   * not subscribed yet is quoted what they would actually pay if they
   * subscribed now — showing them the standard rate would be wrong, since the
   * founding place is still theirs to take.
   */
  async planForAccount(driver: {
    foundingMember: boolean;
    subscriptionStatus: string;
  }): Promise<Plan> {
    if (!driver.foundingMember && driver.subscriptionStatus === 'none') {
      return this.planForNewSubscriber();
    }
    return this.planFor(driver);
  }

  /** The rate an existing professional is actually being billed. */
  planFor(driver: { foundingMember: boolean }): Plan {
    return driver.foundingMember
      ? { founding: true, priceId: foundingPriceId(), amountGbp: foundingGbp() }
      : { founding: false, priceId: standardPriceId(), amountGbp: standardGbp() };
  }

  /** Drives the price shown on the homepage and signup page. */
  async publicPricing(): Promise<PublicPricing> {
    const left = await this.spotsLeft();
    return {
      amountGbp: left > 0 ? foundingGbp() : standardGbp(),
      founding: left > 0,
      standardAmountGbp: standardGbp(),
      foundingCap: cap(),
      spotsLeft: left > 0 && left < REVEAL_SPOTS_BELOW ? left : null,
    };
  }

  /** Monthly recurring revenue, counting each professional at their own rate. */
  async monthlyRevenue(): Promise<number> {
    const [founding, standard] = await Promise.all([
      this.prisma.driver.count({ where: { isActive: true, foundingMember: true } }),
      this.prisma.driver.count({ where: { isActive: true, foundingMember: false } }),
    ]);
    return Math.round((founding * foundingGbp() + standard * standardGbp()) * 100) / 100;
  }
}
