import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  Sparkles,
  Briefcase,
  Search,
  Check,
  ArrowRight,
  QrCode,
  Star,
  Lock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Wrench,
  Zap,
  Leaf,
  Hammer,
  Paintbrush,
  Home as HomeIcon,
  Truck,
  Car,
  Scissors,
  Dumbbell,
  Camera,
  GraduationCap,
  KeyRound,
  HardHat,
  Bug,
  Dog,
} from "lucide-react";
import { usePricing, gbp } from "@/hooks/usePricing";
import { Logo, LogoMark } from "@/components/Logo";
import { Button, Input } from "@/components/shared";
import { CategorySelect } from "@/components/CategoryPicker";
import { PostcodeInput } from "@/components/PostcodeInput";
import { ChooseProDemo } from "@/components/ChooseProDemo";
import { RatingSummary, ReviewCard, StarRow } from "@/components/Reviews";
import { getCategories } from "@/lib/categories";
import { api } from "@/lib/api";
import heroImg from "@/assets/hero.jpg";
import proTradesman from "@/assets/pro-tradesman.jpg";
// Browse-by-service photography (Pexels licence: commercial use, no attribution)
import svcPlumber from "@/assets/svc-plumber.jpg";
import svcElectrician from "@/assets/svc-electrician.jpg";
import svcCleaner from "@/assets/svc-cleaner.jpg";
import svcGardener from "@/assets/svc-gardener.jpg";
import svcCarpenter from "@/assets/svc-carpenter.jpg";
import svcPainter from "@/assets/svc-painter-decorator.jpg";
import svcHandyman from "@/assets/svc-handyman.jpg";
import svcRoofer from "@/assets/svc-roofer.jpg";
import svcRemovals from "@/assets/svc-removals.jpg";
import svcMechanic from "@/assets/svc-mechanic.jpg";
import svcHairdresser from "@/assets/svc-hairdresser.jpg";
import svcTrainer from "@/assets/svc-personal-trainer.jpg";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// The dozen services shown as tiles. Names are inlined so the grid renders in
// the server HTML (first paint + crawlers) rather than waiting on JS; the API
// then supplies the true total and the remaining services.
const FEATURED: { slug: string; name: string }[] = [
  { slug: "plumber", name: "Plumber" },
  { slug: "electrician", name: "Electrician" },
  { slug: "cleaner", name: "Cleaner" },
  { slug: "gardener", name: "Gardener" },
  { slug: "carpenter", name: "Carpenter & Joiner" },
  { slug: "painter-decorator", name: "Painter & Decorator" },
  { slug: "handyman", name: "Handyman" },
  { slug: "roofer", name: "Roofer" },
  { slug: "removals", name: "Removals" },
  { slug: "mechanic", name: "Mechanic" },
  { slug: "hairdresser", name: "Hairdresser" },
  { slug: "personal-trainer", name: "Personal Trainer" },
];
const FEATURED_SLUGS = FEATURED.map((f) => f.slug);

// One photo per trade, each showing that trade actually at work — which is what
// a browse-by-service card should show, rather than the QR handoff used
// elsewhere. Sourced from Pexels (free for commercial use, no attribution) and
// normalised to a single 3:4 crop and grade so they read as one set.
const SERVICE_PHOTOS: Record<string, string> = {
  plumber: svcPlumber,
  electrician: svcElectrician,
  cleaner: svcCleaner,
  gardener: svcGardener,
  carpenter: svcCarpenter,
  "painter-decorator": svcPainter,
  handyman: svcHandyman,
  roofer: svcRoofer,
  removals: svcRemovals,
  mechanic: svcMechanic,
  hairdresser: svcHairdresser,
  "personal-trainer": svcTrainer,
};

const SERVICE_ICONS: Record<string, typeof Wrench> = {
  plumber: Wrench,
  electrician: Zap,
  cleaner: Sparkles,
  gardener: Leaf,
  carpenter: Hammer,
  "painter-decorator": Paintbrush,
  handyman: Hammer,
  roofer: HomeIcon,
  removals: Truck,
  mechanic: Car,
  hairdresser: Scissors,
  "personal-trainer": Dumbbell,
  photographer: Camera,
  tutor: GraduationCap,
  locksmith: KeyRound,
  builder: HardHat,
  "pest-control": Bug,
  "dog-walker": Dog,
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SelfeConnect — Hire trusted local professionals" },
      {
        name: "description",
        content:
          "Find reviewed local professionals — plumbers, electricians, cleaners, gardeners and 50+ more. Free to search, free to post a job. Professionals: one flat monthly fee, no commission, no lead fees.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const pricing = usePricing();
  const [proId, setProId] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [heroService, setHeroService] = useState("");
  const [heroPostcode, setHeroPostcode] = useState("");
  const navigate = useNavigate();

  // The real service list — so the page can never advertise a service we
  // don't actually offer.
  const categoriesQ = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const allServices = categoriesQ.data ?? [];
  const totalServices = allServices.length;
  // Tiles render from the inlined list straight away; once the API answers we
  // prefer its names so they can't drift from what's really in the catalogue.
  const featured = FEATURED.map((f) => {
    const live = allServices.find((c) => c.slug === f.slug);
    return live ? { slug: live.slug, name: live.name } : f;
  });
  const rest = allServices.filter((c) => !FEATURED_SLUGS.includes(c.slug));
  const [showAllServices, setShowAllServices] = useState(false);

  // Anyone may search — no account, no wall. The sign-up is asked for later,
  // at the point it actually buys something (seeing contact details).
  const runSearch = (category?: string, postcode?: string) => {
    navigate({
      to: "/customer/search",
      search: { category: category || undefined, postcode: postcode || undefined },
    });
  };

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(heroService, heroPostcode.trim());
  };

  // Every service card is a live control, not decoration.
  const goToService = (slug: string) => runSearch(slug);

  // ── The service rail ──────────────────────────────────────────────
  // Drifts right-to-left on its own, but stays a normal scroll container so
  // touch, trackpad and drag all still work in both directions. The cards are
  // rendered twice and the scroll position wraps at the width of one set, so
  // the loop is seamless in either direction.
  const railRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const wrapRef = useRef(0);
  const dragRef = useRef({ active: false, startX: 0, startScroll: 0, moved: false });

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;

    // One "set" is the distance from the first card to its duplicate.
    const measure = () => {
      const kids = el.children;
      const n = featured.length;
      if (kids.length >= n + 1) {
        wrapRef.current =
          (kids[n] as HTMLElement).offsetLeft - (kids[0] as HTMLElement).offsetLeft;
      }
    };
    measure();
    el.scrollLeft = 1; // off zero, so a leftward wrap is detectable
    const ro = new ResizeObserver(measure);
    ro.observe(el);

    // Someone who asked for less motion shouldn't get a moving carousel.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let last = performance.now();
    const SPEED = 22; // px/sec — a slow drift, not a conveyor belt

    const wrap = () => {
      const w = wrapRef.current;
      if (w <= 0) return;
      if (el.scrollLeft >= w) el.scrollLeft -= w;
      else if (el.scrollLeft <= 0) el.scrollLeft = w - 1;
    };

    // scrollLeft is rounded to whole pixels, so a sub-pixel increment per frame
    // would round straight back and the rail would never move. Carry the
    // fraction across frames and only ever apply whole pixels.
    let carry = 0;
    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const idle = !pausedRef.current && !dragRef.current.active && !reduce.matches;
      if (idle) {
        carry += SPEED * dt;
        const px = Math.floor(carry);
        if (px > 0) {
          carry -= px;
          el.scrollLeft += px;
        }
      } else {
        carry = 0;
      }
      wrap();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [featured.length]);

  const pause = () => { pausedRef.current = true; };
  const resume = () => { pausedRef.current = false; };

  // Drag-to-scroll for mice; touch devices already pan natively.
  //
  // Capture is taken only once the pointer has actually travelled. Capturing on
  // pointerdown would retarget the click to the rail and a plain card click
  // would do nothing at all.
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const el = railRef.current;
    if (!el) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      moved: false,
    };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    const el = railRef.current;
    if (!d.active || !el) return;
    const dx = e.clientX - d.startX;
    if (!d.moved && Math.abs(dx) > 4) {
      d.moved = true;
      // Now it's a drag — keep receiving events even if the cursor leaves.
      el.setPointerCapture(e.pointerId);
    }
    if (d.moved) el.scrollLeft = d.startScroll - dx;
  };
  const endDrag = (e: React.PointerEvent) => {
    const el = railRef.current;
    if (el?.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    dragRef.current.active = false;
    // `moved` only needs to survive long enough to swallow the click this very
    // drag is about to emit. Clearing it after that keeps the next real click
    // from being eaten.
    window.setTimeout(() => {
      dragRef.current.moved = false;
    }, 0);
  };

  const scrollRail = (dir: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    pause();
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: "smooth" });
    window.setTimeout(resume, 900);
  };

  const handleTipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = proId.trim().toUpperCase();
    if (!id) return;
    setLookupError(null);
    setChecking(true);
    try {
      await api(`/drivers/${id}`);
      navigate({ to: "/tip/$driverId", params: { driverId: id } });
    } catch {
      setLookupError("No professional found with that ID. Please check and try again.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
          <Link to="/" className="flex min-w-0 items-center">
            <Logo withTagline={false} />
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
            <a href="#how-it-works" className="transition-colors hover:text-foreground">
              For customers
            </a>
            <a href="#professionals" className="transition-colors hover:text-foreground">
              For professionals
            </a>
            <a href="#pricing" className="transition-colors hover:text-foreground">
              Pricing
            </a>
          </nav>
          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            <Link
              to="/login"
              className="whitespace-nowrap text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Log in
            </Link>
            <Button asChild size="sm" className="shrink-0 rounded-xl">
              <Link to="/signup">
                <span className="sm:hidden">Join</span>
                <span className="hidden sm:inline">Join as a professional</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-mesh opacity-60" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-14 lg:grid-cols-[1.05fr_0.9fr] lg:items-stretch lg:py-20">
          <div className="animate-fade-up lg:flex lg:flex-col lg:justify-center">
            <span className="inline-flex w-fit items-center gap-1.5 self-start rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-semibold text-primary-hover">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Reviewed &amp; recommended by real customers
            </span>
            <h1 className="mt-6 text-[2.6rem] font-extrabold tracking-tight text-foreground font-display sm:text-[3.4rem]">
              Find a trusted{" "}
              <span className="text-primary">professional</span> near you.
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-muted-foreground">
              Plumbers, electricians, cleaners, man and van and local professionals
              across many services. Search by service and postcode, read real
              reviews, and get in touch directly.
            </p>

            {/* Primary action */}
            <form
              onSubmit={handleHeroSearch}
              className="mt-8 rounded-2xl border border-border/70 bg-card p-3 shadow-elevated"
            >
              <div className="grid gap-2 sm:grid-cols-[1.2fr_1fr_auto]">
                <CategorySelect
                  value={heroService}
                  onChange={setHeroService}
                  placeholder="What do you need?"
                />
                <PostcodeInput
                  value={heroPostcode}
                  onChange={setHeroPostcode}
                  placeholder="Your postcode"
                  ariaLabel="Your postcode"
                  className="h-11 rounded-xl"
                />
                <Button type="submit" className="h-11 rounded-xl px-6 text-sm font-semibold">
                  <Search className="mr-1.5 h-4 w-4" /> Search
                </Button>
              </div>
            </form>

            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-primary" /> Free to search
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-primary" /> Free to post a job
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-primary" /> No commission, ever
              </span>
            </div>

            <p className="mt-7 text-sm text-muted-foreground">
              Are you a professional?{" "}
              <Link to="/signup" className="font-semibold text-primary hover:underline">
                Join and find work near you →
              </Link>
            </p>
          </div>

          {/* A single illustration of the whole product: local professionals of
              every trade, matched to customers through the app, with ratings and
              a verified badge. It already contains its own review card, so no
              overlay is layered on it. */}
          <div className="mx-auto w-full max-w-md animate-fade-up lg:max-w-none lg:self-center">
            <img
              src={heroImg}
              alt="SelfeConnect connects people with reviewed local professionals — plumbers, electricians, gardeners, cleaners and painters — through one app, matched by service and postcode."
              width={1122}
              height={1206}
              className="h-auto w-full select-none"
              draggable={false}
            />
          </div>
        </div>
      </section>

      {/* ── Browse by service ──────────────────────────────────────
          Every service is a live control: clicking one runs the search.
          The list comes from the API, so it can never drift from reality. */}
      <section className="border-y border-border/60 bg-secondary/40">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="text-center">
            <p className="eyebrow text-primary">Browse by service</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground font-display sm:text-4xl">
              Whatever you need doing.
            </h2>
            <p className="mx-auto mt-3 text-base text-muted-foreground">
              {totalServices > 0
                ? `${totalServices} services, one platform. Pick one to see who's near you.`
                : "Over 50 services, one platform. Pick one to see who's near you."}
            </p>
          </div>

          {/* A single rail of image cards that flows left and right. */}
          <div className="relative mt-10">
            <button
              type="button"
              aria-label="Scroll services left"
              onClick={() => scrollRail(-1)}
              className="absolute -left-4 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-elevated transition hover:border-primary hover:text-primary sm:flex"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Scroll services right"
              onClick={() => scrollRail(1)}
              className="absolute -right-4 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-elevated transition hover:border-primary hover:text-primary sm:flex"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div
              ref={railRef}
              onMouseEnter={pause}
              onMouseLeave={() => {
                dragRef.current.active = false;
                resume();
              }}
              // Keyboard users get the same courtesy as mouse users: a card you
              // have tabbed to should hold still.
              onFocusCapture={pause}
              onBlurCapture={resume}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onTouchStart={pause}
              onTouchEnd={resume}
              className="no-scrollbar flex cursor-grab gap-4 overflow-x-auto pb-2 active:cursor-grabbing"
              style={{ touchAction: "pan-x" }}
            >
              {/* Rendered twice: the second set is what the loop wraps onto. */}
              {[...featured, ...featured].map((c, i) => {
                const Icon = SERVICE_ICONS[c.slug] ?? Wrench;
                const photo = SERVICE_PHOTOS[c.slug];
                const dupe = i >= featured.length;
                return (
                  <button
                    key={`${c.slug}-${i}`}
                    type="button"
                    tabIndex={dupe ? -1 : 0}
                    aria-hidden={dupe || undefined}
                    onClick={() => {
                      // Swallow the click that a drag emits on release.
                      if (dragRef.current.moved) return;
                      goToService(c.slug);
                    }}
                    className="group relative aspect-[3/4] w-40 shrink-0 select-none overflow-hidden rounded-2xl border border-border/60 bg-ink shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-elevated sm:w-44"
                  >
                    {photo ? (
                      <img
                        src={photo}
                        alt=""
                        loading="lazy"
                        draggable={false}
                        className="pointer-events-none absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-primary/25 blur-2xl" />
                        <Icon className="relative h-12 w-12 text-primary" strokeWidth={1.5} />
                      </span>
                    )}
                    {/* One dark foot on every card — photo or not — so the rail
                        reads as one set rather than two. */}
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/85 to-transparent p-3 pt-10 text-left">
                      <span className="block text-sm font-bold leading-tight text-ink-foreground">
                        {c.name}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-primary opacity-0 transition group-hover:opacity-100">
                        Find one near you <ArrowRight className="h-3 w-3" />
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {rest.length > 0 && (
            <div className="mt-8 text-center">
              {!showAllServices ? (
                <button
                  type="button"
                  onClick={() => setShowAllServices(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-ink-foreground transition hover:opacity-90"
                >
                  Show all {totalServices} services
                  <ChevronDown className="h-4 w-4" />
                </button>
              ) : (
                <div className="animate-fade-up">
                  <div className="flex flex-wrap justify-center gap-2">
                    {rest.map((c) => (
                      <button
                        key={c.slug}
                        type="button"
                        onClick={() => goToService(c.slug)}
                        className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground/75 transition hover:border-primary hover:text-primary"
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAllServices(false)}
                    className="mt-6 text-sm font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Show fewer
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Two ways in ────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <div className="text-center">
          <p className="eyebrow text-primary">Two ways in</p>
          <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-extrabold tracking-tight text-foreground font-display sm:text-4xl">
            Whether you need the work, or need it done.
          </h2>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-5 sm:grid-cols-2">
          <PathCard
            icon={Search}
            title="I need a professional"
            body="Search reviewed local pros by service and area, or post a job for free and let them come to you."
            points={[
              "Search by service & postcode",
              "Read real, verified reviews",
              "Contact them directly — no middleman",
            ]}
            cta="Find a professional"
            to="/customer/signup"
            variant="outline"
            footer={{ text: "Have an account?", link: "Log in", to: "/customer/login" }}
          />
          <PathCard
            icon={Briefcase}
            title="I am a professional"
            body="Find local jobs, collect reviews from every customer, and keep 100% of your tips and payments."
            points={[
              "Find local jobs in your trade or let customers find you.",
              "Your own QR code for reviews, payments, and tips.",
              `${gbp(pricing.amountGbp)}/month — no commission, no lead fees`,
            ]}
            cta="Join as a professional"
            to="/signup"
            variant="default"
            footer={{ text: "Already a member?", link: "Log in", to: "/login" }}
          />
        </div>
      </section>

      {/* ── For customers: how hiring works ────────────────────── */}
      <section
        id="how-it-works"
        className="scroll-mt-20 border-y border-border/60 bg-secondary/40"
      >
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="text-center">
            <p className="eyebrow text-primary">For customers</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground font-display sm:text-4xl">
              Hiring someone, without the guesswork.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
              Free to search, free to post a job, and no one takes a cut of what you
              pay your professional.
            </p>
          </div>

          <div className="mt-14 grid items-center gap-12 lg:grid-cols-2">
            <ol className="space-y-7">
              <Numbered
                n={1}
                title="Search, or post the job"
                body="Search by service and postcode to see who's nearby — or describe the job once, for free, and let professionals in that trade find you."
              />
              <Numbered
                n={2}
                title="Compare on real reviews"
                body="Every professional has a public profile with their rating, their star breakdown, and reviews from customers who actually hired them."
              />
              <Numbered
                n={3}
                title="Contact them directly"
                body="Call or email them yourself. There's no middleman, no bidding war, and we never take a percentage of the price you agree."
              />
              <Numbered
                n={4}
                title="Leave a review afterwards"
                body="Mark the job as filled, then rate the professional you hired — free, no tip required. That's what helps the next customer choose."
              />
            </ol>

            <ChooseProDemo />
          </div>
        </div>
      </section>

      {/* ── For professionals: find work + build reputation ─────── */}
      <section id="professionals" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="text-center">
            <p className="eyebrow text-primary">For professionals</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground font-display sm:text-4xl">
              Two ways SelfeConnect pays for itself.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
              Win work you'd never have heard about — and turn the customers you
              already have into the reviews that win you the next ones.
            </p>
          </div>

          {/* Pillar 1 — the job board */}
          <div className="mt-14 grid items-center gap-14 lg:grid-cols-2">
            <div>
              <span className="eyebrow text-muted-foreground">01 — Find work</span>
              <h3 className="mt-2 text-2xl font-bold text-foreground font-display sm:text-3xl">
                Local jobs, on your dashboard the day they're posted.
              </h3>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Customers post jobs in your trades and near your postcode. You see
                them the moment they land, nearest first, and unlock the customer's
                details when you want the job.
              </p>
              <ul className="mt-6 space-y-4">
                <Feature
                  icon={Briefcase}
                  title="Nearest first, in your trades only"
                  body="Filter by distance and service, so you're not wading through work you'd never take."
                />
                <Feature
                  icon={Lock}
                  title="Unlock the contact, not a lead fee"
                  body="Your subscription unlocks every job. We never charge per lead, and we never sell the same job to eight of your competitors."
                />
              </ul>
            </div>
            <div>
              <JobBoardPreview />
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Example job board — this is the real SelfeConnect layout.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pillar 2 — reputation (the QR half) ────────────────── */}
      <section
        id="reputation"
        className="scroll-mt-20 border-y border-border/60 bg-secondary/40"
      >
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 py-20 sm:py-24 lg:grid-cols-2">
          <div>
            <span className="eyebrow text-muted-foreground">
              02 — Build reputation
            </span>
            <h3 className="mt-2 text-2xl font-bold text-foreground font-display sm:text-3xl">
              The reviews you earn offline win you work online.
            </h3>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Hand your QR code to the customers you already have. They rate you in
              seconds — no app, no payment required — and those reviews build the
              public profile that new customers see when they search.
            </p>
            <ul className="mt-7 space-y-4">
              <Feature
                icon={QrCode}
                title="Collect reviews from day one"
                body="Your QR works with the customers you have today — you don't need to wait for the platform to find you any."
              />
              <Feature
                icon={Star}
                title="Rating without a tip"
                body="Customers can leave a review without paying a penny. Tipping is optional — and entirely theirs to choose."
              />
              <Feature
                icon={ShieldCheck}
                title="Verified, not anonymous"
                body="Reviews from customers who hired you on SelfeConnect are marked as verified, so they carry real weight."
              />
            </ul>
          </div>

          {/* A preview of the real profile UI — same components the app uses. */}
          <div className="relative">
            <div className="absolute -inset-5 -z-10 rounded-[2rem] bg-mesh opacity-70 blur-2xl" />
            <div className="overflow-hidden rounded-[1.75rem] border border-border/60 shadow-elevated">
              <div className="relative bg-ink p-6">
                <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />
                <div className="relative flex items-center gap-4">
                  <img
                    src={proTradesman}
                    alt=""
                    className="h-16 w-16 rounded-2xl object-cover ring-2 ring-white/15"
                  />
                  <div>
                    <p className="font-display text-xl font-bold text-ink-foreground">
                      Sam Rivers
                    </p>
                    <p className="text-sm text-ink-muted">Plumber · Electrician</p>
                  </div>
                </div>
              </div>
              <div className="space-y-5 bg-card p-6">
                <RatingSummary
                  avgRating={4.9}
                  reviewCount={38}
                  breakdown={{ "5": 33, "4": 4, "3": 1, "2": 0, "1": 0 }}
                />
                <ReviewCard
                  review={{
                    rating: 5,
                    comment:
                      "Fixed our boiler the same day and left the place spotless. Clear about the cost up front.",
                    author: "Helen W.",
                    date: "2026-06-20T10:00:00.000Z",
                    verified: true,
                    hired: true,
                  }}
                />
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Example profile — this is the real SelfeConnect layout.
            </p>
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────── */}
      <section id="pricing" className="scroll-mt-20 bg-ink">
        <div className="relative mx-auto max-w-6xl overflow-hidden px-6 py-20 sm:py-24">
          <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative grid items-center gap-12 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="eyebrow text-primary">Professional subscription</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink-foreground font-display sm:text-4xl">
                One flat fee. No commission. No lead fees.
              </h2>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-muted">
                Everything for one price — find work, collect reviews, build your
                reputation, receive payments, and accept tips. We never take a
                percentage of your payments or tips, and we never charge you for a
                lead that goes nowhere.
              </p>
              <ul className="mt-7 grid gap-3 sm:grid-cols-2">
                {[
                  "Browse & unlock nearby jobs",
                  "Your own QR code & public profile",
                  "Unlimited customer reviews",
                  "Keep 100% of every payment and tip",
                ].map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-ink-foreground/90"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-8 text-center backdrop-blur">
              {pricing.founding ? (
                <p className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                  <Sparkles className="h-3.5 w-3.5" /> Founding member rate
                </p>
              ) : null}
              <p className="font-display text-6xl font-extrabold tracking-tight text-ink-foreground tabular-nums">
                {gbp(pricing.amountGbp)}
              </p>
              <p className="mt-1 text-sm text-ink-muted">per month · cancel anytime</p>
              {pricing.founding ? (
                <p className="mt-3 text-xs leading-relaxed text-ink-muted">
                  {pricing.spotsLeft !== null
                    ? `Only ${pricing.spotsLeft} founding ${pricing.spotsLeft === 1 ? "place" : "places"} left. `
                    : ""}
                  Our first {pricing.foundingCap} professionals keep this price for as long
                  as they stay subscribed. After that it&rsquo;s{" "}
                  {gbp(pricing.standardAmountGbp)}/month.
                </p>
              ) : null}
              <Button
                asChild
                size="lg"
                className="mt-6 h-12 w-full rounded-xl text-base font-semibold"
              >
                <Link to="/signup">
                  Join as a professional <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-ink-muted">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Secure payments
                by Stripe
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Been given a code? ─────────────────────────────────── */}
      <section className="border-b border-border/60 bg-secondary/40">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 py-14 text-center sm:flex-row sm:text-left">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <QrCode className="h-6 w-6" />
          </span>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground font-display">
              Been given a professional's code?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter their 5-character ID to leave a review — and a tip, if you'd
              like to.
            </p>
          </div>
          <form onSubmit={handleTipSubmit} className="w-full sm:w-auto">
            <div className="flex gap-2">
              <Input
                value={proId}
                onChange={(e) => setProId(e.target.value)}
                placeholder="5HQN7"
                aria-label="Professional's 5-character ID"
                className="h-11 w-full rounded-xl text-center text-base font-semibold uppercase tracking-[0.3em] placeholder:tracking-[0.3em] sm:w-40"
                maxLength={10}
              />
              <Button
                type="submit"
                variant="outline"
                disabled={checking}
                className="h-11 shrink-0 rounded-xl border-primary/40 font-semibold text-primary hover:bg-primary-soft"
              >
                {checking ? "Checking…" : "Rate & tip"}
              </Button>
            </div>
            {lookupError && (
              <p className="mt-2 text-xs text-destructive" role="alert">
                {lookupError}
              </p>
            )}
          </form>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 py-20 sm:py-24">
        <div className="text-center">
          <p className="eyebrow text-primary">FAQ</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground font-display">
            Common questions
          </h2>
        </div>
        <Accordion type="single" collapsible className="mt-10">
          <AccordionItem value="cost-to-customer">
            <AccordionTrigger>What does it cost me as a customer?</AccordionTrigger>
            <AccordionContent>
              Nothing. Searching is free, posting a job is free, and we take no
              commission on what you pay your professional — you agree the price
              with them directly and pay them directly.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="who-pays">
            <AccordionTrigger>Who handles payment for the job itself?</AccordionTrigger>
            <AccordionContent>
              You and the professional do — exactly as you would today. SelfeConnect
              does not hold, process, or take a percentage of the money for the work.
              The price and payment arrangements are agreed directly between you and
              the professional.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="customers-sign-up">
            <AccordionTrigger>Do customers need an account to review me?</AccordionTrigger>
            <AccordionContent>
              Customers create a free account to post a job or search for
              professionals. Once they've found and hired someone, they can leave a
              review, making every review verified rather than anonymous. They can
              also leave a tip in just a few seconds — no app download required.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="tip-required">
            <AccordionTrigger>Does a customer have to tip to leave a review?</AccordionTrigger>
            <AccordionContent>
              No. Rating and reviewing is completely free — tipping is separate and
              entirely optional. Most reviews cost the customer nothing.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="how-paid">
            <AccordionTrigger>How do I get paid?</AccordionTrigger>
            <AccordionContent>
              <p>
                Payment for the job itself stays between you and your customer —
                SelfeConnect does not take a commission or hold your money.
              </p>
              <p className="mt-3">
                If you choose to use your personal QR code, customers can also send
                payments, leave reviews, and add tips through your connected payment
                account.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="qr-what-for">
            <AccordionTrigger>What is the QR code used for?</AccordionTrigger>
            <AccordionContent>
              <p>
                Once you register and activate your subscription, you get access to
                your own personal QR code. This QR code belongs to you and allows
                customers to access your profile, leave reviews, send payments, and
                add tips.
              </p>
              <p className="mt-3">
                You can share your QR code with customers after completing a job,
                making it easier for them to pay you, leave a review, or add a tip —
                all in one place.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="qr-how-use">
            <AccordionTrigger>How do I use my QR code?</AccordionTrigger>
            <AccordionContent>
              <p>
                On your profile page, we automatically generate a flyer with your QR
                code that you can share with customers. You can also create your own
                materials or use the QR code however you prefer.
              </p>
              <p className="mt-3">
                Customers simply scan your QR code to access your personal payment
                page, where they can send a payment, leave a review, and add an
                optional tip.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="receive-payments">
            <AccordionTrigger>How do I receive payments?</AccordionTrigger>
            <AccordionContent>
              <p>
                After activating your subscription, go to your Account page and
                connect your payouts. This will take you to our payment processing
                partner, Stripe, where you'll complete a short registration and
                connect your account.
              </p>
              <p className="mt-3">
                Once connected, payments and tips received through your QR code will
                go directly to your linked bank account.
              </p>
              <p className="mt-3">
                Stripe typically charges 1.5% + £0.20 per transaction. For full
                transparency, you can always check the exact processing fees directly
                in your Stripe account.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="payment-timing">
            <AccordionTrigger>How long does it take to receive payments?</AccordionTrigger>
            <AccordionContent>
              <p>
                Your first payment may take between 7 and 15 days to arrive,
                depending on Stripe's verification process and your bank.
              </p>
              <p className="mt-3">
                After your first payment is completed, you can configure your payout
                schedule directly from your Stripe account and choose the payment
                frequency that works best for you.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="manage-payments">
            <AccordionTrigger>Does SelfeConnect manage payments?</AccordionTrigger>
            <AccordionContent>
              <p>
                No. SelfeConnect does not hold or manage customer payments. We simply
                connect professionals with customers and make the process easier.
              </p>
              <p className="mt-3">
                Service prices and payment arrangements are agreed and managed
                entirely between the customer and the professional. The QR code is an
                optional feature that professionals can choose to use to make
                receiving payments, reviews, and tips easier.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="commission">
            <AccordionTrigger>Is there really no commission?</AccordionTrigger>
            <AccordionContent>
              <p>
                Yes. We charge a flat fee of {gbp(pricing.amountGbp)}/month and
                never take a percentage of your payments or tips. We also never
                charge per lead.
              </p>
              <p className="mt-3">
                You keep 100% of every payment and tip, minus only the standard
                processing fee charged by our payment partner.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="cancel">
            <AccordionTrigger>Can I cancel anytime?</AccordionTrigger>
            <AccordionContent>
              Yes — it's monthly, with no contract. Cancel from your account page and
              you keep full access until the end of the period you've paid for.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      {/* ── Closing CTA ────────────────────────────────────────── */}
      <section className="border-t border-border/60 bg-secondary/40">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center sm:py-24">
          <Sparkles className="mx-auto h-7 w-7 text-primary" />
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-foreground font-display sm:text-4xl">
            Start building the reputation you've already earned.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base text-muted-foreground">
            Set up in sixty seconds. Your next customer is one review away.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 rounded-xl px-7 text-base font-semibold">
              <Link to="/signup">
                Join as a professional <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-xl border-primary/40 px-7 text-base font-semibold text-primary hover:bg-primary-soft"
            >
              <Link to="/customer/signup">Find a professional</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid gap-10 sm:grid-cols-[1.5fr_1fr_1fr]">
            <div>
              <Logo />
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Connecting self-employed professionals and small businesses with
                local customers.
              </p>
              <p className="mt-3 max-w-xs text-sm font-medium leading-relaxed text-foreground/80">
                Simple connections. Fair opportunities. No unnecessary costs.
              </p>
            </div>
            <FooterCol
              title="Platform"
              links={[
                { label: "For customers", href: "#how-it-works" },
                { label: "For professionals", href: "#professionals" },
                { label: "Pricing", href: "#pricing" },
              ]}
            />
            <FooterCol
              title="Company"
              links={[
                { label: "About SelfeConnect", to: "/about" },
                { label: "Contact us", to: "/contact" },
                { label: "Terms", to: "/terms" },
                { label: "Privacy", to: "/privacy" },
              ]}
            />
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} SelfeConnect. Independent. Impartial.
              Impactful.
            </p>
            <div className="flex items-center gap-2 text-muted-foreground">
              <LogoMark className="h-4 w-4" />
              <span className="text-xs font-medium">Secure payments by Stripe</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Product previews ──────────────────────────────────────────────
// The marketplace is the half of the product a QR photo can't show. These
// render the real UI so it's visible, and are labelled as examples.

function JobBoardPreview() {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-border/60 bg-card shadow-elevated">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-secondary/50 p-4">
        <p className="text-sm font-bold text-foreground font-display">Find work</p>
        <span className="text-xs text-muted-foreground">6 open jobs · within 15 mi</span>
      </div>
      <div className="space-y-3 p-4">
        <div className="rounded-xl border border-primary bg-primary-soft/40 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">
              Boiler not firing — need a Gas Safe engineer
            </p>
            <span className="shrink-0 rounded-full bg-card px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              2.1 mi
            </span>
          </div>
          <p className="mt-1.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Heating &amp; Gas</span>
            <span>WA1 2NT</span>
            <span>£120 budget</span>
          </p>
          <div className="mt-3 rounded-lg border border-dashed border-primary/50 bg-card p-2.5">
            <p className="text-xs font-semibold text-foreground">Daniel Okafor</p>
            <p className="text-xs text-primary">d.okafor@example.com · +44 7700 900318</p>
          </div>
        </div>
        <div className="rounded-xl border border-border p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">Bathroom radiator swap</p>
            <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              4.6 mi
            </span>
          </div>
          <p className="mt-1.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Plumber</span>
            <span>WA4 6HL</span>
            <span>£60–90</span>
          </p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
            <Lock className="h-3 w-3" /> Unlock contact
          </span>
        </div>
      </div>
    </div>
  );
}

function PathCard({
  icon: Icon,
  title,
  body,
  points,
  cta,
  to,
  variant,
  footer,
}: {
  icon: typeof Search;
  title: string;
  body: string;
  points: string[];
  cta: string;
  to: string;
  variant: "default" | "outline";
  footer: { text: string; link: string; to: string };
}) {
  return (
    <div className="group flex flex-col rounded-2xl border border-border/70 bg-card p-7 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="mt-5 text-xl font-bold text-foreground font-display">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
      <ul className="mt-5 space-y-2.5 text-sm text-foreground/80">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {p}
          </li>
        ))}
      </ul>
      <div className="mt-7 flex flex-col gap-2.5 pt-1">
        <Button
          asChild
          size="lg"
          variant={variant === "outline" ? "outline" : "default"}
          className={`h-11 w-full rounded-xl font-semibold ${
            variant === "outline"
              ? "border-primary/40 text-primary hover:bg-primary-soft"
              : ""
          }`}
        >
          <Link to={to}>
            {cta} <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          {footer.text}{" "}
          <Link to={footer.to} className="font-semibold text-primary hover:underline">
            {footer.link}
          </Link>
        </p>
      </div>
    </div>
  );
}

// A genuine sequence — the customer's journey has a real order, so numbering
// it carries information rather than decoration.
function Numbered({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="flex gap-5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink font-display text-sm font-bold text-ink-foreground">
        {n}
      </span>
      <div>
        <p className="text-lg font-bold text-foreground font-display">{title}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </li>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Star;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </li>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; to?: string; href?: string }[];
}) {
  return (
    <div>
      <p className="eyebrow text-foreground">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            {l.to ? (
              <Link
                to={l.to}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            ) : (
              <a
                href={l.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
