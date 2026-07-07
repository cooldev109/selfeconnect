import { type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { PRO_NAV } from "@/components/dashboardNav";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { useMe } from "@/hooks/useDriver";
import { getAccount } from "@/lib/billing";
import { logout } from "@/lib/auth";

// Chrome for every professional page: side-nav + auth guard + a live
// subscription status pinned to the rail. Renders children only once authed.
export function ProShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const auth = useRequireAuth();
  const { data: driver } = useMe();
  const { data: account } = useQuery({
    queryKey: ["account"],
    queryFn: getAccount,
    retry: false,
  });

  if (!auth.data || !driver) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4F8F8]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  const endsOn =
    account?.isActive &&
    account.cancelAtPeriodEnd &&
    account.currentPeriodEnd
      ? new Date(account.currentPeriodEnd).toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : null;
  const active = !!account?.isActive;

  return (
    <DashboardShell
      nav={PRO_NAV}
      title={title}
      subtitle={subtitle}
      actions={actions}
      onLogout={async () => {
        await logout().catch(() => {});
        navigate({ to: "/login" });
      }}
      footer={
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#AEC1CE]">
            Subscription
          </div>
          <div className="mt-1 flex items-center gap-2 text-[13px] font-semibold text-white">
            <span
              className={`h-2 w-2 rounded-full ${
                active ? "bg-primary" : "bg-amber-400"
              }`}
            />
            {endsOn ? `Active until ${endsOn}` : active ? "Active" : "Inactive"}
          </div>
        </div>
      }
    >
      {children}
    </DashboardShell>
  );
}
