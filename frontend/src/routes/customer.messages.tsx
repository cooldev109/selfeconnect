import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    if (selected == null && threads.length) {
      const target = (job && threads.find((t) => t.jobId === job)) || threads[0];
      setSelected(keyOf(target));
    }
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
