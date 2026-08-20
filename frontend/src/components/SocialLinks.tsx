import { Globe, Instagram, Facebook, Linkedin, Music2 } from "lucide-react";
import type { Socials } from "@/hooks/useDriver";

const LINKS = [
  { key: "website", label: "Website", icon: Globe },
  { key: "instagram", label: "Instagram", icon: Instagram },
  { key: "facebook", label: "Facebook", icon: Facebook },
  { key: "tiktok", label: "TikTok", icon: Music2 },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin },
] as const;

// Tolerate a pro pasting a bare "instagram.com/..." without the scheme.
function href(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

// The professional's social links, shown on their public profile. Renders only
// the platforms they've filled in; nothing when they've added none.
export function SocialLinks({ socials }: { socials: Socials | undefined }) {
  if (!socials) return null;
  const present = LINKS.filter((l) => socials[l.key]?.trim());
  if (present.length === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {present.map(({ key, label, icon: Icon }) => (
        <a
          key={key}
          href={href(socials[key])}
          target="_blank"
          rel="noreferrer"
          title={label}
          aria-label={label}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-primary hover:text-primary"
        >
          <Icon className="h-4 w-4" />
        </a>
      ))}
    </div>
  );
}
