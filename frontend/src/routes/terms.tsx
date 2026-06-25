import { createFileRoute, Link } from "@tanstack/react-router";
import { LogoMark } from "@/components/Logo";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — SelfeConnect" },
      { name: "description", content: "SelfeConnect terms of service." },
    ],
  }),
  component: Terms,
});

function Terms() {
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
        <h1 className="text-3xl font-bold text-foreground font-display">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: 21 June 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="text-lg font-semibold">1. About SelfeConnect</h2>
            <p className="mt-2">
              SelfeConnect provides a service that lets self-employed professionals ("Professionals") receive cashless tips
              from customers ("Customers") via a personal QR code and tipping page. By creating an
              account or sending a tip, you agree to these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">2. Professional accounts &amp; subscription</h2>
            <p className="mt-2">
              Professionals subscribe for £5.49 per month. The subscription renews monthly until cancelled
              and can be cancelled at any time from the account page; access continues until the end
              of the current billing period. Professionals are responsible for the accuracy of their
              profile and contact details.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">3. Tips &amp; payments</h2>
            <p className="mt-2">
              Tips are voluntary payments from Customers to Professionals. Professionals keep 100% of every tip;
              SelfeConnect does not take a commission on tips. Payments are processed by Stripe, and Professional
              payouts are made to the Professional's connected Stripe account. Tips are generally
              non-refundable except where required by law or in the case of a clear error.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">4. Acceptable use</h2>
            <p className="mt-2">
              You agree not to misuse the service, attempt to defraud Customers or Professionals, upload
              unlawful content, or interfere with the platform's operation. We may suspend accounts
              that breach these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">5. Liability</h2>
            <p className="mt-2">
              The service is provided "as is". To the extent permitted by law, SelfeConnect is not liable
              for indirect or consequential losses. Nothing in these Terms limits liability that
              cannot be limited under applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">6. Changes &amp; contact</h2>
            <p className="mt-2">
              We may update these Terms from time to time; continued use means you accept the updated
              Terms. Questions? Contact us at{" "}
              <a className="text-primary underline" href="mailto:support@selfeconnect.com">
                support@selfeconnect.com
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-10 flex gap-4 text-sm">
          <Link to="/privacy" className="text-primary underline">Privacy Policy</Link>
          <Link to="/" className="text-muted-foreground underline">Back to home</Link>
        </div>
      </article>
    </main>
  );
}
