import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Loader2,
  MapPin,
  Lock,
  Sparkles,
  Clock,
  Briefcase,
  Send,
  Bell,
  QrCode,
  ArrowRight,
  X,
} from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { ContactActions } from "@/components/ContactActions";
import { JobPhotos } from "@/components/JobPhotos";
import { Button, Input, Modal } from "@/components/shared";
import { ProShell } from "@/components/ProShell";
import { StatCard, DashCard, EmptyRow } from "@/components/DashKit";
import { CategorySelect } from "@/components/CategoryPicker";
import { getAccount } from "@/lib/billing";
import { proBrowseJobs, proUnlockJob, proSubmitQuote, proDismissJob, type ProJob } from "@/lib/jobs";

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
const isNew = (iso: string) => Date.now() - +new Date(iso) < 24 * 60 * 60 * 1000;

function fmtGbp(pence: number) {
  const p = pence / 100;
  return `£${p % 1 === 0 ? p.toFixed(0) : p.toFixed(2)}`;
}

function JobBoard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [radius, setRadius] = useState(25);
  const [category, setCategory] = useState("");

  const accountQ = useQuery({ queryKey: ["account"], queryFn: getAccount, retry: false });
  const jobsQ = useQuery({
    queryKey: ["pro-jobs", radius, category],
    // radius 0 = "Anywhere": omit the radius so every job in the pro's trades
    // shows, however far away (still newest first).
    queryFn: () => proBrowseJobs({ radius: radius > 0 ? radius : undefined, category: category || undefined }),
    retry: false,
  });

  const unlock = useMutation({
    mutationFn: (id: string) => proUnlockJob(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pro-jobs"] }),
  });
  const quote = useMutation({
    mutationFn: (v: { id: string; amount: number | null; message: string }) =>
      proSubmitQuote(v.id, { amount: v.amount, message: v.message }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pro-jobs"] }),
  });

  // "Not interested" — confirm, then hide the job from this pro's board.
  const [dismissing, setDismissing] = useState<ProJob | null>(null);
  const dismiss = useMutation({
    mutationFn: (id: string) => proDismissJob(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pro-jobs"] });
      setDismissing(null);
    },
  });

  const isActive = !!accountQ.data?.isActive;
  const jobs = jobsQ.data ?? [];
  const newToday = jobs.filter((j) => isNew(j.createdAt)).length;

  return (
    <ProShell title="Find work" subtitle="Find local jobs that match your skills and send quotes.">
      {!isActive && (
        <div className="mb-5 flex flex-col gap-2 rounded-2xl border border-primary/30 bg-primary-soft p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm font-medium text-primary-hover">
            <Sparkles className="h-4 w-4" /> Subscribe to unlock customer contact details and win
            more work.
          </p>
          <Button
            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => navigate({ to: "/account" })}
          >
            Activate subscription
          </Button>
        </div>
      )}

      <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-6">
        {/* Main column */}
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={Briefcase} label="Jobs available" value={jobs.length} foot="In your categories" />
            <StatCard
              icon={Sparkles}
              label="New today"
              value={newToday}
              tone="bg-amber-100 text-amber-600"
              foot={newToday > 0 ? "Fresh opportunities" : "Check back soon"}
              footTone={newToday > 0 ? "text-primary" : "text-muted-foreground"}
            />
            <StatCard
              icon={MapPin}
              label="Search radius"
              value={radius > 0 ? `${radius} mi` : "Anywhere"}
              tone="bg-sky-100 text-sky-600"
              foot="Newest first"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-card p-3 shadow-soft">
            <div className="min-w-[12rem] flex-1">
              <CategorySelect value={category} onChange={setCategory} allLabel="All my services" />
            </div>
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
              aria-label="Search radius"
            >
              {RADII.map((r) => (
                <option key={r} value={r}>
                  Within {r} miles
                </option>
              ))}
              <option value={0}>Anywhere</option>
            </select>
          </div>

          {/* Results */}
          {jobsQ.isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : jobs.length === 0 ? (
            <DashCard bodyClassName="p-10">
              <EmptyRow>
                No open jobs match your filters right now. Try a wider radius or a different category.
              </EmptyRow>
            </DashCard>
          ) : (
            <div className="space-y-3">
              {jobs.map((j) => (
                <JobCard
                  key={j.id}
                  job={j}
                  isActive={isActive}
                  unlocking={unlock.isPending && unlock.variables === j.id}
                  quoting={quote.isPending && quote.variables?.id === j.id}
                  onUnlock={() => unlock.mutate(j.id)}
                  onQuote={(amount, message) => quote.mutate({ id: j.id, amount, message })}
                  onSubscribe={() => navigate({ to: "/account" })}
                  onDismiss={() => setDismissing(j)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="mt-4 space-y-4 lg:mt-0">
          <DashCard title="Your search area">
            <div className="flex flex-col items-center py-2 text-center">
              <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-primary-soft">
                <span className="absolute h-16 w-16 rounded-full bg-primary/20" />
                <MapPin className="relative h-6 w-6 text-primary" />
              </span>
              <p className="mt-3 text-sm font-semibold text-foreground">
                {radius > 0 ? `Within ${radius} miles` : "Jobs anywhere"}
              </p>
              <p className="text-xs text-muted-foreground">Showing the newest jobs first.</p>
            </div>
          </DashCard>

          <DashCard title="Job alerts">
            <p className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Bell className="h-4 w-4" />
              </span>
              Get notified by email when new jobs match your trades and area.
            </p>
            <Link
              to="/account"
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              Manage alerts <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </DashCard>

          <DashCard title="Get more work">
            <p className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <QrCode className="h-4 w-4" />
              </span>
              Share your profile &amp; QR code so past customers can find you and send job requests.
            </p>
            <Link
              to="/profile"
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              View my profile &amp; QR <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </DashCard>
        </aside>
      </div>

      <Modal
        open={!!dismissing}
        onOpenChange={(o) => { if (!o) setDismissing(null); }}
        title="Not interested in this job?"
      >
        <p className="text-sm text-muted-foreground">
          Are you sure you're not interested in this job? It'll be removed from your board
          {dismissing ? <> — “<span className="font-medium text-foreground">{dismissing.title}</span>”</> : null}.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => setDismissing(null)}>
            Cancel
          </Button>
          <Button
            className="rounded-xl"
            disabled={dismiss.isPending}
            onClick={() => dismissing && dismiss.mutate(dismissing.id)}
          >
            {dismiss.isPending ? "Removing…" : "Yes, not interested"}
          </Button>
        </div>
      </Modal>
    </ProShell>
  );
}

function JobCard({
  job,
  isActive,
  unlocking,
  quoting,
  onUnlock,
  onQuote,
  onSubscribe,
  onDismiss,
}: {
  job: ProJob;
  isActive: boolean;
  unlocking: boolean;
  quoting: boolean;
  onUnlock: () => void;
  onQuote: (amount: number | null, message: string) => void;
  onSubscribe: () => void;
  onDismiss: () => void;
}) {
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  // Open the form pre-filled with the pro's existing quote so they can revise
  // the price/pitch after speaking with the customer (re-submitting updates it).
  const openEdit = () => {
    setAmount(job.myQuote?.amount != null ? String(job.myQuote.amount / 100) : "");
    setMessage(job.myQuote?.message ?? "");
    setQuoteOpen(true);
  };
  const submitQuote = () => {
    const trimmed = message.trim();
    if (trimmed.length < 3) return;
    const n = parseFloat(amount);
    const pence = amount.trim() && !Number.isNaN(n) ? Math.round(n * 100) : null;
    onQuote(pence, trimmed);
    setQuoteOpen(false);
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft transition hover:shadow-elevated">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <Briefcase className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {isNew(job.createdAt) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                New
              </span>
            )}
            <h3 className="truncate font-semibold text-foreground">{job.title}</h3>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{job.categoryName}</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {job.postcode}
            </span>
            {job.distanceMiles != null && <span>{job.distanceMiles} mi away</span>}
            {job.budget && <span>{job.budget}</span>}
            {job.workingHours && <span>{job.workingHours}</span>}
            {job.timing && <span>{job.timing}</span>}
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {timeAgo(job.createdAt)}
            </span>
          </div>
        </div>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{job.description}</p>
      <JobPhotos photos={job.photos} />

      {/* The quote form — shared between the pre-unlock and post-unlock states. */}
      {quoteOpen && (
        <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-3">
          <label className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">£</span>
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Your price (optional)"
              inputMode="decimal"
              maxLength={12}
              className="h-9"
            />
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Introduce yourself and what you'd do — this is your pitch."
            rows={3}
            maxLength={1000}
            className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
          <div className="mt-2 flex items-center gap-3">
            <Button
              className="h-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={submitQuote}
              disabled={quoting || message.trim().length < 3}
            >
              {quoting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…
                </>
              ) : job.myQuote ? (
                "Update quote"
              ) : (
                "Send quote"
              )}
            </Button>
            <button
              type="button"
              onClick={() => setQuoteOpen(false)}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {job.unlocked && job.contact ? (
        <div className="mt-4 rounded-xl border border-primary/20 bg-primary-soft/50 p-3 text-sm">
          <p className="font-semibold text-foreground">{job.contact.name}</p>
          <div className="mt-2">
            <ContactActions email={job.contact.email} phone={job.contact.phone} />
          </div>
          {job.contact.addressLine && (
            <p className="mt-1 text-muted-foreground">{job.contact.addressLine}</p>
          )}
          {job.myQuote ? (
            !quoteOpen && (
              <div className="mt-3 flex items-start justify-between gap-2 border-t border-primary/15 pt-2">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    Your quote
                    {job.myQuote.amount != null ? `: ${fmtGbp(job.myQuote.amount)}` : ""}
                  </span>{" "}
                  — {job.myQuote.message}
                </p>
                <button
                  type="button"
                  onClick={openEdit}
                  className="shrink-0 text-xs font-semibold text-primary hover:underline"
                >
                  Edit
                </button>
              </div>
            )
          ) : (
            !quoteOpen && (
              <button
                type="button"
                onClick={() => setQuoteOpen(true)}
                className="mt-3 text-xs font-semibold text-primary hover:underline"
              >
                + Send a quote
              </button>
            )
          )}
        </div>
      ) : job.quotesFull ? (
        <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/50 px-3 py-2 text-sm font-medium text-muted-foreground">
          <Lock className="h-4 w-4" /> Quotes full — this customer has enough responses
        </div>
      ) : isActive ? (
        !quoteOpen && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => setQuoteOpen(true)}
            >
              <Send className="mr-1.5 h-4 w-4" /> Send a quote
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={onUnlock} disabled={unlocking}>
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
          </div>
        )
      ) : (
        <Button variant="outline" className="mt-4 rounded-xl" onClick={onSubscribe}>
          <Lock className="mr-2 h-4 w-4" /> Subscribe to unlock
        </Button>
      )}

      <div className="mt-3 flex justify-end border-t border-border/50 pt-3">
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-destructive"
        >
          <X className="h-3.5 w-3.5" /> Not interested
        </button>
      </div>
    </div>
  );
}
