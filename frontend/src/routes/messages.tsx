import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase } from "lucide-react";
import { ProShell } from "@/components/ProShell";
import { Inbox } from "@/components/Inbox";
import { ChatThread } from "@/components/ChatThread";
import { proThreads, proJobMessages, proSendJobMessage } from "@/lib/jobs";

export const Route = createFileRoute("/messages")({
  // A message notification deep-links here with ?job=<id>.
  validateSearch: (s: Record<string, unknown>): { job?: string } => ({
    job: typeof s.job === "string" ? s.job : undefined,
  }),
  head: () => ({ meta: [{ title: "Messages — SelfeConnect" }] }),
  component: MessagesPage,
});

function MessagesPage() {
  const qc = useQueryClient();
  const { job } = Route.useSearch();
  const q = useQuery({
    queryKey: ["pro-threads"],
    queryFn: proThreads,
    retry: false,
    refetchInterval: 10000,
  });
  const threads = q.data ?? [];
  // Show the conversation list first; only auto-open a thread when a
  // notification deep-links to a specific job (?job=…).
  const [selected, setSelected] = useState<string | null>(job ?? null);
  useEffect(() => {
    if (job) setSelected(job);
  }, [job]);

  return (
    <ProShell title="Messages" subtitle="Your conversations with customers.">
      <Inbox
        threads={threads}
        loading={q.isLoading}
        selectedKey={selected}
        onSelect={setSelected}
        keyOf={(t) => t.jobId}
        headerAction={(t) => (
          <Link
            to="/my-jobs"
            search={{ job: t.jobId }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition hover:bg-secondary"
          >
            <Briefcase className="h-3.5 w-3.5" /> View job
          </Link>
        )}
        emptyHint="When you quote for a job or get hired, your chats with customers appear here."
        renderChat={(t) => (
          <ChatThread
            queryKey={["pro-thread", t.jobId]}
            fetchMessages={() => proJobMessages(t.jobId)}
            sendMessage={(b) => proSendJobMessage(t.jobId, b)}
            isMine={(m) => !m.fromCustomer}
            placeholder="Message the customer…"
            onActivity={() => qc.invalidateQueries({ queryKey: ["pro-threads"] })}
          />
        )}
      />
    </ProShell>
  );
}
