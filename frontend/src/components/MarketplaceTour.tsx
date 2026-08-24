import { useEffect, useRef, useState } from "react";
import {
  Search,
  MapPin,
  Star,
  MessageSquare,
  CreditCard,
  BadgeCheck,
  Send,
  FileText,
  Check,
  Sparkles,
  MousePointer2,
} from "lucide-react";
import { LogoMark } from "@/components/Logo";
import avatarSam from "@/assets/avatar-sam.jpg";
import avatarAisha from "@/assets/avatar-aisha.jpg";
import avatarTom from "@/assets/avatar-tom.jpg";

/**
 * A self-playing tour of the whole marketplace. A cursor tabs through the
 * journey (find → post → quote → pay → review) and taps the key action on each
 * screen, with the search typed live and a running activity feed beside it — so
 * it reads like someone actually using the product, not a slideshow.
 *
 * Presentational only. Plays while on screen; holds a complete still frame for
 * anyone who asked for reduced motion.
 */

const STEPS = [
  { key: "find", label: "Find", title: "Find a pro", icon: Search },
  { key: "post", label: "Post", title: "Post a job", icon: FileText },
  { key: "quote", label: "Quote", title: "Compare quotes", icon: MessageSquare },
  { key: "pay", label: "Pay", title: "Message & pay", icon: CreditCard },
  { key: "review", label: "Review", title: "Leave a review", icon: Star },
] as const;
type StepKey = (typeof STEPS)[number]["key"];

const EVENTS: { key: StepKey; icon: typeof Search; text: string; tone: string }[] = [
  { key: "find", icon: Search, text: 'Searched “Plumber · M1 1AE”', tone: "text-sky-600 bg-sky-100" },
  { key: "post", icon: FileText, text: "Job posted — 6 pros notified", tone: "text-violet-600 bg-violet-100" },
  { key: "quote", icon: MessageSquare, text: "Quote from Sam — £120", tone: "text-amber-600 bg-amber-100" },
  { key: "pay", icon: CreditCard, text: "Paid £120 — 100% to Sam", tone: "text-primary-hover bg-primary-soft" },
  { key: "review", icon: Star, text: "5.0 review posted", tone: "text-amber-600 bg-amber-100" },
];

const RESULTS = [
  { name: "Sam Rivers", trades: "Plumber · Electrician", rating: 4.9, count: 38, miles: "2.1", photo: avatarSam },
  { name: "Aisha Bello", trades: "Plumber", rating: 4.8, count: 21, miles: "3.4", photo: avatarAisha },
  { name: "Tom Whyte", trades: "Heating & Gas", rating: 4.7, count: 12, miles: "5.0", photo: avatarTom },
];

const STEP_MS = 3600;

export function MarketplaceTour() {
  const hostRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [onScreen, setOnScreen] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [i, setI] = useState(0);
  const [typed, setTyped] = useState({ service: "", postcode: "" });
  const [cursor, setCursor] = useState({ x: 60, y: 22 });
  const [clickKey, setClickKey] = useState(0);
  const [tapped, setTapped] = useState(false);

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
  const step = STEPS[active].key;
  const shownEvents = reduced ? EVENTS.length : active + 1;

  // Move the cursor to the tab, click it, then move in and tap the screen's
  // primary action.
  const moveToRect = (rect: DOMRect | undefined) => {
    const p = panelRef.current?.getBoundingClientRect();
    if (!rect || !p) return;
    setCursor({ x: rect.left - p.left + rect.width / 2, y: rect.top - p.top + rect.height / 2 });
  };
  useEffect(() => {
    if (reduced) return;
    setTapped(false);
    moveToRect(tabRefs.current[active]?.getBoundingClientRect());
    setClickKey((k) => k + 1);
    const t1 = setTimeout(() => {
      const tap = phoneRef.current?.querySelector<HTMLElement>("[data-tap]");
      if (tap) {
        moveToRect(tap.getBoundingClientRect());
        setClickKey((k) => k + 1);
        setTapped(true);
        setTimeout(() => setTapped(false), 220);
      }
    }, 1050);
    return () => clearTimeout(t1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, reduced]);

  // Type the search on the Find step.
  useEffect(() => {
    if (step !== "find" || reduced) {
      setTyped({ service: "Plumber", postcode: "M1 1AE" });
      return;
    }
    setTyped({ service: "", postcode: "" });
    let dead = false;
    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const type = async (txt: string, key: "service" | "postcode") => {
      for (let n = 1; n <= txt.length; n++) {
        if (dead) return;
        setTyped((t) => ({ ...t, [key]: txt.slice(0, n) }));
        await wait(70);
      }
    };
    (async () => {
      await wait(300);
      await type("Plumber", "service");
      await wait(220);
      await type("M1 1AE", "postcode");
    })();
    return () => {
      dead = true;
    };
  }, [step, reduced]);

  return (
    <div ref={hostRef} className="mx-auto w-full max-w-md lg:max-w-none">
      <div ref={panelRef} className="relative overflow-hidden rounded-[1.75rem] border border-border/60 bg-card shadow-elevated">
        {/* Step bar */}
        <div className="flex items-center gap-1 border-b border-border/60 bg-secondary/40 px-3 py-2.5 sm:gap-1.5 sm:px-4">
          {STEPS.map((s, idx) => {
            const on = idx === active;
            const Icon = s.icon;
            return (
              <div
                key={s.key}
                ref={(el) => { tabRefs.current[idx] = el; }}
                className={`relative flex min-w-0 flex-1 items-center justify-center gap-1.5 overflow-hidden rounded-lg px-1.5 py-1.5 text-[11px] font-semibold transition-colors sm:text-xs ${
                  on ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{s.label}</span>
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

        <div className="grid gap-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.82fr)]">
          {/* Phone */}
          <div ref={phoneRef} className="flex items-center justify-center bg-secondary/20 p-5 sm:p-6" aria-hidden="true">
            <div className="pointer-events-none relative w-[228px] select-none rounded-[2.1rem] bg-ink p-1.5 shadow-elevated">
              <div className="absolute left-1/2 top-1.5 z-30 h-3.5 w-16 -translate-x-1/2 rounded-b-xl bg-ink" />
              <div className="relative aspect-[9/17] overflow-hidden rounded-[1.7rem] bg-background">
                <div className="flex h-full flex-col px-2.5 pb-2.5 pt-5">
                  <div className="flex items-center gap-1.5 pb-2">
                    <LogoMark className="h-3.5 w-3.5" />
                    <span className="font-display text-[10px] font-bold text-foreground">SelfeConnect</span>
                    <span className="ml-auto text-[8px] font-semibold text-muted-foreground">
                      {STEPS[active].title}
                    </span>
                  </div>
                  <div key={step} className="flex-1" style={{ animation: "tour-in .5s cubic-bezier(0.16,1,0.3,1) both" }}>
                    <Screen step={step} typed={typed} tapped={tapped} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Activity feed */}
          <div className="border-t border-border/60 bg-card p-4 sm:border-l sm:border-t-0 sm:p-5">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Live on SelfeConnect
            </p>
            <div className="mt-3 space-y-2">
              {EVENTS.map((e, idx) => {
                const on = idx < shownEvents;
                const isNew = idx === active && !reduced;
                const Icon = e.icon;
                return (
                  <div
                    key={e.key}
                    style={isNew ? { animation: "tour-in .45s cubic-bezier(0.16,1,0.3,1) both" } : undefined}
                    className={`flex items-center gap-2.5 rounded-xl border border-border/60 bg-background/60 p-2.5 transition-all duration-500 ${
                      on ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0"
                    } ${isNew ? "ring-2 ring-primary/30" : ""}`}
                  >
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${e.tone}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-[11.5px] font-medium leading-tight text-foreground/90">{e.text}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 hidden text-[11px] leading-relaxed text-muted-foreground sm:block">
              One platform: search, post jobs, compare quotes, message, pay, and review — all in one place.
            </p>
          </div>
        </div>

        {/* The cursor that drives the tour. */}
        {!reduced && (
          <div
            className="pointer-events-none absolute z-50 hidden sm:block"
            style={{
              left: cursor.x,
              top: cursor.y,
              transform: "translate(-2px,-2px)",
              transition: "left .55s cubic-bezier(0.5,0,0.2,1), top .55s cubic-bezier(0.5,0,0.2,1)",
            }}
          >
            <span key={clickKey} className="tour-click absolute -left-3 -top-3 h-8 w-8 rounded-full" />
            <MousePointer2 className="h-5 w-5 fill-ink text-card drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]" />
          </div>
        )}
      </div>

      <p className="sr-only">
        A tour of SelfeConnect: search for a professional, post a job that notifies nearby pros,
        compare their quotes, message and pay the one you hire through the platform with no
        commission, then leave a verified review.
      </p>
    </div>
  );
}

function Screen({ step, typed, tapped }: { step: StepKey; typed: { service: string; postcode: string }; tapped: boolean }) {
  if (step === "find") return <FindScreen typed={typed} tapped={tapped} />;
  if (step === "post") return <PostScreen tapped={tapped} />;
  if (step === "quote") return <QuoteScreen tapped={tapped} />;
  if (step === "pay") return <PayScreen tapped={tapped} />;
  return <ReviewScreen />;
}

function pressCls(tapped: boolean) {
  return tapped ? "scale-95 brightness-95" : "scale-100";
}

function FindScreen({ typed, tapped }: { typed: { service: string; postcode: string }; tapped: boolean }) {
  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-border/70 bg-card p-2 shadow-soft">
        <MiniField label="Service" value={typed.service} caret={!!typed.service && typed.service !== "Plumber"} />
        <div className="h-1.5" />
        <MiniField
          label="Postcode"
          value={typed.postcode}
          caret={typed.service === "Plumber" && typed.postcode !== "M1 1AE"}
          icon={<MapPin className="h-2.5 w-2.5 text-primary" />}
        />
        <div
          data-tap
          className={`mt-2 flex h-6 items-center justify-center gap-1 rounded-lg bg-primary text-[9px] font-semibold text-primary-foreground transition-transform duration-150 ${pressCls(tapped)}`}
        >
          <Search className="h-2.5 w-2.5" /> Search
        </div>
      </div>
      <p className="text-[8px] font-semibold text-muted-foreground">3 near you</p>
      {RESULTS.map((r, idx) => (
        <div
          key={r.name}
          style={{ animation: "tour-in .5s cubic-bezier(0.16,1,0.3,1) both", animationDelay: `${900 + idx * 130}ms` }}
          className={`flex items-center gap-2 rounded-xl border bg-card p-1.5 ${
            idx === 0 ? "border-primary ring-2 ring-primary/20" : "border-border/60"
          }`}
        >
          <img src={r.photo} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-border/60" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <p className="truncate text-[9.5px] font-semibold text-foreground">{r.name}</p>
              <span className="shrink-0 rounded-full bg-secondary px-1 text-[7px] font-medium text-muted-foreground">
                {r.miles} mi
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Stars value={r.rating} />
              <span className="text-[7.5px] tabular-nums text-muted-foreground">
                {r.rating.toFixed(1)} ({r.count})
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PostScreen({ tapped }: { tapped: boolean }) {
  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-border/70 bg-card p-2 shadow-soft">
        <p className="text-[8px] font-semibold uppercase text-muted-foreground">New job</p>
        <p className="mt-1 text-[10px] font-semibold text-foreground">Boiler not firing — need a Gas Safe engineer</p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {["Heating & Gas", "M1 1AE", "£120 budget"].map((t) => (
            <span key={t} className="rounded-full bg-secondary px-1.5 py-px text-[7.5px] font-medium text-muted-foreground">
              {t}
            </span>
          ))}
        </div>
        <div
          data-tap
          className={`mt-2 flex h-6 items-center justify-center gap-1 rounded-lg bg-primary text-[9px] font-semibold text-primary-foreground transition-transform duration-150 ${pressCls(tapped)}`}
        >
          <Send className="h-2.5 w-2.5" /> Post job
        </div>
      </div>
      <div style={{ animation: "tour-in .5s cubic-bezier(0.16,1,0.3,1) both", animationDelay: "1150ms" }} className="rounded-xl border border-primary/40 bg-primary-soft/50 p-2.5">
        <p className="flex items-center gap-1 text-[9.5px] font-semibold text-primary-hover">
          <Check className="h-3 w-3" /> Posted — notifying 6 nearby pros
        </p>
        <div className="mt-1.5 flex -space-x-1.5">
          {[avatarSam, avatarAisha, avatarTom].map((a, idx) => (
            <img key={idx} src={a} alt="" className="h-5 w-5 rounded-full object-cover ring-2 ring-card" />
          ))}
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[7px] font-bold text-ink-foreground ring-2 ring-card">
            +3
          </span>
        </div>
      </div>
    </div>
  );
}

function QuoteScreen({ tapped }: { tapped: boolean }) {
  const quotes = [
    { name: "Sam Rivers", photo: avatarSam, price: "£120", note: "Can do Thursday AM.", hire: true },
    { name: "Aisha Bello", photo: avatarAisha, price: "£140", note: "Available this week.", hire: false },
  ];
  return (
    <div className="space-y-2">
      <p className="text-[8px] font-semibold text-muted-foreground">2 quotes received</p>
      {quotes.map((q, idx) => (
        <div
          key={q.name}
          style={{ animation: "tour-in .5s cubic-bezier(0.16,1,0.3,1) both", animationDelay: `${idx * 160}ms` }}
          className={`rounded-xl border bg-card p-2 ${q.hire ? "border-primary ring-2 ring-primary/20" : "border-border/60"}`}
        >
          <div className="flex items-center gap-1.5">
            <img src={q.photo} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-border/60" />
            <p className="text-[9.5px] font-semibold text-foreground">{q.name}</p>
            <span className="ml-auto font-display text-[11px] font-bold text-primary">{q.price}</span>
          </div>
          <p className="mt-1 text-[8px] text-muted-foreground">{q.note}</p>
          {q.hire && (
            <div
              data-tap
              className={`mt-1.5 flex h-5 items-center justify-center gap-1 rounded-lg bg-primary text-[8.5px] font-semibold text-primary-foreground transition-transform duration-150 ${pressCls(tapped)}`}
            >
              <Check className="h-2.5 w-2.5" /> Hire Sam
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function PayScreen({ tapped }: { tapped: boolean }) {
  return (
    <div className="flex h-full flex-col">
      <div className="space-y-1.5">
        <Bubble mine={false} delay={0}>Hi! I can come Thursday morning.</Bubble>
        <Bubble mine delay={350}>Perfect, thanks Sam!</Bubble>
      </div>
      <div className="mt-auto space-y-1.5">
        <div
          data-tap
          className={`flex h-6 items-center justify-center gap-1 rounded-lg border border-primary/40 bg-card text-[9px] font-semibold text-primary transition-transform duration-150 ${pressCls(tapped)}`}
        >
          <CreditCard className="h-2.5 w-2.5" /> Pay through SelfeConnect
        </div>
        <div style={{ animation: "tour-in .5s cubic-bezier(0.16,1,0.3,1) both", animationDelay: "1200ms" }} className="rounded-lg bg-primary-soft/60 p-1.5 text-center">
          <p className="flex items-center justify-center gap-1 text-[9px] font-semibold text-primary-hover">
            <BadgeCheck className="h-3 w-3" /> Paid £120 · 100% to Sam
          </p>
        </div>
      </div>
    </div>
  );
}

function ReviewScreen() {
  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-border/70 bg-card p-2.5 shadow-soft">
        <p className="text-[9px] font-semibold text-foreground">How was the service?</p>
        <div className="mt-1.5 flex gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              style={{ animation: "tour-in .35s cubic-bezier(0.16,1,0.3,1) both", animationDelay: `${300 + s * 130}ms` }}
              className="h-5 w-5 fill-amber-400 text-amber-400"
            />
          ))}
        </div>
        <p className="mt-1.5 text-[8.5px] text-muted-foreground">“Fixed it same day — tidy, fair price.”</p>
      </div>
      <div style={{ animation: "tour-in .5s cubic-bezier(0.16,1,0.3,1) both", animationDelay: "1100ms" }} className="rounded-xl border border-primary/40 bg-primary-soft/50 p-2.5">
        <p className="flex items-center gap-1 text-[9.5px] font-semibold text-primary-hover">
          <BadgeCheck className="h-3 w-3" /> Verified review posted
        </p>
        <div className="mt-1.5 flex items-center gap-1.5">
          <img src={avatarSam} alt="" className="h-6 w-6 rounded-full object-cover ring-1 ring-border/60" />
          <p className="text-[9px] font-semibold text-foreground">Sam Rivers</p>
          <span className="ml-auto flex items-center gap-0.5 text-[9px] font-bold text-foreground">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> 4.9 (39)
          </span>
        </div>
      </div>
    </div>
  );
}

function Bubble({ mine, delay, children }: { mine: boolean; delay: number; children: React.ReactNode }) {
  return (
    <div className="flex" style={{ justifyContent: mine ? "flex-end" : "flex-start", animation: "tour-in .4s cubic-bezier(0.16,1,0.3,1) both", animationDelay: `${delay}ms` }}>
      <span
        className={`max-w-[85%] rounded-2xl px-2 py-1 text-[8.5px] leading-snug ${
          mine ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
        }`}
      >
        {children}
      </span>
    </div>
  );
}

function MiniField({ label, value, caret, icon }: { label: string; value: string; caret?: boolean; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/70 bg-background px-2 py-1">
      <p className="text-[7.5px] font-semibold uppercase leading-none text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1">
        {icon}
        <span className={`text-[9.5px] font-medium ${value ? "text-foreground" : "text-muted-foreground/60"}`}>
          {value || "…"}
        </span>
        {caret && <span className="inline-block h-2.5 w-px animate-[--animate-caret] bg-primary" />}
      </div>
    </div>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-px">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-1.5 w-1.5 ${s <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </span>
  );
}
