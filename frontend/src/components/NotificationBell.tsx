import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, FileText, MessageSquare, BadgeCheck, ShieldCheck, Scale } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import type { AppNotification } from "@/lib/notifications";

const ICON = {
  quote: FileText,
  message: MessageSquare,
  hired: BadgeCheck,
  verification: ShieldCheck,
  dispute: Scale,
} as const;

// The header notification bell: an unread badge, and a dropdown of recent
// alerts. It polls so new alerts appear on their own; opening it marks
// everything read. `onOpenNotification` lets the host route to the job.
export function NotificationBell({
  queryKey,
  fetchNotifications,
  markAllRead,
  onOpenNotification,
}: {
  queryKey: unknown[];
  fetchNotifications: () => Promise<AppNotification[]>;
  markAllRead: () => Promise<{ ok: true }>;
  onOpenNotification?: (n: AppNotification) => void;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const q = useQuery({
    queryKey,
    queryFn: fetchNotifications,
    refetchInterval: 20000,
  });
  const items = q.data ?? [];
  const unread = items.filter((n) => !n.read).length;

  const read = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  // Opening the panel clears the unread badge.
  useEffect(() => {
    if (open && unread > 0 && !read.isPending) read.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition hover:text-foreground"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        // The bell lives at the top-right of the header, so anchor the panel to
        // the right edge (it opens down-and-left) and clamp its width to the
        // viewport — that way it never spills off the right on a narrow phone.
        <div className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-border bg-popover shadow-elevated">
          <div className="border-b border-border/60 px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Notifications</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No notifications yet.
              </p>
            ) : (
              items.map((n) => {
                const Icon = ICON[n.kind] ?? Bell;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onOpenNotification?.(n);
                    }}
                    className={`flex w-full items-start gap-3 border-b border-border/40 px-4 py-3 text-left transition hover:bg-secondary ${
                      n.read ? "" : "bg-primary-soft/40"
                    }`}
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">{n.title}</span>
                      {n.body && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {n.body}
                        </span>
                      )}
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {timeAgo(n.createdAt)}
                      </span>
                    </span>
                    {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
