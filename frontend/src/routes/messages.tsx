import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  const [selected, setSelected] = useState<string | null>(job ?? null);
  useEffect(() => {
    if (selected == null && threads.length) setSelected(job ?? threads[0].jobId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data, job]);

  return (
    <ProShell title="Messages" subtitle="Your conversations with customers.">
      <Inbox
        threads={threads}
        loading={q.isLoading}
        selectedKey={selected}
        onSelect={setSelected}
        keyOf={(t) => t.jobId}
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
