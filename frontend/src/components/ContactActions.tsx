import { useState } from "react";
import { Mail, Phone, MessageSquare, Copy, Check } from "lucide-react";

/**
 * The three ways to reach someone, plus a copy button for each.
 *
 * The mailto/tel/sms links are excellent on a phone — they open the mail app,
 * the dialler and the messaging app. On a desktop they're unreliable: `tel:`
 * and `sms:` often do nothing without a handler installed, and they fail
 * *silently*, which reads as a broken site. The copy button is the fallback
 * that works on every device, and it also solves not being able to select text
 * that's wrapped in a link.
 */
function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Older browsers / insecure contexts have no clipboard API.
      const el = document.createElement("textarea");
      el.value = value;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      title={copied ? "Copied" : `Copy ${label}`}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:border-primary hover:text-primary"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-primary" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

export function ContactActions({
  email,
  phone,
  size = "sm",
}: {
  email: string;
  phone?: string | null;
  /** "lg" for the profile page, "sm" for a job card. */
  size?: "sm" | "lg";
}) {
  const pill =
    size === "lg"
      ? "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
      : "inline-flex items-center gap-1 text-sm";
  const icon = size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5";

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {phone && (
        <>
          <span className="inline-flex items-center gap-1.5">
            <a
              href={`tel:${phone}`}
              className={`${pill} ${
                size === "lg"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "text-primary hover:underline"
              }`}
            >
              <Phone className={icon} /> {phone}
            </a>
            <CopyButton value={phone} label="phone number" />
          </span>
          {/* Opens the device's own messaging app with the number ready. */}
          <a
            href={`sms:${phone}`}
            className={`${pill} ${
              size === "lg"
                ? "border border-border text-foreground hover:bg-secondary"
                : "text-primary hover:underline"
            }`}
          >
            <MessageSquare className={icon} /> Text
          </a>
        </>
      )}
      <span className="inline-flex items-center gap-1.5">
        <a
          href={`mailto:${email}`}
          className={`${pill} ${
            size === "lg"
              ? "border border-border text-foreground hover:bg-secondary"
              : "text-primary hover:underline"
          }`}
        >
          <Mail className={icon} /> {email}
        </a>
        <CopyButton value={email} label="email address" />
      </span>
    </div>
  );
}
