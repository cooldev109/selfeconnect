import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Loader2, ShieldCheck, Truck } from "lucide-react";
import { Button, Card, CardContent, Input } from "@/components/shared";
import authSide from "@/assets/auth-side.jpg";
import { login as loginRequest } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — SelfeConnect" },
      { name: "description", content: "Log in to your SelfeConnect professional account." },
    ],
  }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(1, "Enter your password").max(72),
});

function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fe: typeof errors = {};
      for (const i of parsed.error.issues) {
        const k = i.path[0] as "email" | "password";
        if (!fe[k]) fe[k] = i.message;
      }
      setErrors(fe);
      return;
    }
    setErrors({});
    setFormError(null);
    setSubmitting(true);
    try {
      await loginRequest(parsed.data);
      navigate({ to: "/dashboard" });
    } catch {
      setFormError("Invalid email or password.");
      setSubmitting(false);
    }
  };

  return (
    <main className="relative grid min-h-screen lg:grid-cols-2">
      {/* Brand side panel */}
      <aside className="relative hidden overflow-hidden lg:block">
        <img
          src={authSide}
          alt="A SelfeConnect driver smiling next to his white van at golden hour, holding a phone with a payment confirmation"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/40 via-primary/20 to-primary/80" />
        <div className="relative flex h-full flex-col justify-between p-10 text-primary-foreground">
          <Link to="/" className="flex w-fit items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-foreground/15 backdrop-blur">
              <Truck size={18} strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold tracking-tight font-display">SelfeConnect</span>
          </Link>
          <div className="max-w-md">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/80">
              For professionals, by professionals
            </p>
            <p className="mt-3 text-3xl font-bold leading-tight font-display">
              "Made an extra £180 last month — straight to my account."
            </p>
            <p className="mt-4 text-sm text-primary-foreground/85">
              — Marco, parcel courier in Manchester
            </p>
          </div>
        </div>
      </aside>

      <section className="relative flex items-center justify-center overflow-hidden bg-background px-6 py-12">
        <div className="absolute inset-0 -z-10 bg-mesh opacity-70" />
        <div className="w-full max-w-md animate-fade-up">
          <Link to="/" className="mx-auto mb-7 flex w-fit items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-elevated">
              <Truck size={18} strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground font-display">SelfeConnect</span>
          </Link>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground font-display">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Log in to your dashboard.
          </p>
        </div>

        <Card className="mt-6 rounded-2xl border-border/70 shadow-soft">
          <CardContent className="p-6">
            <form onSubmit={onSubmit} noValidate className="space-y-5">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-foreground">
                  Email
                </span>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, email: e.target.value }));
                    if (errors.email) setErrors((er) => ({ ...er, email: undefined }));
                  }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  maxLength={255}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-destructive">{errors.email}</p>
                )}
              </label>

              <label className="block">
                <span className="mb-1.5 flex items-center justify-between text-sm font-medium text-foreground">
                  Password
                  <Link
                    to="/login"
                    className="text-xs font-normal text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </span>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, password: e.target.value }));
                    if (errors.password)
                      setErrors((er) => ({ ...er, password: undefined }));
                  }}
                  placeholder="Your password"
                  autoComplete="current-password"
                  maxLength={72}
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-destructive">{errors.password}</p>
                )}
              </label>

              {formError && (
                <p className="text-sm text-destructive" role="alert">
                  {formError}
                </p>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in…
                  </>
                ) : (
                  "Log in"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link to="/signup" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </p>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Bank-grade encryption · 100% of tips to professionals
        </p>
        </div>
      </section>
    </main>
  );
}
