import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  Sparkles,
  Briefcase,
  Search,
  Check,
  ArrowRight,
  QrCode,
  Star,
  BadgeCheck,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/Logo";
import { Button, Card, CardContent, Input } from "@/components/shared";
import { CategorySelect } from "@/components/CategoryPicker";
import { RatingSummary, ReviewCard } from "@/components/Reviews";
import { api } from "@/lib/api";
import { customerMe } from "@/lib/customer-auth";
import professionalsFlyer from "@/assets/professionals-flyer.png";
import proTradesman from "@/assets/pro-tradesman.jpg";
import proGardener from "@/assets/pro-gardener.jpg";
import proStylist from "@/assets/pro-stylist.jpg";
import dashboardEmpty from "@/assets/dashboard-empty.jpg";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// A representative slice of the 50+ service categories — enough to make the
// breadth obvious at a glance without becoming a directory.
const TRADES = [
  "Plumber",
  "Electrician",
  "Cleaner",
  "Gardener",
  "Carpenter",
  "Painter & Decorator",
  "Roofer",
  "Handyman",
  "Removals",
  "Mechanic",
  "Dog Walker",
  "Personal Trainer",
  "Photographer",
  "Tutor",
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SelfeConnect — Hire trusted local professionals" },
      {
        name: "description",
        content:
          "Find reviewed local professionals — plumbers, electricians, cleaners, gardeners and 50+ more. Free to search, free to post a job. Professionals: one flat £5.49/month, no commission, no lead fees.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const [proId, setProId] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [heroService, setHeroService] = useState("");
  const [heroPostcode, setHeroPostcode] = useState("");
  const navigate = useNavigate();

  // Is there already a customer session? Decides whether a hero search goes
  // straight to results or via a free sign-up (which then lands on results).
  const customerQ = useQuery({
    queryKey: ["customer-me"],
    queryFn: customerMe,
    retry: false,
    staleTime: 60_000,
  });

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({
      to: customerQ.data?.customer ? "/customer/search" : "/customer/signup",
      search: {
        category: heroService || undefined,
        postcode: heroPostcode.trim() || undefined,
      },
    });
  };

  const handleTipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = proId.trim().toUpperCase();
    if (!id) return;
    setLookupError(null);
    setChecking(true);
    try {
      await api(`/drivers/${id}`);
      navigate({ to: "/tip/$driverId", params: { driverId: id } });
    } catch {
      setLookupError("No professional found with that ID. Please check and try again.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
          <Link to="/" className="flex min-w-0 items-center">
            <Logo withTagline={false} />
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
            <a href="#how-it-works" className="transition-colors hover:text-foreground">
              How it works
            </a>
            <a href="#reputation" className="transition-colors hover:text-foreground">
              Reviews
            </a>
            <a href="#pricing" className="transition-colors hover:text-foreground">
              Pricing
            </a>
          </nav>
          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            <Link
              to="/login"
              className="whitespace-nowrap text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Log in
            </Link>
            <Button asChild size="sm" className="shrink-0 rounded-xl">
              <Link to="/signup">
                <span className="sm:hidden">Join</span>
                <span className="hidden sm:inline">Join as a professional</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-mesh opacity-60" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-hover">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Reviewed &amp; recommended by real customers
            </span>
            <h1 className="mt-6 text-[2.6rem] font-extrabold tracking-tight text-foreground font-display sm:text-[3.4rem]">
              Find a trusted{" "}
              <span className="text-primary">professional</span> near you.
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-muted-foreground">
              Plumbers, electricians, cleaners, gardeners and 50+ more. Search by
              service and postcode, read real reviews, and get in touch directly.
            </p>

            {/* Primary action */}
            <form
              onSubmit={handleHeroSearch}
              className="mt-8 rounded-2xl border border-border/70 bg-card p-3 shadow-elevated"
            >
              <div className="grid gap-2 sm:grid-cols-[1.2fr_1fr_auto]">
                <CategorySelect
                  value={heroService}
                  onChange={setHeroService}
                  placeholder="What do you need?"
                />
                <Input
                  value={heroPostcode}
                  onChange={(e) => setHeroPostcode(e.target.value)}
                  placeholder="Your postcode"
                  aria-label="Your postcode"
                  maxLength={12}
                  className="h-11 rounded-xl"
                />
                <Button type="submit" className="h-11 rounded-xl px-6 text-sm font-semibold">
                  <Search className="mr-1.5 h-4 w-4" /> Search
                </Button>
              </div>
            </form>

            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-primary" /> Free to search
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-primary" /> Free to post a job
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-primary" /> No commission, ever
              </span>
            </div>

            <p className="mt-7 text-sm text-muted-foreground">
              Are you a professional?{" "}
              <Link to="/signup" className="font-semibold text-primary hover:underline">
                Join and find work near you →
              </Link>
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-md animate-fade-up lg:max-w-none">
            <div className="overflow-hidden rounded-[1.75rem] border border-border/60 shadow-elevated">
              <img
                src={professionalsFlyer}
                alt="Four self-employed professionals — a cleaner, a tradesman, a gardener and a hair stylist — sharing their SelfeConnect QR code with happy customers"
                width={1448}
                height={1086}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -left-8 hidden rounded-2xl border border-border/60 bg-card px-4 py-3 shadow-elevated lg:block">
              <p className="eyebrow text-muted-foreground">Verified review</p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="inline-flex text-amber-400">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400" />
                  ))}
                </span>
                <span className="text-sm font-semibold text-foreground">5.0</span>
              </div>
              <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                <BadgeCheck className="h-3.5 w-3.5" /> Hired on SelfeConnect
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trades ─────────────────────────────────────────────── */}
      <section className="border-y border-border/60 bg-secondary/40">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <p className="eyebrow text-center text-muted-foreground">
            Over 50 services · one platform
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {TRADES.map((t) => (
              <span
                key={t}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground/75"
              >
                {t}
              </span>
            ))}
            <span className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-ink-foreground">
              + 40 more
            </span>
          </div>
        </div>
      </section>

      {/* ── Two ways in ────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <div className="text-center">
          <p className="eyebrow text-primary">Two ways in</p>
          <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-extrabold tracking-tight text-foreground font-display sm:text-4xl">
            Whether you need the work, or need it done.
          </h2>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-5 sm:grid-cols-2">
          <PathCard
            icon={Search}
            title="I need a professional"
            body="Search reviewed local pros by service and area, or post a job for free and let them come to you."
            points={[
              "Search by service & postcode",
              "Read real, verified reviews",
              "Contact them directly — no middleman",
            ]}
            cta="Find a professional"
            to="/customer/signup"
            variant="outline"
            footer={{ text: "Have an account?", link: "Log in", to: "/customer/login" }}
          />
          <PathCard
            icon={Briefcase}
            title="I am a professional"
            body="Win local jobs, collect reviews from every customer, and keep 100% of your tips."
            points={[
              "Browse nearby jobs in your trades",
              "Your own QR code for reviews & tips",
              "£5.49/month — no commission, no lead fees",
            ]}
            cta="Join as a professional"
            to="/signup"
            variant="default"
            footer={{ text: "Already a member?", link: "Log in", to: "/login" }}
          />
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────── */}
      <section
        id="how-it-works"
        className="scroll-mt-20 border-y border-border/60 bg-secondary/40"
      >
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="text-center">
            <p className="eyebrow text-primary">For professionals</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground font-display sm:text-4xl">
              Three steps. Sixty seconds.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
              Set up once, and every customer you serve builds the reputation that
              wins you the next one.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            <Step
              number={1}
              title="Get your QR code"
              description="Sign up in a minute. We generate a unique 5-character ID and QR code that's yours alone."
              image={dashboardEmpty}
              imageAlt="A professional checking their SelfeConnect dashboard on their phone"
            />
            <Step
              number={2}
              title="Share it with customers"
              description="Print it once, then hand it to every customer you work for — or show it on your phone. Any trade, any job."
              image={proGardener}
              imageAlt="A gardener handing a SelfeConnect QR code card to a customer"
            />
            <Step
              number={3}
              title="They rate you — and tip"
              description="They scan, leave a review in seconds, and can add a tip if they want to. Tips go straight to you — you keep 100%."
              image={proStylist}
              imageAlt="A hair stylist handing a SelfeConnect QR code card to her client"
            />
          </div>
        </div>
      </section>

      {/* ── Reputation: the product moment ─────────────────────── */}
      <section id="reputation" className="scroll-mt-20">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 py-20 sm:py-24 lg:grid-cols-2">
          <div>
            <p className="eyebrow text-primary">Own your reputation</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground font-display sm:text-4xl">
              The reviews you earn offline win you work online.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              Every customer you already have can rate you in seconds — no app, no
              account hassle, no payment required. Those reviews build a public
              profile that new customers see when they search.
            </p>
            <ul className="mt-7 space-y-4">
              <Feature
                icon={QrCode}
                title="Collect reviews from day one"
                body="Your QR works with the customers you have today — you don't need to wait for the platform to find you any."
              />
              <Feature
                icon={Star}
                title="Rating without a tip"
                body="Customers can leave a review without paying a penny. Tipping is optional — and entirely theirs to choose."
              />
              <Feature
                icon={ShieldCheck}
                title="Verified, not anonymous"
                body="Reviews from customers who hired you on SelfeConnect are marked as verified, so they carry real weight."
              />
            </ul>
          </div>

          {/* A preview of the real profile UI — same components the app uses. */}
          <div className="relative">
            <div className="absolute -inset-5 -z-10 rounded-[2rem] bg-mesh opacity-70 blur-2xl" />
            <div className="overflow-hidden rounded-[1.75rem] border border-border/60 shadow-elevated">
              <div className="relative bg-ink p-6">
                <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />
                <div className="relative flex items-center gap-4">
                  <img
                    src={proTradesman}
                    alt=""
                    className="h-16 w-16 rounded-2xl object-cover ring-2 ring-white/15"
                  />
                  <div>
                    <p className="font-display text-xl font-bold text-ink-foreground">
                      Sam Rivers
                    </p>
                    <p className="text-sm text-ink-muted">Plumber · Electrician</p>
                  </div>
                </div>
              </div>
              <div className="space-y-5 bg-card p-6">
                <RatingSummary
                  avgRating={4.9}
                  reviewCount={38}
                  breakdown={{ "5": 33, "4": 4, "3": 1, "2": 0, "1": 0 }}
                />
                <ReviewCard
                  review={{
                    rating: 5,
                    comment:
                      "Fixed our boiler the same day and left the place spotless. Clear about the cost up front.",
                    author: "Helen W.",
                    date: "2026-06-20T10:00:00.000Z",
                    verified: true,
                    hired: true,
                  }}
                />
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Example profile — this is the real SelfeConnect layout.
            </p>
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────── */}
      <section id="pricing" className="scroll-mt-20 bg-ink">
        <div className="relative mx-auto max-w-6xl overflow-hidden px-6 py-20 sm:py-24">
          <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative grid items-center gap-12 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="eyebrow text-primary">Professional subscription</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink-foreground font-display sm:text-4xl">
                One flat fee. No commission. No lead fees.
              </h2>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-muted">
                Everything for one price — find work, collect reviews, take tips.
                We never take a percentage of your tips, and we never charge you
                for a lead that goes nowhere.
              </p>
              <ul className="mt-7 grid gap-3 sm:grid-cols-2">
                {[
                  "Browse & unlock nearby jobs",
                  "Your own QR code & public profile",
                  "Unlimited reviews from customers",
                  "Keep 100% of every tip",
                ].map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-ink-foreground/90"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-8 text-center backdrop-blur">
              <p className="font-display text-6xl font-extrabold tracking-tight text-ink-foreground tabular-nums">
                £5.49
              </p>
              <p className="mt-1 text-sm text-ink-muted">per month · cancel anytime</p>
              <Button
                asChild
                size="lg"
                className="mt-6 h-12 w-full rounded-xl text-base font-semibold"
              >
                <Link to="/signup">
                  Join as a professional <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-ink-muted">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Secure payments
                by Stripe
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Been given a code? ─────────────────────────────────── */}
      <section className="border-b border-border/60 bg-secondary/40">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 py-14 text-center sm:flex-row sm:text-left">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <QrCode className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground font-display">
              Been given a professional's code?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter their 5-character ID to leave a review — and a tip, if you'd
              like to.
            </p>
          </div>
          <form onSubmit={handleTipSubmit} className="w-full sm:w-auto">
            <div className="flex gap-2">
              <Input
                value={proId}
                onChange={(e) => setProId(e.target.value)}
                placeholder="5HQN7"
                aria-label="Professional's 5-character ID"
                className="h-11 w-full rounded-xl text-center text-base font-semibold uppercase tracking-[0.3em] placeholder:tracking-[0.3em] sm:w-40"
                maxLength={10}
              />
              <Button
                type="submit"
                variant="outline"
                disabled={checking}
                className="h-11 shrink-0 rounded-xl border-primary/40 font-semibold text-primary hover:bg-primary-soft"
              >
                {checking ? "Checking…" : "Rate & tip"}
              </Button>
            </div>
            {lookupError && (
              <p className="mt-2 text-xs text-destructive" role="alert">
                {lookupError}
              </p>
            )}
          </form>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 py-20 sm:py-24">
        <div className="text-center">
          <p className="eyebrow text-primary">FAQ</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground font-display">
            Common questions
          </h2>
        </div>
        <Accordion type="single" collapsible className="mt-10">
          <AccordionItem value="customers-sign-up">
            <AccordionTrigger>Do customers need an account to review me?</AccordionTrigger>
            <AccordionContent>
              They create a free account to leave a review, which is what makes
              reviews verified rather than anonymous. Leaving a tip takes seconds
              and needs no app download.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="tip-required">
            <AccordionTrigger>Does a customer have to tip to leave a review?</AccordionTrigger>
            <AccordionContent>
              No. Rating and reviewing is completely free — tipping is separate and
              entirely optional. Most reviews cost the customer nothing.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="how-paid">
            <AccordionTrigger>How do I get paid?</AccordionTrigger>
            <AccordionContent>
              Tips are paid straight into your linked bank account on a weekly
              payout, handled securely by Stripe. Payment for the job itself stays
              between you and your customer — we never touch it.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="commission">
            <AccordionTrigger>Is there really no commission?</AccordionTrigger>
            <AccordionContent>
              Yes. We charge a flat £5.49/month and never take a percentage of your
              tips, and never charge per lead. You keep 100% of every tip, less only
              the standard processing fee charged by our payment partner.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="cancel">
            <AccordionTrigger>Can I cancel anytime?</AccordionTrigger>
            <AccordionContent>
              Yes — it's monthly, with no contract. Cancel from your account page and
              you keep full access until the end of the period you've paid for.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      {/* ── Closing CTA ────────────────────────────────────────── */}
      <section className="border-t border-border/60 bg-secondary/40">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center sm:py-24">
          <Sparkles className="mx-auto h-7 w-7 text-primary" />
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-foreground font-display sm:text-4xl">
            Start building the reputation you've already earned.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base text-muted-foreground">
            Set up in sixty seconds. Your next customer is one review away.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 rounded-xl px-7 text-base font-semibold">
              <Link to="/signup">
                Join as a professional <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-xl border-primary/40 px-7 text-base font-semibold text-primary hover:bg-primary-soft"
            >
              <Link to="/customer/signup">Find a professional</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid gap-10 sm:grid-cols-[1.5fr_1fr_1fr]">
            <div>
              <Logo />
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Reviews and tips for self-employed professionals — and a simple way
                for customers to find them.
              </p>
            </div>
            <FooterCol
              title="Platform"
              links={[
                { label: "How it works", href: "#how-it-works" },
                { label: "Reviews", href: "#reputation" },
                { label: "Pricing", href: "#pricing" },
              ]}
            />
            <FooterCol
              title="Company"
              links={[
                { label: "About SelfeConnect", to: "/about" },
                { label: "Contact us", to: "/contact" },
                { label: "Terms", to: "/terms" },
                { label: "Privacy", to: "/privacy" },
              ]}
            />
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} SelfeConnect. Independent. Impartial.
              Impactful.
            </p>
            <div className="flex items-center gap-2 text-muted-foreground">
              <LogoMark className="h-4 w-4" />
              <span className="text-xs font-medium">Secure payments by Stripe</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PathCard({
  icon: Icon,
  title,
  body,
  points,
  cta,
  to,
  variant,
  footer,
}: {
  icon: typeof Search;
  title: string;
  body: string;
  points: string[];
  cta: string;
  to: string;
  variant: "default" | "outline";
  footer: { text: string; link: string; to: string };
}) {
  return (
    <div className="group flex flex-col rounded-2xl border border-border/70 bg-card p-7 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="mt-5 text-xl font-bold text-foreground font-display">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
      <ul className="mt-5 space-y-2.5 text-sm text-foreground/80">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {p}
          </li>
        ))}
      </ul>
      <div className="mt-7 flex flex-col gap-2.5 pt-1">
        <Button
          asChild
          size="lg"
          variant={variant === "outline" ? "outline" : "default"}
          className={`h-11 w-full rounded-xl font-semibold ${
            variant === "outline"
              ? "border-primary/40 text-primary hover:bg-primary-soft"
              : ""
          }`}
        >
          <Link to={to}>
            {cta} <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          {footer.text}{" "}
          <Link to={footer.to} className="font-semibold text-primary hover:underline">
            {footer.link}
          </Link>
        </p>
      </div>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Star;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </li>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; to?: string; href?: string }[];
}) {
  return (
    <div>
      <p className="eyebrow text-foreground">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            {l.to ? (
              <Link
                to={l.to}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            ) : (
              <a
                href={l.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Step({
  number,
  title,
  description,
  image,
  imageAlt,
}: {
  number: number;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
}) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft transition duration-300 hover:-translate-y-0.5 hover:shadow-elevated">
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        <img
          src={image}
          alt={imageAlt}
          loading="lazy"
          width={724}
          height={543}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary font-display text-sm font-bold text-primary-foreground shadow-elevated">
          {number}
        </div>
      </div>
      <div className="p-6">
        <h3 className="text-base font-bold text-foreground font-display">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}
