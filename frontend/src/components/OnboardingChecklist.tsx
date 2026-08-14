import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, ArrowRight, Loader2 } from "lucide-react";
import type { Driver } from "@/hooks/useDriver";
import type { AccountInfo } from "@/lib/billing";
import { startCheckout, startConnect } from "@/lib/billing";

// A guided "get set up" checklist for a new professional. Turns the scattered
// setup tasks (profile, payouts, going live) into one ordered list with a
// progress bar, so a first-week pro always knows the single next thing to do.
// Disappears once everything's done — it's onboarding, not permanent chrome.

type Step = {
  key: string;
  label: string;
  hint: string;
  done: boolean;
  cta: string;
  // Either an in-app link or an async action that redirects to Stripe.
  to?: string;
  action?: () => Promise<{ url: string }>;
};

export function OnboardingChecklist({ driver, account }: { driver: Driver; account: AccountInfo }) {
  const [busy, setBusy] = useState<string | null>(null);

  const go = async (key: string, action: () => Promise<{ url: string }>) => {
    setBusy(key);
    try {
      const { url } = await action();
      window.location.href = url;
    } catch {
      setBusy(null);
    }
  };

  const steps: Step[] = [
    {
      key: "trade",
      label: "Choose your trade",
      hint: "So customers in your line of work can find you.",
      done: (driver.categorySlugs?.length ?? 0) > 0,
      cta: "Add",
      to: "/profile",
    },
    {
      key: "photo",
      label: "Add a profile photo",
      hint: "Profiles with a photo win noticeably more work.",
      done: !!driver.photoUrl,
      cta: "Add",
      to: "/profile",
    },
    {
      key: "bio",
      label: "Introduce yourself",
      hint: "A short bio tells customers why to pick you.",
      done: !!driver.bio?.trim(),
      cta: "Write",
      to: "/profile",
    },
    {
      key: "payouts",
      label: "Connect payouts",
      hint: "Get paid straight to your bank for jobs and tips.",
      done: account.stripeOnboarded,
      cta: "Connect",
      action: startConnect,
    },
    {
      key: "live",
      label: "Go live",
      hint: "Activate your subscription to appear in search and unlock jobs.",
      done: account.isActive,
      cta: "Go live",
      action: startCheckout,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);

  // Nothing left to do — onboarding's over, so get out of the way.
  if (doneCount === steps.length) return null;

  // Point at the first outstanding task so the header can name it.
  const nextStep = steps.find((s) => !s.done);

  return (
    <section
      data-testid="onboarding-checklist"
      className="rounded-2xl border border-primary/25 bg-card p-5 shadow-soft sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">Finish setting up</h2>
          {nextStep && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              Next: {nextStep.label.toLowerCase()}.
            </p>
          )}
        </div>
        <span className="text-sm font-semibold text-primary">
          {doneCount} of {steps.length} done
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Setup progress"
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="mt-4 space-y-1.5">
        {steps.map((s) => (
          <li
            key={s.key}
            className={`flex items-center gap-3 rounded-xl px-2.5 py-2.5 ${
              s.done ? "" : "bg-secondary/40"
            }`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                s.done
                  ? "bg-primary text-primary-foreground"
                  : "border-2 border-border bg-background"
              }`}
            >
              {s.done && <Check className="h-3.5 w-3.5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm font-medium ${
                  s.done ? "text-muted-foreground line-through" : "text-foreground"
                }`}
              >
                {s.label}
              </p>
              {!s.done && <p className="text-xs text-muted-foreground">{s.hint}</p>}
            </div>
            {!s.done &&
              (s.to ? (
                <Link
                  to={s.to}
                  className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  {s.cta}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => s.action && go(s.key, s.action)}
                  disabled={busy === s.key}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-70"
                >
                  {busy === s.key ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      {s.cta} <ArrowRight className="h-3 w-3" />
                    </>
                  )}
                </button>
              ))}
          </li>
        ))}
      </ul>
    </section>
  );
}
