import type { ReactNode } from "react";
import { MessageSquare, ChevronLeft, Loader2 } from "lucide-react";
import type { InboxThread } from "@/lib/jobs";
import { JobStatusBadge } from "@/components/JobStatusBadge";
import { timeAgo } from "@/lib/utils";

// A shared two-pane inbox: a list of conversations on the left, the selected
// conversation on the right (desktop). On mobile it shows one at a time — the
// list, or the open thread with a back button. Both the professional and the
// customer inbox reuse it; each supplies its threads and how to render a chat.
export function Inbox({
  threads,
  loading,
  selectedKey,
  onSelect,
  keyOf,
  renderChat,
  emptyHint,
}: {
  threads: InboxThread[];
  loading: boolean;
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  /** A unique key per thread (a job may hold more than one). */
  keyOf: (t: InboxThread) => string;
  renderChat: (t: InboxThread) => ReactNode;
  emptyHint: string;
}) {
  const selected = threads.find((t) => keyOf(t) === selectedKey) ?? null;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-10 text-center shadow-soft">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <MessageSquare className="h-6 w-6" />
        </span>
        <p className="mt-3 text-sm font-semibold text-foreground">No conversations yet</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{emptyHint}</p>
      </div>
    );
  }

  const list = (
    <div className="divide-y divide-border/50 overflow-y-auto">
      {threads.map((t) => {
        const k = keyOf(t);
        const active = k === selectedKey;
        return (
          <button
            key={k}
            type="button"
            onClick={() => onSelect(k)}
            className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-secondary/50 ${
              active ? "bg-secondary/60" : ""
            }`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E1F5EE] text-sm font-bold text-primary">
              {(t.name[0] ?? "?").toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-foreground">{t.name}</span>
                {t.lastAt && (
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {timeAgo(t.lastAt)}
                  </span>
                )}
              </span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {t.jobTitle}
              </span>
              <span className="mt-0.5 flex items-center gap-2">
                <span className="truncate text-xs text-muted-foreground">
                  {t.lastMessage ?? "No messages yet"}
                </span>
                {t.unread > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {t.unread > 9 ? "9+" : t.unread}
                  </span>
                )}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );

  const thread = selected && (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="rounded-lg p-1 text-muted-foreground hover:bg-secondary lg:hidden"
          aria-label="Back to all messages"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E1F5EE] text-xs font-bold text-primary">
          {(selected.name[0] ?? "?").toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{selected.name}</p>
          <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
            {selected.jobTitle} <JobStatusBadge status={selected.jobStatus} />
          </p>
        </div>
      </div>
      <div className="min-h-0 flex-1 p-4">{renderChat(selected)}</div>
    </div>
  );

  return (
    <div className="grid h-[calc(100vh-13rem)] min-h-[28rem] overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft lg:grid-cols-[320px_1fr]">
      {/* List — hidden on mobile once a thread is open */}
      <div className={`min-h-0 flex-col border-border/60 lg:flex lg:border-r ${selected ? "hidden lg:flex" : "flex"}`}>
        <div className="border-b border-border/60 px-4 py-3">
          <p className="font-display text-base font-bold text-foreground">Conversations</p>
        </div>
        {list}
      </div>
      {/* Thread — or a placeholder on desktop when nothing is selected */}
      <div className={`min-h-0 ${selected ? "flex" : "hidden lg:flex"} flex-col`}>
        {thread ?? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Select a conversation to read it.
          </div>
        )}
      </div>
    </div>
  );
}
