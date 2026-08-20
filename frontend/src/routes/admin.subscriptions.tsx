import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Ban, CreditCard, Gift } from "lucide-react";
import { Badge, Button, Modal } from "@/components/shared";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { AdminList } from "@/components/AdminList";
import { api } from "@/lib/api";
import { useAdminData, type AdminSubscription } from "@/hooks/useAdminData";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export const Route = createFileRoute("/admin/subscriptions")({
  head: () => ({
    meta: [
      { title: "Subscriptions — SelfeConnect Admin" },
      { name: "description", content: "Monitor and manage professional subscriptions." },
    ],
  }),
  component: AdminSubscriptions,
});

// A cancelled subscription still has access until the paid period ends — the
// console shows that the same way the professional sees it.
function stateOf(s: AdminSubscription) {
  if (s.complimentary && s.isActive) return { label: "Complimentary", cls: "bg-violet-100 text-violet-700 hover:bg-violet-100" };
  if (s.isActive && s.cancelAtPeriodEnd) return { label: "Cancelling", cls: "bg-amber-100 text-amber-800 hover:bg-amber-100" };
  if (s.isActive) return { label: "Active", cls: "bg-[#E1F5EE] text-primary hover:bg-[#E1F5EE]" };
  return { label: "Inactive", cls: "bg-muted text-muted-foreground hover:bg-muted" };
}

const COMP_MONTHS = [1, 3, 6, 12];

function AdminSubscriptions() {
  const { subscriptions } = useAdminData();
  const qc = useQueryClient();
  const [comping, setComping] = useState<AdminSubscription | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    qc.invalidateQueries({ queryKey: ["admin-overview"] });
    qc.invalidateQueries({ queryKey: ["admin-drivers"] });
  };
  const setActive = useMutation({
    mutationFn: (v: { id: string; isActive: boolean }) =>
      api(`/admin/subscriptions/${v.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: v.isActive }),
      }),
    onSuccess: invalidate,
  });
  const grantComp = useMutation({
    mutationFn: (v: { id: string; months: number }) =>
      api(`/admin/subscriptions/${v.id}/complimentary`, {
        method: "POST",
        body: JSON.stringify({ months: v.months }),
      }),
    onSuccess: () => { invalidate(); setComping(null); },
  });

  const active = subscriptions.filter((s) => s.isActive).length;
  const comp = subscriptions.filter((s) => s.complimentary && s.isActive).length;
  const onboarded = subscriptions.filter((s) => s.stripeOnboarded).length;

  return (
    <>
      <AdminList<AdminSubscription>
      title="Subscriptions"
      subtitle="Who has platform access, and who can actually receive money."
      rows={subscriptions}
      searchOf={(s) => `${s.name} ${s.email} ${s.id} ${s.status}`}
      searchPlaceholder="Search by name, email or ID…"
      emptyText="No professionals yet."
      stats={[
        { label: "Active", value: active, accent: true },
        { label: "Complimentary", value: comp, hint: "free launch access" },
        { label: "Payout-ready", value: onboarded, hint: "completed Stripe onboarding" },
        { label: "Total professionals", value: subscriptions.length },
      ]}
      csv={{
        filename: "selfeconnect-subscriptions.csv",
        header: ["id", "name", "email", "status", "active", "cancelling", "periodEnd", "payoutReady"],
        line: (s) => [s.id, s.name, s.email, s.status, s.isActive, s.cancelAtPeriodEnd, s.currentPeriodEnd ?? "", s.stripeOnboarded],
      }}
      head={
        <TableRow>
          <TableHead>Professional</TableHead>
          <TableHead>ID</TableHead>
          <TableHead>State</TableHead>
          <TableHead>Stripe status</TableHead>
          <TableHead>Renews / ends</TableHead>
          <TableHead>Payouts</TableHead>
          <TableHead className="text-right">Access</TableHead>
        </TableRow>
      }
      row={(s) => {
        const st = stateOf(s);
        return (
          <TableRow key={s.id}>
            <TableCell>
              <p className="text-sm font-medium text-foreground">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.email}</p>
            </TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">{s.id}</TableCell>
            <TableCell>
              <Badge className={`rounded-full text-[10px] uppercase tracking-wide ${st.cls}`}>
                {st.label}
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{s.status}</TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {s.complimentary && s.complimentaryUntil
                ? `Free until ${fmtDate(s.complimentaryUntil)}`
                : s.currentPeriodEnd
                  ? new Date(s.currentPeriodEnd).toLocaleDateString()
                  : "—"}
            </TableCell>
            <TableCell>
              {s.stripeOnboarded ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                  <CreditCard className="h-3.5 w-3.5" /> Ready
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Not set up</span>
              )}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  className="rounded-lg text-xs text-violet-700 hover:bg-violet-50"
                  onClick={() => setComping(s)}
                  title="Grant free (complimentary) access"
                >
                  <Gift className="mr-1 h-3.5 w-3.5" /> Free access
                </Button>
                <Button
                  variant="outline"
                  className={`rounded-lg text-xs ${s.isActive ? "text-destructive hover:bg-destructive/10" : "text-primary hover:bg-primary-soft"}`}
                  disabled={setActive.isPending}
                  onClick={() => setActive.mutate({ id: s.id, isActive: !s.isActive })}
                >
                  {s.isActive ? (
                    <>
                      <Ban className="mr-1 h-3.5 w-3.5" /> Suspend
                    </>
                  ) : (
                    <>
                      <Check className="mr-1 h-3.5 w-3.5" /> Activate
                    </>
                  )}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        );
      }}
    />

      <Modal
        open={!!comping}
        onOpenChange={(o) => { if (!o) setComping(null); }}
        title="Complimentary access"
      >
        <p className="text-sm text-muted-foreground">
          Give <strong>{comping?.name}</strong> free access for a period — for launch pros. When it
          expires they'll need to subscribe normally.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {COMP_MONTHS.map((m) => (
            <Button
              key={m}
              variant="outline"
              className="rounded-xl"
              disabled={grantComp.isPending}
              onClick={() => comping && grantComp.mutate({ id: comping.id, months: m })}
            >
              {m} month{m === 1 ? "" : "s"}
            </Button>
          ))}
        </div>
        {comping?.complimentary && (
          <button
            type="button"
            className="mt-4 text-xs font-medium text-destructive hover:underline"
            disabled={grantComp.isPending}
            onClick={() => comping && grantComp.mutate({ id: comping.id, months: 0 })}
          >
            Revoke complimentary access
          </button>
        )}
      </Modal>
    </>
  );
}
