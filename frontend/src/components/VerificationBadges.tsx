import { Award, BadgeCheck, Mail, Phone, ShieldCheck } from "lucide-react";
import type { VerificationBadges as Badges } from "@/lib/verification";

type Pill = { key: string; label: string; icon: typeof ShieldCheck; strong?: boolean };

function pillsFor(b: Badges, keys: Set<string>): Pill[] {
  const out: Pill[] = [];
  if (b.verifiedPro && keys.has("verifiedPro"))
    out.push({ key: "verifiedPro", label: "Verified Pro", icon: ShieldCheck, strong: true });
  if (b.identity && keys.has("identity") && !b.verifiedPro)
    // identity implies verifiedPro today, but keep it independent for the future
    out.push({ key: "identity", label: "Identity verified", icon: BadgeCheck, strong: true });
  if (b.insurance && keys.has("insurance"))
    out.push({ key: "insurance", label: "Insurance checked", icon: ShieldCheck });
  if (b.qualification && keys.has("qualification"))
    out.push({
      key: "qualification",
      label: b.qualificationLabel ? `${b.qualificationLabel} verified` : "Qualified",
      icon: Award,
    });
  if (b.phone && keys.has("phone")) out.push({ key: "phone", label: "Phone verified", icon: Phone });
  if (b.email && keys.has("email")) out.push({ key: "email", label: "Email verified", icon: Mail });
  return out;
}

const DEFAULT_KEYS = ["verifiedPro", "identity", "insurance", "qualification", "phone", "email"];

/**
 * Renders a professional's granular trust badges. Pass `only` to limit which
 * badges show (e.g. just the strong ones on a compact search card).
 */
export function VerificationBadges({
  badges,
  only,
  size = "md",
  className = "",
}: {
  badges: Badges | undefined;
  only?: string[];
  size?: "sm" | "md";
  className?: string;
}) {
  if (!badges) return null;
  const keys = new Set(only ?? DEFAULT_KEYS);
  const pills = pillsFor(badges, keys);
  if (pills.length === 0) return null;

  const pad = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";
  const ic = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {pills.map((p) => {
        const Icon = p.icon;
        const tone = p.strong
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-primary/5 text-primary border-primary/25";
        return (
          <span
            key={p.key}
            className={`inline-flex items-center gap-1 rounded-full border font-semibold ${pad} ${tone}`}
          >
            <Icon className={ic} strokeWidth={2.5} />
            {p.label}
          </span>
        );
      })}
    </div>
  );
}
