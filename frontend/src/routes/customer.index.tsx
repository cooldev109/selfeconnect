import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Loader2,
  Plus,
  MapPin,
  Trash2,
  Pencil,
  Check,
  Star,
  Clock,
  Users,
  Play,
  CircleCheck,
  X,
  MessageSquare,
} from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { Badge, Button, Card, CardContent } from "@/components/shared";
import { CustomerShell } from "@/components/CustomerShell";
import { ChatThread } from "@/components/ChatThread";
import {
  listMyJobs,
  updateJob,
  deleteJob,
  jobInterestedPros,
  jobQuotes,
  jobThreads,
  jobMessages,
  sendJobMessage,
  type Job,
  type JobStatus,
} from "@/lib/jobs";

function fmtGbp(pence: number) {
  const p = pence / 100;
  return `£${p % 1 === 0 ? p.toFixed(0) : p.toFixed(2)}`;
}

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

// Which tab a job lives under. `closed` is the pre-lifecycle "filled" state, so
// it sits with completed work.
const STAGE_OF: Record<JobStatus, Stage> = {
  open: "active",
  hired: "active",
  in_progress: "active",
  completed: "completed",
  closed: "completed",
  cancelled: "cancelled",
};

const STATUS_BADGE: Record<JobStatus, { label: string; cls: string }> = {
  open: { label: "Open", cls: "bg-[#E1F5EE] text-primary" },
  hired: { label: "Hired", cls: "bg-blue-100 text-blue-700" },
  in_progress: { label: "In progress", cls: "bg-amber-100 text-amber-800" },
  completed: { label: "Completed", cls: "bg-muted text-muted-foreground" },
  closed: { label: "Completed", cls: "bg-muted text-muted-foreground" },
  cancelled: { label: "Cancelled", cls: "bg-destructive/10 text-destructive" },
};

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
                <JobCard key={j.id} job={j} />
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

function JobMeta({ job }: { job: Job }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">{job.categoryName}</span>
      <span className="inline-flex items-center gap-1">
        <MapPin className="h-3.5 w-3.5" /> {job.postcode}
      </span>
      {job.budget && <span>{job.budget}</span>}
      <span className="inline-flex items-center gap-1">
        <Clock className="h-3.5 w-3.5" /> Posted {timeAgo(job.createdAt)}
      </span>
    </div>
  );
}

// "3 of 10 professionals have been in touch" — so the customer knows how much of
// their quote limit is used, and whether to raise it.
function QuoteUsage({ job }: { job: Job }) {
  const limit = job.maxContacts;
  return (
    <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-secondary/60 px-2.5 py-1 text-xs text-muted-foreground">
      <Users className="h-3.5 w-3.5 text-primary" />
      {limit == null ? (
        <span>
          <span className="font-semibold text-foreground">{job.contactCount}</span> professional
          {job.contactCount === 1 ? "" : "s"} in touch · no limit
        </span>
      ) : (
        <span>
          <span className="font-semibold text-foreground">
            {job.contactCount} of {limit}
          </span>{" "}
          professionals in touch
          {job.contactCount >= limit && " · limit reached"}
        </span>
      )}
    </div>
  );
}

// A single job, rendered with the actions available at its lifecycle stage.
function JobCard({ job }: { job: Job }) {
  const qc = useQueryClient();
  const [picking, setPicking] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const done = () => qc.invalidateQueries({ queryKey: ["my-jobs"] });

  const interestedQ = useQuery({
    queryKey: ["job-interested", job.id],
    queryFn: () => jobInterestedPros(job.id),
    enabled: picking,
  });
  // Quotes are shown inline on an open job so the customer can compare and hire.
  const quotesQ = useQuery({
    queryKey: ["job-quotes", job.id],
    queryFn: () => jobQuotes(job.id),
    enabled: job.status === "open",
  });
  // Chat threads — available while the job is active (someone's engaged).
  const [chatWith, setChatWith] = useState<string | null>(null);
  const threadsQ = useQuery({
    queryKey: ["job-threads", job.id],
    queryFn: () => jobThreads(job.id),
    enabled: STAGE_OF[job.status] === "active",
    refetchInterval: 8000,
  });
  const hire = useMutation({
    mutationFn: (publicId: string | null) =>
      updateJob(job.id, { status: "hired", hiredDriverPublicId: publicId }),
    onSuccess: () => {
      setPicking(false);
      done();
    },
  });
  const advance = useMutation({
    mutationFn: (status: JobStatus) => updateJob(job.id, { status }),
    onSuccess: done,
  });
  const cancel = useMutation({
    mutationFn: () =>
      updateJob(job.id, { status: "cancelled", cancelReason: reason.trim() || undefined }),
    onSuccess: () => {
      setCancelling(false);
      done();
    },
  });
  const remove = useMutation({
    mutationFn: () => deleteJob(job.id),
    onSuccess: done,
  });

  const pros = interestedQ.data ?? [];
  const badge = STATUS_BADGE[job.status];
  const isActive = STAGE_OF[job.status] === "active";
  const isDone = STAGE_OF[job.status] === "completed";

  return (
    <Card className={`rounded-2xl ${isActive ? "" : "opacity-95"}`}>
      <CardContent className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-semibold text-foreground">{job.title}</h3>
              <Badge className={`rounded-full border-0 ${badge.cls}`}>{badge.label}</Badge>
            </div>
            {job.status === "open" && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{job.description}</p>
            )}
            {(job.status === "hired" || job.status === "in_progress") && job.hiredDriverName && (
              <p className="mt-1 text-sm text-muted-foreground">
                Hired <span className="font-medium text-foreground">{job.hiredDriverName}</span>
              </p>
            )}
            {job.status === "cancelled" && job.cancelReason && (
              <p className="mt-1 text-sm text-muted-foreground">Reason: {job.cancelReason}</p>
            )}
            <JobMeta job={job} />
            {job.status === "open" && <QuoteUsage job={job} />}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {job.status === "open" && (
              <>
                <Button
                  className="h-9 rounded-lg bg-primary px-3 text-xs text-primary-foreground hover:bg-primary/90"
                  onClick={() => setPicking((p) => !p)}
                >
                  <Check className="mr-1 h-3.5 w-3.5" /> I've found my professional
                </Button>
                <Link
                  to="/customer/jobs/$jobId/edit"
                  params={{ jobId: job.id }}
                  className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-xs font-medium text-foreground hover:bg-secondary"
                >
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                </Link>
              </>
            )}

            {job.status === "hired" && (
              <Button
                className="h-9 rounded-lg bg-primary px-3 text-xs text-primary-foreground hover:bg-primary/90"
                onClick={() => advance.mutate("in_progress")}
                disabled={advance.isPending}
              >
                <Play className="mr-1 h-3.5 w-3.5" /> Start work
              </Button>
            )}

            {(job.status === "hired" || job.status === "in_progress") && (
              <Button
                className="h-9 rounded-lg bg-emerald-600 px-3 text-xs text-white hover:bg-emerald-600/90"
                onClick={() => advance.mutate("completed")}
                disabled={advance.isPending}
              >
                <CircleCheck className="mr-1 h-3.5 w-3.5" /> Mark complete
              </Button>
            )}

            {isDone && job.hiredDriverPublicId && (
              <Link
                to="/customer/pros/$publicId"
                params={{ publicId: job.hiredDriverPublicId }}
                search={{ review: "1", jobId: job.id }}
                className="inline-flex h-9 items-center rounded-lg bg-amber-400 px-3 text-xs font-semibold text-amber-950 hover:bg-amber-400/90"
              >
                <Star className="mr-1 h-3.5 w-3.5" /> Leave a review
              </Link>
            )}

            {isActive && (
              <Button
                variant="outline"
                className="h-9 rounded-lg px-3 text-xs text-muted-foreground"
                onClick={() => setCancelling((c) => !c)}
              >
                <X className="mr-1 h-3.5 w-3.5" /> Cancel
              </Button>
            )}

            {!isActive && (
              <Button
                variant="outline"
                className="h-9 rounded-lg border-destructive/30 px-3 text-xs text-destructive hover:bg-destructive/10"
                onClick={() => remove.mutate()}
                disabled={remove.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Quotes received — compare and hire directly (open jobs). */}
        {job.status === "open" && (quotesQ.data?.length ?? 0) > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {quotesQ.data!.length} quote{quotesQ.data!.length === 1 ? "" : "s"} received
            </p>
            {quotesQ.data!.map((q) => (
              <div key={q.publicId} className="rounded-xl border border-border bg-secondary/30 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {q.company || q.name}
                      {q.amount != null && (
                        <span className="ml-2 font-display font-bold text-primary">
                          {fmtGbp(q.amount)}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {q.categories.join(" · ")}
                      {q.distanceMiles != null && ` · ${q.distanceMiles} mi away`}
                    </p>
                  </div>
                  <Button
                    className="h-8 shrink-0 rounded-lg bg-primary px-3 text-xs text-primary-foreground hover:bg-primary/90"
                    onClick={() => hire.mutate(q.publicId)}
                    disabled={hire.isPending}
                  >
                    <Check className="mr-1 h-3.5 w-3.5" /> Hire
                  </Button>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm text-foreground/90">{q.message}</p>
              </div>
            ))}
          </div>
        )}

        {/* Messages — chat with each engaged professional about this job. */}
        {STAGE_OF[job.status] === "active" && (threadsQ.data?.length ?? 0) > 0 && (
          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Messages
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {threadsQ.data!.map((th) => {
                const active = chatWith === th.publicId;
                return (
                  <button
                    key={th.publicId}
                    type="button"
                    onClick={() => setChatWith(active ? null : th.publicId)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                      active
                        ? "border-primary bg-[#E1F5EE] text-primary"
                        : "border-border text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    {th.company || th.name}
                    {th.unread > 0 && (
                      <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                        {th.unread}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {chatWith && (
              <div className="mt-2">
                <ChatThread
                  queryKey={["job-thread", job.id, chatWith]}
                  fetchMessages={() => jobMessages(job.id, chatWith)}
                  sendMessage={(b) => sendJobMessage(job.id, chatWith, b)}
                  isMine={(m) => m.fromCustomer}
                  onActivity={() => threadsQ.refetch()}
                  placeholder="Message the professional…"
                />
              </div>
            )}
          </div>
        )}

        {/* Pick the hired professional (open → hired). */}
        {picking && (
          <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-4">
            <p className="text-sm font-medium text-foreground">Which professional did you hire?</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              This moves the job to Hired so you can track it through to done.
            </p>
            {interestedQ.isLoading ? (
              <div className="mt-3 flex justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {pros.map((p) => (
                  <button
                    key={p.publicId}
                    type="button"
                    disabled={hire.isPending}
                    onClick={() => hire.mutate(p.publicId)}
                    className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-left text-sm transition hover:border-primary"
                  >
                    <span>
                      <span className="font-medium text-foreground">{p.company || p.name}</span>
                      {p.categories.length > 0 && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {p.categories.join(" · ")}
                        </span>
                      )}
                    </span>
                    <Check className="h-4 w-4 text-primary" />
                  </button>
                ))}
                <button
                  type="button"
                  disabled={hire.isPending}
                  onClick={() => hire.mutate(null)}
                  className="w-full rounded-lg border border-dashed border-border px-3 py-2 text-left text-sm text-muted-foreground transition hover:border-primary hover:text-foreground"
                >
                  {pros.length === 0
                    ? "Just mark this job as hired"
                    : "Someone else / hired off-platform"}
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => setPicking(false)}
              className="mt-3 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Cancel the job (open / hired / in_progress → cancelled). */}
        {cancelling && (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm font-medium text-foreground">Cancel this job?</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (optional) — e.g. no longer needed"
              rows={2}
              maxLength={300}
              className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
            <div className="mt-2 flex gap-2">
              <Button
                className="h-9 rounded-lg bg-destructive px-3 text-xs text-destructive-foreground hover:bg-destructive/90"
                onClick={() => cancel.mutate()}
                disabled={cancel.isPending}
              >
                {cancel.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Cancel job"}
              </Button>
              <button
                type="button"
                onClick={() => setCancelling(false)}
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Keep job
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
