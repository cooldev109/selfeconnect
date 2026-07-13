import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { User, Building2, CheckCircle2, KeyRound } from "lucide-react";
import { Button, Card, CardContent, Input } from "@/components/shared";
import { CustomerShell } from "@/components/CustomerShell";
import { PostcodeInput } from "@/components/PostcodeInput";
import { useRequireCustomer } from "@/lib/useRequireCustomer";
import { customerUpdateMe } from "@/lib/customer-auth";
import { ApiError } from "@/lib/api";

export const Route = createFileRoute("/customer/account")({
  head: () => ({
    meta: [
      { title: "Account — SelfeConnect" },
      { name: "description", content: "Manage your customer account details." },
    ],
  }),
  component: CustomerAccountPage,
});

function apiMessage(err: unknown) {
  return err instanceof ApiError
    ? String((err.body as { message?: string })?.message ?? "")
    : "";
}

function CustomerAccountPage() {
  const qc = useQueryClient();
  const { customer } = useRequireCustomer();

  const [type, setType] = useState<"person" | "business">("person");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [postcode, setPostcode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);

  useEffect(() => {
    if (customer) {
      setType(customer.type === "business" ? "business" : "person");
      setName(customer.name);
      setCompanyName(customer.companyName ?? "");
      setEmail(customer.email);
      setPhone(customer.phone ?? "");
      setPostcode(customer.postcode ?? "");
    }
  }, [customer]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const fe: Record<string, string> = {};
    if (name.trim().length < 2) fe.name = "Please enter your name.";
    if (!/^[+0-9 ()-]{6,20}$/.test(phone.trim()))
      fe.phone = "Enter a valid phone number.";
    if (type === "business" && !companyName.trim())
      fe.companyName = "Please enter your company name.";
    if (Object.keys(fe).length) {
      setErrors(fe);
      return;
    }
    setErrors({});
    setSaving(true);
    setSaved(false);
    try {
      await customerUpdateMe({
        name: name.trim(),
        phone: phone.trim(),
        type,
        companyName: type === "business" ? companyName.trim() : "",
        postcode: postcode.trim(),
        email: email.trim(),
      });
      qc.invalidateQueries({ queryKey: ["customer-me"] });
      setSaved(true);
    } catch (err) {
      const msg = apiMessage(err);
      if (err instanceof ApiError && err.status === 409) {
        setErrors({ email: "That email is already registered." });
      } else if (msg.includes("postcode")) {
        setErrors({ postcode: "Enter a valid UK postcode." });
      } else {
        setErrors({ form: "Could not save. Please try again." });
      }
    } finally {
      setSaving(false);
    }
  };

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwErr(null);
    setPwSaved(false);
    if (pwNew.length < 8) {
      setPwErr("New password must be at least 8 characters.");
      return;
    }
    setPwSaving(true);
    try {
      await customerUpdateMe({
        currentPassword: pwCurrent,
        newPassword: pwNew,
      });
      setPwSaved(true);
      setPwCurrent("");
      setPwNew("");
    } catch (err) {
      const msg = apiMessage(err);
      setPwErr(
        msg.includes("wrong_current_password")
          ? "Current password is incorrect."
          : "Could not change password. Please try again.",
      );
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <CustomerShell
      title="Account"
      subtitle="Manage your contact details and password."
    >
      <div className="mx-auto max-w-2xl space-y-6">
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <h2 className="text-base font-semibold text-foreground">
              Your details
            </h2>
            <form onSubmit={onSave} noValidate className="mt-5 space-y-4">
              <div className="flex gap-2">
                <TypeButton
                  active={type === "person"}
                  onClick={() => setType("person")}
                  icon={User}
                  label="Individual"
                />
                <TypeButton
                  active={type === "business"}
                  onClick={() => setType("business")}
                  icon={Building2}
                  label="Business"
                />
              </div>

              <Labeled
                label={type === "business" ? "Contact name" : "Full name"}
                error={errors.name}
              >
                <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
              </Labeled>

              {type === "business" && (
                <Labeled label="Company name" error={errors.companyName}>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    maxLength={120}
                  />
                </Labeled>
              )}

              <Labeled label="Email" error={errors.email}>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={255}
                />
              </Labeled>

              <Labeled label="Phone" error={errors.phone}>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={20}
                />
              </Labeled>

              <Labeled label="Your postcode (optional)" error={errors.postcode}>
                <PostcodeInput
                  value={postcode}
                  onChange={setPostcode}
                  ariaLabel="Your postcode"
                />
              </Labeled>

              {errors.form && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.form}
                </p>
              )}
              <div className="flex items-center justify-between">
                {saved ? (
                  <span className="inline-flex items-center gap-1 text-xs text-primary">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                  </span>
                ) : (
                  <span />
                )}
                <Button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <KeyRound className="h-4 w-4 text-primary" /> Password
            </h2>
            <form onSubmit={onChangePassword} noValidate className="mt-5 space-y-4">
              <Labeled label="Current password">
                <Input
                  type="password"
                  value={pwCurrent}
                  autoComplete="current-password"
                  onChange={(e) => {
                    setPwCurrent(e.target.value);
                    setPwErr(null);
                    setPwSaved(false);
                  }}
                  maxLength={72}
                />
              </Labeled>
              <Labeled label="New password">
                <Input
                  type="password"
                  value={pwNew}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  onChange={(e) => {
                    setPwNew(e.target.value);
                    setPwErr(null);
                    setPwSaved(false);
                  }}
                  maxLength={72}
                />
              </Labeled>
              {pwErr && <p className="text-xs text-destructive">{pwErr}</p>}
              <div className="flex items-center justify-between">
                {pwSaved ? (
                  <span className="inline-flex items-center gap-1 text-xs text-primary">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Password updated
                  </span>
                ) : (
                  <span />
                )}
                <Button
                  type="submit"
                  disabled={pwSaving || !pwCurrent || !pwNew}
                  className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {pwSaving ? "Updating…" : "Update password"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </CustomerShell>
  );
}

function TypeButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof User;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
        active
          ? "border-primary bg-[#E1F5EE] text-primary"
          : "border-border text-muted-foreground hover:bg-secondary"
      }`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

function Labeled({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </span>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </label>
  );
}
