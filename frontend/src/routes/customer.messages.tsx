import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserRound } from "lucide-react";
import { CustomerShell } from "@/components/CustomerShell";
import { Inbox } from "@/components/Inbox";
import { ChatThread } from "@/components/ChatThread";
import { customerThreads, jobMessages, sendJobMessage, type InboxThread } from "@/lib/jobs";

export const Route = createFileRoute("/customer/messages")({
  // A message notification deep-links here with ?job=<id>.
  validateSearch: (s: Record<string, unknown>): { job?: string } => ({
    job: typeof s.job === "string" ? s.job : undefined,
  }),
  head: () => ({ meta: [{ title: "Messages — SelfeConnect" }] }),
  component: CustomerMessagesPage,
});

// A job can hold more than one professional thread, so key by both.
const keyOf = (t: InboxThread) => `${t.jobId}:${t.proPublicId}`;

function CustomerMessagesPage() {
  const qc = useQueryClient();
  const { job } = Route.useSearch();
  const q = useQuery({
    queryKey: ["customer-threads"],
    queryFn: customerThreads,
    retry: false,
    refetchInterval: 10000,
  });
  const threads = q.data ?? [];
  // Show the conversation list first; only auto-open a thread when a
  // notification deep-links to a specific job (?job=…).
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    if (!job) return;
    const target = threads.find((t) => t.jobId === job);
    if (target) setSelected(keyOf(target));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data, job]);

  return (
    <CustomerShell title="Messages" subtitle="Your conversations with professionals.">
      <Inbox
        threads={threads}
        loading={q.isLoading}
        selectedKey={selected}
        onSelect={setSelected}
        keyOf={keyOf}
        headerAction={(t) =>
          t.proPublicId ? (
            <Link
              to="/customer/pros/$publicId"
              params={{ publicId: t.proPublicId }}
              search={{ from: "jobs" }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition hover:bg-secondary"
            >
              <UserRound className="h-3.5 w-3.5" /> View profile
            </Link>
          ) : null
        }
        emptyHint="Message a professional from their profile, and your conversations appear here."
        renderChat={(t) => (
          <ChatThread
            queryKey={["cust-thread", t.jobId, t.proPublicId ?? ""]}
            fetchMessages={() => jobMessages(t.jobId, t.proPublicId!)}
            sendMessage={(b) => sendJobMessage(t.jobId, t.proPublicId!, b)}
            isMine={(m) => m.fromCustomer}
            placeholder="Message the professional…"
            onActivity={() => qc.invalidateQueries({ queryKey: ["customer-threads"] })}
          />
        )}
      />
    </CustomerShell>
  );
}
