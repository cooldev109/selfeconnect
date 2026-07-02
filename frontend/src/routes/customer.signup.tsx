import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Loader2, User, Building2 } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { Button, Card, CardContent, Input } from "@/components/shared";
import authSide from "@/assets/auth-side.jpg";
import { customerSignup } from "@/lib/customer-auth";
import { ApiError } from "@/lib/api";

export const Route = createFileRoute("/customer/signup")({
  head: () => ({
    meta: [
      { title: "Create a customer account — SelfeConnect" },
      {
        name: "description",
        content:
          "Create a free account to post jobs and hire trusted professionals.",
      },
    ],
  }),
  component: CustomerSignupPage,
});

const schema = z
  .object({
    name: z.string().trim().min(2, "Please enter your name").max(120),
    email: z.string().trim().email("Enter a valid email").max(255),
    phone: z
      .string()
      .trim()
      .max(20)
      .regex(/^[+0-9 ()-]*$/, "Only digits, spaces and + ( ) -")
      .optional(),
    type: z.enum(["person", "business"]),
    companyName: z.string().trim().max(120).optional(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72),
  })
  .refine((v) => v.type !== "business" || !!v.companyName, {
    message: "Please enter your company name",
    path: ["companyName"],
  });

type FormState = {
  name: string;
  email: string;
  phone: string;
  type: "person" | "business";
  companyName: string;
  password: string;
};
type Errors = Partial<Record<keyof FormState, string>>;

function CustomerSignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    type: "person",
    companyName: "",
    password: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof FormState, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fe: Errors = {};
      for (const i of parsed.error.issues) {
        const k = i.path[0] as keyof FormState;
        if (!fe[k]) fe[k] = i.message;
      }
      setErrors(fe);
      return;
    }
    setErrors({});
    setFormError(null);
    setSubmitting(true);
    try {
      await customerSignup({
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
        phone: parsed.data.phone || undefined,
        type: parsed.data.type,
        companyName:
          parsed.data.type === "business" ? parsed.data.companyName : undefined,
      });
      navigate({ to: "/customer" });
    } catch (err) {
      setFormError(
        err instanceof ApiError && err.status === 409
          ? "An account with this email already exists."
          : "Something went wrong. Please try again.",
      );
      setSubmitting(false);
    }
  };

  const TypeButton = ({
    value,
    label,
    icon: Icon,
  }: {
    value: "person" | "business";
    label: string;
    icon: typeof User;
  }) => (
    <button
      type="button"
      onClick={() => set("type", value)}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
        form.type === value
          ? "border-primary bg-[#E1F5EE] text-primary"
          : "border-border text-muted-foreground hover:bg-secondary"
      }`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );

  return (
    <main className="relative grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden lg:block">
        <img
          src={authSide}
          alt="People connecting with local professionals"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/40 via-primary/20 to-primary/80" />
        <div className="relative flex h-full flex-col justify-between p-10 text-primary-foreground">
          <Link to="/" className="flex w-fit items-center gap-2">
            <LogoMark className="h-9 w-9" tone="white" />
            <span className="text-lg font-bold tracking-tight font-display">
              SelfeConnect
            </span>
          </Link>
          <div className="max-w-md">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/80">
              Free for customers
            </p>
            <p className="mt-3 text-3xl font-bold leading-tight font-display">
              Hire trusted professionals near you.
            </p>
            <p className="mt-4 text-sm text-primary-foreground/85">
              Post a job in minutes and connect with reviewed local pros — no
              fees to post.
            </p>
          </div>
        </div>
      </aside>

      <section className="relative flex items-center justify-center overflow-hidden bg-background px-6 py-12">
        <div className="absolute inset-0 -z-10 bg-mesh opacity-70" />
        <div className="w-full max-w-md animate-fade-up">
          <Link
            to="/"
            className="mx-auto mb-7 flex w-fit items-center gap-2 lg:hidden"
          >
            <LogoMark className="h-9 w-9" />
            <span className="text-lg font-bold tracking-tight text-foreground font-display">
              SelfeConnect
            </span>
          </Link>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground font-display">
              Create your account
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Post jobs and hire professionals — it's free.
            </p>
          </div>

          <Card className="mt-6 rounded-2xl border-border/70 shadow-soft">
            <CardContent className="p-6">
              <form onSubmit={onSubmit} noValidate className="space-y-4">
                <div className="flex gap-2">
                  <TypeButton value="person" label="Individual" icon={User} />
                  <TypeButton
                    value="business"
                    label="Business"
                    icon={Building2}
                  />
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-foreground">
                    {form.type === "business" ? "Contact name" : "Full name"}
                  </span>
                  <Input
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Jane Doe"
                    autoComplete="name"
                    maxLength={120}
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.name}
                    </p>
                  )}
                </label>

                {form.type === "business" && (
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-foreground">
                      Company name
                    </span>
                    <Input
                      value={form.companyName}
                      onChange={(e) => set("companyName", e.target.value)}
                      placeholder="Acme Ltd"
                      maxLength={120}
                    />
                    {errors.companyName && (
                      <p className="mt-1 text-xs text-destructive">
                        {errors.companyName}
                      </p>
                    )}
                  </label>
                )}

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-foreground">
                    Email
                  </span>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    maxLength={255}
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.email}
                    </p>
                  )}
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-foreground">
                    Phone <span className="text-muted-foreground">(optional)</span>
                  </span>
                  <Input
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="+44 7700 900000"
                    autoComplete="tel"
                    maxLength={20}
                  />
                  {errors.phone && (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.phone}
                    </p>
                  )}
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-foreground">
                    Password
                  </span>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    maxLength={72}
                  />
                  {errors.password && (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.password}
                    </p>
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
                      Creating account…
                    </>
                  ) : (
                    "Create free account"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/customer/login"
              className="font-semibold text-primary hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
