import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  BadgeCheck,
  ChevronDown,
  Heart,
  Loader2,
  Lock,
  Sparkles,
  Star,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Input,
  Textarea,
} from "@/components/shared";
import { useDriverPublic } from "@/hooks/useDriver";
import { api, ApiError } from "@/lib/api";
import { createAnonymousReview } from "@/lib/reviews";
import { cn } from "@/lib/utils";
import { TipPaymentModal } from "@/components/TipPaymentModal";

export const Route = createFileRoute("/tip/$driverId/")({
  head: () => ({
    meta: [
      { title: "Leave a review — SelfeConnect" },
      {
        name: "description",
        content:
          "Rate the professional who did your job — free, in seconds. Tipping is optional.",
      },
    ],
  }),
  component: TipPage,
});

const PRESETS = [
  { value: 2, label: "£2" },
  { value: 5, label: "£5" },
  { value: 10, label: "£10" },
] as const;
// Payments are for work done, so the quick amounts are bigger; the box is the
// primary way to enter an exact figure.
const PAY_PRESETS = [
  { value: 20, label: "£20" },
  { value: 50, label: "£50" },
  { value: 100, label: "£100" },
] as const;

type Mode = "tip" | "payment";

function TipPage() {
  const { driverId } = Route.useParams();
  const navigate = useNavigate();
  const { data: driver, isError } = useDriverPublic(driverId);

  // Two things this QR does: leave a review (+ optional tip), or pay the
  // professional directly. Tip is the default and the original flow.
  const [mode, setMode] = useState<Mode>("tip");
  // The review is the point of the tip flow. The tip is an extra, off by default.
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [preset, setPreset] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  const [showPersonal, setShowPersonal] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  // Switching tabs clears the amount so a £2 tip preset can't leak into a
  // payment (and vice-versa).
  const switchMode = (m: Mode) => {
    if (m === mode) return;
    setMode(m);
    setPreset(null);
    setCustom("");
    setError(null);
    setNotice(null);
  };

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showPay, setShowPay] = useState(false);

  const LIVE = !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

  const amount = useMemo(() => {
    const c = parseFloat(custom.replace(",", "."));
    if (!isNaN(c) && c > 0) return c;
    if (preset) return preset;
    return 0;
  }, [preset, custom]);
  const amountLabel = amount.toFixed(2);

  const goSuccess = (paid: boolean, kind: Mode = "tip") => {
    navigate({
      to: "/tip/$driverId/success",
      params: { driverId },
      state: {
        amount: paid ? amount : 0,
        driverName: driver?.name ?? "",
        kind,
        reviewed: kind === "tip",
      } as Record<string, unknown>,
    });
  };

  // Payment flow: no review, just money for work. Straight to Stripe.
  const onSubmitPayment = async () => {
    if (amount <= 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const res = await api<{ mock: boolean; clientSecret: string }>(
        `/drivers/${driverId}/tips`,
        {
          method: "POST",
          body: JSON.stringify({
            amount: Math.round(amount * 100), // pence
            type: "payment",
            customerName: name.trim() || undefined,
          }),
        },
      );
      if (res.mock) {
        goSuccess(true, "payment");
        return;
      }
      setClientSecret(res.clientSecret);
      setShowPay(true);
      setSubmitting(false);
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      setError(
        status === 409
          ? "This professional isn't set up to take payments yet."
          : "We couldn't start the payment. Please try again.",
      );
      setSubmitting(false);
    }
  };

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (submitting) return;
    if (mode === "payment") return onSubmitPayment();
    if (rating < 1) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      // The review always goes first, and never depends on a payment. If the
      // tip fails afterwards, the review still stands — which is the entire
      // promise on the flyer.
      await createAnonymousReview(driverId, {
        rating,
        comment: message.trim() || undefined,
        authorName: name.trim() || undefined,
      });
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      setError(
        status === 429
          ? "You've already reviewed this professional in the last 24 hours."
          : status === 403
            ? "You can't review your own profile."
            : "We couldn't post your review. Please try again.",
      );
      setSubmitting(false);
      return;
    }

    if (amount <= 0) {
      goSuccess(false);
      return;
    }

    // They chose to tip as well.
    try {
      const res = await api<{ mock: boolean; clientSecret: string }>(
        `/drivers/${driverId}/tips`,
        {
          method: "POST",
          body: JSON.stringify({
            amount: Math.round(amount * 100), // pence
            customerName: name.trim() || undefined,
          }),
        },
      );
      if (res.mock) {
        goSuccess(true);
        return;
      }
      setClientSecret(res.clientSecret);
      setShowPay(true);
      setSubmitting(false);
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      // The professional hasn't finished payment setup — but the review is
      // already saved, so say so rather than pretending the whole thing failed.
      setNotice(
        status === 409
          ? "Your review is posted. This professional isn't set up to receive tips yet."
          : "Your review is posted, but the tip couldn't be taken. Please try again.",
      );
      setSubmitting(false);
    }
  };

  if (isError) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-2 bg-background p-6 text-center">
        <h1 className="font-display text-xl font-bold text-foreground">
          Professional not found
        </h1>
        <p className="text-sm text-muted-foreground">
          Please check the code and try again.
        </p>
        <Link to="/" className="mt-2 text-sm font-semibold text-primary hover:underline">
          Go to SelfeConnect
        </Link>
      </main>
    );
  }
  if (!driver) return null;

  return (
    <main className="min-h-screen bg-background pb-32">
      <div
        className={cn(
          "px-4 py-2 text-center text-[11px] font-medium",
          LIVE ? "bg-muted/60 text-muted-foreground" : "bg-amber-100/90 text-amber-900",
        )}
      >
        {LIVE ? "Secured by Stripe" : "DEMO — no real payment is processed"}
      </div>

      {/* Professional hero */}
      <header className="relative overflow-hidden bg-ink pb-20">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
        <div className="relative flex flex-col items-center px-6 pt-10 text-center animate-fade-up">
          <div className="relative">
            <div className="absolute -inset-2 rounded-full bg-primary/30 blur-xl" />
            <img
              src={driver.photoUrl}
              alt={driver.name}
              className="relative h-28 w-28 rounded-full border-[3px] border-white object-cover shadow-elevated"
            />
            {driver.verified && (
              <span className="absolute -bottom-1 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground ring-[3px] ring-white">
                <BadgeCheck className="h-4 w-4" strokeWidth={2.5} />
              </span>
            )}
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-white">
            {driver.name}
          </h1>
          {(driver.company || driver.categoryNames?.length) && (
            <p className="mt-0.5 text-sm text-white/85">
              {driver.company || driver.categoryNames?.join(" · ")}
            </p>
          )}
          {driver.ratingsCount > 0 && (
            <div className="mt-4 flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/95 ring-1 ring-white/15 backdrop-blur-md">
              <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
              {driver.rating.toFixed(1)}
              <span className="text-white/60">({driver.ratingsCount})</span>
            </div>
          )}
        </div>
      </header>

      <div className="relative z-10 mx-auto -mt-12 max-w-md px-4 animate-fade-up">
        <Card className="overflow-hidden rounded-3xl border-border/70 shadow-elevated">
          <CardContent className="p-6">
            {/* Tip / Payment — two things this QR can do. */}
            <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl bg-muted/70 p-1">
              {(["tip", "payment"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={cn(
                    "rounded-xl py-2.5 text-sm font-semibold capitalize transition",
                    mode === m
                      ? "bg-background text-foreground shadow-soft"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>

            {mode === "tip" && (
            <>
            <div className="text-center">
              <h2 className="font-display text-xl font-bold text-foreground">
                How was {driver.firstName}'s work?
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your review is free and takes seconds. No account needed.
              </p>
            </div>

            <form onSubmit={onSubmit} className="mt-6 space-y-6">
              {/* 1. The rating — the actual point of the page */}
              <div>
                <div
                  className="flex items-center justify-center gap-1"
                  onMouseLeave={() => setHoverRating(0)}
                >
                  {[1, 2, 3, 4, 5].map((s) => {
                    const filled = s <= (hoverRating || rating);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setRating(s)}
                        onMouseEnter={() => setHoverRating(s)}
                        aria-label={`${s} star${s > 1 ? "s" : ""}`}
                        className="p-1 transition-transform active:scale-90"
                      >
                        <Star
                          className={cn(
                            "h-10 w-10 transition-all duration-150",
                            filled
                              ? "fill-amber-400 text-amber-400 drop-shadow-[0_2px_6px_rgb(251_191_36_/_0.4)]"
                              : "text-muted-foreground/30",
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Optional words */}
              <div className="rounded-2xl bg-muted/50">
                <button
                  type="button"
                  onClick={() => setShowPersonal((v) => !v)}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Add a few words (optional)
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform duration-200",
                      showPersonal && "rotate-180",
                    )}
                  />
                </button>
                {showPersonal && (
                  <div className="space-y-3 px-4 pb-4 animate-fade-in">
                    <Input
                      placeholder="Your name (e.g. Jane)"
                      aria-label="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-11 rounded-xl bg-background"
                      maxLength={120}
                    />
                    <Textarea
                      placeholder="What did they do, and how did it go?"
                      aria-label="Your review"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="min-h-[80px] rounded-xl bg-background"
                      maxLength={1000}
                    />
                  </div>
                )}
              </div>

              {/* 3. The tip — genuinely optional, and off by default */}
              <div className="rounded-2xl border border-border/70 p-4">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">
                    Add a tip? <span className="font-normal text-muted-foreground">Optional</span>
                  </p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  100% goes to {driver.firstName}. Your review posts either way.
                </p>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPreset(null);
                      setCustom("");
                    }}
                    className={cn(
                      "rounded-xl border-2 py-2.5 text-sm font-bold transition",
                      amount === 0
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary/50",
                    )}
                  >
                    No tip
                  </button>
                  {PRESETS.map((p) => {
                    const active = preset === p.value && !custom;
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => {
                          setPreset(p.value);
                          setCustom("");
                        }}
                        className={cn(
                          "rounded-xl border-2 py-2.5 text-sm font-bold transition",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-foreground hover:border-primary/50",
                        )}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
                <div className="relative mt-2">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground/60">
                    £
                  </span>
                  <Input
                    inputMode="decimal"
                    placeholder="Other amount"
                    value={custom}
                    onChange={(e) => {
                      setCustom(e.target.value);
                      setPreset(null);
                    }}
                    className={cn(
                      "h-11 rounded-xl pl-7 text-sm",
                      custom && "border-primary ring-2 ring-primary/20",
                    )}
                  />
                </div>
              </div>
            </form>
            </>
            )}

            {mode === "payment" && (
            <div className="animate-fade-in">
              <div className="text-center">
                <h2 className="font-display text-xl font-bold text-foreground">
                  Make a payment to {driver.firstName}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose the amount you'd like to pay.
                </p>
              </div>

              {/* Amount — the box is primary; the chips just fill it quickly. */}
              <div className="mt-6">
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground/70">
                    £
                  </span>
                  <Input
                    inputMode="decimal"
                    placeholder="0.00"
                    aria-label="Payment amount"
                    value={custom}
                    onChange={(e) => {
                      setCustom(e.target.value);
                      setPreset(null);
                    }}
                    className={cn(
                      "h-14 rounded-2xl pl-9 text-xl font-bold",
                      amount > 0 && "border-primary ring-2 ring-primary/20",
                    )}
                  />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {PAY_PRESETS.map((p) => {
                    const active = preset === p.value && !custom;
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => {
                          setPreset(p.value);
                          setCustom("");
                        }}
                        className={cn(
                          "rounded-xl border-2 py-2.5 text-sm font-bold transition",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background text-foreground hover:border-primary/50",
                        )}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional: who's paying, so it shows in the pro's records. */}
              <div className="mt-4">
                <Input
                  placeholder="Your name (optional)"
                  aria-label="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 rounded-xl bg-background"
                  maxLength={120}
                />
              </div>

              {/* The disclaimer — read right before paying. */}
              <div className="mt-4 rounded-2xl border border-border/70 bg-muted/50 p-4">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  You're paying{" "}
                  <span className="font-semibold text-foreground">
                    {driver.name}
                  </span>{" "}
                  directly. SelfeConnect only provides the tool to process this
                  payment — we're not a party to your agreement and aren't
                  responsible for the service, its quality, or any refund. Please
                  make sure you're happy with what you've agreed before paying.
                </p>
              </div>
            </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-4 flex items-center justify-center gap-4 text-[11px] font-medium text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Lock className="h-3 w-3" /> Secured by Stripe
          </span>
          <span className="h-1 w-1 rounded-full bg-border" />
          <span>{mode === "payment" ? "100% goes to your professional" : "Reviews are always free"}</span>
        </div>
        <div className="mt-3 flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
          <Link to="/terms" className="underline hover:text-foreground">Terms</Link>
          <span className="h-1 w-1 rounded-full bg-border" />
          <Link to="/privacy" className="underline hover:text-foreground">Privacy</Link>
        </div>
      </div>

      {/* Sticky action */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto max-w-md">
          {error && (
            <p className="mb-2 text-center text-xs font-medium text-destructive" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="mb-2 text-center text-xs font-medium text-primary" role="status">
              {notice}
            </p>
          )}
          <Button
            onClick={() => onSubmit()}
            disabled={(mode === "payment" ? amount <= 0 : rating < 1) || submitting}
            className="h-13 w-full rounded-2xl bg-primary py-4 text-base font-semibold text-primary-foreground shadow-elevated transition-all hover:bg-primary-hover disabled:opacity-50"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {mode === "payment" ? "Processing…" : "Posting…"}
              </span>
            ) : mode === "payment" ? (
              amount > 0 ? (
                <span className="inline-flex items-center gap-2">
                  <Lock className="h-4 w-4" /> Pay £{amountLabel}
                </span>
              ) : (
                "Enter an amount"
              )
            ) : rating < 1 ? (
              "Tap a star to rate"
            ) : amount > 0 ? (
              <span className="inline-flex items-center gap-2">
                <Lock className="h-4 w-4" /> Post review &amp; tip £{amountLabel}
              </span>
            ) : (
              "Post review"
            )}
          </Button>
        </div>
      </div>

      <TipPaymentModal
        open={showPay}
        clientSecret={clientSecret}
        amountLabel={amountLabel}
        title={mode === "payment" ? "Complete your payment" : "Complete your tip"}
        payLabel="Pay"
        errorLabel={
          mode === "payment"
            ? "Payment failed. Please try again."
            : "Payment failed. Your review is already posted."
        }
        returnUrl={
          typeof window !== "undefined"
            ? `${window.location.origin}/tip/${driverId}/success`
            : ""
        }
        onClose={() => {
          setShowPay(false);
          setSubmitting(false);
        }}
        onPaid={() => goSuccess(true, mode)}
      />
    </main>
  );
}
