import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Download, Star } from "lucide-react";
import { Badge, Button, Card, CardContent, Input } from "@/components/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminData } from "@/hooks/useAdminData";

export const Route = createFileRoute("/admin/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — SelfeConnect Admin" },
      { name: "description", content: "Review all platform transactions." },
    ],
  }),
  component: AdminTransactions,
});

const PAGE_SIZE = 12;

function statusBadge(status: string) {
  switch (status) {
    case "succeeded":
      return "bg-[#E1F5EE] text-primary hover:bg-[#E1F5EE]";
    case "refunded":
      return "bg-amber-100 text-amber-800 hover:bg-amber-100";
    case "pending":
      return "bg-blue-100 text-blue-700 hover:bg-blue-100";
    default:
      return "bg-muted text-muted-foreground hover:bg-muted";
  }
}

function AdminTransactions() {
  const { transactions } = useAdminData();
  const today = new Date().toISOString().slice(0, 10);
  const ago = new Date();
  ago.setDate(ago.getDate() - 30);
  const startDefault = ago.toISOString().slice(0, 10);

  const [start, setStart] = useState(startDefault);
  const [end, setEnd] = useState(today);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime() + 24 * 60 * 60 * 1000;
    return transactions.filter((t) => {
      const ts = new Date(t.timestamp).getTime();
      if (ts < s || ts > e) return false;
      if (q && !t.driverName.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [transactions, q, start, end]);

  const totalVolume = filtered
    .filter((t) => t.status === "succeeded")
    .reduce((s, t) => s + t.amount, 0);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const exportCsv = () => {
    const header = ["id", "driver", "amount", "customer", "rating", "status", "timestamp"];
    const rows = filtered.map((t) => [
      t.id,
      t.driverName,
      t.amount.toFixed(2),
      t.customerName ?? "",
      t.rating,
      t.status,
      t.timestamp,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tipvan-transactions-${start}-to-${end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tips processed across all drivers.
          </p>
        </div>
        <Button onClick={exportCsv} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="mt-6 rounded-2xl">
        <CardContent className="grid gap-3 p-6 md:grid-cols-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">From</span>
            <Input
              type="date"
              value={start}
              onChange={(e) => {
                setStart(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">To</span>
            <Input
              type="date"
              value={end}
              onChange={(e) => {
                setEnd(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="md:col-span-2 block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Driver</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by driver name…"
                className="pl-9"
                maxLength={80}
              />
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card className="rounded-2xl border-0 bg-primary text-primary-foreground">
          <CardContent className="p-6">
            <p className="text-sm font-medium opacity-90">Total volume</p>
            <p className="mt-2 text-3xl font-extrabold">£{totalVolume.toFixed(2)}</p>
            <p className="mt-1 text-xs opacity-80">Succeeded transactions only</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground">Transaction count</p>
            <p className="mt-2 text-3xl font-extrabold text-foreground">{filtered.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">In selected range</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="mt-6 rounded-2xl">
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs text-foreground">{t.id}</TableCell>
                    <TableCell className="text-sm font-medium text-foreground">{t.driverName}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      £{t.amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.customerName ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center gap-1 text-sm">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {t.rating}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={`rounded-full text-[10px] uppercase tracking-wide ${statusBadge(t.status)}`}>
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(t.timestamp).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                {pageRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      No transactions in this range.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Page {page} of {pages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="rounded-xl"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                className="rounded-xl"
                disabled={page === pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
