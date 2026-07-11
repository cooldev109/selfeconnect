import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ShieldCheck,
  Sparkles,
  Briefcase,
  Search,
  Check,
  ArrowRight,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/Logo";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "@/components/shared";
import { api } from "@/lib/api";
import professionalsFlyer from "@/assets/professionals-flyer.png";
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
      { title: "SelfeConnect — Reviews & tips for self-employed professionals" },
      {
        name: "description",
        content:
          "Get recognised and rewarded. Collect customer reviews, build trust, and receive tips. Give customers a simple way to rate your service and tip instantly with your personal QR code. No app. No account. No commission.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const [proId, setProId] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const navigate = useNavigate();

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
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <Logo />
          </Link>
          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            <Link
              to="/customer/login"
              className="hidden whitespace-nowrap text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              Find a pro
            </Link>
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

      <main className="mx-auto max-w-5xl px-6">
        {/* Dual-path chooser — the primary entry point */}
        <section className="pt-12 pb-6 text-center animate-fade-up">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-hover">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Trusted local professionals, reviewed &amp; recommended
          </span>
          <h1 className="mx-auto mt-5 max-w-2xl text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground font-display sm:text-5xl">
            One platform. <span className="text-primary">Two ways in.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            Whether you offer a service or need one, SelfeConnect connects
            trusted local professionals with the people who need them.
          </p>

          <div className="mx-auto mt-9 grid max-w-3xl gap-4 text-left sm:grid-cols-2">
            {/* Professional path */}
            <div className="group flex flex-col rounded-2xl border border-border/70 bg-card p-6 shadow-soft transition hover:border-primary/40 hover:shadow-elevated">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Briefcase className="h-6 w-6" />
              </span>
              <h2 className="mt-4 text-lg font-bold text-foreground font-display">
                I'm a Professional
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Get reviews &amp; tips, your own QR code, and find local jobs in
                your trade.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-foreground/80">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-primary" /> Reviews, tips &amp; a personal QR code</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-primary" /> Browse nearby jobs in your categories</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-primary" /> Unlimited access with one subscription</li>
              </ul>
              <div className="mt-6 flex flex-col gap-2">
                <Button asChild size="lg" className="h-11 w-full rounded-xl font-semibold">
                  <Link to="/signup">
                    Join as a professional <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
                <Link to="/login" className="text-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                  Already a member? Log in
                </Link>
              </div>
            </div>

            {/* Customer path */}
            <div className="group flex flex-col rounded-2xl border border-border/70 bg-card p-6 shadow-soft transition hover:border-primary/40 hover:shadow-elevated">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Search className="h-6 w-6" />
              </span>
              <h2 className="mt-4 text-lg font-bold text-foreground font-display">
                I'm Looking for a Professional
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Find and hire trusted local pros, or post a job and let them come
                to you.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-foreground/80">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-primary" /> Search by service &amp; area</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-primary" /> See ratings, reviews &amp; contact directly</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-primary" /> Post a job for free</li>
              </ul>
              <div className="mt-6 flex flex-col gap-2">
                <Button asChild size="lg" variant="outline" className="h-11 w-full rounded-xl border-primary/40 font-semibold text-primary hover:bg-primary-soft">
                  <Link to="/customer/signup">
                    Find a professional <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
                <Link to="/customer/login" className="text-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                  Have an account? Log in
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Breadth of trades — SelfeConnect is for every self-employed trade,
            not one. Naming them is the fastest way to say so. */}
        <section className="pb-4 pt-2">
          <p className="eyebrow text-center text-muted-foreground">
            Over 50 services · one platform
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
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
        </section>

        {/* For professionals — detail */}
        <section className="relative grid items-center gap-10 pt-10 pb-16 lg:grid-cols-2 lg:gap-14 lg:pt-16 animate-fade-up">
          <div className="absolute inset-x-0 -top-10 -z-10 mx-auto h-72 max-w-lg rounded-full bg-mesh blur-2xl opacity-80" />
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-hover">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Now live for UK professionals and business
            </span>
            <h2 className="mt-5 text-4xl font-extrabold tracking-tight text-foreground font-display sm:text-5xl">
              Win the work. Then get <span className="text-primary">rewarded</span> for it.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-foreground/80 lg:text-lg">
              Whatever your trade, SelfeConnect puts local jobs in front of you —
              and turns every happy customer into a review that wins you the next
              one.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-foreground/80">
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <strong className="font-semibold text-foreground">Find work near you.</strong>{" "}
                  Browse jobs posted by local customers in your trades.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <strong className="font-semibold text-foreground">Build a reputation.</strong>{" "}
                  Collect verified reviews customers can actually trust.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <strong className="font-semibold text-foreground">Keep every tip.</strong>{" "}
                  Your own QR code, zero commission, weekly payouts.
                </span>
              </li>
            </ul>
            <div className="mt-8 flex flex-col gap-2.5 lg:max-w-sm">
              <Button
                asChild
                size="lg"
                className="h-12 w-full rounded-xl text-base font-semibold shadow-elevated transition-transform hover:scale-[1.02]"
              >
                <Link to="/signup">Join as a professional</Link>
              </Button>
              <p className="text-xs text-muted-foreground">
                £5.49/month · one flat fee, no commission · cancel anytime
              </p>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground lg:justify-start">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Encrypted payments</span>
              <span className="inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary" /> Weekly payouts</span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-mesh opacity-70 blur-2xl" />
            <div className="overflow-hidden rounded-3xl border border-border/60 shadow-elevated">
              <img
                src={professionalsFlyer}
                alt="Four self-employed professionals — a cleaner, a tradesman, a gardener and a hair stylist — sharing their SelfeConnect QR code with happy customers"
                width={1448}
                height={1086}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-5 -left-4 hidden rounded-2xl bg-background/95 px-4 py-3 shadow-elevated ring-1 ring-border/60 backdrop-blur sm:block">
              <p className="text-xs font-medium text-muted-foreground">New review today</p>
              <p className="font-display text-xl font-bold text-primary">★★★★★ + £4.00 tip</p>
            </div>
          </div>
        </section>

        {/* Customer lookup card */}
        <section className="pb-16 animate-fade-up">
          <Card className="mx-auto max-w-md rounded-2xl border-border/70 shadow-soft">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-display">Got a professional's code?</CardTitle>
              <p className="text-sm text-muted-foreground">
                Enter their 5-character ID to rate them and leave a tip.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTipSubmit} className="flex flex-col gap-3">
                <Input
                  value={proId}
                  onChange={(e) => setProId(e.target.value)}
                  placeholder="e.g. 5HQN7"
                  className="h-12 rounded-xl text-center text-base font-semibold uppercase tracking-[0.35em] placeholder:font-normal placeholder:tracking-normal"
                  maxLength={10}
                />
                {lookupError && (
                  <p className="text-center text-sm text-destructive" role="alert">
                    {lookupError}
                  </p>
                )}
                <Button
                  type="submit"
                  size="lg"
                  variant="outline"
                  disabled={checking}
                  className="h-12 w-full rounded-xl border-2 border-primary text-base font-semibold text-primary hover:bg-primary-soft"
                >
                  {checking ? "Checking…" : "Rate & tip"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-20 pb-16">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            How it works
          </p>
          <h2 className="mt-2 text-center text-2xl font-bold tracking-tight text-foreground font-display sm:text-3xl">
            Three steps. Sixty seconds.
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <Step
              number={1}
              title="Get your QR code"
              description="Sign up in a minute. We generate a unique 5-character ID and QR code just for you."
              image={dashboardEmpty}
              imageAlt="A professional checking their SelfeConnect earnings on their phone"
            />
            <Step
              number={2}
              title="Share it with customers"
              description="Print it once, then hand it to every customer you work for — or show it on your phone. Works for any trade, on any job."
              image={proGardener}
              imageAlt="A gardener handing a SelfeConnect QR code card to a customer"
            />
            <Step
              number={3}
              title="Customers rate & tip"
              description="They scan, leave a review in seconds, and can add a tip if they want to. Tips go straight to your account — you keep 100%."
              image={proStylist}
              imageAlt="A hair stylist handing a SelfeConnect QR code card to her client"
            />
          </div>
        </section>

        {/* Pricing — the page's dark anchor, in the secondary brand ink. */}
        <section className="pb-16">
          <div className="relative overflow-hidden rounded-3xl bg-ink px-7 py-10 text-center shadow-elevated">
            <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
            <div className="relative">
              <p className="eyebrow text-primary">Professional subscription</p>
              <p className="mt-3 font-display text-6xl font-extrabold tracking-tight text-ink-foreground tabular-nums">
                £5.49
                <span className="ml-1 text-lg font-medium text-ink-muted">
                  /month
                </span>
              </p>
              <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-ink-muted">
                One flat fee for everything — find work, collect reviews, take
                tips. No percentage cuts. No surprises.
              </p>
              <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                <Check className="h-4 w-4" />
                No commission — you keep every tip
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="pb-16">
          <h2 className="text-center text-2xl font-bold tracking-tight text-foreground font-display">
            Common questions
          </h2>
          <Accordion type="single" collapsible className="mt-6">
            <AccordionItem value="customers-sign-up">
              <AccordionTrigger>
                Do customers need to sign up?
              </AccordionTrigger>
              <AccordionContent>
                No — customers just scan your QR code, rate your service, enter a
                tip amount, and pay. No app download or account creation required.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="how-paid">
              <AccordionTrigger>How do I get paid?</AccordionTrigger>
              <AccordionContent>
                Tips land in your linked bank account on a weekly payout. Every
                review and transaction is tracked in your dashboard.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="cancel">
              <AccordionTrigger>Can I cancel anytime?</AccordionTrigger>
              <AccordionContent>
                Yes. The subscription is monthly with no long-term contract.
                Cancel from your account page and keep going until the end of the
                billing period.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="commission">
              <AccordionTrigger>Is there really no commission?</AccordionTrigger>
              <AccordionContent>
                Absolutely. We charge a simple monthly subscription and never
                take a percentage of your tips or payments. You keep 100% of
                every tip, less any standard payment processing fees charged by
                our payment partner. We never take a cut.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 px-6 py-10">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-muted-foreground">
            <Link to="/about" className="transition-colors hover:text-foreground">About SelfeConnect</Link>
            <a href="/#how-it-works" className="transition-colors hover:text-foreground">How it works</a>
            <Link to="/contact" className="transition-colors hover:text-foreground">Contact us</Link>
            <Link to="/terms" className="transition-colors hover:text-foreground">Terms</Link>
            <Link to="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
          </nav>
          <div className="flex items-center gap-2 text-muted-foreground">
            <LogoMark className="h-4 w-4" />
            <span className="text-xs font-medium">SelfeConnect</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} SelfeConnect. Independent. Impartial. Impactful.
          </p>
        </div>
      </footer>
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
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-background shadow-soft transition hover:-translate-y-0.5 hover:shadow-elevated">
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        <img
          src={image}
          alt={imageAlt}
          loading="lazy"
          width={1280}
          height={960}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-elevated font-display">
          {number}
        </div>
      </div>
      <div className="p-5">
        <h3 className="text-base font-semibold text-foreground font-display">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}
