import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { Button, Card, CardContent, Input } from "@/components/shared";
import { LogoMark } from "@/components/Logo";
import { api } from "@/lib/api";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (s: Record<string, unknown>): { token?: string } => ({
    token: typeof s.token === "string" ? s.token : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Choose a new password — SelfeConnect" },
      { name: "description", content: "Set a new password for your account." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | "professional" | "customer">(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ ok: true; kind: "professional" | "customer" }>(
        "/auth/reset-password",
        { method: "POST", body: JSON.stringify({ token, password }) },
      );
      setDone(res.kind);
    } catch {
      // Expired or already used — the honest fix is to request a fresh one.
      setError(
        "That link has expired or has already been used. Please request a new one.",
      );
      setBusy(false);
    }
  };

  const loginPath = done === "customer" ? "/customer/login" : "/login";

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
            {done ? (
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h1 className="mt-4 text-xl font-bold text-foreground font-display">
                  Password changed
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  You can now log in with your new password.
                </p>
                <Button
                  className="mt-5 h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
                  onClick={() => navigate({ to: loginPath })}
                >
                  Log in
                </Button>
              </div>
            ) : !token ? (
              <>
                <h1 className="text-xl font-bold text-foreground font-display">
                  Link not valid
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  This page needs a reset link from your email. Request a new one
                  and we'll send it over.
                </p>
                <Button asChild className="mt-5 h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90">
                  <Link to="/forgot-password">Request a reset link</Link>
                </Button>
              </>
            ) : (
              <>
                <h1 className="text-xl font-bold text-foreground font-display">
                  Choose a new password
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Pick something at least 8 characters long.
                </p>
                <form onSubmit={submit} noValidate className="mt-5 space-y-4">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-foreground">
                      New password
                    </span>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      maxLength={72}
                      autoFocus
                    />
                  </label>
                  {error && (
                    <p className="text-sm text-destructive" role="alert">
                      {error}{" "}
                      <Link to="/forgot-password" className="font-semibold underline">
                        Request a new link
                      </Link>
                    </p>
                  )}
                  <Button
                    type="submit"
                    disabled={busy}
                    className="h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    {busy ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                      </>
                    ) : (
                      "Save new password"
                    )}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
