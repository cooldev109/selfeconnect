import { useMemo, useState, type ReactNode } from "react";
import { Search, Download } from "lucide-react";
import { Button, Card, CardContent, Input } from "@/components/shared";
import { Table, TableBody, TableHeader } from "@/components/ui/table";

/**
 * The shared chrome every admin list needs: a heading, a search box, summary
 * tiles, a paginated table and optional CSV export. Each screen supplies only
 * its own columns and row markup, so the console stays consistent and the
 * screens stay short.
 */
export function AdminList<T>({
  title,
  subtitle,
  rows,
  searchOf,
  searchPlaceholder = "Search…",
  head,
  row,
  emptyText,
  stats,
  csv,
  pageSize = 12,
  filters,
}: {
  title: string;
  subtitle: string;
  rows: T[];
  /** Text searched by the box — concatenate whatever should be findable. */
  searchOf: (r: T) => string;
  searchPlaceholder?: string;
  head: ReactNode;
  row: (r: T) => ReactNode;
  emptyText: string;
  stats?: { label: string; value: string | number; hint?: string; accent?: boolean }[];
  /** Supply to enable CSV export: a filename and a row→values mapping. */
  csv?: { filename: string; header: string[]; line: (r: T) => (string | number | boolean)[] };
  pageSize?: number;
  /** Extra controls (e.g. a status filter) rendered beside the search box. */
  filters?: ReactNode;
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => searchOf(r).toLowerCase().includes(needle));
  }, [rows, q, searchOf]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const pageRows = filtered.slice((current - 1) * pageSize, current * pageSize);

  const exportCsv = () => {
    if (!csv) return;
    const lines = [csv.header, ...filtered.map(csv.line)]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([lines], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = csv.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {csv && (
          <Button
            onClick={exportCsv}
            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        )}
      </div>

      {stats && stats.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <Card
              key={s.label}
              className={`rounded-2xl ${s.accent ? "border-0 bg-primary text-primary-foreground" : ""}`}
            >
              <CardContent className="p-5">
                <p className={`text-sm font-medium ${s.accent ? "opacity-90" : "text-muted-foreground"}`}>
                  {s.label}
                </p>
                <p className={`mt-2 text-2xl font-extrabold ${s.accent ? "" : "text-foreground"}`}>
                  {s.value}
                </p>
                {s.hint && (
                  <p className={`mt-1 text-xs ${s.accent ? "opacity-80" : "text-muted-foreground"}`}>
                    {s.hint}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-6 rounded-2xl">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-[240px] flex-1 block">
              <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Search
              </span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                  placeholder={searchPlaceholder}
                  className="pl-9"
                  maxLength={80}
                />
              </div>
            </label>
            {filters}
          </div>

          <div className="mt-5 overflow-x-auto">
            <Table>
              <TableHeader>{head}</TableHeader>
              <TableBody>
                {pageRows.map((r) => row(r))}
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={12} className="py-10 text-center text-sm text-muted-foreground">
                      {emptyText}
                    </td>
                  </tr>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {filtered.length} result{filtered.length === 1 ? "" : "s"} · page {current} of {pages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="rounded-xl"
                disabled={current === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                className="rounded-xl"
                disabled={current === pages}
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
