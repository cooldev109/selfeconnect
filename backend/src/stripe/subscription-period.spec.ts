import { subscriptionPeriodEnd } from './subscription-period';

describe('subscriptionPeriodEnd', () => {
  const END = 1757116800;

  it('reads current_period_end from the subscription item (Stripe API 2025+)', () => {
    expect(subscriptionPeriodEnd({ items: { data: [{ current_period_end: END }] } })).toBe(END);
  });

  it('falls back to the legacy top-level field', () => {
    expect(subscriptionPeriodEnd({ current_period_end: END })).toBe(END);
  });

  it('prefers the top-level number when both are present', () => {
    expect(
      subscriptionPeriodEnd({ current_period_end: END, items: { data: [{ current_period_end: 1 }] } }),
    ).toBe(END);
  });

  it('returns undefined when neither is present (never builds an Invalid Date)', () => {
    expect(subscriptionPeriodEnd({ items: { data: [{}] } })).toBeUndefined();
    expect(subscriptionPeriodEnd({})).toBeUndefined();
    expect(subscriptionPeriodEnd(null)).toBeUndefined();
  });
});
