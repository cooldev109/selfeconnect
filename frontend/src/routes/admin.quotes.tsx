import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "@/components/shared";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { AdminList } from "@/components/AdminList";
import { timeAgo } from "@/lib/utils";
import { useAdminData, type AdminQuote } from "@/hooks/useAdminData";

export const Route = createFileRoute("/admin/quotes")({
  head: () => ({
    meta: [
      { title: "Quotes — SelfeConnect Admin" },
      { name: "description", content: "Every quote professionals have sent on jobs." },
    ],
  }),
  component: AdminQuotes,
});

const money = (pence: number | null) =>
  pence == null ? "On request" : `£${(pence / 100).toFixed(2)}`;

function AdminQuotes() {
  const { quotes } = useAdminData();
  const priced = quotes.filter((q) => q.amount != null);
  const avg =
    priced.length > 0
      ? Math.round(priced.reduce((s, q) => s + (q.amount ?? 0), 0) / priced.length)
      : null;

  return (
    <AdminList<AdminQuote>
      title="Quotes"
      subtitle="Every quote a professional has sent on a job — price and pitch."
      rows={quotes}
      searchOf={(q) => `${q.driverName} ${q.jobTitle} ${q.customerName} ${q.message}`}
      searchPlaceholder="Search by professional, job or customer…"
      emptyText="No quotes yet."
      stats={[
        { label: "Total quotes", value: quotes.length, accent: true },
        { label: "With a price", value: priced.length },
        { label: "Average quote", value: money(avg) },
      ]}
      csv={{
        filename: "selfeconnect-quotes.csv",
        header: ["professional", "job", "customer", "amount", "status", "message", "date"],
        line: (q) => [q.driverName, q.jobTitle, q.customerName, money(q.amount), q.jobStatus, q.message, q.createdAt],
      }}
      head={
        <TableRow>
          <TableHead>Professional</TableHead>
          <TableHead>Job</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Pitch</TableHead>
          <TableHead>Sent</TableHead>
        </TableRow>
      }
      row={(q) => (
        <TableRow key={q.id}>
          <TableCell>
            <p className="text-sm font-medium text-foreground">{q.driverName}</p>
            <p className="font-mono text-xs text-muted-foreground">{q.driverId}</p>
          </TableCell>
          <TableCell className="max-w-[200px]">
            <p className="truncate text-sm text-foreground">{q.jobTitle}</p>
            <Badge className="mt-0.5 rounded-full bg-secondary text-[10px] text-muted-foreground hover:bg-secondary">
              {q.jobStatus}
            </Badge>
          </TableCell>
          <TableCell className="text-sm text-muted-foreground">{q.customerName}</TableCell>
          <TableCell className="text-right text-sm font-semibold tabular-nums text-foreground">
            {money(q.amount)}
          </TableCell>
          <TableCell className="max-w-[280px]">
            <p className="truncate text-sm text-muted-foreground">{q.message || "—"}</p>
          </TableCell>
          <TableCell className="text-xs text-muted-foreground">{timeAgo(q.createdAt)}</TableCell>
        </TableRow>
      )}
    />
  );
}
