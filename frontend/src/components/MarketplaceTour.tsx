import { useEffect, useRef, useState } from "react";
import {
  Star,
  MessageSquare,
  CreditCard,
  BadgeCheck,
  Send,
  Check,
  Bell,
  Briefcase,
} from "lucide-react";
import { LogoMark } from "@/components/Logo";
import avatarSam from "@/assets/avatar-sam.jpg";

/**
 * A self-playing tour of the two-sided marketplace: the back-and-forth between
 * a customer and a professional. Two phones sit side by side and the action
 * hands off between them — post a job → the pro is notified → quote → messages
 * → work done + paid → a verified review — with a labelled packet flying across
 * on each handoff, so it shows the relationship, not just one screen.
 *
 * Presentational only. Plays while on screen; holds a complete still frame for
 * reduced motion.
 */

type StepKey = "post" | "respond" | "chat" | "work" | "review";

const STEPS: { key: StepKey; label: string; dir: "r" | "l"; packet: string; icon: typeof Send }[] = [
  { key: "post", label: "Post a job", dir: "r", packet: "New job", icon: Send },
  { key: "respond", label: "Pro responds", dir: "l", packet: "Quote £120", icon: MessageSquare },
  { key: "chat", label: "Message", dir: "l", packet: "Message", icon: MessageSquare },
  { key: "work", label: "Work & pay", dir: "r", packet: "Paid £120", icon: CreditCard },
  { key: "review", label: "Review", dir: "r", packet: "5★ review", icon: Star },
];

const STEP_MS = 3800;
const ARRIVE = "1000ms"; // when a handed-off card lands on the other phone

export function MarketplaceTour() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!onScreen || reduced) return;
    const t = setInterval(() => setI((n) => (n + 1) % STEPS.length), STEP_MS);
    return () => clearInterval(t);
  }, [onScreen, reduced]);

  const active = reduced ? STEPS.length - 1 : i;
  const s = STEPS[active];

  return (
    <div ref={hostRef} className="mx-auto w-full max-w-md lg:max-w-none">
      <div className="relative overflow-hidden rounded-[1.75rem] border border-border/60 bg-card shadow-elevated">
        {/* Step bar */}
        <div className="flex items-center gap-1 border-b border-border/60 bg-secondary/40 px-2.5 py-2.5 sm:gap-1.5 sm:px-4">
          {STEPS.map((st, idx) => {
            const on = idx === active;
            const Icon = st.icon;
            return (
              <div
                key={st.key}
                className={`relative flex min-w-0 flex-1 items-center justify-center gap-1 overflow-hidden rounded-lg px-1 py-1.5 text-[10px] font-semibold transition-colors sm:gap-1.5 sm:text-xs ${
                  on ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden truncate sm:inline">{st.label}</span>
                {on && !reduced && (
                  <span
                    key={active}
                    className="absolute inset-x-1 bottom-0.5 h-0.5 origin-left rounded-full bg-primary-foreground/60"
                    style={{ animation: `tab-progress ${STEP_MS}ms linear both` }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Two phones with a handoff packet between them */}
        <div className="relative flex items-center justify-center gap-3 bg-secondary/20 p-4 sm:gap-6 sm:p-6">
          <Phone label="You" role="Customer" avatar={null}>
            <CustomerScreen step={s.key} />
          </Phone>

          <Phone label="Sam Rivers" role="Plumber" avatar={avatarSam}>
            <ProScreen step={s.key} />
          </Phone>

          {/* The packet flies across on each step. */}
          {!reduced && (
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-30 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
              <span
                key={active}
                className="flex items-center gap-1 whitespace-nowrap rounded-full bg-ink px-2.5 py-1 text-[10px] font-bold text-ink-foreground shadow-elevated"
                style={{ animation: `packet-${s.dir} 1.6s 0.5s cubic-bezier(0.4,0,0.2,1) both` }}
              >
                <s.icon className="h-3 w-3 text-primary" /> {s.packet}
              </span>
            </div>
          )}
        </div>

        <p className="border-t border-border/60 px-4 py-3 text-center text-[11px] font-medium text-muted-foreground sm:text-xs">
          Post, quote, message, pay and review — the whole job between customer and professional, in one place.
        </p>
      </div>

      <p className="sr-only">
        A tour of SelfeConnect: a customer posts a job, a nearby professional is notified and sends
        a quote, they message to agree a time, the customer pays through the platform with no
        commission after the work, and leaves a verified five-star review that lifts the pro's rating.
      </p>
    </div>
  );
}

function Phone({
  label,
  role,
  avatar,
  children,
}: {
  label: string;
  role: string;
  avatar: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center" aria-hidden="true">
      <div className="mb-2 flex items-center gap-1.5">
        {avatar ? (
          <img src={avatar} alt="" className="h-4 w-4 rounded-full object-cover ring-1 ring-border/60" />
        ) : (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[7px] font-bold text-primary-foreground">
            U
          </span>
        )}
        <span className="text-[10px] font-bold text-foreground">{label}</span>
        <span className="rounded-full bg-secondary px-1.5 text-[8px] font-semibold text-muted-foreground">{role}</span>
      </div>
      <div className="pointer-events-none w-full max-w-[190px] select-none rounded-[1.9rem] bg-ink p-1.5 shadow-elevated">
        <div className="relative aspect-[9/12.5] overflow-hidden rounded-[1.55rem] bg-background">
          <div className="absolute left-1/2 top-1 z-30 h-3 w-12 -translate-x-1/2 rounded-b-lg bg-ink" />
          <div className="flex h-full flex-col px-2 pb-2 pt-4">
            <div className="flex items-center gap-1 pb-1.5">
              <LogoMark className="h-3 w-3" />
              <span className="font-display text-[8.5px] font-bold text-foreground">SelfeConnect</span>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

const arriveStyle = { animation: "tour-in .5s cubic-bezier(0.16,1,0.3,1) both", animationDelay: ARRIVE } as const;
const inStyle = (delay = 0) =>
  ({ animation: "tour-in .5s cubic-bezier(0.16,1,0.3,1) both", animationDelay: `${delay}ms` }) as const;

/* ── Customer phone ─────────────────────────────────────────────── */
function CustomerScreen({ step }: { step: StepKey }) {
  return (
    <div key={step} className="flex-1" style={inStyle()}>
      {step === "post" && (
        <Card>
          <Kicker>New job</Kicker>
          <p className="mt-1 text-[9px] font-semibold leading-tight text-foreground">Boiler not firing — Gas Safe engineer</p>
          <Tags tags={["Heating & Gas", "M1 1AE", "£120"]} />
          <Action icon={Send}>Post job</Action>
        </Card>
      )}
      {step === "respond" && (
        <div style={arriveStyle}>
          <Card highlight>
            <p className="flex items-center gap-1 text-[9px] font-semibold text-primary-hover">
              <Bell className="h-2.5 w-2.5" /> New quote
            </p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <img src={avatarSam} alt="" className="h-5 w-5 rounded-full object-cover" />
              <p className="text-[9px] font-semibold text-foreground">Sam Rivers</p>
              <span className="ml-auto font-display text-[11px] font-bold text-primary">£120</span>
            </div>
            <p className="mt-1 text-[8px] text-muted-foreground">“Can do Thursday morning.”</p>
          </Card>
        </div>
      )}
      {step === "chat" && <Chat mineRight />}
      {step === "work" && (
        <div className="flex h-full flex-col">
          <Card>
            <Kicker>Bathroom leak · Hired</Kicker>
            <Action icon={CreditCard} variant="outline">Pay through SelfeConnect</Action>
          </Card>
          <div style={arriveStyle} className="mt-2">
            <Banner icon={BadgeCheck}>Paid £120 · 100% to Sam</Banner>
          </div>
        </div>
      )}
      {step === "review" && (
        <div className="space-y-2">
          <Card>
            <p className="text-[9px] font-semibold text-foreground">How was the service?</p>
            <div className="mt-1.5 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} style={inStyle(200 + n * 120)} className="h-4 w-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="mt-1.5 text-[8px] text-muted-foreground">“Fixed it same day — tidy, fair price.”</p>
          </Card>
          <div style={arriveStyle}>
            <Banner icon={Send}>Review submitted</Banner>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Professional phone ─────────────────────────────────────────── */
function ProScreen({ step }: { step: StepKey }) {
  return (
    <div key={step} className="flex-1" style={inStyle()}>
      {step === "post" && (
        <div style={arriveStyle}>
          <Card highlight>
            <p className="flex items-center gap-1 text-[9px] font-semibold text-primary-hover">
              <Briefcase className="h-2.5 w-2.5" /> New job · 2.1 mi
            </p>
            <p className="mt-1 text-[9px] font-semibold leading-tight text-foreground">Boiler not firing — Gas Safe engineer</p>
            <Tags tags={["£120", "M1 1AE"]} />
          </Card>
        </div>
      )}
      {step === "respond" && (
        <Card>
          <Kicker>Send a quote</Kicker>
          <div className="mt-1.5 flex items-center gap-1">
            <span className="rounded-md border border-border bg-background px-1.5 py-0.5 font-display text-[11px] font-bold text-primary">£120</span>
            <span className="text-[8px] text-muted-foreground">Thursday AM</span>
          </div>
          <Action icon={Send}>Send quote</Action>
        </Card>
      )}
      {step === "chat" && <Chat mineRight={false} />}
      {step === "work" && (
        <div className="flex h-full flex-col">
          <Card>
            <Kicker>Bathroom leak</Kicker>
            <Action icon={Check}>Mark complete</Action>
          </Card>
          <div style={arriveStyle} className="mt-2">
            <Banner icon={CreditCard}>You’ve been paid £120</Banner>
          </div>
        </div>
      )}
      {step === "review" && (
        <div style={arriveStyle} className="space-y-2">
          <Banner icon={Star}>New 5★ review!</Banner>
          <Card>
            <div className="flex items-center gap-1.5">
              <img src={avatarSam} alt="" className="h-6 w-6 rounded-full object-cover ring-1 ring-border/60" />
              <div>
                <p className="text-[9px] font-semibold text-foreground">Sam Rivers</p>
                <p className="flex items-center gap-0.5 text-[9px] font-bold text-foreground">
                  <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" /> 4.9 <span className="font-medium text-muted-foreground">(39)</span>
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ── Small building blocks ──────────────────────────────────────── */
function Card({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-2 shadow-soft ${
        highlight ? "border-primary/50 bg-primary-soft/50" : "border-border/70 bg-card"
      }`}
    >
      {children}
    </div>
  );
}
function Kicker({ children }: { children: React.ReactNode }) {
  return <p className="text-[7.5px] font-semibold uppercase tracking-wide text-muted-foreground">{children}</p>;
}
function Tags({ tags }: { tags: string[] }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {tags.map((t) => (
        <span key={t} className="rounded-full bg-secondary px-1.5 py-px text-[7.5px] font-medium text-muted-foreground">
          {t}
        </span>
      ))}
    </div>
  );
}
function Action({ icon: Icon, children, variant }: { icon: typeof Send; children: React.ReactNode; variant?: "outline" }) {
  return (
    <div
      className={`mt-2 flex h-6 items-center justify-center gap-1 rounded-lg text-[8.5px] font-semibold ${
        variant === "outline"
          ? "border border-primary/40 bg-card text-primary"
          : "bg-primary text-primary-foreground"
      }`}
    >
      <Icon className="h-2.5 w-2.5" /> {children}
    </div>
  );
}
function Banner({ icon: Icon, children }: { icon: typeof Send; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-primary/40 bg-primary-soft/60 p-1.5 text-center">
      <p className="flex items-center justify-center gap-1 text-[8.5px] font-semibold text-primary-hover">
        <Icon className="h-3 w-3" /> {children}
      </p>
    </div>
  );
}
function Chat({ mineRight }: { mineRight: boolean }) {
  // The same conversation, shown from each side (the customer's bubbles sit on
  // the right of the customer's phone, and vice-versa).
  const msgs = [
    { fromCustomer: true, text: "When can you come?", delay: 0 },
    { fromCustomer: false, text: "Thursday morning works 👍", delay: 500 },
    { fromCustomer: true, text: "Perfect, thanks Sam!", delay: 1000 },
  ];
  return (
    <div className="space-y-1.5">
      {msgs.map((m, idx) => {
        const mine = m.fromCustomer === mineRight;
        return (
          <div key={idx} className="flex" style={{ justifyContent: mine ? "flex-end" : "flex-start", ...inStyle(m.delay) }}>
            <span
              className={`max-w-[86%] rounded-xl px-1.5 py-1 text-[8px] leading-snug ${
                mine ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
              }`}
            >
              {m.text}
            </span>
          </div>
        );
      })}
    </div>
  );
}
