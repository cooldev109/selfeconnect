import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Loader2,
  Wallet,
  Users,
  UserPlus,
  Timer,
  Briefcase,
  CheckCircle2,
  FileQuestion,
  TrendingDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/shared";
import { getAnalytics } from "@/lib/adminAnalytics";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — SelfeConnect Admin" },
      { name: "description", content: "Growth, funnel, revenue and retention metrics." },
    ],
  }),
  component: AdminAnalytics,
});

function Tile({
  label,
  value,
  hint,
  Icon,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  Icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
}) {
  return (
    <Card className={`rounded-2xl ${accent ? "border-primary/40 ring-1 ring-primary/20" : ""}`}>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E1F5EE] text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-extrabold tabular-nums text-foreground">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function AdminAnalytics() {
  const q = useQuery({ queryKey: ["admin-analytics"], queryFn: getAnalytics, retry: false });

  if (q.isLoading || !q.data) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  const a = q.data;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Growth, marketplace funnel, revenue and retention — the numbers that tell you if it's working.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="MRR" value={`£${a.revenue.mrr.toFixed(2)}`} hint={`${a.revenue.activePros} paying pros`} Icon={Wallet} accent />
        <Tile label="Active professionals" value={String(a.users.activePros)} hint={`${a.users.onboardedPros} payout-ready`} Icon={Users} />
        <Tile
          label="New sign-ups (30d)"
          value={String(a.users.newPros30 + a.users.newCustomers30)}
          hint={`${a.users.newPros30} pros · ${a.users.newCustomers30} customers`}
          Icon={UserPlus}
        />
        <Tile
          label="Median response time"
          value={a.responseTime.quotedJobs ? `${a.responseTime.medianHours}h` : "—"}
          hint="job posted → first quote"
          Icon={Timer}
        />
      </div>

      <Section title="Marketplace funnel">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Tile label="Jobs posted" value={String(a.jobs.totalJobs)} hint={`${a.jobs.openJobs} open now`} Icon={Briefcase} />
          <Tile label="Completed" value={String(a.jobs.completedJobs)} hint={`${a.conversions.jobToCompletedPct}% of jobs`} Icon={CheckCircle2} />
          <Tile
            label="No-quote jobs"
            value={String(a.jobs.noQuoteJobs)}
            hint={`${a.conversions.noQuotePct}% got no quote`}
            Icon={FileQuestion}
            accent={a.conversions.noQuotePct >= 25}
          />
          <Tile label="Quotes / job" value={a.jobs.quotesPerJob.toFixed(1)} hint={`${a.jobs.totalQuotes} quotes total`} Icon={Briefcase} />
        </div>
      </Section>

      <Section title="Conversions">
        <div className="grid gap-4 sm:grid-cols-3">
          <Tile label="Sign-up → paying" value={`${a.conversions.signupToActivePct}%`} hint="pros who subscribe" Icon={Users} />
          <Tile label="Job → hired" value={`${a.conversions.jobToHiredPct}%`} hint="posted jobs that hire" Icon={Briefcase} />
          <Tile label="Job → completed" value={`${a.conversions.jobToCompletedPct}%`} hint="posted jobs finished" Icon={CheckCircle2} />
        </div>
      </Section>

      <Section title="Retention">
        <div className="grid gap-4 sm:grid-cols-3">
          <Tile label="Churn" value={`${a.revenue.churnPct}%`} hint="set to cancel" Icon={TrendingDown} accent={a.revenue.churnPct >= 10} />
          <Tile label="Cancelling" value={String(a.revenue.cancellingSubs)} hint="active until period end" Icon={TrendingDown} />
          <Tile label="Cancelled" value={String(a.revenue.canceledSubs)} hint="lapsed subscriptions" Icon={TrendingDown} />
        </div>
      </Section>

      <Section title="Sign-ups — last 8 weeks">
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={a.signupTrend} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} tickFormatter={(d: string) => d.slice(5)} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="pros" name="Professionals" stroke="#1D9E75" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="customers" name="Customers" stroke="#6366F1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
