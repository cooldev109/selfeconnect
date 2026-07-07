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
  BadgeCheck,
  Star,
} from "lucide-react";
import { Badge, Button, Card, CardContent } from "@/components/shared";
import { CustomerShell } from "@/components/CustomerShell";
import {
  listMyJobs,
  updateJob,
  deleteJob,
  jobInterestedPros,
  type Job,
} from "@/lib/jobs";

export const Route = createFileRoute("/customer/")({
  head: () => ({
    meta: [
      { title: "My jobs — SelfeConnect" },
      { name: "description", content: "Manage your jobs and find professionals." },
    ],
  }),
  component: CustomerHome,
});

function CustomerHome() {
  const navigate = useNavigate();
  const jobsQ = useQuery({ queryKey: ["my-jobs"], queryFn: listMyJobs, retry: false });

  const jobs = jobsQ.data ?? [];
  const open = jobs.filter((j) => j.status === "open");
  const history = jobs.filter((j) => j.status === "closed");

  return (
    <CustomerShell
      title="My jobs"
      subtitle={`${open.length} open · ${history.length} completed`}
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
            <p className="text-sm text-muted-foreground">
              You haven't posted any jobs yet.
            </p>
            <Button
              className="mt-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => navigate({ to: "/customer/jobs/new" })}
            >
              <Plus className="mr-2 h-4 w-4" /> Post your first job
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          <Section title="Open">
            {open.length === 0 ? (
              <EmptyLine>No open jobs. Post one to start hearing from pros.</EmptyLine>
            ) : (
              open.map((j) => <OpenJobCard key={j.id} job={j} />)
            )}
          </Section>

          {history.length > 0 && (
            <Section title="History">
              {history.map((j) => (
                <HistoryJobCard key={j.id} job={j} />
              ))}
            </Section>
          )}
        </div>
      )}
    </CustomerShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="space-y-3">{children}</div>
    </div>
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
    </div>
  );
}

function OpenJobCard({ job }: { job: Job }) {
  const qc = useQueryClient();
  const [picking, setPicking] = useState(false);

  const interestedQ = useQuery({
    queryKey: ["job-interested", job.id],
    queryFn: () => jobInterestedPros(job.id),
    enabled: picking,
  });

  const fill = useMutation({
    mutationFn: (hiredDriverPublicId: string | null) =>
      updateJob(job.id, { status: "closed", hiredDriverPublicId }),
    onSuccess: () => {
      setPicking(false);
      qc.invalidateQueries({ queryKey: ["my-jobs"] });
    },
  });
  const remove = useMutation({
    mutationFn: () => deleteJob(job.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-jobs"] }),
  });

  const pros = interestedQ.data ?? [];

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-semibold text-foreground">{job.title}</h3>
              <Badge className="rounded-full bg-[#E1F5EE] text-primary hover:bg-[#E1F5EE]">
                Open
              </Badge>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {job.description}
            </p>
            <JobMeta job={job} />
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
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
            <Button
              variant="outline"
              className="h-9 rounded-lg border-destructive/30 px-3 text-xs text-destructive hover:bg-destructive/10"
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {picking && (
          <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-4">
            <p className="text-sm font-medium text-foreground">
              Which professional did you hire?
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              This closes the job and moves it to your history.
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
                    disabled={fill.isPending}
                    onClick={() => fill.mutate(p.publicId)}
                    className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-left text-sm transition hover:border-primary"
                  >
                    <span>
                      <span className="font-medium text-foreground">
                        {p.company || p.name}
                      </span>
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
                  disabled={fill.isPending}
                  onClick={() => fill.mutate(null)}
                  className="w-full rounded-lg border border-dashed border-border px-3 py-2 text-left text-sm text-muted-foreground transition hover:border-primary hover:text-foreground"
                >
                  {pros.length === 0
                    ? "Just mark this job as filled"
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
      </CardContent>
    </Card>
  );
}

function HistoryJobCard({ job }: { job: Job }) {
  const qc = useQueryClient();
  const reopen = useMutation({
    mutationFn: () => updateJob(job.id, { status: "open" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-jobs"] }),
  });
  const remove = useMutation({
    mutationFn: () => deleteJob(job.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-jobs"] }),
  });

  return (
    <Card className="rounded-2xl opacity-90">
      <CardContent className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-semibold text-foreground">{job.title}</h3>
              <Badge className="rounded-full bg-muted text-muted-foreground hover:bg-muted">
                {job.hiredDriverName ? (
                  <>
                    <BadgeCheck className="mr-1 h-3.5 w-3.5" /> Hired{" "}
                    {job.hiredDriverName}
                  </>
                ) : (
                  "Filled"
                )}
              </Badge>
            </div>
            <JobMeta job={job} />
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {job.hiredDriverPublicId && (
              <Link
                to="/customer/pros/$publicId"
                params={{ publicId: job.hiredDriverPublicId }}
                search={{ review: "1", jobId: job.id }}
                className="inline-flex h-9 items-center rounded-lg bg-amber-400 px-3 text-xs font-semibold text-amber-950 hover:bg-amber-400/90"
              >
                <Star className="mr-1 h-3.5 w-3.5" /> Leave a review
              </Link>
            )}
            <Button
              variant="outline"
              className="h-9 rounded-lg px-3 text-xs"
              onClick={() => reopen.mutate()}
              disabled={reopen.isPending}
            >
              Reopen
            </Button>
            <Button
              variant="outline"
              className="h-9 rounded-lg border-destructive/30 px-3 text-xs text-destructive hover:bg-destructive/10"
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
