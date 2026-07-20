import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { Button, Card, CardContent, Input } from "@/components/shared";
import { LogoMark } from "@/components/Logo";
import { api } from "@/lib/api";

export const Route = createFileRoute("/forgot-password")({
  validateSearch: (s: Record<string, unknown>): { kind?: string } => ({
    kind: s.kind === "customer" ? "customer" : s.kind === "professional" ? "professional" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Reset your password — SelfeConnect" },
      { name: "description", content: "Get a link to reset your SelfeConnect password." },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const { kind } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true);
    // Always shows the same confirmation, whether or not the address exists —
    // otherwise this page becomes a way to find out who has an account.
    await api("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: email.trim(), kind }),
    }).catch(() => undefined);
    setBusy(false);
    setSent(true);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md animate-fade-up">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <div className="mb-7 flex items-center gap-2">
          <LogoMark className="h-9 w-9" />
          <span className="text-lg font-bold tracking-tight text-foreground font-display">
            SelfeConnect
          </span>
        </div>

        <Card className="rounded-2xl">
          <CardContent className="p-6">
            {sent ? (
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <MailCheck className="h-7 w-7" />
                </div>
                <h1 className="mt-4 text-xl font-bold text-foreground font-display">
                  Check your email
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  If there's an account for{" "}
                  <span className="font-medium text-foreground">{email.trim()}</span>,
                  we've sent a link to reset the password. It expires in an hour.
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Nothing arrived? Check your spam folder, or try again in a
                  minute.
                </p>
                <Button
                  variant="outline"
                  className="mt-5 w-full rounded-xl"
                  onClick={() =>
                    navigate({ to: kind === "customer" ? "/customer/login" : "/login" })
                  }
                >
                  Back to log in
                </Button>
              </div>
            ) : (
              <>
                <h1 className="text-xl font-bold text-foreground font-display">
                  Reset your password
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Enter your email and we'll send you a link to choose a new one.
                </p>
                <form onSubmit={submit} noValidate className="mt-5 space-y-4">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-foreground">
                      Email
                    </span>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      maxLength={255}
                      autoFocus
                    />
                  </label>
                  <Button
                    type="submit"
                    disabled={busy || !email.trim()}
                    className="h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    {busy ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…
                      </>
                    ) : (
                      "Send reset link"
                    )}
                  </Button>
                </form>
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Remembered it?{" "}
                  <Link
                    to={kind === "customer" ? "/customer/login" : "/login"}
                    className="font-semibold text-primary hover:underline"
                  >
                    Log in
                  </Link>
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
