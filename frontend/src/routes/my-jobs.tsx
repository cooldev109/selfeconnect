import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MapPin, Clock, Mail, Phone, BadgeCheck, MessageSquare } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { Badge, Button, Card, CardContent } from "@/components/shared";
import { ProShell } from "@/components/ProShell";
import { ChatThread } from "@/components/ChatThread";
import {
  proMyJobs,
  proJobMessages,
  proSendJobMessage,
  type ProJob,
  type JobStatus,
} from "@/lib/jobs";

export const Route = createFileRoute("/my-jobs")({
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

const STATUS_BADGE: Record<JobStatus, { label: string; cls: string }> = {
  open: { label: "Quoted", cls: "bg-[#E1F5EE] text-primary" },
  hired: { label: "Hired", cls: "bg-blue-100 text-blue-700" },
  in_progress: { label: "In progress", cls: "bg-amber-100 text-amber-800" },
  completed: { label: "Completed", cls: "bg-muted text-muted-foreground" },
  closed: { label: "Completed", cls: "bg-muted text-muted-foreground" },
  cancelled: { label: "Cancelled", cls: "bg-destructive/10 text-destructive" },
};

function MyJobsPage() {
  const jobsQ = useQuery({ queryKey: ["pro-my-jobs"], queryFn: proMyJobs, retry: false });
  const [stage, setStage] = useState<Stage>("active");

  const jobs = jobsQ.data ?? [];
  const stageOf = (j: ProJob) => STAGE_OF[j.status ?? "open"];
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
                <ProJobCard key={j.id} job={j} />
              ))}
            </div>
          )}
        </div>
      )}
    </ProShell>
  );
}

function ProJobCard({ job }: { job: ProJob }) {
  const badge = STATUS_BADGE[job.status ?? "open"];
  const [chatOpen, setChatOpen] = useState(false);
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-foreground">{job.title}</h3>
          <Badge className={`rounded-full border-0 ${badge.cls}`}>{badge.label}</Badge>
          {job.hired && (
            <Badge className="rounded-full border-0 bg-blue-100 text-blue-700">
              <BadgeCheck className="mr-1 h-3.5 w-3.5" /> They hired you
            </Badge>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{job.categoryName}</span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {job.postcode}
            {job.distanceMiles != null && ` · ${job.distanceMiles} mi`}
          </span>
          {job.budget && <span>{job.budget}</span>}
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> Posted {timeAgo(job.createdAt)}
          </span>
        </div>

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
      </CardContent>
    </Card>
  );
}
