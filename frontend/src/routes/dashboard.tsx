import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Star,
  Download,
  FileText,
  TrendingUp,
  Sparkles,
  Flame,
  MapPin,
  Quote,
  Wallet,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge, Button, Card, CardContent } from "@/components/shared";
import { ProShell } from "@/components/ProShell";
import { useMe } from "@/hooks/useDriver";
import { useTips } from "@/hooks/useTips";
import { useQuery } from "@tanstack/react-query";
import { getAccount, openConnectDashboard } from "@/lib/billing";
import scanQrImg from "@/assets/pro-cleaner.jpg";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — SelfeConnect" },
      { name: "description", content: "Your payments, tips, ratings and weekly performance." },
    ],
  }),
  component: DashboardPage,
});

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function DashboardPage() {
  const { data: driver } = useMe();
  const { data: account } = useQuery({ queryKey: ["account"], queryFn: getAccount, retry: false });
  const {
    tips,
    total,
    average,
    avgRating,
    perDay,
    bestDay,
    fiveStarStreak,
    payments,
    paymentTotal,
    paymentCount,
  } = useTips();
  // Individual payments are viewable right here on the dashboard, so a
  // professional never has to open the spreadsheet just to check one.
  const [showPayments, setShowPayments] = useState(false);
  // Opens the professional's Stripe dashboard (balance, payouts, withdrawals).
  // Only shown once onboarded, so the endpoint always has a Connect account.
  const openPayouts = async () => {
    try {
      const { url } = await openConnectDashboard();
      window.location.href = url;
    } catch {
      /* button only renders when onboarded */
    }
  };
  const paymentsByNewest = [...payments].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  // Everything the professional has been paid, in one file for their records
  // (and their accountant). Tips and payments in one timeline, clearly typed.
  const downloadReport = () => {
    const rows = [
      ...tips.map((t) => ({
        date: t.date,
        type: "Tip",
        amount: t.amount,
        from: t.customerName ?? "Anonymous",
        note: t.message ?? "",
        rating: t.rating || "",
      })),
      ...payments.map((p) => ({
        date: p.date,
        type: "Payment",
        amount: p.amount,
        from: p.customerName ?? "Anonymous",
        note: "",
        rating: "",
      })),
    ].sort((a, b) => (a.date < b.date ? 1 : -1));

    const header = ["Date", "Type", "Amount (GBP)", "From", "Rating", "Note"];
    const body = rows.map((r) => [
      new Date(r.date).toLocaleDateString("en-GB"),
      r.type,
      r.amount.toFixed(2),
      r.from,
      r.rating,
      r.note,
    ]);
    const grand = rows.reduce((s, r) => s + r.amount, 0);
    body.push([], ["", "TOTAL", grand.toFixed(2), "", "", ""]);

    const csv = [header, ...body]
      .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `selfeconnect-earnings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const weekTotal = perDay.slice(-7).reduce((s, d) => s + d.total, 0);
  const prevWeekTotal = perDay.slice(0, 7).reduce((s, d) => s + d.total, 0);
  const weekDelta = prevWeekTotal > 0 ? ((weekTotal - prevWeekTotal) / prevWeekTotal) * 100 : 0;

  // Most recent tip that left a written message — shown as the "Customer love" quote.
  const latestReview = tips.find((t) => t.message);
  const reviewBy = latestReview
    ? `${latestReview.customerName ?? "Anonymous"}${latestReview.area ? `, ${latestReview.area}` : ""}`
    : "";

  return (
    <ProShell
      title="Payments & tips"
      subtitle="Your payments, tips, ratings and weekly performance."
    >
      <div className="space-y-6">
        {/* Hero earnings card */}
        <section className="animate-fade-up">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-mesh shadow-soft">
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />

            <div className="relative grid gap-8 p-8 sm:p-10 md:grid-cols-[1.4fr_1fr] md:items-center">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-primary backdrop-blur">
                  <Sparkles className="h-3.5 w-3.5" />
                  {greeting()}, {driver?.firstName}
                </p>
                <p className="mt-5 text-sm font-medium text-muted-foreground">You've earned</p>
                <div className="mt-2 flex items-baseline gap-3">
                  <h1 className="font-display text-6xl font-bold leading-none tracking-tight text-foreground sm:text-7xl">
                    £{(total + paymentTotal).toFixed(2)}
                  </h1>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">£{paymentTotal.toFixed(2)}</span>{" "}
                  in payments
                  {" · "}
                  <span className="font-semibold text-foreground">£{total.toFixed(2)}</span> in tips
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full border-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                    <TrendingUp className="mr-1 h-3.5 w-3.5" />+{weekDelta.toFixed(0)}% vs last week
                  </Badge>
                  <Badge className="rounded-full border-0 bg-amber-100 text-amber-800 hover:bg-amber-100">
                    <Flame className="mr-1 h-3.5 w-3.5" />
                    {fiveStarStreak}-tip 5★ streak
                  </Badge>
                </div>
                <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
                  Every payment and tip here is a customer valuing your work. Keep doing what you're
                  doing — it's working.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <MiniStat label="Tips received" value={String(tips.length)} sublabel="this month" />
                <MiniStat
                  label="Average tip"
                  value={`£${average.toFixed(2)}`}
                  sublabel="per customer"
                />
                <MiniStat
                  label="Best day"
                  value={`£${bestDay.total.toFixed(0)}`}
                  sublabel={`on ${bestDay.day}`}
                />
                <MiniStat
                  label="Rating"
                  value={avgRating.toFixed(1)}
                  sublabel={`from ${tips.length} customers`}
                  accent="amber"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Direct payments — money for work, kept separate from tips. */}
        <section className="animate-fade-up">
          <div className="rounded-2xl border border-border bg-card shadow-soft">
            <div className="px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Wallet className="h-4 w-4 text-primary" /> Payments received
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Paid to you directly through your QR — separate from tips.
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-2xl font-bold text-foreground">
                    £{paymentTotal.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {paymentCount} payment{paymentCount === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              {/* Buttons stack full-width on mobile, sit inline on wider
                  screens — three of them overflow a phone row otherwise. */}
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  variant="outline"
                  className="justify-center rounded-xl"
                  onClick={() => setShowPayments((v) => !v)}
                  aria-expanded={showPayments}
                  title="See each payment individually"
                >
                  {showPayments ? "Hide" : "View payments"}
                  <ChevronDown
                    className={`ml-1.5 h-4 w-4 transition-transform ${showPayments ? "rotate-180" : ""}`}
                  />
                </Button>
                {account?.stripeOnboarded && (
                  <Button
                    variant="outline"
                    className="justify-center rounded-xl"
                    onClick={openPayouts}
                    title="See your balance and withdraw to your bank on Stripe"
                  >
                    <ExternalLink className="mr-1.5 h-4 w-4" /> Payouts
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="justify-center rounded-xl"
                  onClick={downloadReport}
                  disabled={tips.length + payments.length === 0}
                  title="Download every tip and payment as a spreadsheet"
                >
                  <Download className="mr-1.5 h-4 w-4" /> Report
                </Button>
              </div>
            </div>

            {/* Individual payments — the list the professional can open in the
                dashboard instead of the spreadsheet. */}
            {showPayments && paymentCount === 0 && (
              <div className="border-t border-border/60 px-6 py-6 text-center text-sm text-muted-foreground">
                No payments received yet. Payments customers make to you through your QR will appear
                here.
              </div>
            )}
            {showPayments && paymentCount > 0 && (
              <div className="border-t border-border/60 px-6 py-2">
                <div className="grid grid-cols-[1fr_auto] gap-x-4 border-b border-border/50 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  <span>From</span>
                  <span className="text-right">Amount</span>
                </div>
                <ul>
                  {paymentsByNewest.map((p) => (
                    <li
                      key={p.id}
                      className="grid grid-cols-[1fr_auto] items-center gap-x-4 border-b border-border/40 py-3 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {p.customerName?.trim() || "Anonymous"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(p.date).toLocaleDateString(undefined, {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <p className="text-right font-display text-base font-bold tabular-nums text-foreground">
                        £{p.amount.toFixed(2)}
                      </p>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between gap-4 py-3 text-sm">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="font-display text-base font-bold tabular-nums text-primary">
                    £{paymentTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Chart + Rating */}
        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <Card className="overflow-hidden rounded-3xl border-border/70 shadow-soft lg:col-span-2">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    Last 14 days
                  </h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Your tips are trending up — nice work.
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    This week
                  </p>
                  <p className="font-display text-2xl font-bold text-foreground">
                    £{weekTotal.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="mt-6 h-64 w-full">
                <ResponsiveContainer>
                  <AreaChart data={perDay} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="tipFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      vertical={false}
                      strokeDasharray="3 6"
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="day"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `£${v}`}
                    />
                    <Tooltip
                      cursor={{
                        stroke: "hsl(var(--primary))",
                        strokeWidth: 1,
                        strokeDasharray: "4 4",
                      }}
                      contentStyle={{
                        borderRadius: 14,
                        border: "1px solid hsl(var(--border))",
                        background: "hsl(var(--background))",
                        boxShadow: "0 8px 24px -8px rgb(15 23 42 / 0.12)",
                        fontSize: 12,
                      }}
                      formatter={(v: number) => [`£${v.toFixed(2)}`, "Tips"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#1D9E75"
                      strokeWidth={2.5}
                      fill="url(#tipFill)"
                      activeDot={{ r: 5, strokeWidth: 2, stroke: "white" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-3xl border-border/70 bg-gradient-to-br from-amber-50 to-white shadow-soft">
            <CardContent className="flex h-full flex-col items-center justify-center p-8 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                Customer love
              </p>
              <p className="mt-3 font-display text-6xl font-bold text-foreground">
                {avgRating.toFixed(1)}
              </p>
              <Stars rating={avgRating} size="lg" />
              <p className="mt-3 text-sm text-muted-foreground">Across {tips.length} rated jobs</p>
              {latestReview && (
                <div className="mt-6 w-full rounded-2xl bg-white/70 p-4 text-left backdrop-blur">
                  <div className="flex items-start gap-2 text-sm italic text-foreground/80">
                    <Quote className="h-4 w-4 shrink-0 text-amber-500" />
                    <span>"{latestReview.message}"</span>
                  </div>
                  <p className="mt-1.5 pl-6 text-xs text-muted-foreground">— {reviewBy}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Recent tips */}
        <section className="mt-6">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground">Recent tips</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                The people you made smile this week.
              </p>
            </div>
          </div>

          {tips.length === 0 ? (
            <Card className="rounded-2xl border-dashed border-border/70 bg-muted/30 shadow-none">
              <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
                <p className="text-sm font-medium text-foreground">No tips yet</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Share your QR code with every customer — on your invoice, your vehicle, your
                  workwear. Your first tips will appear right here.
                </p>
                <Button asChild variant="outline" className="mt-2 rounded-xl">
                  <Link to="/profile">Get your QR code</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {tips.map((t, i) => (
                <TipCard key={t.id} tip={t} index={i} />
              ))}
            </div>
          )}
        </section>

        {/* QR Box */}
        <Card className="mt-8 overflow-hidden rounded-3xl border-0 bg-gradient-to-br from-primary to-[#0F6E56] text-primary-foreground shadow-elevated">
          <CardContent className="grid gap-0 p-0 md:grid-cols-[1fr_320px]">
            <div className="flex flex-col items-start gap-5 p-8">
              <Badge className="rounded-full border-0 bg-white/15 text-white hover:bg-white/15">
                Earn more
              </Badge>
              <div>
                <h2 className="font-display text-2xl font-bold">More scans, more earnings</h2>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-primary-foreground/85">
                  Print your QR once, then put it everywhere a customer might see — your invoice,
                  your vehicle, your toolbox, your shop window. The more it's seen, the more it
                  pays.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="secondary" className="rounded-xl">
                  <Link to="/profile">
                    <Download className="mr-1.5 h-4 w-4" />
                    Download PNG
                  </Link>
                </Button>
                <Button asChild variant="secondary" className="rounded-xl">
                  <Link to="/profile">
                    <FileText className="mr-1.5 h-4 w-4" />
                    Print-ready PDF
                  </Link>
                </Button>
              </div>
            </div>
            <div className="relative hidden md:block">
              <img
                src={scanQrImg}
                alt="A cleaner sharing her SelfeConnect QR code with a customer"
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-l from-transparent via-primary/20 to-primary/60" />
            </div>
          </CardContent>
        </Card>
      </div>
    </ProShell>
  );
}

function MiniStat({
  label,
  value,
  sublabel,
  accent,
}: {
  label: string;
  value: string;
  sublabel: string;
  accent?: "amber";
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-white/70 p-4 backdrop-blur">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 font-display text-2xl font-bold ${
          accent === "amber" ? "text-amber-600" : "text-foreground"
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{sublabel}</p>
    </div>
  );
}

function TipCard({
  tip,
  index,
}: {
  tip: {
    id: string;
    date: string;
    amount: number;
    rating: number;
    customerName?: string;
    message?: string;
    area?: string;
  };
  index: number;
}) {
  const name = tip.customerName ?? "Anonymous customer";
  const initial = (tip.customerName?.[0] ?? "?").toUpperCase();
  const colors = [
    "bg-primary/10 text-primary",
    "bg-amber-100 text-amber-700",
    "bg-blue-100 text-blue-700",
    "bg-rose-100 text-rose-700",
    "bg-violet-100 text-violet-700",
  ];
  const color = colors[index % colors.length];

  return (
    <Card className="group overflow-hidden rounded-2xl border-border/70 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elevated">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-base font-bold ${color}`}
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <Stars rating={tip.rating} />
                  {tip.area && (
                    <span className="inline-flex items-center gap-0.5">
                      <MapPin className="h-3 w-3" />
                      {tip.area}
                    </span>
                  )}
                </div>
              </div>
              <p className="font-display text-xl font-bold text-primary">
                £{tip.amount.toFixed(2)}
              </p>
            </div>

            {tip.message && (
              <div className="mt-3 rounded-xl bg-muted/60 p-3">
                <p className="text-sm italic leading-relaxed text-foreground/80">"{tip.message}"</p>
              </div>
            )}

            <p className="mt-2.5 text-[11px] uppercase tracking-wider text-muted-foreground">
              {new Date(tip.date).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const px = size === "lg" ? "h-5 w-5" : "h-3.5 w-3.5";
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${px} ${
            i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/25"
          }`}
        />
      ))}
    </span>
  );
}
