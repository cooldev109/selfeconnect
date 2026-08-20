import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  CheckCircle2,
  Clock,
  IdCard,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  Upload,
  XCircle,
} from "lucide-react";
import { Button, Card, CardContent, Input } from "@/components/shared";
import { ProShell } from "@/components/ProShell";
import { VerificationBadges } from "@/components/VerificationBadges";
import {
  confirmPhoneVerify,
  getVerification,
  resendVerificationEmail,
  startPhoneVerify,
  submitVerificationDoc,
  type DocState,
  type DocType,
  type VerificationState,
} from "@/lib/verification";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Verification & badges — SelfeConnect" },
      { name: "description", content: "Verify your identity, insurance and qualifications to earn trust badges." },
    ],
  }),
  component: VerifyPage,
});

function StatusPill({ status }: { status: DocState["status"] }) {
  const map = {
    none: { icon: Upload, text: "Not submitted", cls: "bg-muted text-muted-foreground" },
    pending: { icon: Clock, text: "In review", cls: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" },
    verified: { icon: CheckCircle2, text: "Verified", cls: "bg-primary/10 text-primary" },
    rejected: { icon: XCircle, text: "Not approved", cls: "bg-destructive/10 text-destructive" },
  } as const;
  const s = map[status];
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${s.cls}`}>
      <Icon className="h-3.5 w-3.5" /> {s.text}
    </span>
  );
}

function DocCard({
  type,
  title,
  hint,
  icon: Icon,
  state,
  onDone,
  withLabel,
  withReference,
  withExpiry,
}: {
  type: DocType;
  title: string;
  hint: string;
  icon: typeof IdCard;
  state: DocState;
  onDone: () => void;
  withLabel?: string;
  withReference?: string;
  withExpiry?: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState(state.label ?? "");
  const [reference, setReference] = useState(state.reference ?? "");
  const [expiresAt, setExpiresAt] = useState(state.expiresAt ? state.expiresAt.slice(0, 10) : "");
  const [error, setError] = useState<string | null>(null);
  // Lets a pro re-open the form to replace an already-submitted or approved
  // document (e.g. renewed insurance). Re-submitting sends it back for review.
  const [replacing, setReplacing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = useMutation({
    mutationFn: () =>
      submitVerificationDoc(type, file!, {
        label: withLabel ? label : undefined,
        reference: withReference ? reference : undefined,
        expiresAt: withExpiry && expiresAt ? expiresAt : undefined,
      }),
    onSuccess: () => {
      setFile(null);
      setReplacing(false);
      onDone();
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Upload failed"),
  });

  const canShowForm =
    state.status === "none" || state.status === "rejected" || replacing;

  return (
    <Card className="rounded-2xl">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{title}</p>
              <p className="text-sm text-muted-foreground">{hint}</p>
            </div>
          </div>
          <StatusPill status={state.status} />
        </div>

        {state.status === "verified" && state.expiresAt && (
          <p className="text-xs text-muted-foreground">
            Valid until {new Date(state.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.
          </p>
        )}
        {state.status === "rejected" && state.reviewerNotes && (
          <p className="rounded-lg bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {state.reviewerNotes}
          </p>
        )}

        {(state.status === "pending" || state.status === "verified") && !replacing && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setReplacing(true)}
            className="w-full gap-2 sm:w-auto"
          >
            <Upload className="h-4 w-4" />
            {state.status === "verified" ? "Replace document" : "Update document"}
          </Button>
        )}

        {canShowForm && (
          <div className="flex flex-col gap-2.5 border-t border-border pt-3">
            {withLabel && (
              <Input placeholder={withLabel} value={label} onChange={(e) => setLabel(e.target.value)} />
            )}
            {withReference && (
              <Input placeholder={withReference} value={reference} onChange={(e) => setReference(e.target.value)} />
            )}
            {withExpiry && (
              <label className="text-sm text-muted-foreground">
                Valid until
                <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="mt-1" />
              </label>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                setError(null);
                setFile(e.target.files?.[0] ?? null);
              }}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => inputRef.current?.click()}
                className="gap-2"
              >
                <Upload className="h-4 w-4" /> {file ? "Change file" : "Choose file (PDF or image)"}
              </Button>
              {file && <span className="truncate text-sm text-muted-foreground">{file.name}</span>}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                disabled={!file || submit.isPending}
                onClick={() => submit.mutate()}
                className="w-full sm:w-auto"
              >
                {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit for review"}
              </Button>
              {replacing && (
                <button
                  type="button"
                  onClick={() => { setReplacing(false); setFile(null); setError(null); }}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmailCard({ state }: { state: VerificationState["email"] }) {
  const [sent, setSent] = useState(false);
  const resend = useMutation({
    mutationFn: resendVerificationEmail,
    onSuccess: () => setSent(true),
  });
  return (
    <Card className="rounded-2xl">
      <CardContent className="flex items-center justify-between gap-3 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Email</p>
            <p className="text-sm text-muted-foreground">{state.address}</p>
          </div>
        </div>
        {state.verified ? (
          <StatusPill status="verified" />
        ) : (
          <Button variant="outline" disabled={resend.isPending || sent} onClick={() => resend.mutate()}>
            {sent ? "Email sent" : resend.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resend email"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function PhoneCard({ state, onDone }: { state: VerificationState["phone"]; onDone: () => void }) {
  const [phone, setPhone] = useState(state.number ?? "");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const start = useMutation({
    mutationFn: () => startPhoneVerify(phone),
    onSuccess: (r) => {
      setPhase("sent");
      setDevCode(r.devCode ?? null);
      setError(null);
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Could not send code"),
  });
  const confirm = useMutation({
    mutationFn: () => confirmPhoneVerify(code),
    onSuccess: onDone,
    onError: (e) => setError(e instanceof Error ? e.message : "Invalid code"),
  });

  return (
    <Card className="rounded-2xl">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Phone</p>
              <p className="text-sm text-muted-foreground">
                {state.verified ? state.number : "We'll text you a 6-digit code"}
              </p>
            </div>
          </div>
          {state.verified && <StatusPill status="verified" />}
        </div>

        {!state.verified && (
          <div className="flex flex-col gap-2.5 border-t border-border pt-3">
            {phase === "idle" ? (
              <div className="flex flex-wrap gap-2">
                <Input
                  type="tel"
                  placeholder="+44 7700 900000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex-1 min-w-[200px]"
                />
                <Button disabled={phone.trim().length < 6 || start.isPending} onClick={() => start.mutate()}>
                  {start.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send code"}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {devCode && (
                  <p className="rounded-lg bg-primary/5 px-3 py-2 text-sm text-primary">
                    Test mode — your code is <span className="font-mono font-bold">{devCode}</span>
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Input
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="6-digit code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    className="flex-1 min-w-[160px] font-mono tracking-widest"
                  />
                  <Button disabled={code.length !== 6 || confirm.isPending} onClick={() => confirm.mutate()}>
                    {confirm.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                  </Button>
                </div>
                <button
                  type="button"
                  className="self-start text-xs text-muted-foreground underline"
                  onClick={() => { setPhase("idle"); setCode(""); setError(null); }}
                >
                  Use a different number
                </button>
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function VerifyPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["verification"], queryFn: getVerification, retry: false });
  const refresh = () => qc.invalidateQueries({ queryKey: ["verification"] });

  return (
    <ProShell
      title="Verification & badges"
      subtitle="Earn trust badges customers can see — verify your identity, insurance and qualifications."
    >
      {q.isLoading || !q.data ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Card className="rounded-2xl border-primary/20 bg-primary/5">
            <CardContent className="flex flex-col gap-3 p-5">
              <div className="flex items-center gap-2 text-primary">
                <ShieldCheck className="h-5 w-5" />
                <p className="font-semibold">Your badges</p>
              </div>
              {q.data.badges.verifiedPro ||
              q.data.badges.insurance ||
              q.data.badges.qualification ||
              q.data.badges.phone ||
              q.data.badges.email ? (
                <VerificationBadges badges={q.data.badges} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No badges yet. Complete the checks below — each one shows on your public profile and in search.
                </p>
              )}
            </CardContent>
          </Card>

          <EmailCard state={q.data.email} />
          <PhoneCard state={q.data.phone} onDone={refresh} />

          <DocCard
            type="identity"
            title="Identity"
            hint="Passport or driving licence — becomes your Verified Pro badge."
            icon={IdCard}
            state={q.data.identity}
            onDone={refresh}
            withReference="Document type (e.g. Passport)"
          />
          <DocCard
            type="insurance"
            title="Insurance"
            hint="Public liability certificate — shows an 'Insurance checked' badge with its date."
            icon={ShieldCheck}
            state={q.data.insurance}
            onDone={refresh}
            withLabel="Cover (e.g. Public liability £2m)"
            withExpiry
          />
          <DocCard
            type="qualification"
            title="Qualification"
            hint="Trade certification or accreditation (e.g. Gas Safe)."
            icon={Award}
            state={q.data.qualification}
            onDone={refresh}
            withLabel="Qualification (e.g. Gas Safe)"
          />
        </div>
      )}
    </ProShell>
  );
}
