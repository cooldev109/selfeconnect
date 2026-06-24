import { createFileRoute, Link } from "@tanstack/react-router";
import { Truck, Mail, Globe } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — SelfeConnect" },
      { name: "description", content: "Get in touch with the SelfeConnect team." },
    ],
  }),
  component: Contact,
});

function Contact() {
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
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Contact us</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground font-display sm:text-4xl">
          We're here to help
        </h1>
        <p className="mt-5 text-base leading-relaxed text-foreground/80">
          Questions about your account, payouts, or getting set up? Reach out and
          we'll get back to you as soon as we can.
        </p>

        <div className="mt-8 space-y-4">
          <a
            href="mailto:support@selfeconnect.com"
            className="flex items-center gap-4 rounded-2xl border border-border/60 bg-background p-5 shadow-soft transition hover:border-primary/40"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E1F5EE] text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Email</p>
              <p className="text-sm text-muted-foreground">support@selfeconnect.com</p>
            </div>
          </a>
          <a
            href="https://www.selfeconnect.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-4 rounded-2xl border border-border/60 bg-background p-5 shadow-soft transition hover:border-primary/40"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E1F5EE] text-primary">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Website</p>
              <p className="text-sm text-muted-foreground">www.selfeconnect.com</p>
            </div>
          </a>
        </div>

        <div className="mt-10 flex gap-4 text-sm">
          <Link to="/about" className="text-primary underline">About SelfeConnect</Link>
          <a href="/#how-it-works" className="text-primary underline">How it works</a>
          <Link to="/" className="text-muted-foreground underline">Back to home</Link>
        </div>
      </article>
    </main>
  );
}
