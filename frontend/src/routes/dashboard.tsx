import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wallet, CreditCard, Gift, Star, Banknote, ExternalLink, Download } from "lucide-react";
import { Button } from "@/components/shared";
import { ProShell } from "@/components/ProShell";
import { StatCard, DashCard, EmptyRow } from "@/components/DashKit";
import { EarningsChart, type ChartPoint } from "@/components/EarningsChart";
import { useTips } from "@/hooks/useTips";
import { getAccount, openConnectDashboard } from "@/lib/billing";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Payments & tips — SelfeConnect" },
      { name: "description", content: "Track your earnings, tips and payment activity." },
    ],
  }),
  component: PaymentsPage,
});

const money = (n: number) =>
  `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dayKey = (iso: string) => new Date(iso).toISOString().slice(0, 10);

function PaymentsPage() {
  const { data: account } = useQuery({ queryKey: ["account"], queryFn: getAccount, retry: false });
  const { tips, total, avgRating, payments, paymentTotal, paymentCount } = useTips();
  const [range, setRange] = useState<7 | 14>(14);

  // A true daily earnings series (tips + payments) over the last 14 days.
  const days: ChartPoint[] = [];
  const keyOf: Record<string, number> = {};
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    keyOf[d.toISOString().slice(0, 10)] = days.length;
    days.push({ label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), value: 0 });
  }
  const addToDay = (iso: string, amt: number) => {
    const idx = keyOf[dayKey(iso)];
    if (idx != null) days[idx].value += amt;
  };
  tips.forEach((t) => addToDay(t.date, t.amount));
  payments.forEach((p) => addToDay(p.date, p.amount));
  const series = days.slice(-range);
  const rangeTotal = series.reduce((s, d) => s + d.value, 0);

  // Tips + payments in one activity feed.
  const txns = [
    ...payments.map((p) => ({ id: p.id, date: p.date, type: "Payment" as const, name: p.customerName, amount: p.amount })),
    ...tips.map((t) => ({ id: t.id, date: t.date, type: "Tip" as const, name: t.customerName, amount: t.amount })),
  ].sort((a, b) => (a.date < b.date ? 1 : -1));

  const openPayouts = async () => {
    try {
      const { url } = await openConnectDashboard();
      window.location.href = url;
    } catch {
      /* the button only renders once onboarded */
    }
  };

  const downloadReport = () => {
    const header = ["Date", "Type", "Amount (GBP)", "From"];
    const body = txns.map((t) => [
      new Date(t.date).toLocaleDateString("en-GB"),
      t.type,
      t.amount.toFixed(2),
      t.name?.trim() || "Anonymous",
    ]);
    const grand = txns.reduce((s, t) => s + t.amount, 0);
    body.push([], ["", "TOTAL", grand.toFixed(2), ""]);
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

  return (
    <ProShell title="Payments & tips" subtitle="Track your earnings, tips and payment activity.">
      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard icon={Wallet} label="Total received" value={money(total + paymentTotal)} foot="Tips + payments" />
          <StatCard
            icon={CreditCard}
            label="Payments"
            value={money(paymentTotal)}
            tone="bg-sky-100 text-sky-600"
            foot={`${paymentCount} payment${paymentCount === 1 ? "" : "s"}`}
          />
          <StatCard
            icon={Gift}
            label="Tips received"
            value={money(total)}
            tone="bg-violet-100 text-violet-600"
            foot={`${tips.length} tip${tips.length === 1 ? "" : "s"}`}
          />
          <StatCard
            icon={Star}
            label="Avg rating"
            value={tips.length ? avgRating.toFixed(1) : "—"}
            tone="bg-amber-100 text-amber-600"
            foot={`from ${tips.length} rated`}
          />
        </div>

        {/* Earnings chart + payouts */}
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <DashCard
            title="Earnings"
            action={
              <div className="flex items-center gap-1 rounded-lg bg-secondary p-0.5 text-xs font-semibold">
                {([7, 14] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    className={`rounded-md px-2.5 py-1 transition ${
                      range === r ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"
                    }`}
                  >
                    {r} days
                  </button>
                ))}
              </div>
            }
          >
            <div className="mb-2 flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold tabular-nums text-foreground">
                {money(rangeTotal)}
              </span>
              <span className="text-xs text-muted-foreground">in the last {range} days</span>
            </div>
            <EarningsChart data={series} />
          </DashCard>

          <aside className="space-y-4">
            <DashCard title="Payouts">
              {account?.stripeOnboarded ? (
                <>
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                      <Banknote className="h-[18px] w-[18px]" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Payouts active</p>
                      <p className="text-xs text-muted-foreground">Managed securely by Stripe</p>
                    </div>
                  </div>
                  <Button variant="outline" className="mt-4 w-full justify-center rounded-xl" onClick={openPayouts}>
                    <ExternalLink className="mr-1.5 h-4 w-4" /> Manage payouts on Stripe
                  </Button>
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    Payouts to your bank are processed by Stripe. Standard payment processing fees apply.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Set up payouts to receive payments and tips directly to your bank.
                  </p>
                  <Button asChild className="mt-3 w-full justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
                    <Link to="/account">Set up payouts</Link>
                  </Button>
                </>
              )}
            </DashCard>
          </aside>
        </div>

        {/* Recent transactions */}
        <DashCard
          title="Recent transactions"
          action={
            <button
              type="button"
              onClick={downloadReport}
              disabled={txns.length === 0}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
          }
          bodyClassName="p-0"
        >
          {txns.length === 0 ? (
            <EmptyRow>No payments or tips yet — share your QR code to start earning.</EmptyRow>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Type</th>
                    <th className="px-5 py-3 font-semibold">Customer</th>
                    <th className="px-5 py-3 text-right font-semibold">Amount</th>
                    <th className="px-5 py-3 text-right font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {txns.slice(0, 15).map((t) => (
                    <tr key={t.id} className="border-b border-border/40 last:border-0">
                      <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                        {new Date(t.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            t.type === "Payment" ? "bg-sky-100 text-sky-700" : "bg-violet-100 text-violet-700"
                          }`}
                        >
                          {t.type}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-medium text-foreground">{t.name?.trim() || "Anonymous"}</td>
                      <td className="whitespace-nowrap px-5 py-3 text-right font-display font-bold tabular-nums text-foreground">
                        {money(t.amount)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary-hover">
                          Paid
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DashCard>
      </div>
    </ProShell>
  );
}
