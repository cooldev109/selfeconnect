import type { JobStatus } from "@/lib/jobs";

// A single, app-wide source of truth for job-status colours. Each status gets a
// distinct hue + a solid dot so state reads at a glance; red is reserved for
// cancelled (a problem state) so it never gets diluted onto neutral statuses.
export const JOB_STATUS_BADGE: Record<
  JobStatus,
  { label: string; cls: string; dot: string }
> = {
  open: { label: "Open", cls: "bg-sky-100 text-sky-800", dot: "bg-sky-500" },
  hired: { label: "Hired", cls: "bg-violet-100 text-violet-800", dot: "bg-violet-500" },
  in_progress: { label: "In progress", cls: "bg-amber-100 text-amber-900", dot: "bg-amber-500" },
  completed: { label: "Completed", cls: "bg-slate-200 text-slate-700", dot: "bg-slate-500" },
  closed: { label: "Completed", cls: "bg-slate-200 text-slate-700", dot: "bg-slate-500" },
  cancelled: { label: "Cancelled", cls: "bg-red-100 text-red-700", dot: "bg-red-500" },
};

export function JobStatusBadge({
  status,
  className = "",
}: {
  status: JobStatus;
  className?: string;
}) {
  const b = JOB_STATUS_BADGE[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${b.cls} ${className}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${b.dot}`} aria-hidden />
      {b.label}
    </span>
  );
}
