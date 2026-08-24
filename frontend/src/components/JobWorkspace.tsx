import { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  Loader2,
  MapPin,
  Trash2,
  Pencil,
  Check,
  Star,
  Clock,
  Users,
  Play,
  CircleCheck,
  Scale,
  X,
  MessageSquare,
  BadgeCheck,
  CreditCard,
  UserRound,
  Receipt,
} from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { Button, Card, CardContent, Input, Modal } from "@/components/shared";
import { ChatThread } from "@/components/ChatThread";
import { JobPhotos } from "@/components/JobPhotos";
import { JobStatusBadge } from "@/components/JobStatusBadge";
import { TipPaymentModal } from "@/components/TipPaymentModal";
import { RaiseDisputeModal } from "@/components/RaiseDisputeModal";
import { raiseJobDispute } from "@/lib/disputes";
import {
  updateJob,
  deleteJob,
  jobInterestedPros,
  jobQuotes,
  jobThreads,
  jobMessages,
  sendJobMessage,
  payForJob,
  getJobReceipt,
  type Job,
  type JobStatus,
} from "@/lib/jobs";

export function fmtGbp(pence: number) {
  const p = pence / 100;
  return `£${p % 1 === 0 ? p.toFixed(0) : p.toFixed(2)}`;
}

type Stage = "active" | "completed" | "cancelled";
export const STAGE_OF: Record<JobStatus, Stage> = {
  open: "active",
  hired: "active",
  in_progress: "active",
  completed: "completed",
  closed: "completed",
  cancelled: "cancelled",
};

export function JobMeta({ job }: { job: Job }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">{job.categoryName}</span>
      <span className="inline-flex items-center gap-1">
        <MapPin className="h-3.5 w-3.5" /> {job.postcode}
      </span>
      {job.budget && <span>{job.budget}</span>}
      <span className="inline-flex items-center gap-1">
        <Clock className="h-3.5 w-3.5" /> Posted {timeAgo(job.createdAt)}
      </span>
    </div>
  );
}

// "3 of 10 professionals have been in touch" — so the customer knows how much of
// their quote limit is used, and whether to raise it.
export function QuoteUsage({ job }: { job: Job }) {
  const limit = job.maxContacts;
  return (
    <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-secondary/60 px-2.5 py-1 text-xs text-muted-foreground">
      <Users className="h-3.5 w-3.5 text-primary" />
      {limit == null ? (
        <span>
          <span className="font-semibold text-foreground">{job.contactCount}</span> professional
          {job.contactCount === 1 ? "" : "s"} in touch · no limit
        </span>
      ) : (
        <span>
          <span className="font-semibold text-foreground">
            {job.contactCount} of {limit}
          </span>{" "}
          professionals in touch
          {job.contactCount >= limit && " · limit reached"}
        </span>
      )}
    </div>
  );
}

// The full workspace for one job: details, actions, quotes to compare/hire,
// per-pro chat, and optional platform payment. Rendered on the job detail page;
// the My-jobs list links here instead of expanding inline.
export function JobWorkspace({ job }: { job: Job }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [picking, setPicking] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [disputing, setDisputing] = useState(false);
  const [reason, setReason] = useState("");
  const done = () => {
    qc.invalidateQueries({ queryKey: ["my-jobs"] });
    qc.invalidateQueries({ queryKey: ["my-job", job.id] });
  };

  const interestedQ = useQuery({
    queryKey: ["job-interested", job.id],
    queryFn: () => jobInterestedPros(job.id),
    enabled: picking,
  });
  const quotesQ = useQuery({
    queryKey: ["job-quotes", job.id],
    queryFn: () => jobQuotes(job.id),
    enabled: job.status === "open",
  });
  const [chatWith, setChatWith] = useState<string | null>(null);
  const threadsQ = useQuery({
    queryKey: ["job-threads", job.id],
    queryFn: () => jobThreads(job.id),
    enabled: STAGE_OF[job.status] === "active",
    refetchInterval: 8000,
  });
  const hire = useMutation({
    mutationFn: (publicId: string | null) =>
      updateJob(job.id, { status: "hired", hiredDriverPublicId: publicId }),
    onSuccess: () => {
      setPicking(false);
      done();
    },
  });
  const advance = useMutation({
    mutationFn: (status: JobStatus) => updateJob(job.id, { status }),
    onSuccess: done,
  });
  const markComplete = useMutation({
    mutationFn: () => updateJob(job.id, { status: "completed" }),
    onSuccess: () => {
      setConfirmComplete(false);
      done();
      if (job.hiredDriverPublicId) {
        navigate({
          to: "/customer/pros/$publicId",
          params: { publicId: job.hiredDriverPublicId },
          search: { review: "1", jobId: job.id },
        });
      }
    },
  });
  const cancel = useMutation({
    mutationFn: () =>
      updateJob(job.id, { status: "cancelled", cancelReason: reason.trim() || undefined }),
    onSuccess: () => {
      setCancelling(false);
      done();
    },
  });
  const remove = useMutation({
    mutationFn: () => deleteJob(job.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-jobs"] });
      navigate({ to: "/customer" });
    },
  });

  // Optional platform payment.
  const [paying, setPaying] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [payAccount, setPayAccount] = useState<string | null>(null);
  const [receiptMsg, setReceiptMsg] = useState<string | null>(null);
  const receipt = useMutation({
    mutationFn: () => getJobReceipt(job.id),
    onSuccess: (r) => {
      if (r.receiptUrl) window.open(r.receiptUrl, "_blank", "noopener");
      else setReceiptMsg("Receipt not available yet — check your email.");
    },
    onError: () => setReceiptMsg("Couldn't open the receipt."),
  });
  const pay = useMutation({
    mutationFn: (pence: number) => payForJob(job.id, pence),
    onSuccess: (res) => {
      if (res.mock) {
        setPaying(false);
        setPayAmount("");
        done();
      } else {
        setPayAccount(res.connectedAccountId);
        setClientSecret(res.clientSecret);
      }
    },
  });
  const submitPay = () => {
    const n = parseFloat(payAmount);
    if (!Number.isNaN(n) && n >= 1) pay.mutate(Math.round(n * 100));
  };

  const pros = interestedQ.data ?? [];
  const isActive = STAGE_OF[job.status] === "active";
  const isDone = STAGE_OF[job.status] === "completed";

  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-bold text-foreground">{job.title}</h1>
              <JobStatusBadge status={job.status} />
            </div>
            {(job.status === "hired" || job.status === "in_progress") && job.hiredDriverName && (
              <p className="mt-1 text-sm text-muted-foreground">
                Hired <span className="font-medium text-foreground">{job.hiredDriverName}</span>
              </p>
            )}
            {job.status === "cancelled" && job.cancelReason && (
              <p className="mt-1 text-sm text-muted-foreground">Reason: {job.cancelReason}</p>
            )}
            <JobMeta job={job} />
            {job.status === "open" && <QuoteUsage job={job} />}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {job.status === "open" && (
              <>
                <Button
                  className="h-9 rounded-lg bg-primary px-3 text-xs text-primary-foreground hover:bg-primary/90"
                  onClick={() => setPicking((p) => !p)}
                >
                  <Check className="mr-1 h-3.5 w-3.5" /> I've found my professional
                </Button>
                <Link
                  to="/customer/jobs/$jobId/edit"
                  params={{ jobId: job.id }}
                  className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-xs font-medium text-foreground hover:bg-secondary"
                >
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                </Link>
              </>
            )}

            {job.status === "hired" && (
              <Button
                className="h-9 rounded-lg bg-primary px-3 text-xs text-primary-foreground hover:bg-primary/90"
                onClick={() => advance.mutate("in_progress")}
                disabled={advance.isPending}
              >
                <Play className="mr-1 h-3.5 w-3.5" /> Start work
              </Button>
            )}

            {(job.status === "hired" || job.status === "in_progress") && (
              <Button
                className="h-9 rounded-lg bg-emerald-600 px-3 text-xs text-white hover:bg-emerald-600/90"
                onClick={() => setConfirmComplete(true)}
                disabled={markComplete.isPending}
              >
                <CircleCheck className="mr-1 h-3.5 w-3.5" /> Mark complete
              </Button>
            )}

            {isDone && job.hiredDriverPublicId && (
              <Link
                to="/customer/pros/$publicId"
                params={{ publicId: job.hiredDriverPublicId }}
                search={{ review: "1", jobId: job.id }}
                className="inline-flex h-9 items-center rounded-lg bg-amber-400 px-3 text-xs font-semibold text-amber-950 hover:bg-amber-400/90"
              >
                <Star className="mr-1 h-3.5 w-3.5" /> Leave a review
              </Link>
            )}

            {(job.status === "hired" || job.status === "in_progress" || isDone) && (
              <Button
                variant="outline"
                className="h-9 rounded-lg px-3 text-xs text-muted-foreground"
                onClick={() => setDisputing(true)}
              >
                <Scale className="mr-1 h-3.5 w-3.5" /> Raise a dispute
              </Button>
            )}

            {isActive && (
              <Button
                variant="outline"
                className="h-9 rounded-lg px-3 text-xs text-muted-foreground"
                onClick={() => setCancelling((c) => !c)}
              >
                <X className="mr-1 h-3.5 w-3.5" /> Cancel
              </Button>
            )}

            {!isActive && (
              <Button
                variant="outline"
                className="h-9 rounded-lg border-destructive/30 px-3 text-xs text-destructive hover:bg-destructive/10"
                onClick={() => remove.mutate()}
                disabled={remove.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Full brief + photos so the customer sees exactly what pros see. */}
        <div className="mt-4">
          <p className="whitespace-pre-line text-sm text-foreground/90">{job.description}</p>
          <JobPhotos photos={job.photos} />
          {(job.timing || job.workingHours || job.workingDays.length > 0) && (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {job.timing && <span>When: {job.timing}</span>}
              {job.workingHours && <span>Hours: {job.workingHours}</span>}
              {job.workingDays.length > 0 && <span>Days: {job.workingDays.join(", ")}</span>}
            </div>
          )}
        </div>

        {/* Quotes received — compare and hire directly (open jobs). */}
        {job.status === "open" && (quotesQ.data?.length ?? 0) > 0 && (
          <div className="mt-5 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {quotesQ.data!.length} quote{quotesQ.data!.length === 1 ? "" : "s"} received
            </p>
            {quotesQ.data!.map((q) => (
              <div key={q.publicId} className="rounded-xl border border-border bg-secondary/30 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {q.company || q.name}
                      {q.amount != null && (
                        <span className="ml-2 font-display font-bold text-primary">
                          {fmtGbp(q.amount)}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {q.categories.join(" · ")}
                      {q.distanceMiles != null && ` · ${q.distanceMiles} mi away`}
                    </p>
                    <Link
                      to="/customer/pros/$publicId"
                      params={{ publicId: q.publicId }}
                      className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      <UserRound className="h-3 w-3" /> View profile
                    </Link>
                  </div>
                  <Button
                    className="h-8 shrink-0 rounded-lg bg-primary px-3 text-xs text-primary-foreground hover:bg-primary/90"
                    onClick={() => hire.mutate(q.publicId)}
                    disabled={hire.isPending}
                  >
                    <Check className="mr-1 h-3.5 w-3.5" /> Hire
                  </Button>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm text-foreground/90">{q.message}</p>
              </div>
            ))}
          </div>
        )}

        {/* Messages — chat with each engaged professional about this job. */}
        {STAGE_OF[job.status] === "active" && (threadsQ.data?.length ?? 0) > 0 && (
          <div className="mt-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Messages
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {threadsQ.data!.map((th) => {
                const active = chatWith === th.publicId;
                return (
                  <button
                    key={th.publicId}
                    type="button"
                    onClick={() => setChatWith(active ? null : th.publicId)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                      active
                        ? "border-primary bg-[#E1F5EE] text-primary"
                        : "border-border text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    {th.company || th.name}
                    {th.unread > 0 && (
                      <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                        {th.unread}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {chatWith && (
              <div className="mt-2">
                <div className="mb-1.5 flex justify-end">
                  <Link
                    to="/customer/pros/$publicId"
                    params={{ publicId: chatWith }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <UserRound className="h-3 w-3" /> View profile
                  </Link>
                </div>
                <ChatThread
                  queryKey={["job-thread", job.id, chatWith]}
                  fetchMessages={() => jobMessages(job.id, chatWith)}
                  sendMessage={(b) => sendJobMessage(job.id, chatWith, b)}
                  isMine={(m) => m.fromCustomer}
                  onActivity={() => threadsQ.refetch()}
                  placeholder="Message the professional…"
                />
              </div>
            )}
          </div>
        )}

        {/* Optional payment — pay the hired pro through the platform. */}
        {job.canPayOnPlatform &&
          (job.status === "hired" ||
            job.status === "in_progress" ||
            job.status === "completed") && (
            <div className="mt-5">
              {job.paidOnPlatform ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary-soft px-3 py-1.5 text-sm font-semibold text-primary">
                    <BadgeCheck className="h-4 w-4" /> Paid on SelfeConnect
                  </span>
                  <button
                    type="button"
                    onClick={() => receipt.mutate()}
                    disabled={receipt.isPending}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    {receipt.isPending ? "Opening…" : "View receipt"}
                  </button>
                  {receiptMsg && <span className="text-xs text-muted-foreground">{receiptMsg}</span>}
                </div>
              ) : paying ? (
                <div className="rounded-xl border border-border bg-secondary/40 p-4">
                  <p className="text-sm font-medium text-foreground">
                    Pay {job.hiredDriverName ?? "your professional"} through SelfeConnect
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    100% goes to them — pay securely by card.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">£</span>
                    <Input
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="Amount"
                      inputMode="decimal"
                      maxLength={10}
                      className="h-9 w-32"
                    />
                    <Button
                      onClick={submitPay}
                      disabled={pay.isPending || !(parseFloat(payAmount) >= 1)}
                      className="h-9 rounded-lg bg-primary px-4 text-sm text-primary-foreground hover:bg-primary/90"
                    >
                      {pay.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Pay"}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setPaying(false)}
                      className="text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <Button
                    variant="outline"
                    className="h-9 rounded-lg px-3 text-xs"
                    onClick={() => setPaying(true)}
                  >
                    <CreditCard className="mr-1.5 h-3.5 w-3.5" /> Pay through SelfeConnect
                  </Button>
                  <p className="mt-1.5 max-w-md text-xs text-muted-foreground">
                    You can pay {job.hiredDriverName ?? "the professional"} you hired directly
                    through SelfeConnect, if agreed with them. 100% goes to the professional.
                  </p>
                </div>
              )}
            </div>
          )}

        {clientSecret && (
          <TipPaymentModal
            open
            clientSecret={clientSecret}
            stripeAccount={payAccount}
            amountLabel={payAmount || "0"}
            title={`Pay ${job.hiredDriverName ?? "your professional"}`}
            payLabel="Pay"
            errorLabel="Payment failed. Please try again."
            returnUrl={typeof window !== "undefined" ? window.location.href : ""}
            onPaid={() => {
              setClientSecret(null);
              setPayAccount(null);
              setPaying(false);
              setPayAmount("");
              done();
            }}
            onClose={() => {
              setClientSecret(null);
              setPayAccount(null);
            }}
          />
        )}

        {/* Pick the hired professional (open → hired). */}
        {picking && (
          <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-4">
            <p className="text-sm font-medium text-foreground">Which professional did you hire?</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              This moves the job to Hired so you can track it through to done.
            </p>
            {interestedQ.isLoading ? (
              <div className="mt-3 flex justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {pros.map((p) => (
                  <button
                    key={p.publicId}
                    type="button"
                    disabled={hire.isPending}
                    onClick={() => hire.mutate(p.publicId)}
                    className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-left text-sm transition hover:border-primary"
                  >
                    <span>
                      <span className="font-medium text-foreground">{p.company || p.name}</span>
                      {p.categories.length > 0 && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {p.categories.join(" · ")}
                        </span>
                      )}
                    </span>
                    <Check className="h-4 w-4 text-primary" />
                  </button>
                ))}
                <button
                  type="button"
                  disabled={hire.isPending}
                  onClick={() => hire.mutate(null)}
                  className="w-full rounded-lg border border-dashed border-border px-3 py-2 text-left text-sm text-muted-foreground transition hover:border-primary hover:text-foreground"
                >
                  {pros.length === 0
                    ? "Just mark this job as hired"
                    : "Someone else / hired off-platform"}
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => setPicking(false)}
              className="mt-3 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Cancel the job (open / hired / in_progress → cancelled). */}
        {cancelling && (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm font-medium text-foreground">
              Are you sure you want to cancel this job?
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (optional) — e.g. no longer needed"
              rows={2}
              maxLength={300}
              className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
            <div className="mt-2 flex gap-2">
              <Button
                className="h-9 rounded-lg bg-destructive px-3 text-xs text-destructive-foreground hover:bg-destructive/90"
                onClick={() => cancel.mutate()}
                disabled={cancel.isPending}
              >
                {cancel.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Cancel job"}
              </Button>
              <button
                type="button"
                onClick={() => setCancelling(false)}
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Keep job
              </button>
            </div>
          </div>
        )}
      </CardContent>

      <RaiseDisputeModal
        open={disputing}
        onClose={() => setDisputing(false)}
        jobTitle={job.title}
        onSubmit={(reason, detail) => raiseJobDispute(job.id, { reason, detail })}
      />

      <Modal
        open={confirmComplete}
        onOpenChange={(o) => {
          if (!o) setConfirmComplete(false);
        }}
        title="Mark job as complete?"
      >
        <p className="text-sm text-muted-foreground">
          Are you sure the job is completed? We'll then invite you to review{" "}
          {job.hiredDriverName ?? "the professional"}.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => setConfirmComplete(false)}>
            No
          </Button>
          <Button
            className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-600/90"
            disabled={markComplete.isPending}
            onClick={() => markComplete.mutate()}
          >
            {markComplete.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Yes, it's complete"
            )}
          </Button>
        </div>
      </Modal>
    </Card>
  );
}
