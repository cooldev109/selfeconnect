import { createFileRoute, Link } from "@tanstack/react-router";
import { LogoMark } from "@/components/Logo";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — SelfeConnect" },
      { name: "description", content: "How SelfeConnect handles your data." },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <LogoMark className="h-8 w-8" />
            <span className="font-display font-bold tracking-tight text-foreground">SelfeConnect</span>
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-bold text-foreground font-display">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: 21 June 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="text-lg font-semibold">1. Who we are</h2>
            <p className="mt-2">
              SelfeConnect ("we") operates the SelfeConnect tipping platform. This policy explains what personal
              data we collect, why, and your rights over it.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">2. Data we collect</h2>
            <p className="mt-2">
              <strong>Professionals:</strong> name, email, phone, company, profile photo and subscription
              status. <strong>Customers:</strong> the tip amount, optional rating, and any optional
              name, address or message you choose to include with a tip. Card details are entered
              directly with our payment processor and are never stored on our servers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">3. How we use it</h2>
            <p className="mt-2">
              We use your data to operate the service: authenticating Professionals, displaying tipping
              pages, processing payments and payouts, showing Professionals their tips and ratings, and
              providing support. We do not sell your personal data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">4. Payment processing</h2>
            <p className="mt-2">
              Payments and payouts are handled by <strong>Stripe</strong>, which processes card and
              bank details under its own privacy policy. We receive only limited information (such as
              payment status and the last details needed to show a transaction).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">5. Retention &amp; your rights</h2>
            <p className="mt-2">
              We keep your data for as long as your account is active and as required for legal and
              accounting purposes. You may request access to, correction of, or deletion of your
              personal data, subject to applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">6. Contact</h2>
            <p className="mt-2">
              For any privacy request, contact{" "}
              <a className="text-primary underline" href="mailto:support@selfeconnect.com">
                support@selfeconnect.com
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-10 flex gap-4 text-sm">
          <Link to="/terms" className="text-primary underline">Terms of Service</Link>
          <Link to="/" className="text-muted-foreground underline">Back to home</Link>
        </div>
      </article>
    </main>
  );
}
