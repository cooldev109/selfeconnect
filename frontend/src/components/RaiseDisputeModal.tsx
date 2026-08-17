import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button, Modal } from "@/components/shared";
import { DISPUTE_REASONS } from "@/lib/disputes";

// Shared dispute-raising modal for both the customer and professional sides —
// the caller supplies how the dispute is submitted for their job.
export function RaiseDisputeModal({
  open,
  onClose,
  jobTitle,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  jobTitle: string;
  onSubmit: (reason: string, detail: string) => Promise<unknown>;
}) {
  const [reason, setReason] = useState(DISPUTE_REASONS[0].value);
  const [detail, setDetail] = useState("");
  const [done, setDone] = useState(false);
  const submit = useMutation({
    mutationFn: () => onSubmit(reason, detail),
    onSuccess: () => setDone(true),
  });

  const close = () => {
    onClose();
    setReason(DISPUTE_REASONS[0].value);
    setDetail("");
    setDone(false);
    submit.reset();
  };

  return (
    <Modal open={open} onOpenChange={(o) => { if (!o) close(); }} title={done ? "Dispute raised" : "Raise a dispute"}>
      {done ? (
        <>
          <p className="text-sm text-muted-foreground">
            Thanks — our team will review this and be in touch. The other party has been notified.
          </p>
          <div className="mt-5 flex justify-end">
            <Button className="rounded-xl" onClick={close}>Done</Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Tell us what went wrong with <strong>{jobTitle}</strong>. An admin will review it.
          </p>
          <label className="mt-4 block text-sm font-medium text-foreground">
            What's the problem?
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
            >
              {DISPUTE_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </label>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            rows={4}
            placeholder="Describe what happened (at least a sentence)…"
            className="mt-3 w-full rounded-xl border border-input bg-background p-3 text-sm"
          />
          {submit.isError && (
            <p className="mt-2 text-sm text-destructive">
              {submit.error instanceof Error ? submit.error.message : "Couldn't raise the dispute"}
            </p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" className="rounded-xl" onClick={close}>Cancel</Button>
            <Button
              className="rounded-xl"
              disabled={detail.trim().length < 5 || submit.isPending}
              onClick={() => submit.mutate()}
            >
              {submit.isPending ? "Submitting…" : "Raise dispute"}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
