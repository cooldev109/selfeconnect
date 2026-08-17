import { createFileRoute, Link } from "@tanstack/react-router";
import { LogoMark } from "@/components/Logo";

export const Route = createFileRoute("/cancellation-policy")({
  head: () => ({
    meta: [
      { title: "Cancellation & Disputes Policy — SelfeConnect" },
      { name: "description", content: "How cancellations, disputes and reports work on SelfeConnect." },
    ],
  }),
  component: CancellationPolicy,
});

const SECTIONS: { title: string; paragraphs: string[] }[] = [
  {
    title: "1. Cancelling a job",
    paragraphs: [
      "A customer may cancel a job at any time before or during the work. We ask for a short reason so both sides have a record and so we can keep the marketplace fair.",
      "SelfeConnect only provides the technology that connects customers and professionals — any agreement about the work itself, including deposits, materials or call-out fees, is between the customer and the professional. Please agree cancellation terms directly before work begins.",
    ],
  },
  {
    title: "2. Subscriptions",
    paragraphs: [
      "Professionals subscribe monthly and can cancel at any time from their Account page. Access continues until the end of the paid billing period; subscription payments are non-refundable except where required by law.",
    ],
  },
  {
    title: "3. Raising a dispute",
    paragraphs: [
      "If something goes wrong with a job — work not completed, a no-show, a quality issue or a payment problem — either the customer or the hired professional can raise a dispute from the job in their dashboard.",
      "Our team reviews every dispute. We may contact both parties for more information before recording an outcome. Raising a dispute notifies the other party.",
    ],
  },
  {
    title: "4. Reporting a professional, customer or posting",
    paragraphs: [
      "You can report a professional, a customer or a job posting if you believe it is fake, abusive, or breaks our terms. Reports are reviewed by our team, who may remove content, warn a user, or suspend an account.",
      "Reviews can also be reported directly from a professional's profile. We remove reviews that are fake, abusive or otherwise break our rules.",
    ],
  },
  {
    title: "5. Contact",
    paragraphs: [
      "For anything urgent, email support@selfeconnect.com and our team will help.",
    ],
  },
];

function CancellationPolicy() {
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
        <h1 className="font-display text-3xl font-bold text-foreground">Cancellation &amp; Disputes Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: 17 August 2026</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/90">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="text-lg font-semibold">{s.title}</h2>
              {s.paragraphs.map((para, i) => (
                <p key={i} className="mt-2">{para}</p>
              ))}
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
