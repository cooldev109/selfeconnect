import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, ChevronRight, MessageSquare, FileText } from "lucide-react";
import { Card, CardContent, Button } from "@/components/shared";
import { CustomerShell } from "@/components/CustomerShell";
import { JobStatusBadge } from "@/components/JobStatusBadge";
import { JobMeta, STAGE_OF } from "@/components/JobWorkspace";
import { listMyJobs, jobQuotes, jobThreads, type Job } from "@/lib/jobs";

export const Route = createFileRoute("/customer/")({
  head: () => ({
    meta: [
      { title: "My jobs — SelfeConnect" },
      { name: "description", content: "Manage your jobs and find professionals." },
    ],
  }),
  component: CustomerHome,
});

type Stage = "active" | "completed" | "cancelled";

function CustomerHome() {
  const navigate = useNavigate();
  const jobsQ = useQuery({ queryKey: ["my-jobs"], queryFn: listMyJobs, retry: false });
  const [stage, setStage] = useState<Stage>("active");

  const jobs = jobsQ.data ?? [];
  const counts: Record<Stage, number> = {
    active: jobs.filter((j) => STAGE_OF[j.status] === "active").length,
    completed: jobs.filter((j) => STAGE_OF[j.status] === "completed").length,
    cancelled: jobs.filter((j) => STAGE_OF[j.status] === "cancelled").length,
  };
  const shown = jobs.filter((j) => STAGE_OF[j.status] === stage);

  const tabs: { key: Stage; label: string }[] = [
    { key: "active", label: "Active" },
    { key: "completed", label: "Completed" },
    ...(counts.cancelled > 0 ? [{ key: "cancelled" as Stage, label: "Cancelled" }] : []),
  ];

  return (
    <CustomerShell
      title="My jobs"
      subtitle={`${counts.active} active · ${counts.completed} completed`}
      actions={
        <Button
          className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => navigate({ to: "/customer/jobs/new" })}
        >
          <Plus className="mr-2 h-4 w-4" /> Post a job
        </Button>
      }
    >
      {jobsQ.isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : jobs.length === 0 ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
            <p className="text-sm text-muted-foreground">You haven't posted any jobs yet.</p>
            <Button
              className="mt-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => navigate({ to: "/customer/jobs/new" })}
            >
              <Plus className="mr-2 h-4 w-4" /> Post your first job
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {/* Stage tabs */}
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
            <EmptyLine>
              {stage === "active"
                ? "No active jobs. Post one to start hearing from professionals."
                : stage === "completed"
                  ? "No completed jobs yet."
                  : "No cancelled jobs."}
            </EmptyLine>
          ) : (
            <div className="space-y-3">
              {shown.map((j) => (
                <JobSummaryRow key={j.id} job={j} />
              ))}
            </div>
          )}
        </div>
      )}
    </CustomerShell>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return (
    <Card className="rounded-2xl border-dashed">
      <CardContent className="p-6 text-center text-sm text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  );
}

// A compact, clickable summary of one job. Opens the full job page. Quote/unread
// counts are surfaced here so the customer knows which jobs need attention
// without opening each one.
function JobSummaryRow({ job }: { job: Job }) {
  const isActive = STAGE_OF[job.status] === "active";
  const quotesQ = useQuery({
    queryKey: ["job-quotes", job.id],
    queryFn: () => jobQuotes(job.id),
    enabled: job.status === "open",
  });
  const threadsQ = useQuery({
    queryKey: ["job-threads", job.id],
    queryFn: () => jobThreads(job.id),
    enabled: isActive,
    refetchInterval: 8000,
  });
  const quoteCount = quotesQ.data?.length ?? 0;
  const unread = (threadsQ.data ?? []).reduce((n, t) => n + t.unread, 0);

  return (
    <Link
      to="/customer/jobs/$jobId"
      params={{ jobId: job.id }}
      className="block focus:outline-none"
    >
      <Card className="rounded-2xl transition hover:border-primary/40 hover:shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate font-semibold text-foreground">{job.title}</h3>
                <JobStatusBadge status={job.status} />
              </div>
              {job.status === "open" && (
                <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{job.description}</p>
              )}
              {(job.status === "hired" || job.status === "in_progress") && job.hiredDriverName && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Hired <span className="font-medium text-foreground">{job.hiredDriverName}</span>
                </p>
              )}
              {job.status === "cancelled" && job.cancelReason && (
                <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                  Reason: {job.cancelReason}
                </p>
              )}
              <JobMeta job={job} />
              {(quoteCount > 0 || unread > 0) && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {job.status === "open" && quoteCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-foreground">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      {quoteCount} quote{quoteCount === 1 ? "" : "s"}
                    </span>
                  )}
                  {unread > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {unread} new message{unread === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
              )}
            </div>
            <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
