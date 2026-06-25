import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Camera, CheckCircle2, Loader2 } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { Button, Card, CardContent, Input } from "@/components/shared";
import authSide from "@/assets/auth-side.jpg";
import { signup as signupRequest } from "@/lib/auth";
import { uploadPhoto } from "@/lib/driver";
import { ApiError } from "@/lib/api";

const PRICE_PER_MONTH = 5.49;

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign up — SelfeConnect" },
      { name: "description", content: "Create your SelfeConnect professional account and start collecting tips." },
    ],
  }),
  component: SignupPage,
});

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name").max(80),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z
    .string()
    .trim()
    .min(6, "Enter a valid phone number")
    .max(20)
    .regex(/^[+0-9 ()-]+$/, "Only digits, spaces and + ( ) -"),
  company: z.string().trim().max(80).optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long"),
  photo: z
    .string()
    .min(1, "Please upload a profile photo"),
});

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  company: string;
  password: string;
  photo: string;
};

type Errors = Partial<Record<keyof FormState, string>>;

function SignupPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>({
    fullName: "",
    email: "",
    phone: "",
    company: "",
    password: "",
    photo: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const priceLabel = useMemo(
    () => `£${PRICE_PER_MONTH.toFixed(2)}/month`,
    []
  );

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const onPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrors((er) => ({ ...er, photo: "Please choose an image file" }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((er) => ({ ...er, photo: "Image must be under 5MB" }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update("photo", String(reader.result ?? ""));
    reader.readAsDataURL(file);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signupSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FormState | undefined;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      await signupRequest({
        name: parsed.data.fullName,
        email: parsed.data.email,
        password: parsed.data.password,
        phone: parsed.data.phone,
        company: parsed.data.company,
      });
      // Signup logs the driver in (session cookie set), so the required photo
      // they chose is uploaded here rather than being silently discarded.
      const file = fileInputRef.current?.files?.[0];
      if (file) await uploadPhoto(file).catch(() => undefined);
      navigate({ to: "/dashboard" });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setErrors((e) => ({ ...e, email: "That email is already registered." }));
      } else {
        setFormError("Something went wrong. Please try again.");
      }
      setSubmitting(false);
    }
  };

  return (
    <main className="relative grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden lg:block">
        <img
          src={authSide}
          alt="A SelfeConnect driver standing next to his white van at golden hour"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/50 via-primary/25 to-primary/85" />
        <div className="relative flex h-full flex-col justify-between p-10 text-primary-foreground">
          <Link to="/" className="flex w-fit items-center gap-2">
            <LogoMark className="h-9 w-9" tone="white" />
            <span className="text-lg font-bold tracking-tight font-display">SelfeConnect</span>
          </Link>
          <div className="max-w-md space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/80">
              Join 3,200+ UK professionals
            </p>
            <h2 className="text-3xl font-bold leading-tight font-display">
              Set up once. Get rated &amp; tipped.
            </h2>
            <ul className="space-y-2.5 text-sm text-primary-foreground/90">
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> Your unique 5-character ID & QR code, ready in 60 seconds</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> Zero commission — you keep 100% of every tip</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> Weekly payouts straight to your bank</li>
            </ul>
          </div>
        </div>
      </aside>

      <section className="bg-background px-6 py-10">
        <div className="mx-auto max-w-md">
          <h1 className="text-2xl font-bold text-foreground font-display">Create your account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Start collecting reviews &amp; tips today.
          </p>

        <Card className="mt-6 rounded-2xl">
          <CardContent className="p-6">
            <form onSubmit={onSubmit} noValidate className="space-y-5">
              {/* Photo upload */}
              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative h-28 w-28 overflow-hidden rounded-full border-2 border-dashed border-border bg-secondary transition hover:border-primary"
                  aria-label="Upload profile photo"
                >
                  {form.photo ? (
                    <img
                      src={form.photo}
                      alt="Profile preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full flex-col items-center justify-center text-muted-foreground">
                      <Camera className="h-6 w-6" />
                      <span className="mt-1 text-xs">Add photo</span>
                    </span>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPhotoChange}
                />
                {errors.photo && (
                  <p className="text-xs text-destructive">{errors.photo}</p>
                )}
              </div>

              <Field
                label="Full name"
                error={errors.fullName}
                input={
                  <Input
                    value={form.fullName}
                    onChange={(e) => update("fullName", e.target.value)}
                    placeholder="Jane Doe"
                    autoComplete="name"
                    maxLength={80}
                  />
                }
              />

              <Field
                label="Email"
                error={errors.email}
                input={
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    maxLength={255}
                  />
                }
              />

              <Field
                label="Phone"
                error={errors.phone}
                input={
                  <Input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    placeholder="+44 7700 900000"
                    autoComplete="tel"
                    maxLength={20}
                  />
                }
              />

              <Field
                label="Company name"
                optional
                error={errors.company}
                input={
                  <Input
                    value={form.company}
                    onChange={(e) => update("company", e.target.value)}
                    placeholder="Lisbon Express Delivery"
                    autoComplete="organization"
                    maxLength={80}
                  />
                }
              />

              <Field
                label="Password"
                error={errors.password}
                input={
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    maxLength={72}
                  />
                }
              />

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
                    Creating account…
                  </>
                ) : (
                  <>Create account — {priceLabel}</>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Subscription managed securely via Stripe. Cancel anytime.
              </p>
              <p className="text-center text-xs text-muted-foreground">
                By creating an account you agree to our{" "}
                <Link to="/terms" className="underline hover:text-foreground">Terms</Link> and{" "}
                <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
              </p>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Log in
          </Link>
        </p>
        </div>
      </section>
    </main>
  );
}

function Field({
  label,
  error,
  input,
  optional,
}: {
  label: string;
  error?: string;
  input: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-sm font-medium text-foreground">
        {label}
        {optional && (
          <span className="text-xs font-normal text-muted-foreground">Optional</span>
        )}
      </span>
      {input}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </label>
  );
}
