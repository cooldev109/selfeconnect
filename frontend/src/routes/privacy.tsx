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
        <p className="mt-2 text-sm text-muted-foreground">Last updated: 27 June 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="text-lg font-semibold">1. Who We Are</h2>
            <p className="mt-2">
              SelfeConnect ("we", "us", or "our") operates the SelfeConnect platform, which enables
              self-employed professionals to receive digital tips, customer feedback, and ratings
              through personalised QR codes and tipping pages.
            </p>
            <p className="mt-2">
              This Privacy Policy explains what personal information we collect, how we use it, how we
              protect it, and how we handle your personal data.
            </p>
            <p className="mt-2">
              SelfeConnect is responsible for managing the personal information processed through our
              platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">2. Information We Collect</h2>
            <p className="mt-2">
              We may collect different types of personal information depending on how you use
              SelfeConnect.
            </p>
            <h3 className="mt-4 font-semibold text-foreground">Professionals</h3>
            <p className="mt-1">We may collect:</p>
            <ul className="mt-1 list-disc space-y-1 pl-6">
              <li>name;</li>
              <li>email address;</li>
              <li>phone number;</li>
              <li>business or company information;</li>
              <li>profile photo;</li>
              <li>subscription details;</li>
              <li>account and payment-related information.</li>
            </ul>
            <h3 className="mt-4 font-semibold text-foreground">Customers</h3>
            <p className="mt-1">
              When Customers leave a tip or interact with a Professional's tipping page, we may
              collect:
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-6">
              <li>tip amount;</li>
              <li>optional rating or review;</li>
              <li>optional name;</li>
              <li>optional message;</li>
              <li>other information voluntarily provided by the Customer.</li>
            </ul>
            <p className="mt-2">Customers are not required to create an account to leave a tip.</p>
            <h3 className="mt-4 font-semibold text-foreground">Payment Information</h3>
            <p className="mt-1">
              Card and bank details are entered directly with our payment provider, Stripe.
              SelfeConnect does not store full payment card details on its own servers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">3. How We Use Your Information</h2>
            <p className="mt-2">We use personal information to:</p>
            <ul className="mt-1 list-disc space-y-1 pl-6">
              <li>create and manage Professional accounts;</li>
              <li>provide and operate the SelfeConnect platform;</li>
              <li>display Professional tipping pages;</li>
              <li>process tips and payouts;</li>
              <li>show Professionals their ratings, reviews, and received tips;</li>
              <li>provide customer support;</li>
              <li>maintain platform security;</li>
              <li>comply with legal and regulatory obligations.</li>
            </ul>
            <p className="mt-2">We do not sell your personal information.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">4. Payment Processing</h2>
            <p className="mt-2">
              Payments and payouts are securely processed by Stripe. Stripe processes payment and
              banking information under its own privacy policy and terms.
            </p>
            <p className="mt-2">
              SelfeConnect receives only limited transaction information, such as payment status and
              information required to manage transactions and display relevant details to
              Professionals.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">5. Sharing Your Information</h2>
            <p className="mt-2">
              We may share personal information with trusted service providers that help us operate
              SelfeConnect, including:
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-6">
              <li>payment processors;</li>
              <li>hosting providers;</li>
              <li>security and technology providers;</li>
              <li>analytics providers where applicable.</li>
            </ul>
            <p className="mt-2">
              We only share information necessary for these services and require providers to handle
              personal data appropriately.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">6. Data Security</h2>
            <p className="mt-2">
              We take reasonable technical and organisational measures to protect personal information
              against unauthorised access, loss, misuse, or disclosure. However, no online service can
              guarantee complete security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">7. Data Retention</h2>
            <p className="mt-2">
              We keep personal information only for as long as necessary to provide our services,
              maintain accounts, comply with legal obligations, resolve disputes, and enforce our
              agreements. When information is no longer required, it will be securely deleted or
              anonymised where appropriate.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">8. Cookies &amp; Analytics</h2>
            <p className="mt-2">
              SelfeConnect may use cookies and similar technologies to improve website functionality,
              understand usage, and maintain platform security. Where required by law, we will request
              consent before using non-essential cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">9. Changes to This Privacy Policy</h2>
            <p className="mt-2">
              We may update this Privacy Policy from time to time. Any changes will be published on
              this page with an updated revision date.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">10. Contact Us</h2>
            <p className="mt-2">
              If you have questions about this Privacy Policy or how we handle your personal
              information, please contact:
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
          <Link to="/terms" className="text-primary underline">Terms &amp; Conditions</Link>
          <Link to="/" className="text-muted-foreground underline">Back to home</Link>
        </div>
      </article>
    </main>
  );
}
