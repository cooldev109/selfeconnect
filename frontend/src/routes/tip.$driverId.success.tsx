import { createFileRoute, Link, useLocation } from "@tanstack/react-router";
import { Button } from "@/components/shared";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/tip/$driverId/success")({
  head: () => ({
    meta: [
      { title: "Thanks for your tip! — SelfeConnect" },
      { name: "description", content: "Your tip was sent successfully." },
    ],
  }),
  component: TipSuccess,
});

function TipSuccess() {
  const location = useLocation();
  const state = (location.state as unknown as Record<string, unknown> | undefined) ?? {};
  const amount =
    typeof state.amount === "number" ? state.amount.toFixed(2) : "0.00";
  const driverName = typeof state.driverName === "string" ? state.driverName : "Driver";

  const transactionId = `tv_${Math.random().toString(36).slice(2, 10).toUpperCase()}_${Date.now().toString(36).slice(-4).toUpperCase()}`;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 py-12">
      <div className="absolute inset-x-0 top-0 -z-10 h-96 bg-mesh opacity-70 blur-2xl" />
      <div className="w-full max-w-sm text-center animate-fade-up">
        <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 animate-pop rounded-full bg-primary/15" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-elevated animate-pop">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>

        <h1 className="mt-8 text-3xl font-bold text-foreground font-display">Thank you!</h1>

        <p className="mt-3 text-base text-muted-foreground">
          Your tip of{" "}
          <span className="font-semibold text-foreground">£{amount}</span> was
          sent to{" "}
          <span className="font-semibold text-foreground">{driverName}</span>.
        </p>

        <div className="mt-7 rounded-2xl border border-border/70 bg-muted/60 px-5 py-4 text-left">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Transaction ID
          </p>
          <p className="mt-1 font-mono text-sm text-foreground">{transactionId}</p>
        </div>

        <Link to="/">
          <Button
            variant="outline"
            className="mt-8 h-12 w-full rounded-xl border-2 border-primary text-base font-semibold text-primary hover:bg-primary-soft"
          >
            Back to home
          </Button>
        </Link>
      </div>

      <p className="mt-12 flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-primary" />
        Secure payment via Stripe
      </p>
    </main>
  );
}
