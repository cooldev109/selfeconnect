import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Plus,
  ChevronRight,
  MessageSquare,
  FileText,
  Briefcase,
  CheckCircle2,
  UserCheck,
  Search,
} from "lucide-react";
import { Button } from "@/components/shared";
import { CustomerShell } from "@/components/CustomerShell";
import { StatCard, DashCard, EmptyRow } from "@/components/DashKit";
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
  const openCount = jobs.filter((j) => j.status === "open").length;
  const hiredCount = jobs.filter((j) => j.hiredDriverName).length;
  const shown = jobs.filter((j) => STAGE_OF[j.status] === stage);

  const tabs: { key: Stage; label: string }[] = [
    { key: "active", label: "Active" },
    { key: "completed", label: "Completed" },
    ...(counts.cancelled > 0 ? [{ key: "cancelled" as Stage, label: "Cancelled" }] : []),
  ];

  const postJob = () => navigate({ to: "/customer/jobs/new" });

  return (
    <CustomerShell
      title="My jobs"
      subtitle={`${counts.active} active · ${counts.completed} completed`}
      actions={
        <Button
          className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={postJob}
        >
          <Plus className="mr-2 h-4 w-4" /> Post a job
        </Button>
      }
    >
      {jobsQ.isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : jobs.length === 0 ? (
        <DashCard>
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <Briefcase className="h-6 w-6" />
            </span>
            <p className="mt-1 text-sm font-semibold text-foreground">No jobs yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Post a job and start hearing from trusted local professionals within minutes.
            </p>
            <Button className="mt-3 rounded-xl" onClick={postJob}>
              <Plus className="mr-2 h-4 w-4" /> Post your first job
            </Button>
          </div>
        </DashCard>
      ) : (
        <div className="space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard icon={Briefcase} label="Active jobs" value={counts.active} foot="in progress or open" />
            <StatCard
              icon={FileText}
              label="Awaiting quotes"
              value={openCount}
              tone="bg-sky-100 text-sky-600"
              foot="open for professionals"
            />
            <StatCard
              icon={UserCheck}
              label="Pros hired"
              value={hiredCount}
              tone="bg-violet-100 text-violet-600"
              foot="across all jobs"
            />
            <StatCard
              icon={CheckCircle2}
              label="Completed"
              value={counts.completed}
              tone="bg-primary-soft text-primary"
              foot="finished jobs"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            {/* Job list */}
            <DashCard
              title="Your jobs"
              action={
                <div className="flex flex-wrap gap-1.5" role="tablist">
                  {tabs.map((t) => {
                    const active = stage === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setStage(t.key)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
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
              }
              bodyClassName="p-0"
            >
              {shown.length === 0 ? (
                <EmptyRow>
                  {stage === "active"
                    ? "No active jobs. Post one to start hearing from professionals."
                    : stage === "completed"
                      ? "No completed jobs yet."
                      : "No cancelled jobs."}
                </EmptyRow>
              ) : (
                <div>
                  {shown.map((j) => (
                    <JobSummaryRow key={j.id} job={j} />
                  ))}
                </div>
              )}
            </DashCard>

            {/* Quick actions */}
            <aside className="space-y-4">
              <DashCard title="Need something done?">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Post the details once and let local professionals come to you with quotes.
                </p>
                <Button className="mt-4 w-full justify-center rounded-xl" onClick={postJob}>
                  <Plus className="mr-1.5 h-4 w-4" /> Post a job
                </Button>
              </DashCard>
              <DashCard title="Prefer to browse?">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Search verified professionals near you and reach out directly.
                </p>
                <Button
                  asChild
                  variant="outline"
                  className="mt-4 w-full justify-center rounded-xl"
                >
                  <Link to="/customer/search">
                    <Search className="mr-1.5 h-4 w-4" /> Find a professional
                  </Link>
                </Button>
              </DashCard>
            </aside>
          </div>
        </div>
      )}
    </CustomerShell>
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
      className="flex items-start justify-between gap-3 border-b border-border/50 px-5 py-4 transition last:border-0 hover:bg-secondary/50 focus:outline-none"
    >
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
    </Link>
  );
}
