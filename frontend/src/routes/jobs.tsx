import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Loader2,
  MapPin,
  ArrowLeft,
  Lock,
  Mail,
  Phone,
  Sparkles,
} from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { Badge, Button, Card, CardContent } from "@/components/shared";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { getAccount } from "@/lib/billing";
import { getCategories } from "@/lib/categories";
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
  const auth = useRequireAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [radius, setRadius] = useState(25);
  const [category, setCategory] = useState("");

  const accountQ = useQuery({ queryKey: ["account"], queryFn: getAccount, retry: false });
  const categoriesQ = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const jobsQ = useQuery({
    queryKey: ["pro-jobs", radius, category],
    queryFn: () => proBrowseJobs({ radius, category: category || undefined }),
    retry: false,
    enabled: !!auth.data,
  });

  const unlock = useMutation({
    mutationFn: (id: string) => proUnlockJob(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pro-jobs"] }),
  });

  if (!auth.data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  const isActive = !!accountQ.data?.isActive;
  const jobs = jobsQ.data ?? [];

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <LogoMark className="h-8 w-8" />
            <span className="text-lg font-bold tracking-tight text-foreground font-display">
              SelfeConnect
            </span>
          </div>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="text-2xl font-bold text-foreground font-display">Find work</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Open jobs in your service categories, nearest first.
        </p>

        {!isActive && (
          <div className="mt-5 flex flex-col gap-2 rounded-2xl border border-primary/30 bg-[#E1F5EE] p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" /> Subscribe to unlock customer
              contact details and win more work.
            </p>
            <Button
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => navigate({ to: "/account" })}
            >
              Activate subscription
            </Button>
          </div>
        )}

        {/* Filters */}
        <div className="mt-6 flex flex-wrap gap-3">
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
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
            >
              <option value="">All my services</option>
              {(categoriesQ.data ?? []).map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
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
      </div>
    </main>
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
          <Button
            variant="outline"
            className="mt-4 rounded-xl"
            onClick={onSubscribe}
          >
            <Lock className="mr-2 h-4 w-4" /> Subscribe to unlock
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
