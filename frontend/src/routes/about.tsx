import { createFileRoute, Link } from "@tanstack/react-router";
import { Truck, Star, Wallet, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — SelfeConnect" },
      { name: "description", content: "About SelfeConnect — reviews and tips for self-employed professionals." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Truck className="h-4 w-4" />
            </div>
            <span className="font-display font-bold tracking-tight text-foreground">SelfeConnect</span>
          </Link>
          <Link to="/signup" className="text-sm font-semibold text-primary hover:underline">
            Join as a professional
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">About SelfeConnect</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground font-display sm:text-4xl">
          Recognition and reward for self-employed professionals
        </h1>
        <p className="mt-5 text-base leading-relaxed text-foreground/80">
          SelfeConnect helps independent, self-employed professionals get
          recognised for great work. Each professional gets a personal QR code
          their customers can scan to leave a review and a tip in seconds — no
          app, no account, and no commission on tips.
        </p>
        <p className="mt-4 text-base leading-relaxed text-foreground/80">
          We believe great service should be seen and rewarded. Whether you go
          the extra mile on a delivery or any other service, SelfeConnect turns a
          happy customer into real feedback and real earnings — paid straight to
          your account.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <Value Icon={Star} title="Reviews that build trust" text="Customers rate your service, helping you stand out and win more work." />
          <Value Icon={Wallet} title="Keep 100% of tips" text="One flat monthly subscription — we never take a cut of your tips." />
          <Value Icon={ShieldCheck} title="Secure by design" text="Payments and payouts are handled securely by Stripe." />
        </div>

        <div className="mt-10 rounded-2xl border border-primary/20 bg-primary-soft/50 p-6 text-center">
          <h2 className="text-lg font-semibold text-foreground font-display">Independent. Impartial. Impactful.</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Built for the UK's growing community of self-employed professionals.
          </p>
          <Link
            to="/signup"
            className="mt-4 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Get started
          </Link>
        </div>

        <div className="mt-10 flex gap-4 text-sm">
          <a href="/#how-it-works" className="text-primary underline">How it works</a>
          <Link to="/contact" className="text-primary underline">Contact us</Link>
          <Link to="/" className="text-muted-foreground underline">Back to home</Link>
        </div>
      </article>
    </main>
  );
}

function Value({ Icon, title, text }: { Icon: React.ComponentType<{ className?: string }>; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background p-5 shadow-soft">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E1F5EE] text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
