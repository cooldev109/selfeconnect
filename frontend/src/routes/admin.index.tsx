import { createFileRoute } from "@tanstack/react-router";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Users, BadgeCheck, Wallet, TrendingUp } from "lucide-react";
import { Badge, Card, CardContent } from "@/components/shared";
import { useAdminData } from "@/hooks/useAdminData";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin dashboard — SelfeConnect" },
      { name: "description", content: "Platform metrics and recent activity." },
    ],
  }),
  component: AdminIndex,
});

function AdminIndex() {
  const { totalDrivers, activeSubs, totalTipsProcessed, platformRevenue, monthly, transactions } =
    useAdminData();

  const recent = transactions.slice(0, 8);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Platform overview.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Total drivers" value={String(totalDrivers)} Icon={Users} />
        <Metric label="Active subscriptions" value={String(activeSubs)} Icon={BadgeCheck} />
        <Metric label="Total tips processed" value={`£${totalTipsProcessed.toFixed(2)}`} Icon={Wallet} />
        <Metric label="Platform revenue" value={`£${platformRevenue.toFixed(2)}`} Icon={TrendingUp} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl lg:col-span-2">
          <CardContent className="p-6">
            <h2 className="text-base font-semibold text-foreground">
              Monthly transaction volume
            </h2>
            <div className="mt-4 h-72 w-full">
              <ResponsiveContainer>
                <LineChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--background))",
                    }}
                    formatter={(v: number) => [`£${v.toFixed(2)}`, "Volume"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="volume"
                    stroke="#1D9E75"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#1D9E75" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <h2 className="text-base font-semibold text-foreground">Recent activity</h2>
            <ul className="mt-4 space-y-3">
              {recent.map((t) => (
                <li key={t.id} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{t.driverName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-bold text-primary">£{t.amount.toFixed(2)}</span>
                    <Badge className="mt-1 rounded-full bg-[#E1F5EE] text-[10px] uppercase tracking-wide text-primary hover:bg-[#E1F5EE]">
                      {t.status}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  Icon,
}: {
  label: string;
  value: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="flex items-center gap-4 p-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E1F5EE] text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-extrabold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
