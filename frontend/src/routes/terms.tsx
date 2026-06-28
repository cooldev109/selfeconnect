import { createFileRoute, Link } from "@tanstack/react-router";
import { LogoMark } from "@/components/Logo";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — SelfeConnect" },
      { name: "description", content: "SelfeConnect terms & conditions." },
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
        <h1 className="text-3xl font-bold text-foreground font-display">Terms &amp; Conditions</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: 27 June 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="text-lg font-semibold">1. About SelfeConnect</h2>
            <p className="mt-2">
              SelfeConnect provides a platform that enables self-employed professionals
              ("Professionals") to receive cashless tips from customers ("Customers") through a
              personal QR code and tipping page.
            </p>
            <p className="mt-2">
              By creating an account, using the platform, or sending a tip, you agree to these Terms
              &amp; Conditions.
            </p>
            <p className="mt-2">
              SelfeConnect provides the technology that connects Customers and Professionals.
              SelfeConnect does not employ Professionals and is not responsible for the services
              provided by Professionals to Customers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">2. Professional Accounts &amp; Subscriptions</h2>
            <p className="mt-2">
              Professionals subscribe to the SelfeConnect service for £5.49 per month.
            </p>
            <p className="mt-2">
              Subscriptions automatically renew each month until cancelled. Professionals may cancel
              their subscription at any time through their account settings. Access to paid features
              will continue until the end of the current billing period.
            </p>
            <p className="mt-2">
              Professionals are responsible for ensuring that their profile information, contact
              details, and payment information are accurate and up to date.
            </p>
            <p className="mt-2">
              Professionals must only use SelfeConnect for legitimate business purposes and must
              provide accurate information about their services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">3. Tips &amp; Payments</h2>
            <p className="mt-2">Tips are voluntary payments made by Customers directly to Professionals.</p>
            <p className="mt-2">
              Professionals receive 100% of tips. SelfeConnect does not deduct any commission or
              percentage from tips received.
            </p>
            <p className="mt-2">
              Payments and payouts are securely processed by Stripe. Professionals must have a valid
              connected Stripe account in order to receive payouts. Stripe's own terms and conditions
              may also apply to payment processing.
            </p>
            <p className="mt-2">
              Tips are generally non-refundable, except where required by applicable law or where a
              clear payment error has occurred.
            </p>
            <p className="mt-2">
              SelfeConnect does not guarantee that Customers will provide tips or that Professionals
              will receive a particular amount of earnings.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">4. Customer &amp; Professional Responsibilities</h2>
            <p className="mt-2">
              Customers are responsible for ensuring that any tips they provide are voluntary and
              accurate.
            </p>
            <p className="mt-2">
              Professionals are responsible for the quality, legality, and delivery of the services
              they provide to Customers.
            </p>
            <p className="mt-2">
              SelfeConnect does not verify, guarantee, or endorse the services provided by
              Professionals.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">5. Acceptable Use</h2>
            <p className="mt-2">You agree not to misuse the SelfeConnect platform.</p>
            <p className="mt-2">This includes, but is not limited to:</p>
            <ul className="mt-1 list-disc space-y-1 pl-6">
              <li>providing false or misleading information;</li>
              <li>creating fake reviews or ratings;</li>
              <li>attempting fraudulent transactions;</li>
              <li>manipulating the tipping system;</li>
              <li>uploading unlawful or harmful content;</li>
              <li>interfering with the operation or security of the platform.</li>
            </ul>
            <p className="mt-2">
              SelfeConnect reserves the right to suspend or terminate accounts that breach these Terms
              &amp; Conditions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">6. Account Suspension &amp; Termination</h2>
            <p className="mt-2">
              SelfeConnect may suspend or terminate accounts where we reasonably believe there has
              been a breach of these Terms &amp; Conditions, fraudulent activity, misuse of the
              platform, or activity that may harm Customers, Professionals, or the SelfeConnect
              community.
            </p>
            <p className="mt-2">
              Professionals may stop using the service and cancel their subscription at any time.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">7. Intellectual Property</h2>
            <p className="mt-2">
              All SelfeConnect branding, logos, software, designs, content, and platform materials
              remain the property of SelfeConnect unless otherwise stated.
            </p>
            <p className="mt-2">
              You may not copy, modify, distribute, or use SelfeConnect materials without prior written
              permission.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">8. Liability</h2>
            <p className="mt-2">The SelfeConnect platform is provided on an "as available" basis.</p>
            <p className="mt-2">
              To the extent permitted by law, SelfeConnect is not responsible for indirect, incidental,
              or consequential losses arising from the use of the platform.
            </p>
            <p className="mt-2">
              Nothing in these Terms &amp; Conditions limits any liability that cannot be excluded under
              applicable law, including consumer rights protected under UK law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">9. Changes to These Terms</h2>
            <p className="mt-2">
              We may update these Terms &amp; Conditions from time to time. Where significant changes
              are made, we will provide reasonable notice where required. Continued use of SelfeConnect
              after changes are published means that you accept the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">10. Contact Us</h2>
            <p className="mt-2">
              If you have any questions about these Terms &amp; Conditions, please contact us:
            </p>
            <p className="mt-2">
              Email:{" "}
              <a className="text-primary underline" href="mailto:support@selfeconnect.com">
                support@selfeconnect.com
              </a>
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
