import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ChevronDown,
  User,
  CreditCard,
  LogOut,
  Star,
  Download,
  FileText,
  TrendingUp,
  Sparkles,
  Flame,
  MapPin,
  Quote,
} from "lucide-react";
import { LogoMark } from "@/components/Logo";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMe } from "@/hooks/useDriver";
import { useTips } from "@/hooks/useTips";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { logout } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { getAccount } from "@/lib/billing";
import scanQrImg from "@/assets/scan-qr.jpg";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — SelfeConnect" },
      { name: "description", content: "Your tips, ratings and weekly performance." },
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
  const auth = useRequireAuth();
  const { data: driver } = useMe();
  const { data: account } = useQuery({ queryKey: ["account"], queryFn: getAccount, retry: false });
  const { tips, total, average, avgRating, perDay, bestDay, fiveStarStreak } = useTips();
  const navigate = useNavigate();

  const weekTotal = perDay.slice(-7).reduce((s, d) => s + d.total, 0);
  const prevWeekTotal = perDay.slice(0, 7).reduce((s, d) => s + d.total, 0);
  const weekDelta = prevWeekTotal > 0 ? ((weekTotal - prevWeekTotal) / prevWeekTotal) * 100 : 0;

  // Most recent tip that left a written message — shown as the "Customer love" quote.
  const latestReview = tips.find((t) => t.message);
  const reviewBy = latestReview
    ? `${latestReview.customerName ?? "Anonymous"}${latestReview.area ? `, ${latestReview.area}` : ""}`
    : "";

  if (!auth.data || !driver) return null;

  return (
    <div className="min-h-screen bg-background">
      <TopNav
        driverName={driver.name}
        onLogout={async () => {
          await logout().catch(() => {});
          navigate({ to: "/login" });
        }}
      />

      <main className="mx-auto max-w-6xl px-6 py-10">
        {account && (!account.isActive || !account.stripeOnboarded) && (
          <Link
            to="/account"
            data-testid="setup-banner"
            className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary-soft px-5 py-3.5 text-sm transition hover:bg-primary-soft/70"
          >
            <span className="font-medium text-foreground">
              {!account.isActive
                ? "Activate your subscription to go live and start receiving tips."
                : "Connect your payout account to receive tips."}
            </span>
            <span className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
              Finish setup →
            </span>
          </Link>
        )}

        {/* Hero earnings card */}
        <section className="animate-fade-up">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-mesh shadow-soft">
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />

            <div className="relative grid gap-8 p-8 sm:p-10 md:grid-cols-[1.4fr_1fr] md:items-center">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-primary backdrop-blur">
                  <Sparkles className="h-3.5 w-3.5" />
                  {greeting()}, {driver.firstName}
                </p>
                <p className="mt-5 text-sm font-medium text-muted-foreground">
                  You've earned in tips
                </p>
                <div className="mt-2 flex items-baseline gap-3">
                  <h1 className="font-display text-6xl font-bold leading-none tracking-tight text-foreground sm:text-7xl">
                    £{total.toFixed(2)}
                  </h1>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge className="rounded-full border-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                    <TrendingUp className="mr-1 h-3.5 w-3.5" />
                    +{weekDelta.toFixed(0)}% vs last week
                  </Badge>
                  <Badge className="rounded-full border-0 bg-amber-100 text-amber-800 hover:bg-amber-100">
                    <Flame className="mr-1 h-3.5 w-3.5" />
                    {fiveStarStreak}-tip 5★ streak
                  </Badge>
                </div>
                <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
                  Every tip here is someone choosing to say thank you. Keep doing what you're doing — it's working.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <MiniStat label="Tips received" value={String(tips.length)} sublabel="this month" />
                <MiniStat label="Average tip" value={`£${average.toFixed(2)}`} sublabel="per customer" />
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
                    <CartesianGrid vertical={false} strokeDasharray="3 6" stroke="hsl(var(--border))" />
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
                      cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1, strokeDasharray: "4 4" }}
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
              <p className="mt-3 text-sm text-muted-foreground">
                Across {tips.length} tipped deliveries
              </p>
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
              <h2 className="font-display text-xl font-semibold text-foreground">
                Recent tips
              </h2>
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
                  Share your QR code on your van, parcels and delivery slips — your first tips will appear right here.
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
                <h2 className="font-display text-2xl font-bold">More scans, more tips</h2>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-primary-foreground/85">
                  Print your QR once, stick it everywhere a customer might see — your van door, your parcels, your delivery slip. The more it's seen, the more it pays.
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
                alt="Customer scanning a SelfeConnect QR code on a parcel"
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-l from-transparent via-primary/20 to-primary/60" />
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
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

function TipCard({ tip, index }: { tip: { id: string; date: string; amount: number; rating: number; customerName?: string; message?: string; area?: string }; index: number }) {
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
                <p className="text-sm italic leading-relaxed text-foreground/80">
                  "{tip.message}"
                </p>
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

function TopNav({ driverName, onLogout }: { driverName: string; onLogout: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link to="/dashboard" className="flex items-center gap-2">
          <LogoMark className="h-8 w-8" />
          <span className="font-display font-bold tracking-tight text-foreground">SelfeConnect</span>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-full px-2 py-1 text-sm font-medium text-foreground transition-colors hover:bg-secondary">
            {driverName}
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl">
            <DropdownMenuItem asChild>
              <Link to="/profile" className="flex items-center gap-2">
                <User className="h-4 w-4" /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/account" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Account
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
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
            i <= Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/25"
          }`}
        />
      ))}
    </span>
  );
}
