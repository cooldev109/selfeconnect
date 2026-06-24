import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  BadgeCheck,
  ChevronDown,
  Loader2,
  Lock,
  Package,
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
import { cn } from "@/lib/utils";
import { TipPaymentModal } from "@/components/TipPaymentModal";

export const Route = createFileRoute("/tip/$driverId/")({
  head: () => ({
    meta: [
      { title: "Leave a tip — SelfeConnect" },
      {
        name: "description",
        content: "Say thanks to your delivery driver in seconds.",
      },
    ],
  }),
  component: TipPage,
});

const PRESETS = [
  { value: 1, label: "£1", caption: "A coffee" },
  { value: 2, label: "£2", caption: "Most popular" },
  { value: 5, label: "£5", caption: "Generous" },
] as const;

const COPY = {
  EN: {
    demo: "DEMO — no real payment is processed",
    verified: "Verified driver",
    deliveries: "deliveries",
    rated: "rating",
    title: (n: string) => `Say thanks to ${n}`,
    subtitle: "Drivers keep 100% of every tip.",
    choose: "Choose an amount",
    most: "Most popular",
    custom: "Other amount",
    customPh: "e.g. 3.50",
    rating: "How was your delivery?",
    addPersonal: "Add a personal touch (optional)",
    name: "Your name",
    namePh: "e.g. Jane",
    address: "Your address",
    addressPh: "10 Downing Street",
    message: "Message",
    messagePh: "Thanks for the great delivery!",
    cta: (n: string) => `Send tip · £${n}`,
    ctaEmpty: "Choose an amount",
    secure: "Secured by Stripe",
    noFees: "No fees",
    fast: "Takes 10 seconds",
    payTitle: "Complete your tip",
    payCta: "Pay",
    payFail: "Payment failed. Please try again.",
  },
  PT: {
    demo: "DEMO — nenhum pagamento real é processado",
    verified: "Estafeta verificado",
    deliveries: "entregas",
    rated: "avaliação",
    title: (n: string) => `Agradecer ao ${n}`,
    subtitle: "Os estafetas ficam com 100% da gorjeta.",
    choose: "Escolha um valor",
    most: "Mais popular",
    custom: "Outro valor",
    customPh: "ex. 3,50",
    rating: "Como foi a entrega?",
    addPersonal: "Mensagem pessoal (opcional)",
    name: "O seu nome",
    namePh: "ex. Maria",
    address: "A sua morada",
    addressPh: "Rua Augusta 100",
    message: "Mensagem",
    messagePh: "Obrigado pela entrega!",
    cta: (n: string) => `Enviar gorjeta · £${n}`,
    ctaEmpty: "Escolha um valor",
    secure: "Seguro com Stripe",
    noFees: "Sem taxas",
    fast: "Leva 10 segundos",
    payTitle: "Concluir a gorjeta",
    payCta: "Pagar",
    payFail: "Pagamento falhou. Tente novamente.",
  },
};

function TipPage() {
  const { driverId } = Route.useParams();
  const navigate = useNavigate();
  const { data: driver, isError } = useDriverPublic(driverId);

  const [lang, setLang] = useState<"EN" | "PT">("EN");
  const [preset, setPreset] = useState<number | null>(2);
  const [custom, setCustom] = useState("");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [showPersonal, setShowPersonal] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showPay, setShowPay] = useState(false);

  const t = COPY[lang];
  // Real Stripe is active when a publishable key is configured at build time.
  const LIVE = !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

  const amount = useMemo(() => {
    const c = parseFloat(custom.replace(",", "."));
    if (!isNaN(c) && c > 0) return c;
    if (preset) return preset;
    return 0;
  }, [preset, custom]);

  const amountLabel = amount.toFixed(2);

  const goSuccess = () => {
    if (!driver) return;
    navigate({
      to: "/tip/$driverId/success",
      params: { driverId },
      state: { amount, driverName: driver.name } as Record<string, unknown>,
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !driver || submitting) return;
    setSubmitting(true);
    setPayError(null);
    try {
      const res = await api<{ mock: boolean; clientSecret: string }>(
        `/drivers/${driverId}/tips`,
        {
          method: "POST",
          body: JSON.stringify({
            amount: Math.round(amount * 100), // pence
            rating,
            customerName: name.trim() || undefined,
            customerAddress: address.trim() || undefined,
            message: message.trim() || undefined,
          }),
        },
      );
      if (res.mock) {
        goSuccess();
        return;
      }
      // Real Stripe: collect the card via the Payment Element.
      setClientSecret(res.clientSecret);
      setShowPay(true);
      setSubmitting(false);
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      setPayError(
        status === 409
          ? lang === "PT"
            ? "Este estafeta ainda não está a aceitar gorjetas."
            : "This driver isn't accepting tips yet."
          : lang === "PT"
            ? "Algo correu mal. Tente novamente."
            : "Something went wrong. Please try again.",
      );
      setSubmitting(false);
    }
  };

  if (isError) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-2 bg-background p-6 text-center">
        <h1 className="text-xl font-bold text-foreground font-display">
          {lang === "PT" ? "Estafeta não encontrado" : "Driver not found"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {lang === "PT"
            ? "Verifique o ID e tente novamente."
            : "Please check the ID and try again."}
        </p>
      </main>
    );
  }
  if (!driver) return null;

  return (
    <main className="min-h-screen bg-background pb-32">
      {/* Demo banner */}
      <div
        className={cn(
          "flex items-center justify-between gap-3 px-4 py-2 text-[11px] font-medium",
          LIVE ? "bg-muted/60 text-muted-foreground" : "bg-amber-100/90 text-amber-900",
        )}
      >
        <span className="truncate">{LIVE ? t.secure : t.demo}</span>
        <div className="flex shrink-0 overflow-hidden rounded-full border border-amber-300 bg-white">
          {(["PT", "EN"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              className={cn(
                "px-2.5 py-0.5 text-[11px] font-semibold transition",
                lang === l
                  ? "bg-foreground text-background"
                  : "text-foreground/70 hover:bg-amber-50",
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Driver hero */}
      <header className="relative overflow-hidden pb-20">
        <div
          className="absolute inset-0 scale-110 bg-cover bg-center"
          style={{ backgroundImage: `url('${driver.vanPhotoUrl}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/40 via-foreground/65 to-foreground/95" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,oklch(0.63_0.115_168_/_0.35),transparent_60%)]" />

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
          <h1 className="mt-4 text-2xl font-bold text-white font-display">
            {driver.name}
          </h1>
          <p className="mt-0.5 text-sm text-white/85">
            {driver.company} · {driver.city}
          </p>

          <div className="mt-4 flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/95 ring-1 ring-white/15 backdrop-blur-md">
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
              {driver.rating.toFixed(1)}
              <span className="text-white/60">({driver.ratingsCount})</span>
            </span>
            <span className="text-white/30">·</span>
            <span className="flex items-center gap-1">
              <Package className="h-3.5 w-3.5" />
              {driver.deliveries.toLocaleString()} {t.deliveries}
            </span>
          </div>

          <p className="mt-4 max-w-[280px] text-sm italic leading-relaxed text-white/85">
            “{driver.tagline}”
          </p>
        </div>
      </header>

      {/* Tip card (pulled up onto hero) */}
      <div className="mx-auto -mt-12 max-w-md px-4 animate-fade-up">
        <Card className="overflow-hidden rounded-3xl border-border/70 shadow-elevated">
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground font-display">
                {t.title(driver.firstName)}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{t.subtitle}</p>
            </div>

            <form onSubmit={onSubmit} className="mt-6 space-y-6">
              {/* Amount presets */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {t.choose}
                </label>
                <div className="mt-3 grid grid-cols-3 gap-2.5">
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
                          "group relative flex flex-col items-center justify-center rounded-2xl border-2 py-4 transition-all duration-150 active:scale-[0.97]",
                          active
                            ? "border-primary bg-primary text-primary-foreground shadow-elevated -translate-y-0.5"
                            : "border-border bg-background text-foreground hover:border-primary/50 hover:-translate-y-0.5 hover:shadow-soft",
                        )}
                      >
                        <span className="text-xl font-bold font-display">
                          {p.label}
                        </span>
                        <span
                          className={cn(
                            "mt-0.5 text-[10px] font-medium uppercase tracking-wider",
                            active ? "text-primary-foreground/80" : "text-muted-foreground",
                          )}
                        >
                          {p.caption}
                        </span>
                        {p.value === 2 && !active && (
                          <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-foreground shadow-soft">
                            ★
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Custom amount */}
                <div className="relative mt-3">
                  <span
                    className={cn(
                      "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base font-semibold transition-colors",
                      custom ? "text-foreground" : "text-muted-foreground/60",
                    )}
                  >
                    £
                  </span>
                  <Input
                    inputMode="decimal"
                    placeholder={t.customPh}
                    value={custom}
                    onChange={(e) => {
                      setCustom(e.target.value);
                      setPreset(null);
                    }}
                    className={cn(
                      "h-12 rounded-xl pl-8 text-base font-medium transition-colors",
                      custom && "border-primary ring-2 ring-primary/20",
                    )}
                  />
                </div>
              </div>

              {/* Rating */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {t.rating}
                </label>
                <div
                  className="mt-2 flex items-center gap-1"
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
                        aria-label={`${s} stars`}
                        className="p-1 transition-transform active:scale-90"
                      >
                        <Star
                          className={cn(
                            "h-8 w-8 transition-all duration-150",
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

              {/* Personal touch — collapsible to reduce friction */}
              <div className="rounded-2xl bg-muted/50">
                <button
                  type="button"
                  onClick={() => setShowPersonal((v) => !v)}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    {t.addPersonal}
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
                      placeholder={t.namePh}
                      aria-label={t.name}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-11 rounded-xl bg-background"
                    />
                    <Input
                      placeholder={t.addressPh}
                      aria-label={t.address}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="h-11 rounded-xl bg-background"
                    />
                    <Textarea
                      placeholder={t.messagePh}
                      aria-label={t.message}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="min-h-[80px] rounded-xl bg-background"
                    />
                  </div>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Trust strip */}
        <div className="mt-4 flex items-center justify-center gap-4 text-[11px] font-medium text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Lock className="h-3 w-3" />
            {t.secure}
          </span>
          <span className="h-1 w-1 rounded-full bg-border" />
          <span>{t.noFees}</span>
          <span className="h-1 w-1 rounded-full bg-border" />
          <span>{t.fast}</span>
        </div>

        <div className="mt-3 flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
          <Link to="/terms" className="underline hover:text-foreground">Terms</Link>
          <span className="h-1 w-1 rounded-full bg-border" />
          <Link to="/privacy" className="underline hover:text-foreground">Privacy</Link>
        </div>
      </div>

      {/* Sticky pay bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto max-w-md">
          {payError && (
            <p className="mb-2 text-center text-xs font-medium text-destructive" role="alert">
              {payError}
            </p>
          )}
          <Button
            onClick={onSubmit}
            disabled={amount <= 0 || submitting}
            className={cn(
              "h-13 w-full rounded-2xl text-base font-semibold shadow-elevated transition-all",
              "bg-primary text-primary-foreground hover:bg-primary-hover",
              "h-13 py-4 disabled:opacity-50",
              amount > 0 && "hover:scale-[1.01]",
            )}
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> …
              </span>
            ) : amount > 0 ? (
              <span key={amountLabel} className="inline-flex items-center gap-2 animate-fade-in">
                <Lock className="h-4 w-4" />
                {t.cta(amountLabel)}
              </span>
            ) : (
              t.ctaEmpty
            )}
          </Button>
        </div>
      </div>

      <TipPaymentModal
        open={showPay}
        clientSecret={clientSecret}
        amountLabel={amountLabel}
        title={t.payTitle}
        payLabel={t.payCta}
        errorLabel={t.payFail}
        returnUrl={
          typeof window !== "undefined"
            ? `${window.location.origin}/tip/${driverId}/success`
            : ""
        }
        onClose={() => {
          setShowPay(false);
          setSubmitting(false);
        }}
        onPaid={goSuccess}
      />
    </main>
  );
}
