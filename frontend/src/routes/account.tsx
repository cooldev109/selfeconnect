import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { CheckCircle2, KeyRound, LogOut, ExternalLink, Wallet, BadgeCheck, Sparkles, Bell } from "lucide-react";
import { Badge, Button, Card, CardContent, Input, Modal } from "@/components/shared";
import { ProShell } from "@/components/ProShell";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { useMe } from "@/hooks/useDriver";
import { updateMe } from "@/lib/driver";
import { logout, changePassword } from "@/lib/auth";
import {
  getAccount,
  updateContact,
  startCheckout,
  startPortal,
  startConnect,
  openConnectDashboard,
  cancelSubscription,
} from "@/lib/billing";
import { ApiError } from "@/lib/api";
import { gbp } from "@/hooks/usePricing";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Account — SelfeConnect" },
      { name: "description", content: "Manage your subscription and account details." },
    ],
  }),
  component: AccountPage,
});

const contactSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z
    .string()
    .trim()
    .min(6, "Enter a valid phone number")
    .max(20)
    .regex(/^[+0-9 ()-]+$/, "Only digits, spaces and + ( ) -"),
});

function AccountPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const accountQ = useQuery({ queryKey: ["account"], queryFn: getAccount, retry: false });
  const { data: driver } = useMe();

  // Job-alert email preference (defaults on until the profile loads).
  const notifyOn = driver?.notifyNewJobs ?? true;
  const alertsMut = useMutation({
    mutationFn: (v: boolean) => updateMe({ notifyNewJobs: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });

  const [showCancel, setShowCancel] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<{ email?: string; phone?: string }>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<{
    scope: "sub" | "payout";
    message: string;
  } | null>(null);

  // Change password
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);

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
      await changePassword({ currentPassword: pwCurrent, newPassword: pwNew });
      setPwSaved(true);
      setPwCurrent("");
      setPwNew("");
    } catch (err) {
      setPwErr(
        err instanceof ApiError && err.status === 401
          ? "Current password is incorrect."
          : "Could not change password. Please try again.",
      );
    } finally {
      setPwSaving(false);
    }
  };

  useEffect(() => {
    if (accountQ.data) {
      setEmail(accountQ.data.email);
      setPhone(accountQ.data.phone);
    }
  }, [accountQ.data]);

  const active = !!accountQ.data?.isActive;
  const onboarded = !!accountQ.data?.stripeOnboarded;
  // Admin-granted free launch access — no Stripe subscription behind it.
  const comp = !!accountQ.data?.complimentary;
  const compUntil = accountQ.data?.complimentaryUntil
    ? new Date(accountQ.data.complimentaryUntil).toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;
  // Cancelled but still within the paid period → "Active until <date>".
  const endsOn =
    active && accountQ.data?.cancelAtPeriodEnd && accountQ.data?.currentPeriodEnd
      ? new Date(accountQ.data.currentPeriodEnd).toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : null;

  const go = async (
    fn: () => Promise<{ url: string }>,
    scope: "sub" | "payout",
  ) => {
    setBusy(true);
    setActionError(null);
    try {
      const { url } = await fn();
      window.location.href = url;
    } catch (err) {
      setActionError({
        scope,
        message:
          err instanceof ApiError
            ? err.message
            : "Something went wrong. Please try again.",
      });
      setBusy(false);
    }
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = contactSchema.safeParse({ email, phone });
    if (!parsed.success) {
      const fe: typeof errors = {};
      for (const i of parsed.error.issues) {
        const k = i.path[0] as "email" | "phone";
        if (!fe[k]) fe[k] = i.message;
      }
      setErrors(fe);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      await updateContact({ email: parsed.data.email, phone: parsed.data.phone });
      setSaved(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setErrors({ email: "That email is already registered." });
      } else {
        setErrors({ email: "Could not save. Please try again." });
      }
    } finally {
      setSaving(false);
    }
  };

  if (!accountQ.data) return null;

  return (
    <ProShell
      title="Account"
      subtitle="Manage your subscription, payouts and contact details."
    >
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Guided setup checklist — lives here (not on the Payments tab) and
            hides itself once the professional is fully set up. */}
        {driver && <OnboardingChecklist driver={driver} account={accountQ.data} />}

        {/* Subscription */}
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current plan</p>
                <h2 className="mt-1 text-xl font-bold text-foreground">SelfeConnect Professional</h2>
                {accountQ.data.foundingMember ? (
                  <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-[#E1F5EE] px-2.5 py-0.5 text-xs font-semibold text-primary">
                    <Sparkles className="h-3 w-3" /> Founding member
                  </p>
                ) : null}
                <p className="mt-1 text-sm text-muted-foreground">
                  {gbp(accountQ.data.priceGbp)}/month
                  {endsOn
                    ? ` · won't renew · access until ${endsOn}`
                    : active
                      ? " · renews monthly · cancel anytime"
                      : ""}
                </p>
              </div>
              <Badge
                className={`rounded-full ${comp ? "bg-violet-100 text-violet-700 hover:bg-violet-100" : active ? "bg-[#E1F5EE] text-primary hover:bg-[#E1F5EE]" : "bg-muted text-muted-foreground hover:bg-muted"}`}
              >
                {comp ? "Complimentary" : endsOn ? `Active until ${endsOn}` : active ? "Active" : "Inactive"}
              </Badge>
            </div>

            {comp && compUntil && (
              <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm">
                <p className="font-semibold text-violet-800">Complimentary Access — Expires {compUntil}</p>
                <p className="mt-0.5 text-violet-700/80">
                  You have free access to all paid features until then. After it expires, subscribe
                  to continue.
                </p>
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {comp ? (
                <span className="text-sm text-muted-foreground">
                  No subscription needed while your complimentary access is active.
                </span>
              ) : active ? (
                <>
                  <Button
                    type="button"
                    disabled={busy}
                    className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => go(startPortal, "sub")}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Manage subscription
                  </Button>
                  {endsOn ? (
                    <span className="text-sm text-muted-foreground">
                      Your subscription is set to cancel on {endsOn}.
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowCancel(true)}
                      className="text-sm font-semibold text-destructive hover:underline"
                    >
                      Cancel subscription
                    </button>
                  )}
                </>
              ) : (
                <Button
                  type="button"
                  disabled={busy}
                  className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => go(startCheckout, "sub")}
                >
                  {busy ? "Redirecting…" : "Activate subscription"}
                </Button>
              )}
            </div>
            {actionError?.scope === "sub" && (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {actionError.message}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Payouts (Stripe Connect) */}
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <Wallet className="h-4 w-4 text-primary" /> Payouts
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Connect your payout account to receive tips and payments — you keep 100%.
                </p>
              </div>
              {onboarded ? (
                <Badge className="shrink-0 rounded-full bg-[#E1F5EE] text-primary hover:bg-[#E1F5EE]">
                  <BadgeCheck className="mr-1 h-3.5 w-3.5" /> Ready
                </Badge>
              ) : null}
            </div>
            {onboarded && (
              <div className="mt-5">
                <p className="mb-3 text-sm text-muted-foreground">
                  Your earnings are paid to your bank automatically. Open your
                  Stripe dashboard to see your balance, payout history, and to
                  withdraw or update your bank details.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  className="rounded-xl"
                  onClick={() => go(openConnectDashboard, "payout")}
                >
                  <ExternalLink className="mr-1.5 h-4 w-4" />
                  {busy ? "Opening…" : "View earnings & payouts"}
                </Button>
                {actionError?.scope === "payout" && (
                  <p className="mt-3 text-sm text-destructive" role="alert">
                    {actionError.message}
                  </p>
                )}
              </div>
            )}
            {!onboarded && (
              <div className="mt-5">
                <Button
                  type="button"
                  disabled={busy}
                  className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => go(startConnect, "payout")}
                >
                  {busy ? "Redirecting…" : "Connect payouts"}
                </Button>
                {actionError?.scope === "payout" && (
                  <p className="mt-3 text-sm text-destructive" role="alert">
                    {actionError.message}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact */}
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <h2 className="text-base font-semibold text-foreground">Contact details</h2>
            <form onSubmit={onSave} noValidate className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-foreground">Email</span>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setSaved(false);
                    if (errors.email) setErrors((er) => ({ ...er, email: undefined }));
                  }}
                  maxLength={255}
                />
                {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-foreground">Phone</span>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setSaved(false);
                    if (errors.phone) setErrors((er) => ({ ...er, phone: undefined }));
                  }}
                  maxLength={20}
                />
                {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone}</p>}
              </label>

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

        {/* Job alerts — the "Manage alerts" link on Find work lands here. */}
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Bell className="h-4 w-4 text-primary" /> Job alerts
            </h2>
            <div className="mt-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Email me about new jobs</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Get an email when a new job matches your trades and area.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notifyOn}
                aria-label="Email me about new jobs"
                disabled={alertsMut.isPending || !driver}
                onClick={() => alertsMut.mutate(!notifyOn)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-60 ${
                  notifyOn ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                    notifyOn ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Change password */}
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <KeyRound className="h-4 w-4 text-primary" /> Password
            </h2>
            <form onSubmit={onChangePassword} noValidate className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-foreground">Current password</span>
                <Input
                  type="password"
                  value={pwCurrent}
                  autoComplete="current-password"
                  onChange={(e) => {
                    setPwCurrent(e.target.value);
                    setPwSaved(false);
                    setPwErr(null);
                  }}
                  maxLength={72}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-foreground">New password</span>
                <Input
                  type="password"
                  value={pwNew}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  onChange={(e) => {
                    setPwNew(e.target.value);
                    setPwSaved(false);
                    setPwErr(null);
                  }}
                  maxLength={72}
                />
              </label>
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

        {/* Logout */}
        <Card className="rounded-2xl">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <h2 className="text-base font-semibold text-foreground">Session</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Sign out of SelfeConnect on this device.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={async () => {
                await logout().catch(() => {});
                navigate({ to: "/login" });
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </Button>
          </CardContent>
        </Card>
      </div>

      <Modal
        open={showCancel}
        onOpenChange={setShowCancel}
        title="Cancel subscription?"
        description="Your QR Code will stop accepting tips at the end of the current billing period. You can resubscribe any time."
        footer={
          <>
            <Button variant="outline" className="rounded-xl" onClick={() => setShowCancel(false)}>
              Keep subscription
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              onClick={async () => {
                await cancelSubscription().catch(() => {});
                setShowCancel(false);
                accountQ.refetch();
              }}
            >
              Yes, cancel
            </Button>
          </>
        }
      />
    </ProShell>
  );
}
