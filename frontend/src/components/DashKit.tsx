import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Link, type LinkProps } from "@tanstack/react-router";

/**
 * Shared dashboard building blocks — the design-system primitives every
 * professional page is assembled from, so the pages stay visually consistent
 * (one card style, one stat tile, one section header). Built on the app tokens
 * (bg-card, border, shadow-soft, primary-soft, font-display) — never raw colours.
 */

// A KPI tile: icon chip, label, big value, optional coloured foot line.
export function StatCard({
  icon: Icon,
  label,
  value,
  foot,
  tone = "bg-primary-soft text-primary",
  footTone = "text-muted-foreground",
  to,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  foot?: ReactNode;
  /** Icon-chip colour (a soft brand/semantic pair). */
  tone?: string;
  footTone?: string;
  /** When set, the whole card is a link to this route (with a hover cue). */
  to?: LinkProps["to"];
}) {
  const base = "rounded-2xl border border-border/60 bg-card p-4 shadow-soft sm:p-5";
  const body = (
    <>
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <p className="mt-3 text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-2xl font-bold tabular-nums text-foreground sm:text-[1.75rem]">
        {value}
      </p>
      {foot != null && <p className={`mt-1 text-xs font-medium ${footTone}`}>{foot}</p>}
    </>
  );
  if (to) {
    return (
      <Link to={to} className={`${base} block transition hover:border-primary/40 hover:shadow-elevated`}>
        {body}
      </Link>
    );
  }
  return <div className={base}>{body}</div>;
}

// A panel: a card with a header (title + optional action) and a body.
export function DashCard({
  title,
  action,
  children,
  bodyClassName = "p-5",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft">
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
          {title && <h2 className="font-display text-base font-bold text-foreground">{title}</h2>}
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

// A single activity figure: icon, big number, label.
export function Metric({
  icon: Icon,
  value,
  label,
  tone = "bg-primary-soft text-primary",
  to,
}: {
  icon: LucideIcon;
  value: ReactNode;
  label: string;
  tone?: string;
  /** When set, the metric is a link to this route (with a hover cue). */
  to?: LinkProps["to"];
}) {
  const body = (
    <>
      <span className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-2 font-display text-2xl font-bold tabular-nums text-foreground">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</p>
    </>
  );
  if (to) {
    return (
      <Link
        to={to}
        className="block rounded-xl p-2 text-center transition hover:bg-secondary"
      >
        {body}
      </Link>
    );
  }
  return <div className="text-center">{body}</div>;
}

// A muted empty-state line for a panel with no rows yet.
export function EmptyRow({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>;
}
