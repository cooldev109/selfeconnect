import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Star, BadgeCheck, ShieldQuestion } from "lucide-react";
import { Badge, Button, Modal } from "@/components/shared";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { AdminList } from "@/components/AdminList";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { useAdminData, type AdminReview } from "@/hooks/useAdminData";

export const Route = createFileRoute("/admin/reviews")({
  head: () => ({
    meta: [
      { title: "Reviews — SelfeConnect Admin" },
      { name: "description", content: "Moderate reviews left for professionals." },
    ],
  }),
  component: AdminReviews,
});

function AdminReviews() {
  const { reviews } = useAdminData();
  const qc = useQueryClient();
  const [toDelete, setToDelete] = useState<AdminReview | null>(null);
  const [onlyLow, setOnlyLow] = useState(false);

  const remove = useMutation({
    mutationFn: (id: string) => api(`/admin/reviews/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reviews"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
      setToDelete(null);
    },
  });

  // Low-star reviews are the ones most likely to need a look, so they get a
  // one-click filter rather than making someone scan the whole list.
  const rows = onlyLow ? reviews.filter((r) => r.rating <= 2) : reviews;
  const verified = reviews.filter((r) => r.verified).length;
  const avg = reviews.length
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : 0;

  return (
    <>
      <AdminList<AdminReview>
        title="Reviews"
        subtitle="Every review left for a professional — with the tools to take one down."
        rows={rows}
        searchOf={(r) => `${r.driverName} ${r.author} ${r.comment}`}
        searchPlaceholder="Search by professional, author or comment…"
        emptyText={onlyLow ? "No 1–2 star reviews." : "No reviews yet."}
        stats={[
          { label: "Total reviews", value: reviews.length, accent: true },
          { label: "Verified", value: verified, hint: "from a real account" },
          { label: "Unverified", value: reviews.length - verified, hint: "left via QR" },
          { label: "Average rating", value: avg || "—" },
        ]}
        csv={{
          filename: "selfeconnect-reviews.csv",
          header: ["professional", "author", "rating", "verified", "hired", "comment", "date"],
          line: (r) => [r.driverName, r.author, r.rating, r.verified, r.hired, r.comment, r.createdAt],
        }}
        filters={
          <Button
            variant="outline"
            className={`rounded-xl ${onlyLow ? "border-primary text-primary" : ""}`}
            onClick={() => setOnlyLow((v) => !v)}
          >
            {onlyLow ? "Showing 1–2★" : "Show 1–2★ only"}
          </Button>
        }
        head={
          <TableRow>
            <TableHead>Professional</TableHead>
            <TableHead>Author</TableHead>
            <TableHead className="text-right">Rating</TableHead>
            <TableHead>Comment</TableHead>
            <TableHead>Left</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        }
        row={(r) => (
          <TableRow key={r.id}>
            <TableCell>
              <p className="text-sm font-medium text-foreground">{r.driverName}</p>
              <p className="font-mono text-xs text-muted-foreground">{r.driverId}</p>
            </TableCell>
            <TableCell>
              <p className="text-sm text-foreground">{r.author}</p>
              {r.hired ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                  <BadgeCheck className="h-3 w-3" /> Hired on SelfeConnect
                </span>
              ) : r.verified ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary/80">
                  <BadgeCheck className="h-3 w-3" /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <ShieldQuestion className="h-3 w-3" /> Unverified
                </span>
              )}
            </TableCell>
            <TableCell className="text-right">
              <Badge
                className={`rounded-full text-[10px] ${
                  r.rating <= 2
                    ? "bg-destructive/10 text-destructive hover:bg-destructive/10"
                    : "bg-amber-100 text-amber-800 hover:bg-amber-100"
                }`}
              >
                <Star className="mr-1 h-3 w-3 fill-current" />
                {r.rating}
              </Badge>
            </TableCell>
            <TableCell className="max-w-[280px]">
              <p className="truncate text-sm text-muted-foreground">{r.comment || "—"}</p>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {timeAgo(r.createdAt)}
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="outline"
                className="rounded-lg text-destructive hover:bg-destructive/10"
                onClick={() => setToDelete(r)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        )}
      />

      <Modal open={!!toDelete} onOpenChange={(o) => { if (!o) setToDelete(null); }} title="Take down this review?">
        <p className="text-sm text-muted-foreground">
          This permanently removes the {toDelete?.rating}★ review of{" "}
          <strong>{toDelete?.driverName}</strong> by {toDelete?.author}, and
          recalculates their rating. This can't be undone.
        </p>
        {toDelete?.comment && (
          <p className="mt-3 rounded-xl bg-muted/60 p-3 text-sm italic text-foreground/80">
            "{toDelete.comment}"
          </p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => setToDelete(null)}>
            Cancel
          </Button>
          <Button
            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={remove.isPending}
            onClick={() => toDelete && remove.mutate(toDelete.id)}
          >
            {remove.isPending ? "Removing…" : "Remove review"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
