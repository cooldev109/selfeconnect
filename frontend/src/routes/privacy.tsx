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

type Section = {
  title: string;
  paragraphs?: string[];
  // Section 2 breaks down by who the data is about, so sub-headings are needed.
  subsections?: { title: string; paragraphs: string[] }[];
};

// Wording supplied by the client. Held as data so the page renders uniformly
// and a future revision is a single edit here rather than in the markup.
const SECTIONS: Section[] = [
  {
    title: "1. Who We Are",
    paragraphs: [
      "selfeconnect.com (“we”, “us”, or “our”) is a site operated by SELFECONNECT LTD. We are registered in England and Wales under company number 17367516 and have our registered office and correspondence address at 66 Paul Street, London, EC2A 4NA. We are a limited company.",
      "SelfeConnect operates the platform, which enables self-employed professionals to receive customer feedback, ratings, and payments through personalised QR codes and tipping pages.",
      "SelfeConnect does not process payments. All payments are processed directly by Stripe. SelfeConnect only generates personalised QR codes that link Customers to the Professional's Stripe payment page.",
      "SelfeConnect acts as the data controller for the personal data processed through its platform, unless otherwise stated in this Privacy Policy.",
      "This Privacy Policy explains how we collect, use, and protect your personal data in accordance with applicable UK data protection laws, including the UK GDPR.",
    ],
  },
  {
    title: "2. Information We Collect",
    paragraphs: [
      "We collect different types of personal information depending on how you use the platform.",
    ],
    subsections: [
      {
        title: "Professionals",
        paragraphs: [
          "We may collect: name, email address, phone number, business or company information, profile photo, subscription details, and account-related information.",
        ],
      },
      {
        title: "Customers",
        paragraphs: [
          "Customers are not required to create an account when leaving a tip, review, or rating via a Professional's QR code or tipping page.",
          "However, Customers must create an account if they wish to post a job, search for Professionals, or use core platform features.",
          "When Customers interact with a Professional's QR code or tipping page, we may collect: tip amount, optional rating or review, optional name, optional message, and any other information voluntarily provided.",
        ],
      },
      {
        title: "Payment Information",
        paragraphs: [
          "Payment details are processed directly by Stripe. SelfeConnect does not store, receive, or process full card or banking details.",
        ],
      },
    ],
  },
  {
    title: "3. How We Use Your Information",
    paragraphs: [
      "We use personal data to operate the platform, including creating and managing accounts, displaying Professional profiles and QR pages, generating personalised QR codes, enabling subscriptions, enabling Stripe-based payments and payouts, displaying reviews and ratings, providing customer support, maintaining platform security, and complying with legal obligations.",
      "We do not sell personal data.",
    ],
  },
  {
    title: "4. Legal Basis for Processing",
    paragraphs: [
      "We process personal data under the following legal bases: performance of a contract when providing platform services, legitimate interests to operate and improve the platform, compliance with legal obligations, and consent where required (such as certain cookies or optional marketing communications).",
    ],
  },
  {
    title: "5. Payment Processing (Stripe)",
    paragraphs: [
      "All payments are processed directly by Stripe. Stripe acts as an independent payment processor and data controller for payment and banking information.",
      "SelfeConnect does not process, store, or control any payments. SelfeConnect only generates personalised QR codes that direct Customers to the Professional's Stripe payment interface.",
      "SelfeConnect receives only limited transaction data necessary to operate the platform, such as payment status and transaction references.",
      "Stripe processes data under its own privacy policy and terms.",
    ],
  },
  {
    title: "6. Sharing Your Information",
    paragraphs: [
      "We may share personal data with trusted service providers such as Stripe, hosting providers, analytics tools, and security providers. These providers are only given the data necessary to perform their services and are required to protect it appropriately.",
      "We do not sell or rent personal data.",
    ],
  },
  {
    title: "7. Public Profiles & QR Pages",
    paragraphs: [
      "Professional profiles, QR codes, tipping pages, reviews, and ratings may be publicly accessible as part of the service. This means information provided in these areas may be visible to anyone who accesses the platform or scans a QR code.",
    ],
  },
  {
    title: "8. Data Retention",
    paragraphs: [
      "We retain personal data only for as long as necessary to provide the service, comply with legal obligations, resolve disputes, enforce agreements, and maintain security.",
      "When data is no longer required, it will be securely deleted or anonymised where appropriate.",
    ],
  },
  {
    title: "9. Your Rights",
    paragraphs: [
      "Under UK data protection law, you have the right to request access to your personal data, request correction of inaccurate data, request deletion of your data, object to or restrict certain processing, and request data portability where applicable.",
      "You also have the right to lodge a complaint with the Information Commissioner's Office (ICO) in the United Kingdom.",
    ],
  },
  {
    title: "10. Cookies & Analytics",
    paragraphs: [
      "We may use cookies and similar technologies to operate the platform, improve performance, analyse usage, and maintain security.",
      "Where required by law, we will request consent for non-essential cookies. You may manage cookie preferences through your browser or platform settings.",
    ],
  },
  {
    title: "11. Data Security",
    paragraphs: [
      "We take reasonable technical and organisational measures to protect personal data against unauthorised access, loss, misuse, or disclosure. However, no online system can guarantee absolute security.",
    ],
  },
  {
    title: "12. Changes to This Policy",
    paragraphs: [
      "We may update this Privacy Policy from time to time. Updates will be posted on this page with a revised date.",
    ],
  },
];

function Privacy() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <LogoMark className="h-8 w-8" />
            <span className="font-display font-bold tracking-tight text-foreground">
              SelfeConnect
            </span>
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-bold text-foreground font-display">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: 28 July 2026
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/90">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="text-lg font-semibold">{s.title}</h2>
              {s.paragraphs?.map((para, i) => (
                <p key={i} className="mt-2">
                  {para}
                </p>
              ))}
              {s.subsections?.map((sub) => (
                <div key={sub.title} className="mt-4">
                  <h3 className="font-semibold text-foreground">{sub.title}</h3>
                  {sub.paragraphs.map((para, i) => (
                    <p key={i} className="mt-2">
                      {para}
                    </p>
                  ))}
                </div>
              ))}
            </section>
          ))}

          <section>
            <h2 className="text-lg font-semibold">13. Contact Us</h2>
            <p className="mt-2">
              If you have any questions about this Privacy Policy or your personal
              data, please contact us at{" "}
              <a
                className="text-primary underline"
                href="mailto:support@selfeconnect.com"
              >
                support@selfeconnect.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-10 flex gap-4 text-sm">
          <Link to="/terms" className="text-primary underline">
            Terms &amp; Conditions
          </Link>
          <Link to="/" className="text-muted-foreground underline">
            Back to home
          </Link>
        </div>
      </article>
    </main>
  );
}
