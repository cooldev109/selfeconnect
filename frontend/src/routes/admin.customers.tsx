import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Building2, UserRound } from "lucide-react";
import { Badge, Button, Modal } from "@/components/shared";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { AdminList } from "@/components/AdminList";
import { api } from "@/lib/api";
import { useAdminData, type AdminCustomer } from "@/hooks/useAdminData";

export const Route = createFileRoute("/admin/customers")({
  head: () => ({
    meta: [
      { title: "Customers — SelfeConnect Admin" },
      { name: "description", content: "Manage customers and businesses." },
    ],
  }),
  component: AdminCustomers,
});

function AdminCustomers() {
  const { customers } = useAdminData();
  const qc = useQueryClient();
  const [toDelete, setToDelete] = useState<AdminCustomer | null>(null);

  const remove = useMutation({
    mutationFn: (id: string) => api(`/admin/customers/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-customers"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
      qc.invalidateQueries({ queryKey: ["admin-jobs"] });
      setToDelete(null);
    },
  });

  const businesses = customers.filter((c) => c.type === "business").length;

  return (
    <>
      <AdminList<AdminCustomer>
        title="Customers"
        subtitle="Everyone who signed up to hire a professional — individuals and businesses."
        rows={customers}
        searchOf={(c) => `${c.name} ${c.email} ${c.companyName} ${c.postcode}`}
        searchPlaceholder="Search by name, email, company or postcode…"
        emptyText="No customers yet."
        stats={[
          { label: "Total customers", value: customers.length, accent: true },
          { label: "Businesses", value: businesses, hint: "vs individuals" },
          {
            label: "Jobs posted",
            value: customers.reduce((s, c) => s + c.jobsPosted, 0),
          },
          {
            label: "Reviews left",
            value: customers.reduce((s, c) => s + c.reviewsLeft, 0),
          },
        ]}
        csv={{
          filename: "selfeconnect-customers.csv",
          header: ["name", "email", "phone", "type", "company", "postcode", "jobs", "reviews", "joined"],
          line: (c) => [c.name, c.email, c.phone, c.type, c.companyName, c.postcode, c.jobsPosted, c.reviewsLeft, c.joinDate],
        }}
        head={
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Postcode</TableHead>
            <TableHead className="text-right">Jobs</TableHead>
            <TableHead className="text-right">Reviews</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        }
        row={(c) => (
          <TableRow key={c.id}>
            <TableCell>
              <p className="text-sm font-medium text-foreground">{c.name}</p>
              {c.companyName && (
                <p className="text-xs text-muted-foreground">{c.companyName}</p>
              )}
            </TableCell>
            <TableCell>
              <Badge className="rounded-full bg-secondary text-[10px] uppercase tracking-wide text-muted-foreground hover:bg-secondary">
                {c.type === "business" ? (
                  <Building2 className="mr-1 h-3 w-3" />
                ) : (
                  <UserRound className="mr-1 h-3 w-3" />
                )}
                {c.type}
              </Badge>
            </TableCell>
            <TableCell>
              <p className="text-sm text-foreground">{c.email}</p>
              {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {c.postcode || "—"}
            </TableCell>
            <TableCell className="text-right text-sm tabular-nums text-foreground">
              {c.jobsPosted}
            </TableCell>
            <TableCell className="text-right text-sm tabular-nums text-foreground">
              {c.reviewsLeft}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {new Date(c.joinDate).toLocaleDateString()}
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="outline"
                className="rounded-lg text-destructive hover:bg-destructive/10"
                onClick={() => setToDelete(c)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        )}
      />

      <Modal
        open={!!toDelete}
        onOpenChange={(o) => { if (!o) setToDelete(null); }}
        title="Delete customer?"
      >
        <p className="text-sm text-muted-foreground">
          This permanently removes <strong>{toDelete?.name}</strong>, along with
          their {toDelete?.jobsPosted} job posting
          {toDelete?.jobsPosted === 1 ? "" : "s"} and{" "}
          {toDelete?.reviewsLeft} review{toDelete?.reviewsLeft === 1 ? "" : "s"}.
          This can't be undone.
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
            {remove.isPending ? "Deleting…" : "Delete customer"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
