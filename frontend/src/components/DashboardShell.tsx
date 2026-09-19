import { type ReactNode, useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { LogOut, MessageSquare, Settings, ChevronDown, type LucideIcon } from "lucide-react";
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
// top bar on mobile. On desktop a sticky top app bar carries the page title
// and the global actions (Messages, notifications, account). Page content is
// passed as children.
export function DashboardShell({
  nav,
  onLogout,
  footer,
  title,
  subtitle,
  actions,
  bell,
  messagesPath,
  accountPath,
  userName,
  homePath = "/",
  children,
}: {
  nav: NavItem[];
  onLogout: () => void;
  /** Small status block pinned to the bottom of the rail. */
  footer?: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Notification bell, shown in the top app bar. */
  bell?: ReactNode;
  /** Where the "Messages" shortcut in the app bar links to. */
  messagesPath?: string;
  /** Where the account menu's "Account" item links to. */
  accountPath?: string;
  /** The signed-in user's display name, for the account menu. */
  userName?: string;
  /** Where the logo links to — the signed-in user's own dashboard, not the
   * public landing page. */
  homePath?: string;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.to : pathname.startsWith(item.to);
  // Fall back to the active section's label so the app bar always has context.
  const heading = title ?? nav.find(isActive)?.label ?? "";

  return (
    <div className="min-h-screen bg-[#F4F8F8] lg:grid lg:grid-cols-[248px_1fr]">
      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-screen flex-col gap-1 bg-[#0F2438] p-4 lg:flex">
        <Link to={homePath} className="mb-4 flex items-center gap-2 px-2 py-1.5">
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
          <Link to={homePath} className="flex items-center gap-2">
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
        {/* Desktop sticky top app bar — page context + global actions. */}
        <header className="sticky top-0 z-30 hidden border-b border-border/60 bg-background/80 backdrop-blur-xl lg:block">
          <div className="mx-auto flex max-w-5xl items-center gap-4 px-5 py-3 sm:px-8">
            <div className="min-w-0">
              {heading && (
                <h1 className="truncate font-display text-lg font-bold text-foreground">
                  {heading}
                </h1>
              )}
              {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
            </div>
            <div className="ml-auto flex items-center gap-2">
              {actions && <div className="flex items-center gap-2">{actions}</div>}
              {messagesPath && (
                <Link
                  to={messagesPath}
                  aria-label="Messages"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition hover:text-foreground"
                >
                  <MessageSquare className="h-5 w-5" />
                </Link>
              )}
              {bell}
              <AccountMenu userName={userName} accountPath={accountPath} onLogout={onLogout} />
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
          {/* Mobile-only in-content header (the desktop app bar covers this). */}
          {(title || actions || bell) && (
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4 lg:hidden">
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

// The account/avatar menu in the top app bar: the user's name, an Account link,
// and Log out. A small dropdown that closes on an outside click.
function AccountMenu({
  userName,
  accountPath,
  onLogout,
}: {
  userName?: string;
  accountPath?: string;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const initial = (userName?.trim()?.[0] ?? "?").toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        className="flex h-10 items-center gap-1.5 rounded-xl border border-border bg-background py-1 pl-1 pr-2 text-muted-foreground transition hover:text-foreground"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-sm font-bold text-primary">
          {initial}
        </span>
        <ChevronDown className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-border bg-popover shadow-elevated">
          {userName && (
            <div className="truncate border-b border-border/60 px-4 py-3 text-sm font-semibold text-foreground">
              {userName}
            </div>
          )}
          {accountPath && (
            <Link
              to={accountPath}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground transition hover:bg-secondary"
            >
              <Settings className="h-4 w-4 text-muted-foreground" /> Account
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-foreground transition hover:bg-secondary"
          >
            <LogOut className="h-4 w-4 text-muted-foreground" /> Log out
          </button>
        </div>
      )}
    </div>
  );
}
