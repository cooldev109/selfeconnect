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

// A content block is either a paragraph (string) or a bulleted list.
type Block = string | { list: string[] };
type Section = {
  title: string;
  blocks?: Block[];
  // Section 2 breaks down by who the data is about, so sub-headings are needed.
  subsections?: { title: string; blocks: Block[] }[];
};

// Wording supplied by the client. Held as data so the page renders uniformly
// and a future revision is a single edit here rather than in the markup.
const SECTIONS: Section[] = [
  {
    title: "1. Who We Are",
    blocks: [
      "selfeconnect.com (“we”, “us”, or “our”) is a site operated by SELFECONNECT LTD. We are registered in England and Wales under company number 17367516 and have our registered office and correspondence address at 66 Paul Street, London, EC2A 4NA. We are a limited company.",
      "SelfeConnect operates an online technology platform that connects Customers with independent Professionals. The platform enables Customers to create accounts, post jobs, search for Professionals after posting their first job, communicate with Professionals, leave reviews and ratings, and make optional payments or tips. Professionals can create profiles, browse available jobs, communicate with Customers, complete optional verification checks, receive reviews and ratings, and use optional Stripe-based payment features, including personalised QR codes.",
      "Payments made through the platform are processed by Stripe. SelfeConnect does not store full card or banking details and does not hold Customer funds.",
      "SelfeConnect acts as the data controller for the personal data processed through its platform, unless otherwise stated in this Privacy Policy.",
      "This Privacy Policy explains how we collect, use and protect your personal data in accordance with applicable UK data protection laws, including the UK GDPR and the Data Protection Act 2018.",
    ],
  },
  {
    title: "2. Information We Collect",
    blocks: [
      "We collect different types of personal information depending on how you use the platform.",
    ],
    subsections: [
      {
        title: "Professionals",
        blocks: [
          "We may collect information including:",
          {
            list: [
              "name",
              "email address",
              "telephone number",
              "business or company information",
              "location and service area",
              "profile photo and other profile information",
              "professional experience and services offered",
              "subscription and account information",
              "reviews and ratings",
              "communications and interactions made through the platform",
              "information relating to jobs, quotes or other interactions with Customers",
            ],
          },
          "Where a Professional chooses to use our optional verification features, we may also collect information and documents relating to:",
          {
            list: [
              "identity verification",
              "insurance",
              "professional qualifications or certifications",
              "email verification",
              "telephone number verification",
            ],
          },
          "Documents submitted for verification may contain additional personal information. We use this information for verification, fraud prevention, platform security and related purposes.",
          "Where a verification has been completed, a corresponding verification badge or status may be displayed on the Professional's public profile. The underlying documents submitted for verification, such as identification documents, insurance documents or qualification certificates, are not made publicly available through the Professional's profile.",
        ],
      },
      {
        title: "Customers",
        blocks: [
          "Customers may create an account to post jobs and access core platform features. After posting their first job, Customers may also access Professional search functionality and their Customer dashboard.",
          "We may collect information including:",
          {
            list: [
              "name",
              "email address",
              "telephone number",
              "account information",
              "job descriptions and requirements",
              "job location or service area",
              "information voluntarily included in a job posting",
              "communications and interactions with Professionals",
              "reviews and ratings",
              "other information voluntarily provided through the platform",
            ],
          },
          "Customers are not required to create an account solely to interact with certain QR code features, where those features are available without an account.",
          "When Customers interact with a Professional's QR code or payment page, we may collect information such as payment or tip amount, optional rating or review, optional name, optional message and other information voluntarily provided.",
        ],
      },
      {
        title: "Payment Information",
        blocks: [
          "Payment details are processed by Stripe. SelfeConnect does not store or receive full card numbers or full banking credentials.",
          "We may receive limited information relating to transactions where necessary to operate the platform, such as payment status, transaction references, amounts, dates and other limited payment-related information provided by Stripe.",
        ],
      },
    ],
  },
  {
    title: "3. How We Use Your Information",
    blocks: [
      "We use personal data where necessary to operate and provide the SelfeConnect platform and its features.",
      "This may include:",
      {
        list: [
          "creating and managing Customer and Professional accounts",
          "enabling Customers to post and manage jobs",
          "enabling Professionals to browse and respond to available jobs",
          "enabling Customers to search for Professionals",
          "displaying Professional profiles",
          "facilitating communication between Customers and Professionals",
          "providing Professional verification features and displaying verification badges",
          "generating and operating personalised QR codes",
          "enabling subscriptions",
          "enabling optional Stripe-based payments and payouts",
          "displaying reviews and ratings",
          "providing customer support",
          "preventing fraud, misuse and unlawful activity",
          "maintaining platform security",
          "administering and improving the platform",
          "complying with legal and regulatory obligations",
        ],
      },
      "We do not sell personal data.",
    ],
  },
  {
    title: "4. Legal Basis for Processing",
    blocks: [
      "We process personal data under one or more lawful bases depending on the circumstances and the type of processing involved.",
      "These may include:",
      {
        list: [
          "Performance of a contract — where processing is necessary to provide the platform and services you request",
          "Legitimate interests — where necessary to operate, secure, administer and improve the platform, prevent fraud and support our business, provided those interests are not overridden by your rights and interests",
          "Legal obligations — where processing is necessary to comply with applicable laws or regulatory requirements",
          "Consent — where consent is required, including for certain cookies, optional marketing communications or other processing where consent is the appropriate legal basis",
        ],
      },
      "Where processing is based on consent, you may withdraw your consent at any time, without affecting processing carried out before withdrawal.",
    ],
  },
  {
    title: "5. Payment Processing (Stripe)",
    blocks: [
      "Payments made using SelfeConnect's optional payment features are processed by Stripe through Stripe Connect.",
      "Stripe may act as an independent data controller for payment, identity, banking and other information it processes in connection with its payment services.",
      "SelfeConnect does not store full card or banking details and does not hold or control Customer funds processed through Stripe.",
      "SelfeConnect may provide payment functionality within the platform, including personalised QR codes and payment links, and may receive limited transaction information from Stripe where necessary to operate the service, such as transaction amounts, payment status and transaction references.",
      "Stripe processes personal data in accordance with its own privacy policy and applicable terms.",
    ],
  },
  {
    title: "6. Sharing Your Information",
    blocks: [
      "We may share personal data with trusted third-party service providers where necessary to operate the platform. These may include payment providers such as Stripe, hosting and infrastructure providers, email and communication providers, analytics services, security providers and other technology providers supporting the operation of SelfeConnect.",
      "Where third-party services are used to support verification, fraud prevention or security checks, relevant information may also be shared with those providers where necessary.",
      "We may also disclose information where required by law, regulation, court order or another lawful authority, or where reasonably necessary to protect the rights, safety or security of SelfeConnect, our users or others.",
      "Service providers are given only the information reasonably necessary to perform their services and are expected to handle personal data appropriately and securely.",
      "We do not sell or rent personal data.",
    ],
  },
  {
    title: "7. Public Profiles, Jobs & QR Pages",
    blocks: [
      "Certain information provided through SelfeConnect may be visible to other users or publicly accessible, depending on the feature being used.",
      "Professional profiles may display information such as the Professional's name or business name, profile photo, services, service area, experience, reviews, ratings and verification badges.",
      "Verification badges may indicate that a particular verification process has been completed. Documents and sensitive information submitted to SelfeConnect for verification purposes, such as identification documents, insurance documentation or qualification evidence, are not displayed publicly through the Professional's profile.",
      "Information contained in job postings may be made available to relevant Professionals through the platform for the purpose of connecting Customers with Professionals. Customers should avoid including unnecessary sensitive or confidential personal information in job descriptions, messages or other content that may be visible to Professionals.",
      "Professional QR pages, reviews and ratings may also be accessible to users who access the relevant page or scan the Professional's QR code.",
    ],
  },
  {
    title: "8. Data Retention",
    blocks: [
      "We retain personal data only for as long as reasonably necessary for the purposes for which it was collected, including providing the service, maintaining accounts and platform records, complying with legal obligations, resolving disputes, preventing fraud, enforcing agreements and maintaining security.",
      "Verification information and documents are retained only for as long as reasonably necessary for verification, security, fraud prevention, legal or regulatory purposes.",
      "The appropriate retention period may vary depending on the type of information, the reason it was collected and any applicable legal requirements.",
      "When personal data is no longer required, it will be securely deleted or anonymised where appropriate.",
    ],
  },
  {
    title: "9. Your Rights",
    blocks: [
      "Under UK data protection law, you may have the right, depending on the circumstances, to:",
      {
        list: [
          "request access to personal data we hold about you",
          "request correction of inaccurate or incomplete personal data",
          "request deletion of your personal data",
          "request restriction of certain processing",
          "object to certain processing",
          "request transfer or portability of certain personal data",
          "withdraw consent where processing is based on consent",
          "lodge a complaint with the Information Commissioner's Office (ICO)",
        ],
      },
      "These rights may be subject to legal limitations or exceptions depending on the circumstances and the lawful basis on which the information is processed.",
      "Requests relating to your personal data may be made using the contact details provided below.",
    ],
  },
  {
    title: "10. Cookies & Analytics",
    blocks: [
      "We may use cookies and similar technologies to operate the platform, maintain security, remember preferences, improve performance and understand how the platform is used.",
      "Where required by law, we will request consent before using non-essential cookies or similar technologies.",
      "You may manage cookie preferences through available platform settings, your browser settings or any cookie controls provided on the website.",
    ],
  },
  {
    title: "11. Data Security",
    blocks: [
      "We take reasonable technical and organisational measures designed to protect personal data against unauthorised access, alteration, loss, misuse or disclosure.",
      "Access to personal information is limited where appropriate to those who require it for legitimate business or operational purposes.",
      "However, no online service, method of transmission or electronic storage can guarantee absolute security.",
    ],
  },
  {
    title: "12. Changes to This Policy",
    blocks: [
      "We may update this Privacy Policy from time to time to reflect changes to the platform, our practices, legal requirements or other operational reasons.",
      "Updates will be posted on this page with a revised “Last updated” date.",
    ],
  },
];

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((blk, i) =>
        typeof blk === "string" ? (
          <p key={i} className="mt-2">
            {blk}
          </p>
        ) : (
          <ul key={i} className="mt-2 list-disc space-y-1 pl-5 marker:text-primary">
            {blk.list.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        ),
      )}
    </>
  );
}

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
        <h1 className="text-3xl font-bold text-foreground font-display">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: 23 August 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/90">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="text-lg font-semibold text-foreground">{s.title}</h2>
              {s.blocks && <Blocks blocks={s.blocks} />}
              {s.subsections?.map((sub) => (
                <div key={sub.title} className="mt-4">
                  <h3 className="font-semibold text-foreground">{sub.title}</h3>
                  <Blocks blocks={sub.blocks} />
                </div>
              ))}
            </section>
          ))}

          <section>
            <h2 className="text-lg font-semibold text-foreground">13. Contact Us</h2>
            <p className="mt-2">
              If you have any questions about this Privacy Policy, wish to exercise your data
              protection rights, or have concerns about how your personal data is handled, please
              contact us at{" "}
              <a className="text-primary underline" href="mailto:support@selfeconnect.com">
                support@selfeconnect.com
              </a>
              .
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
