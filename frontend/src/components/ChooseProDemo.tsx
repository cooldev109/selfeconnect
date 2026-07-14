import { useEffect, useRef, useState } from "react";
import { BadgeCheck, MapPin, Phone, Search, Star } from "lucide-react";
import { LogoMark } from "@/components/Logo";

/**
 * A phone that demonstrates choosing a professional, start to finish: the search
 * is typed, results come back, one is tapped, their profile opens.
 *
 * It plays itself and nothing in it can be clicked. That is the point — the
 * static mock this replaced painted real-looking "View profile" buttons that did
 * nothing when pressed, which reads as a broken site rather than a picture of
 * one. A phone that runs on its own is unmistakably a preview.
 *
 * It only runs while it is on screen, and holds a single still frame for anyone
 * who asked for reduced motion.
 */

const SERVICE = "Plumber";
const POSTCODE = "M1 1AE";

const RESULTS = [
  { name: "Sam Rivers", trades: "Plumber · Electrician", rating: 4.9, count: 38, miles: "2.1" },
  { name: "Aisha Bello", trades: "Plumber", rating: 4.8, count: 21, miles: "3.4" },
  { name: "Tom Whyte", trades: "Heating & Gas", rating: 4.7, count: 12, miles: "5.0" },
];
const CHOSEN = RESULTS[0];

type Phase =
  | "idle"
  | "service"
  | "postcode"
  | "search"
  | "loading"
  | "results"
  | "pick"
  | "tap"
  | "profile";

// Where the fingertip rests in each phase, as a % of the screen.
const POINTER: Record<Phase, { x: number; y: number; show: boolean }> = {
  idle: { x: 80, y: 100, show: false },
  service: { x: 58, y: 20, show: true },
  postcode: { x: 58, y: 29, show: true },
  search: { x: 50, y: 38, show: true },
  loading: { x: 50, y: 38, show: false },
  results: { x: 50, y: 38, show: false },
  pick: { x: 50, y: 53, show: true },
  tap: { x: 50, y: 53, show: true },
  profile: { x: 50, y: 53, show: false },
};

const initials = (n: string) =>
  n.split(" ").map((w) => w[0]).join("");

export function ChooseProDemo() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(false);
  const [reduced, setReduced] = useState(false);

  const [phase, setPhase] = useState<Phase>("idle");
  const [service, setService] = useState("");
  const [postcode, setPostcode] = useState("");

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Don't animate a phone nobody is looking at.
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setOnScreen(e.isIntersecting),
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!onScreen || reduced) return;
    let dead = false;
    const wait = (ms: number) =>
      new Promise<void>((r) => setTimeout(r, ms));

    const type = async (text: string, set: (s: string) => void) => {
      for (let i = 1; i <= text.length; i++) {
        if (dead) return;
        set(text.slice(0, i));
        await wait(85);
      }
    };

    (async () => {
      while (!dead) {
        setPhase("idle");
        setService("");
        setPostcode("");
        await wait(900);
        if (dead) return;

        setPhase("service");
        await type(SERVICE, setService);
        await wait(350);
        if (dead) return;

        setPhase("postcode");
        await type(POSTCODE, setPostcode);
        await wait(350);
        if (dead) return;

        setPhase("search");
        await wait(550);
        setPhase("loading");
        await wait(800);
        setPhase("results");
        await wait(1600);
        setPhase("pick");
        await wait(800);
        setPhase("tap");
        await wait(380);
        setPhase("profile");
        await wait(3200);
      }
    })();

    return () => {
      dead = true;
    };
  }, [onScreen, reduced]);

  // A still, complete frame for reduced motion: the result of the whole flow.
  const still = reduced;
  const showResults =
    still || ["results", "pick", "tap", "profile"].includes(phase);
  const showProfile = still || phase === "profile";
  const typingService = phase === "service";
  const typingPostcode = phase === "postcode";
  const pressed = phase === "search";
  const picking = phase === "pick" || phase === "tap";
  const ptr = POINTER[phase];

  return (
    <div ref={hostRef} className="flex flex-col items-center">
      {/* Presentational only — it is a moving picture, not a control. */}
      <div
        aria-hidden="true"
        className="pointer-events-none relative w-[248px] select-none rounded-[2.4rem] bg-ink p-2 shadow-elevated sm:w-[268px]"
      >
        {/* Screen */}
        <div className="relative aspect-[9/18] overflow-hidden rounded-[1.9rem] bg-background">
          {/* Notch */}
          <div className="absolute left-1/2 top-0 z-30 h-4 w-20 -translate-x-1/2 rounded-b-xl bg-ink" />

          <div className="flex h-full flex-col px-3 pb-3 pt-6">
            {/* App bar */}
            <div className="flex items-center gap-1.5 pb-2">
              <LogoMark className="h-4 w-4" />
              <span className="font-display text-[11px] font-bold text-foreground">
                SelfeConnect
              </span>
            </div>

            {/* Search card */}
            <div className="rounded-xl border border-border/70 bg-card p-2 shadow-soft">
              <Field
                label="Service"
                // The still frame is the end of the flow, so it shows the search
                // already filled in — not an empty form under a full profile.
                value={still ? SERVICE : service}
                typing={typingService}
                placeholder="What do you need?"
              />
              <div className="h-1.5" />
              <Field
                label="Postcode"
                value={still ? POSTCODE : postcode}
                typing={typingPostcode}
                placeholder="Your postcode"
                icon={<MapPin className="h-2.5 w-2.5 text-primary" />}
              />
              <div
                className={`mt-2 flex h-7 items-center justify-center gap-1 rounded-lg bg-primary text-[10px] font-semibold text-primary-foreground transition-transform duration-150 ${
                  pressed ? "scale-95 brightness-90" : "scale-100"
                }`}
              >
                <Search className="h-2.5 w-2.5" /> Search
              </div>
            </div>

            {/* Results */}
            <div className="relative mt-2.5 flex-1">
              {phase === "loading" && !still && (
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="flex animate-pulse items-center gap-2 rounded-xl border border-border/60 bg-card p-2"
                    >
                      <div className="h-7 w-7 shrink-0 rounded-full bg-muted" />
                      <div className="flex-1 space-y-1">
                        <div className="h-1.5 w-2/3 rounded bg-muted" />
                        <div className="h-1.5 w-1/2 rounded bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showResults && (
                <div className="space-y-2">
                  <p className="text-[9px] font-semibold text-muted-foreground">
                    3 near you
                  </p>
                  {RESULTS.map((r, i) => (
                    <div
                      key={r.name}
                      style={{ transitionDelay: still ? "0ms" : `${i * 110}ms` }}
                      className={`flex items-center gap-2 rounded-xl border bg-card p-2 transition-all duration-500 ${
                        showResults
                          ? "translate-y-0 opacity-100"
                          : "translate-y-2 opacity-0"
                      } ${
                        picking && i === 0
                          ? "border-primary ring-2 ring-primary/25"
                          : "border-border/60"
                      }`}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[9px] font-bold text-primary">
                        {initials(r.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <p className="truncate text-[10px] font-semibold text-foreground">
                            {r.name}
                          </p>
                          <span className="shrink-0 rounded-full bg-secondary px-1 py-px text-[7px] font-medium text-muted-foreground">
                            {r.miles} mi
                          </span>
                        </div>
                        <div className="mt-px flex items-center gap-1">
                          <Stars value={r.rating} />
                          <span className="text-[8px] tabular-nums text-muted-foreground">
                            {r.rating.toFixed(1)} ({r.count})
                          </span>
                        </div>
                        <p className="truncate text-[8px] text-muted-foreground">
                          {r.trades}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* The chosen professional's profile rises over the results as a
                  full-bleed bottom sheet — edge to edge, like the real thing, so
                  nothing behind it peeks out at the margins. */}
              <div
                className={`absolute -bottom-3 -left-3 -right-3 top-0 rounded-t-2xl border-t border-border/70 bg-card px-3 pt-2.5 shadow-elevated transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  showProfile ? "translate-y-0" : "translate-y-[115%]"
                }`}
              >
                <div className="mx-auto mb-2 h-0.5 w-8 rounded-full bg-border" />
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[11px] font-bold text-primary">
                    {initials(CHOSEN.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-display text-[12px] font-bold text-foreground">
                      {CHOSEN.name}
                    </p>
                    <div className="flex items-center gap-1">
                      <Stars value={CHOSEN.rating} />
                      <span className="text-[8px] tabular-nums text-muted-foreground">
                        {CHOSEN.rating.toFixed(1)} ({CHOSEN.count})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-2 space-y-1">
                  {[
                    { s: 5, pct: 84 },
                    { s: 4, pct: 12 },
                    { s: 3, pct: 4 },
                  ].map((b) => (
                    <div key={b.s} className="flex items-center gap-1">
                      <span className="w-1.5 text-[7px] text-muted-foreground">
                        {b.s}
                      </span>
                      <span className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                        <span
                          className="block h-full rounded-full bg-amber-400 transition-[width] duration-700 ease-out"
                          style={{ width: showProfile ? `${b.pct}%` : "0%" }}
                        />
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-2 rounded-lg bg-secondary/60 p-1.5">
                  <p className="inline-flex items-center gap-0.5 text-[7px] font-semibold text-primary">
                    <BadgeCheck className="h-2 w-2" /> Hired on SelfeConnect
                  </p>
                  <p className="mt-0.5 text-[8px] leading-snug text-foreground/80">
                    "Fixed a leak the same day. Tidy, fair price."
                  </p>
                </div>

                <div className="mt-2 flex h-6 items-center justify-center gap-1 rounded-lg bg-primary text-[9px] font-semibold text-primary-foreground">
                  <Phone className="h-2.5 w-2.5" /> Call Sam
                </div>
                <p className="mt-1 text-center text-[7px] text-muted-foreground">
                  No commission. You pay Sam directly.
                </p>
              </div>
            </div>
          </div>

          {/* The fingertip */}
          {!still && (
            <div
              className="absolute z-40 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{
                left: `${ptr.x}%`,
                top: `${ptr.y}%`,
                opacity: ptr.show ? 1 : 0,
              }}
            >
              <span
                className={`block h-6 w-6 rounded-full bg-ink/20 ring-2 ring-ink/30 backdrop-blur-[1px] transition-transform duration-200 ${
                  phase === "tap" || phase === "search" ? "scale-75" : "scale-100"
                }`}
              />
            </div>
          )}
        </div>
      </div>

      <p className="mt-4 max-w-[19rem] text-center text-xs text-muted-foreground">
        A preview of the real app — search, compare on reviews, then call them
        yourself.
      </p>

      {/* What the animation conveys, for anyone who can't see it. */}
      <p className="sr-only">
        Example: searching for a plumber near M1 1AE returns three nearby
        professionals with star ratings; opening one shows their review breakdown
        and their phone number, which you call directly with no commission.
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  typing,
  placeholder,
  icon,
}: {
  label: string;
  value: string;
  typing: boolean;
  placeholder: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-background px-2 py-1">
      {/* No letter-spacing: at this size it opens visible gaps mid-word. */}
      <p className="text-[8px] font-semibold uppercase leading-none text-muted-foreground">
        {label}
      </p>
      <div className="flex items-center gap-1">
        {icon}
        <span
          className={`text-[10px] ${
            value ? "font-medium text-foreground" : "text-muted-foreground/70"
          }`}
        >
          {value || placeholder}
        </span>
        {typing && (
          <span className="inline-block h-2.5 w-px animate-[--animate-caret] bg-primary" />
        )}
      </div>
    </div>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-px">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-1.5 w-1.5 ${
            i <= Math.round(value)
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/30"
          }`}
        />
      ))}
    </span>
  );
}
