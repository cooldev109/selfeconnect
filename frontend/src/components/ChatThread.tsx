import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/shared";
import type { ChatMessage } from "@/lib/jobs";

// Time under each bubble: just the time for today's messages, date + time for
// older ones — so a thread that spans days stays readable.
function fmtMsgTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const today = new Date().toDateString() === d.toDateString();
  return today
    ? time
    : `${d.toLocaleDateString([], { day: "numeric", month: "short" })} · ${time}`;
}

// A self-contained chat thread: a scrollable message list plus an input. It
// polls every few seconds so the other side's replies appear without a manual
// refresh — no websockets needed. `isMine` decides which side a bubble sits on,
// so the same component serves both the customer and the professional.
export function ChatThread({
  queryKey,
  fetchMessages,
  sendMessage,
  isMine,
  onActivity,
  placeholder = "Write a message…",
}: {
  queryKey: unknown[];
  fetchMessages: () => Promise<ChatMessage[]>;
  sendMessage: (body: string) => Promise<ChatMessage>;
  isMine: (m: ChatMessage) => boolean;
  /** Called after messages load or a send succeeds (e.g. to refresh unread badges). */
  onActivity?: () => void;
  placeholder?: string;
}) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const q = useQuery({
    queryKey,
    queryFn: fetchMessages,
    refetchInterval: 4000,
  });
  const messages = q.data ?? [];

  const send = useMutation({
    mutationFn: (body: string) => sendMessage(body),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey });
      onActivity?.();
    },
  });

  // Keep the newest message in view as the thread grows.
  const count = messages.length;
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    onActivity?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  const submit = () => {
    const body = text.trim();
    if (body) send.mutate(body);
  };

  return (
    <div className="rounded-xl border border-border bg-background">
      <div ref={scrollRef} className="max-h-72 min-h-[6rem] space-y-2 overflow-y-auto p-3">
        {q.isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            No messages yet — say hello.
          </p>
        ) : (
          messages.map((m) => {
            const mine = isMine(m);
            return (
              <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-sm ${
                    mine ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                  }`}
                >
                  <p className="whitespace-pre-line break-words">{m.body}</p>
                </div>
                <span className="mt-0.5 px-1 text-[10px] text-muted-foreground">
                  {fmtMsgTime(m.createdAt)}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-end gap-2 border-t border-border p-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
          rows={1}
          maxLength={2000}
          className="max-h-24 min-h-[2.25rem] flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <Button
          type="button"
          onClick={submit}
          disabled={send.isPending || !text.trim()}
          className="h-9 shrink-0 rounded-lg bg-primary px-3 text-primary-foreground hover:bg-primary/90"
          aria-label="Send message"
        >
          {send.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
