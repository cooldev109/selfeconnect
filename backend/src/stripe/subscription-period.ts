// Stripe moved `current_period_end` off the Subscription object onto its
// items in newer API versions (2025-*). Read the item's value, falling back
// to the legacy top-level field, so we work across API versions. Returns the
// unix seconds, or undefined when neither is present.
export function subscriptionPeriodEnd(sub: unknown): number | undefined {
  const s = sub as {
    current_period_end?: unknown;
    items?: { data?: Array<{ current_period_end?: unknown }> };
  };
  if (typeof s?.current_period_end === 'number') return s.current_period_end;
  const item = s?.items?.data?.[0];
  return typeof item?.current_period_end === 'number'
    ? item.current_period_end
    : undefined;
}
