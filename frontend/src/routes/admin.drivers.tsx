import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, MoreHorizontal, Star, Trash2 } from "lucide-react";
import { Badge, Button, Card, CardContent, Input, Modal } from "@/components/shared";
import { api } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAdminData, type AdminDriver } from "@/hooks/useAdminData";

export const Route = createFileRoute("/admin/drivers")({
  head: () => ({
    meta: [
      { title: "Drivers — SelfeConnect Admin" },
      { name: "description", content: "Manage all SelfeConnect drivers." },
    ],
  }),
  component: AdminDrivers,
});

const PAGE_SIZE = 8;

function AdminDrivers() {
  const { drivers } = useAdminData();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminDriver | null>(null);
  const [toDelete, setToDelete] = useState<AdminDriver | null>(null);

  const removeDriver = useMutation({
    mutationFn: (id: string) => api(`/admin/drivers/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-drivers"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
      setToDelete(null);
      setSelected(null);
    },
  });

  const filtered = useMemo(() => {
    return drivers.filter((d) => {
      if (filter !== "all" && d.status !== filter) return false;
      if (q && !`${d.name} ${d.email} ${d.id}`.toLowerCase().includes(q.toLowerCase()))
        return false;
      return true;
    });
  }, [drivers, q, filter]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="text-2xl font-bold text-foreground">Drivers</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {filtered.length} of {drivers.length} drivers
      </p>

      <Card className="mt-6 rounded-2xl">
        <CardContent className="p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by name, email, ID…"
                className="pl-9"
                maxLength={80}
              />
            </div>
            <Select
              value={filter}
              onValueChange={(v: "all" | "active" | "inactive") => {
                setFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All drivers</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-5 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total tips</TableHead>
                  <TableHead className="text-right">Rating</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((d) => (
                  <TableRow
                    key={d.id}
                    className="cursor-pointer"
                    onClick={() => setSelected(d)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <img src={d.photoUrl} alt={d.name} className="h-8 w-8 rounded-full object-cover" />
                        <div>
                          <p className="font-medium text-foreground">{d.name}</p>
                          <p className="text-xs text-muted-foreground">{d.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{d.email}</TableCell>
                    <TableCell>
                      <Badge
                        className={`rounded-full ${d.status === "active" ? "bg-[#E1F5EE] text-primary hover:bg-[#E1F5EE]" : "bg-muted text-muted-foreground hover:bg-muted"}`}
                      >
                        {d.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-foreground">
                      £{d.totalTips.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {d.avgRating.toFixed(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(d.joinDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="rounded-md p-1 hover:bg-secondary">
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem onClick={() => setSelected(d)}>View</DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setToDelete(d)}
                          >
                            Remove driver
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {pageRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      No drivers match your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
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

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>Driver details</SheetTitle>
                <SheetDescription>Full record for {selected.name}.</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-5">
                <div className="flex items-center gap-4">
                  <img
                    src={selected.photoUrl}
                    alt={selected.name}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-lg font-bold text-foreground">{selected.name}</p>
                    <p className="text-sm text-muted-foreground">ID {selected.id}</p>
                  </div>
                </div>
                <Detail label="Email" value={selected.email} />
                <Detail label="Phone" value={selected.phone} />
                <Detail label="Company" value={selected.company} />
                <Detail label="Status" value={selected.status} />
                <Detail label="Total tips" value={`£${selected.totalTips.toFixed(2)}`} />
                <Detail label="Average rating" value={selected.avgRating.toFixed(1)} />
                <Detail label="Joined" value={new Date(selected.joinDate).toLocaleDateString()} />
                <Button
                  variant="destructive"
                  className="mt-2 w-full rounded-xl"
                  onClick={() => setToDelete(selected)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove driver
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Modal
        open={!!toDelete}
        onOpenChange={(o) => !o && !removeDriver.isPending && setToDelete(null)}
        title="Remove this driver?"
        description={
          toDelete
            ? `This permanently deletes ${toDelete.name} (${toDelete.id}) and all of their tip history. This cannot be undone.`
            : ""
        }
        footer={
          <>
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={removeDriver.isPending}
              onClick={() => setToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              disabled={removeDriver.isPending}
              onClick={() => toDelete && removeDriver.mutate(toDelete.id)}
            >
              {removeDriver.isPending ? "Removing…" : "Yes, remove"}
            </Button>
          </>
        }
      />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
