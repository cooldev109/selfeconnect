// Pure helper: turn a professional's verification signals into the granular
// badge set shown on their public profile and in search. Kept dependency-free
// so DriversService / ProsService can compute badges from a Driver row they
// already loaded, without importing the verification module.

export type VerificationBadges = {
  email: boolean;
  phone: boolean;
  identity: boolean;
  insurance: boolean;
  /** ISO date the insurance check lapses, when insurance is live. */
  insuranceExpiresAt: string | null;
  qualification: boolean;
  /** What the qualification is (e.g. "Gas Safe"), when live. */
  qualificationLabel: string | null;
  /** The headline "Verified Pro" signal — identity confirmed by an admin. */
  verifiedPro: boolean;
};

type VerificationLike = {
  type: string;
  status: string;
  expiresAt: Date | null;
  label: string | null;
};

type DriverLike = {
  emailVerifiedAt: Date | null;
  phoneVerifiedAt: Date | null;
  verifications?: VerificationLike[];
};

// A document check counts only while it's approved AND not past its expiry.
function isLive(v: VerificationLike | undefined): boolean {
  if (!v || v.status !== 'verified') return false;
  return !v.expiresAt || v.expiresAt.getTime() > Date.now();
}

export function computeVerificationBadges(d: DriverLike): VerificationBadges {
  const vs = d.verifications ?? [];
  const find = (t: string) => vs.find((v) => v.type === t);
  const insurance = find('insurance');
  const qualification = find('qualification');
  return {
    email: d.emailVerifiedAt != null,
    phone: d.phoneVerifiedAt != null,
    identity: isLive(find('identity')),
    insurance: isLive(insurance),
    insuranceExpiresAt:
      isLive(insurance) && insurance?.expiresAt
        ? insurance.expiresAt.toISOString()
        : null,
    qualification: isLive(qualification),
    qualificationLabel: isLive(qualification)
      ? (qualification?.label ?? null)
      : null,
    verifiedPro: isLive(find('identity')),
  };
}
