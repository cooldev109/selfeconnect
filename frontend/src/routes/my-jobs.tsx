import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MapPin, Clock, Mail, Phone, BadgeCheck, MessageSquare } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { Badge, Button, Card, CardContent } from "@/components/shared";
import { ProShell } from "@/components/ProShell";
import { ChatThread } from "@/components/ChatThread";
import { JobPhotos } from "@/components/JobPhotos";
import { JobStatusBadge } from "@/components/JobStatusBadge";
import {
  proMyJobs,
  proJobMessages,
  proSendJobMessage,
  type ProJob,
  type JobStatus,
} from "@/lib/jobs";

export const Route = createFileRoute("/my-jobs")({
  // A notification deep-links here with ?job=<id> so we can open that job's
  // conversation directly instead of dropping the pro on the list.
  validateSearch: (s: Record<string, unknown>): { job?: string } => ({
    job: typeof s.job === "string" ? s.job : undefined,
  }),
  head: () => ({
    meta: [
      { title: "My jobs — SelfeConnect" },
      { name: "description", content: "Jobs you've contacted or been hired for." },
    ],
  }),
  component: MyJobsPage,
});

type Stage = "active" | "completed" | "cancelled";

const STAGE_OF: Record<JobStatus, Stage> = {
  open: "active",
  hired: "active",
  in_progress: "active",
  completed: "completed",
  closed: "completed",
  cancelled: "cancelled",
};

// The pro's engagement with an open job: a submitted quote counts as "Quoted";
// unlocking contact alone shows "Contacted" (reached out, no price yet). Once
// the job leaves "open", its lifecycle status carries the colour instead.
const ENGAGEMENT = {
  quoted: { label: "Quoted", cls: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
  contacted: { label: "Contacted", cls: "bg-sky-100 text-sky-800", dot: "bg-sky-500" },
};

function MyJobsPage() {
  const jobsQ = useQuery({ queryKey: ["pro-my-jobs"], queryFn: proMyJobs, retry: false });
  const [stage, setStage] = useState<Stage>("active");
  const { job: focusJobId } = Route.useSearch();

  const jobs = jobsQ.data ?? [];
  const stageOf = (j: ProJob) => STAGE_OF[j.status ?? "open"];

  // Deep-linked from a notification: switch to the tab holding that job so it's
  // actually on screen for its card to open + scroll to.
  useEffect(() => {
    if (!focusJobId) return;
    const target = jobs.find((j) => j.id === focusJobId);
    if (target) setStage(stageOf(target));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusJobId, jobsQ.data]);
  const counts: Record<Stage, number> = {
    active: jobs.filter((j) => stageOf(j) === "active").length,
    completed: jobs.filter((j) => stageOf(j) === "completed").length,
    cancelled: jobs.filter((j) => stageOf(j) === "cancelled").length,
  };
  const shown = jobs.filter((j) => stageOf(j) === stage);

  const tabs: { key: Stage; label: string }[] = [
    { key: "active", label: "Active" },
    { key: "completed", label: "Completed" },
    ...(counts.cancelled > 0 ? [{ key: "cancelled" as Stage, label: "Cancelled" }] : []),
  ];

  return (
    <ProShell
      title="My jobs"
      subtitle="Jobs you've contacted a customer about, and the ones you've been hired for."
    >
      {jobsQ.isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : jobs.length === 0 ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            You haven't contacted any jobs yet. Unlock a job on{" "}
            <span className="font-medium text-foreground">Find work</span> and it will appear here.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2" role="tablist">
            {tabs.map((t) => {
              const active = stage === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setStage(t.key)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label} ({counts[t.key]})
                </button>
              );
            })}
          </div>

          {shown.length === 0 ? (
            <Card className="rounded-2xl border-dashed">
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                Nothing here yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {shown.map((j) => (
                <ProJobCard key={j.id} job={j} autoOpen={j.id === focusJobId} />
              ))}
            </div>
          )}
        </div>
      )}
    </ProShell>
  );
}

function ProJobCard({ job, autoOpen = false }: { job: ProJob; autoOpen?: boolean }) {
  const status = job.status ?? "open";
  const engagement = status === "open" ? (job.myQuote ? ENGAGEMENT.quoted : ENGAGEMENT.contacted) : null;
  const active = STAGE_OF[status] === "active";
  // Deep-linked from a notification → open this job's conversation and bring it
  // into view.
  const [chatOpen, setChatOpen] = useState(autoOpen && active);
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (autoOpen) cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [autoOpen]);
  return (
    <Card ref={cardRef} className={`rounded-2xl ${autoOpen ? "ring-2 ring-primary/40" : ""}`}>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-foreground">{job.title}</h3>
          {engagement ? (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${engagement.cls}`}
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${engagement.dot}`} aria-hidden />
              {engagement.label}
            </span>
          ) : (
            <JobStatusBadge status={status} />
          )}
          {job.hired && (
            <Badge className="rounded-full border-0 bg-violet-100 text-violet-800">
              <BadgeCheck className="mr-1 h-3.5 w-3.5" /> They hired you
            </Badge>
          )}
        </div>

        {/* The full job the customer posted — description, details and photos —
            carried through from the board so nothing is lost in "My jobs". */}
        <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{job.description}</p>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{job.categoryName}</span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {job.postcode}
            {job.distanceMiles != null && ` · ${job.distanceMiles} mi`}
          </span>
          {job.budget && <span>{job.budget}</span>}
          {job.workingHours && <span>{job.workingHours}</span>}
          {job.timing && <span>{job.timing}</span>}
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> Posted {timeAgo(job.createdAt)}
          </span>
        </div>

        <JobPhotos photos={job.photos} />

        {/* The pro's own quote on this job, when they've sent one. */}
        {job.myQuote && (
          <p className="mt-3 rounded-xl border border-primary/15 bg-[#E1F5EE]/40 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">
              Your quote{job.myQuote.amount != null ? `: £${(job.myQuote.amount / 100).toFixed(2)}` : ""}
            </span>{" "}
            — {job.myQuote.message}
          </p>
        )}

        {/* Contact — already unlocked, so the pro can reach the customer. */}
        {job.contact && (
          <div className="mt-3 rounded-xl bg-secondary/50 p-3 text-sm">
            <p className="font-medium text-foreground">{job.contact.name}</p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <a
                href={`mailto:${job.contact.email}`}
                className="inline-flex items-center gap-1 hover:text-primary"
              >
                <Mail className="h-3.5 w-3.5" /> {job.contact.email}
              </a>
              {job.contact.phone && (
                <a
                  href={`tel:${job.contact.phone}`}
                  className="inline-flex items-center gap-1 hover:text-primary"
                >
                  <Phone className="h-3.5 w-3.5" /> {job.contact.phone}
                </a>
              )}
            </div>
          </div>
        )}

        {/* Chat with the customer about this job. */}
        {/* Chat is only available while the job is active — the customer's
            side hides it once the job is completed/cancelled, so messaging a
            closed job would reach no one. */}
        {STAGE_OF[job.status ?? "open"] === "active" && (
          <div className="mt-3">
            <Button
              variant="outline"
              className="h-9 rounded-lg px-3 text-xs"
              onClick={() => setChatOpen((o) => !o)}
            >
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
              {chatOpen ? "Hide messages" : "Message customer"}
            </Button>
            {chatOpen && (
              <div className="mt-2">
                <ChatThread
                  queryKey={["pro-thread", job.id]}
                  fetchMessages={() => proJobMessages(job.id)}
                  sendMessage={(b) => proSendJobMessage(job.id, b)}
                  isMine={(m) => !m.fromCustomer}
                  placeholder="Message the customer…"
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
