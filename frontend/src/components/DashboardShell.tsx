import { type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { LogOut, type LucideIcon } from "lucide-react";
import { LogoMark } from "@/components/Logo";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Match this exact path only (default: prefix match). */
  exact?: boolean;
}

// Persistent side-navigation shell shared by the professional and customer
// dashboards. A dark rail on the left (desktop) collapses to a horizontal
// top bar on mobile. Page content is passed as children.
export function DashboardShell({
  nav,
  onLogout,
  footer,
  title,
  subtitle,
  actions,
  bell,
  children,
}: {
  nav: NavItem[];
  onLogout: () => void;
  /** Small status block pinned to the bottom of the rail. */
  footer?: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Notification bell, pinned to the top-right of the header. */
  bell?: ReactNode;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.to : pathname.startsWith(item.to);

  return (
    <div className="min-h-screen bg-[#F4F8F8] lg:grid lg:grid-cols-[248px_1fr]">
      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-screen flex-col gap-1 bg-[#0F2438] p-4 lg:flex">
        <Link to="/" className="mb-4 flex items-center gap-2 px-2 py-1.5">
          <LogoMark className="h-7 w-7" tone="white" />
          <span className="font-display text-[15px] font-bold tracking-tight text-white">
            Selfe<span className="text-primary">Connect</span>
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-[#AEC1CE] hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <Icon
                  className={`h-[18px] w-[18px] shrink-0 ${active ? "text-primary" : "opacity-80"}`}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {footer && (
          <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3">{footer}</div>
        )}
        <button
          onClick={onLogout}
          className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#AEC1CE] transition hover:bg-white/[0.06] hover:text-white"
        >
          <LogOut className="h-[18px] w-[18px] opacity-80" /> Log out
        </button>
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 border-b border-border bg-[#0F2438] lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <LogoMark className="h-7 w-7" tone="white" />
            <span className="font-display text-[15px] font-bold tracking-tight text-white">
              Selfe<span className="text-primary">Connect</span>
            </span>
          </Link>
          <button
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#AEC1CE] hover:text-white"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {nav.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active ? "bg-primary text-primary-foreground" : "text-[#AEC1CE] hover:bg-white/10"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <main className="min-w-0">
        <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
          {(title || actions || bell) && (
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                {title && (
                  <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
                )}
                {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
              </div>
              <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
                {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
                {bell}
              </div>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
