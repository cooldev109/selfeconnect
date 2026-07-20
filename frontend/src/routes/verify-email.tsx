import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button, Card, CardContent } from "@/components/shared";
import { LogoMark } from "@/components/Logo";
import { api } from "@/lib/api";

export const Route = createFileRoute("/verify-email")({
  validateSearch: (s: Record<string, unknown>): { token?: string } => ({
    token: typeof s.token === "string" ? s.token : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Confirm your email — SelfeConnect" },
      { name: "description", content: "Confirm your email address." },
    ],
  }),
  component: VerifyEmail,
});

function VerifyEmail() {
  const { token } = Route.useSearch();
  const [state, setState] = useState<"working" | "ok" | "bad">("working");
  const [kind, setKind] = useState<"professional" | "customer">("professional");

  useEffect(() => {
    if (!token) {
      setState("bad");
      return;
    }
    let cancelled = false;
    api<{ ok: true; kind: "professional" | "customer" }>("/auth/verify-email", {
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

  const home = kind === "customer" ? "/customer" : "/jobs";

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
                <p className="mt-4 text-sm text-muted-foreground">
                  Confirming your email…
                </p>
              </>
            )}
            {state === "ok" && (
              <>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h1 className="mt-4 text-xl font-bold text-foreground font-display">
                  Email confirmed
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Thanks — we know we can reach you now.
                </p>
                <Button
                  asChild
                  className="mt-5 h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <Link to={home}>Continue</Link>
                </Button>
              </>
            )}
            {state === "bad" && (
              <>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <XCircle className="h-7 w-7" />
                </div>
                <h1 className="mt-4 text-xl font-bold text-foreground font-display">
                  Link expired
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  This confirmation link has expired or has already been used.
                  It's nothing to worry about — your account works either way.
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
