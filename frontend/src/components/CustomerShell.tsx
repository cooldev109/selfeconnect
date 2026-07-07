import { type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { DashboardShell } from "@/components/DashboardShell";
import { CUSTOMER_NAV } from "@/components/dashboardNav";
import { useRequireCustomer } from "@/lib/useRequireCustomer";
import { customerLogout } from "@/lib/customer-auth";

// Chrome for every customer page: side-nav + auth guard. Exposes the signed-in
// customer to children via a render prop so pages don't re-query.
export function CustomerShell({
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
  const { customer, loading } = useRequireCustomer();

  if (loading || !customer) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4F8F8]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <DashboardShell
      nav={CUSTOMER_NAV}
      title={title}
      subtitle={subtitle}
      actions={actions}
      onLogout={async () => {
        await customerLogout().catch(() => {});
        navigate({ to: "/customer/login" });
      }}
      footer={
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#AEC1CE]">
            Signed in
          </div>
          <div className="mt-1 truncate text-[13px] font-semibold text-white">
            {customer.companyName || customer.name}
          </div>
        </div>
      }
    >
      {children}
    </DashboardShell>
  );
}
