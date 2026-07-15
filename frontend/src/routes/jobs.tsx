import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Loader2, MapPin, Lock, Mail, Phone, Sparkles, Clock } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { Badge, Button, Card, CardContent } from "@/components/shared";
import { ProShell } from "@/components/ProShell";
import { CategorySelect } from "@/components/CategoryPicker";
import { getAccount } from "@/lib/billing";
import { useTips } from "@/hooks/useTips";
import { proBrowseJobs, proUnlockJob, type ProJob } from "@/lib/jobs";

export const Route = createFileRoute("/jobs")({
  head: () => ({
    meta: [
      { title: "Find work — SelfeConnect" },
      { name: "description", content: "Browse nearby jobs in your categories." },
    ],
  }),
  component: JobBoard,
});

const RADII = [5, 10, 25, 50, 100];

function JobBoard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [radius, setRadius] = useState(25);
  const [category, setCategory] = useState("");

  const accountQ = useQuery({ queryKey: ["account"], queryFn: getAccount, retry: false });
  const { total, avgRating, tips } = useTips();
  const jobsQ = useQuery({
    queryKey: ["pro-jobs", radius, category],
    queryFn: () => proBrowseJobs({ radius, category: category || undefined }),
    retry: false,
  });

  const unlock = useMutation({
    mutationFn: (id: string) => proUnlockJob(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pro-jobs"] }),
  });

  const isActive = !!accountQ.data?.isActive;
  const jobs = jobsQ.data ?? [];

  return (
    <ProShell
      title="Find work"
      subtitle="Open jobs in your service categories, nearest first."
    >
      {!isActive && (
        <div className="mb-5 flex flex-col gap-2 rounded-2xl border border-primary/30 bg-[#E1F5EE] p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" /> Subscribe to unlock customer contact
            details and win more work.
          </p>
          <Button
            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => navigate({ to: "/account" })}
          >
            Activate subscription
          </Button>
        </div>
      )}

      {/* Secondary: tips summary strip (a bonus on top of won work) */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat label="Tips received" value={`£${total.toFixed(2)}`} />
        <Stat label="Avg rating" value={tips.length ? avgRating.toFixed(1) : "—"} />
        <Stat label="Jobs nearby" value={String(jobs.length)} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Within</span>
          <select
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
          >
            {RADII.map((r) => (
              <option key={r} value={r}>
                {r} miles
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Category</span>
          <div className="w-52">
            <CategorySelect
              value={category}
              onChange={setCategory}
              allLabel="All my services"
            />
          </div>
        </label>
      </div>

      {/* Results */}
      {jobsQ.isLoading ? (
        <div className="mt-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : jobs.length === 0 ? (
        <Card className="mt-6 rounded-2xl border-dashed">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No open jobs match your filters right now. Try a wider radius or a
            different category.
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 space-y-3">
          {jobs.map((j) => (
            <JobCard
              key={j.id}
              job={j}
              isActive={isActive}
              unlocking={unlock.isPending && unlock.variables === j.id}
              onUnlock={() => unlock.mutate(j.id)}
              onSubscribe={() => navigate({ to: "/account" })}
            />
          ))}
        </div>
      )}
    </ProShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}

function JobCard({
  job,
  isActive,
  unlocking,
  onUnlock,
  onSubscribe,
}: {
  job: ProJob;
  isActive: boolean;
  unlocking: boolean;
  onUnlock: () => void;
  onSubscribe: () => void;
}) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="font-semibold text-foreground">{job.title}</h3>
          {job.distanceMiles != null && (
            <Badge className="rounded-full bg-secondary text-muted-foreground hover:bg-secondary">
              <MapPin className="mr-1 h-3.5 w-3.5" /> {job.distanceMiles} mi
            </Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{job.description}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{job.categoryName}</span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {job.postcode}
          </span>
          {job.budget && <span>{job.budget}</span>}
          {job.workingHours && <span>{job.workingHours}</span>}
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> Posted {timeAgo(job.createdAt)}
          </span>
        </div>

        {job.unlocked && job.contact ? (
          <div className="mt-4 rounded-xl border border-primary/20 bg-[#E1F5EE]/50 p-3 text-sm">
            <p className="font-semibold text-foreground">{job.contact.name}</p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
              <a
                href={`mailto:${job.contact.email}`}
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <Mail className="h-3.5 w-3.5" /> {job.contact.email}
              </a>
              {job.contact.phone && (
                <a
                  href={`tel:${job.contact.phone}`}
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <Phone className="h-3.5 w-3.5" /> {job.contact.phone}
                </a>
              )}
            </div>
            {job.contact.addressLine && (
              <p className="mt-1 text-muted-foreground">{job.contact.addressLine}</p>
            )}
          </div>
        ) : job.quotesFull ? (
          // The customer capped how many pros can reach them, and it's reached.
          <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/50 px-3 py-2 text-sm font-medium text-muted-foreground">
            <Lock className="h-4 w-4" /> Quotes full — this customer has enough
            responses
          </div>
        ) : isActive ? (
          <Button
            className="mt-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={onUnlock}
            disabled={unlocking}
          >
            {unlocking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Unlocking…
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" /> Unlock contact
              </>
            )}
          </Button>
        ) : (
          <Button variant="outline" className="mt-4 rounded-xl" onClick={onSubscribe}>
            <Lock className="mr-2 h-4 w-4" /> Subscribe to unlock
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
