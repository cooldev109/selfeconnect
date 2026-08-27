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

// Wording supplied by the client. Held as data so the page renders uniformly
// and a future revision is a single edit here rather than in the markup.
const SECTIONS: { title: string; paragraphs: string[] }[] = [
  {
    title: "1. About SelfeConnect",
    paragraphs: [
      "selfeconnect.com (“we”, “us”, or “our”) is a site operated by SELFECONNECT LTD. We are registered in England and Wales under company number 17367516 and have our registered office and correspondence address at 66 Paul Street, London, EC2A 4NA. We are a limited company.",
      "SelfeConnect is an online technology platform that connects customers, businesses and independent professionals. Customers can create an account, publish jobs and connect directly with local Professionals. After publishing their first job, Customers may also access the platform's Professional search features and Customer dashboard. Professionals can create profiles, browse available jobs, connect with Customers and, as an optional feature, receive cashless customer payments and tips through their personal QR code using Stripe Connect.",
      "SelfeConnect only provides the technology that enables these connections. SelfeConnect is not an employer, recruitment agency, staffing agency, contractor, broker, or party to any agreement between Customers and Professionals. Any agreement, negotiation, pricing, payment arrangements, or business relationship exists solely between the Customer and the Professional.",
      "By creating an account or using the platform, you agree to these Terms & Conditions.",
    ],
  },
  {
    title: "2. Customer Accounts",
    paragraphs: [
      "Customers may create an account free of charge. Customers may publish job opportunities and communicate directly with Professionals. After publishing their first job, Customers may access additional platform features, including the Professional search functionality and Customer dashboard.",
      "Customers are responsible for ensuring that all information they provide is accurate, lawful and up to date.",
      "SelfeConnect does not endorse or recommend any Professional. Customers remain solely responsible for selecting, verifying and engaging any Professional, including deciding whether to carry out their own checks before engaging them.",
    ],
  },
  {
    title: "3. Professional Accounts & Subscription",
    paragraphs: [
      "Professionals subscribe to SelfeConnect on a monthly basis. The standard subscription price is £9.49 per month. The price that applies to you will always be displayed before you complete checkout.",
      "From time to time, SelfeConnect may offer promotional campaigns, introductory offers, discounts, free-access periods or other special subscription offers. Where available, the applicable offer, price, duration and any relevant conditions will be displayed in the Pricing area of the platform or during the subscription process.",
      "Unless otherwise stated as part of a specific promotional offer, subscriptions renew automatically at the applicable subscription price until cancelled. Professionals may cancel at any time.",
      "The subscription provides access to the platform only and does not guarantee work, customers, bookings or earnings.",
      "By subscribing, Professionals acknowledge and agree that subscription payments are non-refundable, except where required by law. Access is granted for the duration of the applicable paid or promotional subscription period.",
    ],
  },
  {
    title: "4. Marketplace",
    paragraphs: [
      "SelfeConnect operates solely as an online marketplace where Customers and Professionals may find and communicate with each other. All agreements, pricing, payment methods and services are arranged directly between Customers and Professionals.",
      "Customers and Professionals are free to agree between themselves how much will be paid and which payment method will be used. As an optional feature, payments may be made through the platform using Stripe Connect and a Professional's QR code.",
      "SelfeConnect does not charge commission on payments made between Customers and Professionals.*",
      "*Stripe processing fees may apply to payments processed through Stripe. These fees are charged by Stripe and are separate from SelfeConnect.",
    ],
  },
  {
    title: "5. No Guarantee of Work",
    paragraphs: [
      "SelfeConnect does not guarantee job opportunities, applications, bookings, agreements, income, earnings, availability of Professionals, response times, or business success.",
    ],
  },
  {
    title: "6. Professional Verification",
    paragraphs: [
      "SelfeConnect may offer optional verification features for Professionals, including checks relating to identity, insurance, qualifications, email address and telephone number.",
      "Where a verification has been completed, a corresponding badge or status may be displayed on the Professional's profile. Verification is optional and Professionals may use the platform without completing all available verification checks, subject to any platform requirements that may apply.",
      "Professionals are solely responsible for the authenticity, accuracy, validity and completeness of any documents or information they submit for verification.",
      "SelfeConnect performs only limited or light checks on information and documents submitted through the platform. A verification badge does not constitute a guarantee or endorsement by SelfeConnect of a Professional's identity, qualifications, insurance, competence, experience, suitability, trustworthiness or the authenticity or continuing validity of any document.",
      "Customers remain responsible for carrying out any checks or due diligence they consider appropriate before engaging a Professional and may request further evidence or verification directly from the Professional.",
    ],
  },
  {
    title: "7. Stripe Connect, QR Code & Payments",
    paragraphs: [
      "Professionals may connect a Stripe account through Stripe Connect in order to receive payments and voluntary tips from their customers.",
      "The use of SelfeConnect's payment functionality is optional. Customers and Professionals remain responsible for agreeing directly between themselves the amount to be paid and the method of payment.",
      "SelfeConnect does not charge commission on payments or tips processed through the platform.*",
      "Payments made via QR code, Apple Pay, Google Pay, or supported card payment methods are processed by Stripe and paid to the Professional's connected Stripe account, subject to Stripe's own terms, availability, processing requirements and fees.",
      "SelfeConnect does not hold or control funds processed by Stripe and is not a bank, financial institution or money transmitter. Professionals are responsible for complying with Stripe's applicable terms and requirements.",
      "*Stripe processing fees apply where applicable. These fees are charged by Stripe and are separate from SelfeConnect.",
    ],
  },
  {
    title: "8. Stripe Fees",
    paragraphs: [
      "SelfeConnect does not charge commission on payments or tips processed through Stripe Connect or a Professional's SelfeConnect QR code.",
      "Stripe may charge payment processing or other applicable fees for transactions processed using its services. These fees are determined and collected by Stripe and may vary depending on factors such as payment method, card type, region, currency or the Professional's Stripe account.",
      "Professionals are responsible for reviewing Stripe's current pricing, terms and applicable fee structure.",
      "References on the SelfeConnect website to “no commission” or similar wording refer to SelfeConnect's own commission and do not mean that third-party payment processing is free of Stripe fees.",
    ],
  },
  {
    title: "9. Professional Dashboard, QR Code & Marketing Materials",
    paragraphs: [
      "Upon subscription, Professionals are granted access to a personal dashboard. The dashboard may include a unique personal QR code linked to their Stripe account, the ability to accept supported card payments, Apple Pay and Google Pay via Stripe, and a downloadable flyer or leaflet containing their QR code for offline use.",
      "Professionals may use these materials in physical or digital environments to receive payments or voluntary tips from their customers. SelfeConnect does not charge commission on these payments or tips.*",
      "Customers may also use the QR code to leave reviews and, where available, make optional payments or tips.",
      "*Stripe processing fees may apply to payments processed through Stripe.",
    ],
  },
  {
    title: "10. Ratings & Reviews",
    paragraphs: [
      "Reviews reflect the opinions of their authors. Users are solely responsible for the content they publish.",
      "SelfeConnect may remove content that is unlawful, abusive, misleading, fraudulent, or inappropriate. SelfeConnect is not responsible for any user-generated content, including reviews and ratings.",
    ],
  },
  {
    title: "11. User Responsibilities",
    paragraphs: [
      "Users must provide accurate and lawful information. Users agree not to create fake accounts or impersonate others, post fake reviews or misleading content, misuse the platform or attempt to bypass its systems, or commit fraud or unlawful activity.",
      "Users must comply with all applicable laws when using the platform.",
      "Professionals must ensure that information, documents, qualifications, insurance details and other materials submitted to SelfeConnect are genuine, accurate, current and not misleading.",
    ],
  },
  {
    title: "12. Independent Relationship",
    paragraphs: [
      "Professionals operate as independent businesses. Nothing in these Terms creates an employment, agency, partnership, or joint venture relationship between SelfeConnect and any user.",
    ],
  },
  {
    title: "13. Suspension & Termination",
    paragraphs: [
      "SelfeConnect may suspend or terminate accounts that violate these Terms or engage in harmful, fraudulent, misleading or illegal activity.",
      "SelfeConnect may also remove or withdraw verification badges where information appears to be inaccurate, expired, misleading or no longer satisfies the applicable verification requirements.",
    ],
  },
  {
    title: "14. Intellectual Property",
    paragraphs: [
      "All platform software, branding, logos, and content remain the property of SelfeConnect. Users may not copy, reproduce, or distribute any part of the platform without permission.",
    ],
  },
  {
    title: "15. Disclaimer",
    paragraphs: [
      "SelfeConnect only provides the technology platform. SelfeConnect is not responsible for the quality, safety or legality of work or services provided by Professionals, disputes between users, payment arrangements between users, cancellations, injuries or damages, fraud or misconduct by users, or agreements made between Customers and Professionals.",
      "Any verification badge or status displayed on a Professional's profile reflects only the limited verification process carried out by SelfeConnect in relation to the information or documentation submitted. It does not constitute an endorsement, recommendation, warranty or guarantee of the Professional or their services.",
      "Customers remain responsible for deciding whether a Professional is suitable for their requirements and for carrying out any additional checks they consider appropriate.",
    ],
  },
  {
    title: "16. Limitation of Liability",
    paragraphs: [
      "The platform is provided “as is” and “as available”. To the fullest extent permitted by law, SelfeConnect shall not be liable for any indirect, incidental, or consequential damages.",
      "Total liability of SelfeConnect shall not exceed the subscription fees paid by the affected user during the previous 12 months, except where prohibited by law.",
    ],
  },
  {
    title: "17. Changes to Terms",
    paragraphs: [
      "We may update these Terms at any time. Continued use of the platform after changes constitutes acceptance of the updated Terms.",
    ],
  },
  {
    title: "18. Reviews & Account Data After Cancellation",
    paragraphs: [
      "If a Professional cancels their subscription, their profile may be deactivated or removed from the platform. In such cases, reviews and ratings associated with the Professional may no longer be publicly visible or retained on the platform.",
      "If a Professional later rejoins SelfeConnect, they must create a new profile and rebuild their reputation and review history.",
    ],
  },
  {
    title: "19. Governing Law",
    paragraphs: [
      "These Terms are governed by the laws of England and Wales. The courts of England and Wales shall have exclusive jurisdiction over any disputes, except where applicable law provides otherwise.",
    ],
  },
];

function Terms() {
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
          Terms &amp; Conditions
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: 23 August 2026
        </p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/90">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="text-lg font-semibold text-foreground">{s.title}</h2>
              {s.paragraphs.map((para, i) => (
                <p key={i} className="mt-2">
                  {para}
                </p>
              ))}
            </section>
          ))}

          <section>
            <h2 className="text-lg font-semibold text-foreground">20. Contact Us</h2>
            <p className="mt-2">
              Email:{" "}
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
          <Link to="/privacy" className="text-primary underline">
            Privacy Policy
          </Link>
          <Link to="/" className="text-muted-foreground underline">
            Back to home
          </Link>
        </div>
      </article>
    </main>
  );
}
