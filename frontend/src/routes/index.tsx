import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ShieldCheck, Sparkles, Truck } from "lucide-react";
import { Logo } from "@/components/Logo";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "@/components/shared";
import heroDriver from "@/assets/hero-driver.jpg";
import { api } from "@/lib/api";
import scanQr from "@/assets/scan-qr.jpg";
import professionalsFlyer from "@/assets/professionals-flyer.png";
import dashboardEmpty from "@/assets/dashboard-empty.jpg";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
        {/* Hero */}
        <section className="relative grid items-center gap-10 pt-10 pb-16 lg:grid-cols-2 lg:gap-14 lg:pt-16 animate-fade-up">
          <div className="absolute inset-x-0 -top-10 -z-10 mx-auto h-72 max-w-lg rounded-full bg-mesh blur-2xl opacity-80" />
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-hover">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Now live for UK professionals and business
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground font-display sm:text-5xl">
              Get recognised and <span className="text-primary">rewarded</span>.
            </h1>
            <p className="mt-5 text-base leading-relaxed text-foreground/80 lg:text-lg">
              Join a community built for self-employed professionals. Collect
              customer reviews, build trust, and receive tips for delivering
              exceptional service.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Give your customers a simple way to rate your service and leave a
              tip instantly with your personal QR code.
            </p>
            <p className="mt-2 text-sm font-semibold text-foreground/70">
              No app. No account. No commission.
            </p>
            <div className="mt-8 flex flex-col gap-2.5 lg:max-w-sm">
              <Button
                asChild
                size="lg"
                className="h-12 w-full rounded-xl text-base font-semibold shadow-elevated transition-transform hover:scale-[1.02]"
              >
                <Link to="/signup">Get Started with Reviews &amp; Tips</Link>
              </Button>
              <p className="text-xs text-muted-foreground">
                £5.49/month · cancel anytime · setup in 60 seconds
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
                src={heroDriver}
                alt="A self-employed professional handing a parcel to a happy customer at their doorstep"
                width={1280}
                height={960}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-5 -left-4 hidden rounded-2xl bg-background/95 px-4 py-3 shadow-elevated ring-1 ring-border/60 backdrop-blur sm:block">
              <p className="text-xs font-medium text-muted-foreground">Last tip today</p>
              <p className="font-display text-xl font-bold text-primary">+ £4.00 ★★★★★</p>
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
              title="Print it"
              description="Print the QR code label and hand it to your customer. They can instantly rate your service, share their feedback, and reward exceptional work with a tip."
              image={professionalsFlyer}
              imageAlt="Self-employed professionals handing a SelfeConnect QR code flyer to happy customers"
            />
            <Step
              number={3}
              title="Customers scan, rate & tip"
              description="They scan, rate and choose an amount to tip. The money is paid directly into your account."
              image={scanQr}
              imageAlt="A customer scanning a SelfeConnect QR code with their smartphone"
            />
          </div>
        </section>

        {/* Pricing */}
        <section className="pb-16">
          <Card className="overflow-hidden rounded-2xl border-primary/20 bg-gradient-to-br from-primary-soft to-background shadow-soft">
            <CardContent className="relative p-7 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-hover">
                Professional subscription
              </p>
              <p className="mt-3 text-5xl font-extrabold tracking-tight text-foreground font-display">
                £5.49
                <span className="ml-1 text-lg font-medium text-muted-foreground">
                  /month
                </span>
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                One flat fee. No percentage cuts. No surprises.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary-hover">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                No commission, keep every tip
              </div>
            </CardContent>
          </Card>
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
            <Truck size={14} />
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
