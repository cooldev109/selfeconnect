import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BellOff, Loader2, XCircle } from "lucide-react";
import { Button, Card, CardContent } from "@/components/shared";
import { LogoMark } from "@/components/Logo";
import { api } from "@/lib/api";

export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (s: Record<string, unknown>): { token?: string } => ({
    token: typeof s.token === "string" ? s.token : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Unsubscribed — SelfeConnect" },
      { name: "description", content: "Manage your email notifications." },
    ],
  }),
  component: Unsubscribe,
});

function Unsubscribe() {
  const { token } = Route.useSearch();
  const [state, setState] = useState<"working" | "ok" | "bad">("working");
  const [kind, setKind] = useState<"professional" | "customer">("professional");

  useEffect(() => {
    if (!token) {
      setState("bad");
      return;
    }
    let cancelled = false;
    api<{ ok: true; kind: "professional" | "customer" }>("/unsubscribe", {
      method: "POST",
      body: JSON.stringify({ token }),
    })
      .then((r) => {
        if (cancelled) return;
        setKind(r.kind);
        setState("ok");
      })
      .catch(() => !cancelled && setState("bad"));
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md animate-fade-up">
        <div className="mb-7 flex items-center justify-center gap-2">
          <LogoMark className="h-9 w-9" />
          <span className="text-lg font-bold tracking-tight text-foreground font-display">
            SelfeConnect
          </span>
        </div>
        <Card className="rounded-2xl">
          <CardContent className="p-8 text-center">
            {state === "working" && (
              <>
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                <p className="mt-4 text-sm text-muted-foreground">Updating…</p>
              </>
            )}
            {state === "ok" && (
              <>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <BellOff className="h-7 w-7" />
                </div>
                <h1 className="mt-4 text-xl font-bold text-foreground font-display">
                  Unsubscribed
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {kind === "professional"
                    ? "You won't get emails about new jobs any more."
                    : "You won't get emails about your job postings any more."}{" "}
                  You'll still receive essential account emails, like password
                  resets and receipts.
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Changed your mind? You can turn these back on in your account
                  settings.
                </p>
                <Button asChild variant="outline" className="mt-5 w-full rounded-xl">
                  <Link to="/">Back to home</Link>
                </Button>
              </>
            )}
            {state === "bad" && (
              <>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <XCircle className="h-7 w-7" />
                </div>
                <h1 className="mt-4 text-xl font-bold text-foreground font-display">
                  Link not recognised
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  We couldn't match this unsubscribe link to an account. You can
                  change your email preferences from your account settings.
                </p>
                <Button asChild variant="outline" className="mt-5 w-full rounded-xl">
                  <Link to="/">Back to home</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
