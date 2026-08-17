import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Check, X, Flag, Scale } from "lucide-react";
import { Badge, Button, Card, CardContent, Modal } from "@/components/shared";
import {
  getAdminDisputes,
  getAdminReports,
  resolveDispute,
  resolveReport,
  type AdminDispute,
} from "@/lib/disputes";
import { timeAgo } from "@/lib/utils";

export const Route = createFileRoute("/admin/disputes")({
  head: () => ({
    meta: [
      { title: "Disputes & reports — SelfeConnect Admin" },
      { name: "description", content: "Resolve job disputes and act on abuse reports." },
    ],
  }),
  component: AdminDisputes,
});

const STATUS_CLS: Record<string, string> = {
  open: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  resolved: "bg-primary/10 text-primary hover:bg-primary/10",
  rejected: "bg-muted text-muted-foreground hover:bg-muted",
  actioned: "bg-primary/10 text-primary hover:bg-primary/10",
  dismissed: "bg-muted text-muted-foreground hover:bg-muted",
};

function AdminDisputes() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"disputes" | "reports">("disputes");
  const [toResolve, setToResolve] = useState<AdminDispute | null>(null);
  const [decision, setDecision] = useState<"resolved" | "rejected">("resolved");
  const [notes, setNotes] = useState("");

  const disputesQ = useQuery({ queryKey: ["admin-disputes"], queryFn: getAdminDisputes, retry: false });
  const reportsQ = useQuery({ queryKey: ["admin-reports"], queryFn: getAdminReports, retry: false });
  const disputes = disputesQ.data ?? [];
  const reports = reportsQ.data ?? [];
  const openDisputes = disputes.filter((d) => d.status === "open").length;
  const openReports = reports.filter((r) => r.status === "open").length;

  const doResolveDispute = useMutation({
    mutationFn: () => resolveDispute(toResolve!.id, decision, notes || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-disputes"] });
      setToResolve(null);
      setNotes("");
    },
  });
  const doResolveReport = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "actioned" | "dismissed" }) =>
      resolveReport(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-reports"] }),
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-bold text-foreground">Disputes &amp; reports</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Resolve disputes raised on jobs, and act on reports of professionals, customers or postings.
      </p>

      <div className="mt-5 inline-flex rounded-xl border border-border p-1">
        <button
          className={`rounded-lg px-4 py-1.5 text-sm font-semibold ${tab === "disputes" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          onClick={() => setTab("disputes")}
        >
          <Scale className="mr-1.5 inline h-4 w-4" /> Disputes {openDisputes > 0 && `(${openDisputes})`}
        </button>
        <button
          className={`rounded-lg px-4 py-1.5 text-sm font-semibold ${tab === "reports" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          onClick={() => setTab("reports")}
        >
          <Flag className="mr-1.5 inline h-4 w-4" /> Reports {openReports > 0 && `(${openReports})`}
        </button>
      </div>

      {tab === "disputes" ? (
        <div className="mt-5 space-y-3">
          {disputesQ.isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : disputes.length === 0 ? (
            <Card className="rounded-2xl border-dashed"><CardContent className="p-8 text-center text-sm text-muted-foreground">No disputes raised.</CardContent></Card>
          ) : (
            disputes.map((d) => (
              <Card key={d.id} className="rounded-2xl">
                <CardContent className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">{d.jobTitle}</p>
                        <Badge className={`rounded-full text-[10px] ${STATUS_CLS[d.status]}`}>{d.status}</Badge>
                        <span className="text-xs text-muted-foreground">· {d.reason.replace(/_/g, " ")}</span>
                      </div>
                      <p className="mt-1 text-sm text-foreground/90">{d.detail}</p>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Raised by <strong>{d.raisedBy}</strong> ({d.raisedByKind}) · {timeAgo(d.createdAt)}
                        {d.proName && ` · pro: ${d.proName}`} · customer: {d.customerName}
                      </p>
                      {d.resolutionNotes && (
                        <p className="mt-1 rounded-lg bg-muted/60 px-3 py-1.5 text-xs italic text-foreground/80">
                          Resolution: {d.resolutionNotes}
                        </p>
                      )}
                    </div>
                    {d.status === "open" && (
                      <div className="flex gap-2">
                        <Button
                          className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                          onClick={() => { setToResolve(d); setDecision("resolved"); setNotes(""); }}
                        >
                          Resolve
                        </Button>
                        <Button
                          variant="outline"
                          className="rounded-lg"
                          onClick={() => { setToResolve(d); setDecision("rejected"); setNotes(""); }}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {reportsQ.isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : reports.length === 0 ? (
            <Card className="rounded-2xl border-dashed"><CardContent className="p-8 text-center text-sm text-muted-foreground">No reports.</CardContent></Card>
          ) : (
            reports.map((r) => (
              <Card key={r.id} className="rounded-2xl">
                <CardContent className="flex flex-wrap items-start justify-between gap-3 p-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="rounded-full bg-secondary text-[10px] text-muted-foreground hover:bg-secondary">{r.targetType}</Badge>
                      <span className="font-mono text-xs text-muted-foreground">{r.targetId}</span>
                      <Badge className={`rounded-full text-[10px] ${STATUS_CLS[r.status]}`}>{r.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-foreground/90">{r.reason}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Reported by a {r.reporterKind} · {timeAgo(r.createdAt)}</p>
                  </div>
                  {r.status === "open" && (
                    <div className="flex gap-2">
                      <Button
                        className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                        disabled={doResolveReport.isPending}
                        onClick={() => doResolveReport.mutate({ id: r.id, status: "actioned" })}
                      >
                        <Check className="mr-1 h-4 w-4" /> Actioned
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-lg"
                        disabled={doResolveReport.isPending}
                        onClick={() => doResolveReport.mutate({ id: r.id, status: "dismissed" })}
                      >
                        <X className="mr-1 h-4 w-4" /> Dismiss
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      <Modal
        open={!!toResolve}
        onOpenChange={(o) => { if (!o) setToResolve(null); }}
        title={decision === "resolved" ? "Resolve dispute" : "Reject dispute"}
      >
        <p className="text-sm text-muted-foreground">
          {decision === "resolved"
            ? "Mark this dispute as resolved in the raiser's favour."
            : "Dismiss this dispute after review."}{" "}
          The person who raised it is notified.
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Notes / outcome (optional, shown to the raiser)"
          className="mt-3 w-full rounded-xl border border-input bg-background p-3 text-sm"
        />
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => setToResolve(null)}>Cancel</Button>
          <Button
            className="rounded-xl"
            disabled={doResolveDispute.isPending}
            onClick={() => doResolveDispute.mutate()}
          >
            {doResolveDispute.isPending ? "Saving…" : decision === "resolved" ? "Resolve" : "Reject"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
