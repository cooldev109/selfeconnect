import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  Check,
  Clock,
  FileText,
  IdCard,
  ShieldCheck,
  X,
} from "lucide-react";
import { Badge, Button, Modal } from "@/components/shared";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { AdminList } from "@/components/AdminList";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { openVerificationDoc } from "@/lib/verification";
import { useAdminData, type AdminVerification } from "@/hooks/useAdminData";

export const Route = createFileRoute("/admin/verifications")({
  head: () => ({
    meta: [
      { title: "Verifications — SelfeConnect Admin" },
      { name: "description", content: "Review professional identity, insurance and qualification documents." },
    ],
  }),
  component: AdminVerifications,
});

const TYPE_META = {
  identity: { label: "Identity", icon: IdCard },
  insurance: { label: "Insurance", icon: ShieldCheck },
  qualification: { label: "Qualification", icon: Award },
} as const;

function StatusBadge({ status }: { status: AdminVerification["status"] }) {
  const map = {
    pending: { text: "Pending", cls: "bg-amber-100 text-amber-800 hover:bg-amber-100" },
    verified: { text: "Verified", cls: "bg-primary/10 text-primary hover:bg-primary/10" },
    rejected: { text: "Rejected", cls: "bg-destructive/10 text-destructive hover:bg-destructive/10" },
  } as const;
  const s = map[status];
  return <Badge className={`rounded-full text-[10px] ${s.cls}`}>{s.text}</Badge>;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function AdminVerifications() {
  const { verifications } = useAdminData();
  const qc = useQueryClient();
  const [onlyPending, setOnlyPending] = useState(true);
  const [toReject, setToReject] = useState<AdminVerification | null>(null);
  const [notes, setNotes] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-verifications"] });
    qc.invalidateQueries({ queryKey: ["admin-overview"] });
  };

  const approve = useMutation({
    mutationFn: (id: string) => api(`/admin/verifications/${id}/approve`, { method: "POST" }),
    onSuccess: invalidate,
  });
  const reject = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      api(`/admin/verifications/${id}/reject`, { method: "POST", body: JSON.stringify({ notes }) }),
    onSuccess: () => {
      invalidate();
      setToReject(null);
      setNotes("");
    },
  });

  const rows = onlyPending ? verifications.filter((v) => v.status === "pending") : verifications;
  const pending = verifications.filter((v) => v.status === "pending").length;
  const verified = verifications.filter((v) => v.status === "verified").length;

  return (
    <>
      <AdminList<AdminVerification>
        title="Verifications"
        subtitle="Review the documents professionals submit, and grant or decline their trust badges."
        rows={rows}
        searchOf={(v) => `${v.driver.name} ${v.driver.email} ${v.type} ${v.label ?? ""} ${v.reference ?? ""}`}
        searchPlaceholder="Search by professional, type or reference…"
        emptyText={onlyPending ? "Nothing awaiting review." : "No verification submissions yet."}
        stats={[
          { label: "Awaiting review", value: pending, accent: true },
          { label: "Verified", value: verified },
          { label: "Total submissions", value: verifications.length },
        ]}
        filters={
          <Button
            variant="outline"
            className={`rounded-xl ${onlyPending ? "border-primary text-primary" : ""}`}
            onClick={() => setOnlyPending((v) => !v)}
          >
            {onlyPending ? "Awaiting review" : "All submissions"}
          </Button>
        }
        head={
          <TableRow>
            <TableHead>Professional</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Details</TableHead>
            <TableHead>Document</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        }
        row={(v) => {
          const meta = TYPE_META[v.type];
          const Icon = meta.icon;
          return (
            <TableRow key={v.id}>
              <TableCell>
                <p className="text-sm font-medium text-foreground">{v.driver.name}</p>
                <p className="text-xs text-muted-foreground">{v.driver.email}</p>
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
                  <Icon className="h-4 w-4 text-primary" /> {meta.label}
                </span>
              </TableCell>
              <TableCell className="max-w-[220px]">
                <p className="truncate text-sm text-foreground">{v.label || v.reference || "—"}</p>
                {v.expiresAt && (
                  <p className="text-xs text-muted-foreground">Valid to {fmtDate(v.expiresAt)}</p>
                )}
                {v.status === "rejected" && v.reviewerNotes && (
                  <p className="truncate text-xs italic text-destructive">{v.reviewerNotes}</p>
                )}
              </TableCell>
              <TableCell>
                {v.hasDocument ? (
                  <Button
                    variant="outline"
                    className="rounded-lg"
                    onClick={() => openVerificationDoc(v.id).catch(() => {})}
                  >
                    <FileText className="mr-1.5 h-4 w-4" /> View
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {timeAgo(v.submittedAt)}
                </span>
              </TableCell>
              <TableCell>
                <StatusBadge status={v.status} />
              </TableCell>
              <TableCell className="text-right">
                {v.status === "pending" ? (
                  <div className="flex justify-end gap-2">
                    <Button
                      className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                      disabled={approve.isPending}
                      onClick={() => approve.mutate(v.id)}
                    >
                      <Check className="mr-1 h-4 w-4" /> Approve
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-lg text-destructive hover:bg-destructive/10"
                      onClick={() => { setToReject(v); setNotes(""); }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {v.reviewedAt ? `Reviewed ${timeAgo(v.reviewedAt)}` : "—"}
                  </span>
                )}
              </TableCell>
            </TableRow>
          );
        }}
      />

      <Modal
        open={!!toReject}
        onOpenChange={(o) => { if (!o) setToReject(null); }}
        title="Decline this verification?"
      >
        <p className="text-sm text-muted-foreground">
          Decline <strong>{toReject && TYPE_META[toReject.type].label}</strong> for{" "}
          <strong>{toReject?.driver.name}</strong>. They'll be notified and can re-submit.
        </p>
        <label className="mt-4 block text-sm font-medium text-foreground">
          Reason (shown to the professional)
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="e.g. The certificate photo is unreadable — please upload a clearer copy."
            className="mt-1 w-full rounded-xl border border-input bg-background p-3 text-sm"
          />
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => setToReject(null)}>
            Cancel
          </Button>
          <Button
            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={reject.isPending}
            onClick={() => toReject && reject.mutate({ id: toReject.id, notes })}
          >
            {reject.isPending ? "Declining…" : "Decline"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
