import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Ban, CreditCard } from "lucide-react";
import { Badge, Button } from "@/components/shared";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { AdminList } from "@/components/AdminList";
import { api } from "@/lib/api";
import { useAdminData, type AdminSubscription } from "@/hooks/useAdminData";

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
  if (s.isActive && s.cancelAtPeriodEnd) return { label: "Cancelling", cls: "bg-amber-100 text-amber-800 hover:bg-amber-100" };
  if (s.isActive) return { label: "Active", cls: "bg-[#E1F5EE] text-primary hover:bg-[#E1F5EE]" };
  return { label: "Inactive", cls: "bg-muted text-muted-foreground hover:bg-muted" };
}

function AdminSubscriptions() {
  const { subscriptions } = useAdminData();
  const qc = useQueryClient();

  const setActive = useMutation({
    mutationFn: (v: { id: string; isActive: boolean }) =>
      api(`/admin/subscriptions/${v.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: v.isActive }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-subscriptions"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
      qc.invalidateQueries({ queryKey: ["admin-drivers"] });
    },
  });

  const active = subscriptions.filter((s) => s.isActive).length;
  const cancelling = subscriptions.filter((s) => s.isActive && s.cancelAtPeriodEnd).length;
  const onboarded = subscriptions.filter((s) => s.stripeOnboarded).length;

  return (
    <AdminList<AdminSubscription>
      title="Subscriptions"
      subtitle="Who has platform access, and who can actually receive money."
      rows={subscriptions}
      searchOf={(s) => `${s.name} ${s.email} ${s.id} ${s.status}`}
      searchPlaceholder="Search by name, email or ID…"
      emptyText="No professionals yet."
      stats={[
        { label: "Active subscriptions", value: active, accent: true },
        { label: "Cancelling", value: cancelling, hint: "access until period end" },
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
              {s.currentPeriodEnd
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
            </TableCell>
          </TableRow>
        );
      }}
    />
  );
}
