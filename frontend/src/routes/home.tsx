import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  Star,
  Wallet,
  Search,
  Send,
  Award,
  CircleCheck,
  Circle,
  ArrowRight,
  MessageSquare,
  BadgeCheck,
  ShieldCheck,
  Scale,
  FileText,
  Bell,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { ProShell } from "@/components/ProShell";
import { StatCard, DashCard, Metric, EmptyRow } from "@/components/DashKit";
import { JobStatusBadge } from "@/components/JobStatusBadge";
import { ReviewCard } from "@/components/Reviews";
import { useMe } from "@/hooks/useDriver";
import { useTips } from "@/hooks/useTips";
import { getAccount } from "@/lib/billing";
import { proMyJobs, proBrowseJobs } from "@/lib/jobs";
import { proNotifications, type AppNotification } from "@/lib/notifications";
import { getMyReviews } from "@/lib/reviews";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Dashboard — SelfeConnect" },
      { name: "description", content: "Your SelfeConnect business at a glance." },
    ],
  }),
  component: ProDashboard,
});

const money = (pounds: number) => `£${Math.round(pounds).toLocaleString("en-GB")}`;
const isSameMonth = (iso: string, ref: Date) => {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
};
const isToday = (iso: string) => {
  const d = new Date(iso);
  const n = new Date();
  return d.toDateString() === n.toDateString();
};

const NOTIF_ICON: Record<AppNotification["kind"], LucideIcon> = {
  quote: FileText,
  message: MessageSquare,
  hired: BadgeCheck,
  verification: ShieldCheck,
  dispute: Scale,
};

function ProDashboard() {
  const { data: driver } = useMe();
  const tips = useTips();
  const { data: account } = useQuery({ queryKey: ["account"], queryFn: getAccount, retry: false });
  const myJobsQ = useQuery({ queryKey: ["pro-my-jobs"], queryFn: proMyJobs, retry: false });
  const nearbyQ = useQuery({
    queryKey: ["pro-jobs-nearby-dash"],
    queryFn: () => proBrowseJobs({ radius: 25 }),
    retry: false,
  });
  const notifsQ = useQuery({ queryKey: ["pro-notifications"], queryFn: proNotifications, retry: false });
  const reviewsQ = useQuery({ queryKey: ["my-reviews"], queryFn: getMyReviews, retry: false });

  // Time-of-day greeting, resolved after mount to avoid an SSR/client mismatch.
  const [greeting, setGreeting] = useState("Welcome back");
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");
  }, []);
  const firstName = driver?.name?.trim().split(/\s+/)[0] ?? "there";

  const jobs = myJobsQ.data ?? [];
  const activeJobs = jobs.filter((j) => j.status === "hired" || j.status === "in_progress");
  const completed = jobs.filter((j) => j.status === "completed");
  const quotesSent = jobs.filter((j) => j.myQuote != null);
  const jobsWon = jobs.filter((j) => j.hired);
  const nearby = nearbyQ.data ?? [];
  const newToday = nearby.filter((j) => isToday(j.createdAt)).length;

  const now = new Date();
  const thisMonth = (tips.payments ?? [])
    .filter((p) => isSameMonth(p.date, now))
    .reduce((s, p) => s + p.amount, 0);

  // The reviews endpoint is the authoritative rating source (same as the My
  // reviews page + the Latest-review card below), so the tile can't disagree.
  const rating = reviewsQ.data?.avgRating ?? 0;
  const ratingsCount = reviewsQ.data?.reviewCount ?? 0;

  const steps = [
    { label: "Add a profile photo", done: !!driver?.photoUrl, to: "/profile" as const },
    { label: "Add a description", done: !!driver?.bio?.trim(), to: "/profile" as const },
    { label: "Add your services", done: (driver?.categorySlugs?.length ?? 0) > 0, to: "/profile" as const },
    { label: "Add portfolio photos", done: (driver?.galleryPhotos?.length ?? 0) >= 3, to: "/profile" as const },
    { label: "Get verified", done: !!driver?.verified, to: "/verify" as const },
    { label: "Set up payouts", done: !!account?.stripeOnboarded, to: "/account" as const },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);

  const attention = (notifsQ.data ?? []).slice(0, 5);
  const recent = [...jobs]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 5);
  const latestReview = reviewsQ.data?.reviews?.[0];

  const priceLabel = (j: (typeof jobs)[number]) =>
    j.budget || (j.myQuote?.amount != null ? money(j.myQuote.amount / 100) : "—");

  return (
    <ProShell
      title={`${greeting}, ${firstName} 👋`}
      subtitle="Here's what's happening with your business."
    >
      <div className="space-y-5">
        {/* KPI row */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            icon={Briefcase}
            label="Jobs nearby"
            value={nearby.length}
            foot={newToday > 0 ? `${newToday} new today` : "In your area"}
            footTone={newToday > 0 ? "text-primary" : "text-muted-foreground"}
          />
          <StatCard
            icon={CircleCheck}
            label="Active jobs"
            value={activeJobs.length}
            tone="bg-violet-100 text-violet-600"
            foot={activeJobs.length ? "In progress" : "None right now"}
          />
          <StatCard
            icon={Star}
            label="Rating"
            value={
              ratingsCount > 0 ? (
                <span className="inline-flex items-center gap-1.5">
                  {rating.toFixed(1)}
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                </span>
              ) : (
                "—"
              )
            }
            tone="bg-amber-100 text-amber-600"
            foot={`${ratingsCount} review${ratingsCount === 1 ? "" : "s"}`}
          />
          <StatCard
            icon={Wallet}
            label="This month"
            value={money(thisMonth)}
            tone="bg-sky-100 text-sky-600"
            foot="Payments received"
            footTone="text-primary"
          />
        </div>

        {/* Your activity */}
        <DashCard title="Your activity">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric icon={Search} value={nearby.length} label="Jobs available" tone="bg-sky-100 text-sky-600" />
            <Metric icon={Send} value={quotesSent.length} label="Quotes sent" tone="bg-violet-100 text-violet-600" />
            <Metric icon={Award} value={jobsWon.length} label="Jobs won" tone="bg-primary-soft text-primary" />
            <Metric icon={CircleCheck} value={completed.length} label="Completed" tone="bg-emerald-100 text-emerald-600" />
          </div>
        </DashCard>

        {/* Attention + recent jobs */}
        <div className="grid gap-4 lg:grid-cols-2">
          <DashCard
            title="Needs your attention"
            action={
              <Link to="/my-jobs" className="text-xs font-semibold text-primary hover:underline">
                View all
              </Link>
            }
            bodyClassName="divide-y divide-border/60"
          >
            {attention.length === 0 ? (
              <EmptyRow>You&rsquo;re all caught up. 🎉</EmptyRow>
            ) : (
              attention.map((n) => {
                const Icon = NOTIF_ICON[n.kind] ?? Bell;
                return (
                  <Link
                    key={n.id}
                    to="/my-jobs"
                    className="flex items-start gap-3 py-3 transition hover:bg-secondary/40"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{n.title}</span>
                      {n.body && <span className="block truncate text-xs text-muted-foreground">{n.body}</span>}
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
                    </span>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                );
              })
            )}
          </DashCard>

          <DashCard
            title="Recent jobs"
            action={
              <Link to="/my-jobs" className="text-xs font-semibold text-primary hover:underline">
                View all
              </Link>
            }
            bodyClassName="divide-y divide-border/60"
          >
            {recent.length === 0 ? (
              <EmptyRow>No jobs yet — find work to get started.</EmptyRow>
            ) : (
              recent.map((j) => (
                <div key={j.id} className="flex items-center gap-3 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <JobStatusBadge status={j.status ?? "open"} />
                      <span className="truncate text-sm font-medium text-foreground">{j.title}</span>
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {j.categoryName} · {timeAgo(j.createdAt)}
                    </span>
                  </span>
                  <span className="shrink-0 font-display text-sm font-bold tabular-nums text-foreground">
                    {priceLabel(j)}
                  </span>
                </div>
              ))
            )}
          </DashCard>
        </div>

        {/* Profile strength + latest review */}
        <div className="grid gap-4 lg:grid-cols-2">
          <DashCard title="Profile strength">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Complete your profile to win more work.
              </span>
              <span className="font-display text-lg font-bold tabular-nums text-foreground">{pct}%</span>
            </div>
            <span className="mt-2 block h-2 w-full overflow-hidden rounded-full bg-secondary">
              <span
                className="block h-full rounded-full bg-primary transition-[width] duration-700"
                style={{ width: `${pct}%` }}
              />
            </span>
            <ul className="mt-4 space-y-2.5">
              {steps.map((s) => (
                <li key={s.label}>
                  <Link
                    to={s.to}
                    className="flex items-center gap-2.5 text-sm transition hover:text-foreground"
                  >
                    {s.done ? (
                      <CircleCheck className="h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                    )}
                    <span className={s.done ? "text-muted-foreground line-through" : "text-foreground"}>
                      {s.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </DashCard>

          <DashCard
            title="Latest review"
            action={
              <Link to="/reviews" className="text-xs font-semibold text-primary hover:underline">
                View all
              </Link>
            }
          >
            {latestReview ? (
              <ReviewCard review={latestReview} />
            ) : (
              <EmptyRow>No reviews yet — share your QR code to collect your first.</EmptyRow>
            )}
          </DashCard>
        </div>
      </div>
    </ProShell>
  );
}
