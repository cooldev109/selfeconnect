import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, MapPin, Users, Eye } from "lucide-react";
import { Badge, Button, Modal } from "@/components/shared";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { AdminList } from "@/components/AdminList";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { useAdminData, type AdminJob } from "@/hooks/useAdminData";

export const Route = createFileRoute("/admin/jobs")({
  head: () => ({
    meta: [
      { title: "Job postings — SelfeConnect Admin" },
      { name: "description", content: "Monitor and manage job postings." },
    ],
  }),
  component: AdminJobs,
});

function AdminJobs() {
  const { jobs } = useAdminData();
  const qc = useQueryClient();
  const [toDelete, setToDelete] = useState<AdminJob | null>(null);
  const [viewing, setViewing] = useState<AdminJob | null>(null);

  const remove = useMutation({
    mutationFn: (id: string) => api(`/admin/jobs/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-jobs"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
      setToDelete(null);
    },
  });

  const open = jobs.filter((j) => j.status === "open").length;
  const hired = jobs.filter((j) => j.hiredDriverName).length;

  return (
    <>
      <AdminList<AdminJob>
        title="Job postings"
        subtitle="Every job customers have posted, and how much interest each has had."
        rows={jobs}
        searchOf={(j) => `${j.title} ${j.category} ${j.customerName} ${j.postcode}`}
        searchPlaceholder="Search by title, service, customer or postcode…"
        emptyText="No jobs posted yet."
        stats={[
          { label: "Open jobs", value: open, accent: true },
          { label: "Total posted", value: jobs.length },
          { label: "Filled", value: hired, hint: "customer named a professional" },
          {
            label: "Contacts made",
            value: jobs.reduce((s, j) => s + j.contactCount, 0),
            hint: "professionals who unlocked",
          },
        ]}
        csv={{
          filename: "selfeconnect-jobs.csv",
          header: ["title", "service", "customer", "postcode", "status", "contacts", "limit", "hired", "posted"],
          line: (j) => [j.title, j.category, j.customerName, j.postcode, j.status, j.contactCount, j.maxContacts ?? "none", j.hiredDriverName ?? "", j.createdAt],
        }}
        head={
          <TableRow>
            <TableHead>Job</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Area</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Contacts</TableHead>
            <TableHead>Posted</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        }
        row={(j) => (
          <TableRow
            key={j.id}
            onClick={() => setViewing(j)}
            className="cursor-pointer"
          >
            <TableCell className="max-w-[220px]">
              <p className="truncate text-sm font-medium text-foreground">{j.title}</p>
              {j.hiredDriverName && (
                <p className="text-xs text-primary">Hired {j.hiredDriverName}</p>
              )}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{j.category}</TableCell>
            <TableCell>
              <p className="text-sm text-foreground">{j.customerName}</p>
              <p className="text-xs text-muted-foreground">{j.customerEmail}</p>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {j.postcode}
              </span>
            </TableCell>
            <TableCell>
              <Badge
                className={`rounded-full text-[10px] uppercase tracking-wide ${
                  j.status === "open"
                    ? "bg-[#E1F5EE] text-primary hover:bg-[#E1F5EE]"
                    : "bg-muted text-muted-foreground hover:bg-muted"
                }`}
              >
                {j.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right text-sm tabular-nums text-foreground">
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                {j.contactCount}
                {j.maxContacts != null && (
                  <span className="text-muted-foreground">/{j.maxContacts}</span>
                )}
              </span>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {timeAgo(j.createdAt)}
            </TableCell>
            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-end gap-1.5">
                <Button
                  variant="outline"
                  className="rounded-lg text-xs"
                  onClick={() => setViewing(j)}
                >
                  <Eye className="mr-1 h-3.5 w-3.5" /> View
                </Button>
                <Button
                  variant="outline"
                  className="rounded-lg text-destructive hover:bg-destructive/10"
                  onClick={() => setToDelete(j)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        )}
      />

      {/* Full detail — the table truncates, so this is where you actually read a job. */}
      <Modal
        open={!!viewing}
        onOpenChange={(o) => { if (!o) setViewing(null); }}
        title={viewing?.title ?? ""}
      >
        {viewing && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-secondary text-[10px] uppercase tracking-wide text-muted-foreground hover:bg-secondary">
                {viewing.category}
              </Badge>
              <Badge
                className={`rounded-full text-[10px] uppercase tracking-wide ${
                  viewing.status === "open"
                    ? "bg-[#E1F5EE] text-primary hover:bg-[#E1F5EE]"
                    : "bg-muted text-muted-foreground hover:bg-muted"
                }`}
              >
                {viewing.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Posted {timeAgo(viewing.createdAt)}
              </span>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Description
              </p>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed text-foreground/90">
                {viewing.description}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Detail label="Customer" value={viewing.customerName} sub={viewing.customerEmail} />
              <Detail label="Area" value={viewing.postcode} />
              <Detail label="Budget" value={viewing.budget || "Not given"} />
              <Detail
                label="Quotes allowed"
                value={
                  viewing.maxContacts == null
                    ? "No limit"
                    : `Up to ${viewing.maxContacts}`
                }
                sub={`${viewing.contactCount} professional${viewing.contactCount === 1 ? "" : "s"} in touch${
                  viewing.maxContacts != null && viewing.contactCount >= viewing.maxContacts
                    ? " · limit reached"
                    : ""
                }`}
              />
            </div>

            {viewing.hiredDriverName && (
              <div className="rounded-xl bg-[#E1F5EE] p-3">
                <p className="text-xs font-semibold text-primary">
                  Customer hired {viewing.hiredDriverName}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={!!toDelete} onOpenChange={(o) => { if (!o) setToDelete(null); }} title="Delete job posting?">
        <p className="text-sm text-muted-foreground">
          This permanently removes <strong>{toDelete?.title}</strong> posted by{" "}
          {toDelete?.customerName}. This can't be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => setToDelete(null)}>
            Cancel
          </Button>
          <Button
            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={remove.isPending}
            onClick={() => toDelete && remove.mutate(toDelete.id)}
          >
            {remove.isPending ? "Deleting…" : "Delete job"}
          </Button>
        </div>
      </Modal>
    </>
  );
}

function Detail({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
