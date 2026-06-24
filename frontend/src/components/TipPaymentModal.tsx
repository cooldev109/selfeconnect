import { useState } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Loader2, Lock } from "lucide-react";
import { Button, Modal } from "@/components/shared";
import { getStripe } from "@/lib/stripe";

const stripePromise = getStripe();

function PayForm({
  amountLabel,
  payLabel,
  errorLabel,
  returnUrl,
  onPaid,
}: {
  amountLabel: string;
  payLabel: string;
  errorLabel: string;
  returnUrl: string;
  onPaid: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || busy) return;
    setBusy(true);
    setError(null);
    // return_url is required for wallet/redirect methods (Apple/Google Pay);
    // redirect:"if_required" keeps card payments inline.
    const { error: err, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: returnUrl ? { return_url: returnUrl } : undefined,
    });
    if (err) {
      setError(err.message ?? errorLabel);
      setBusy(false);
      return;
    }
    if (paymentIntent && paymentIntent.status !== "succeeded" && paymentIntent.status !== "processing") {
      setError(errorLabel);
      setBusy(false);
      return;
    }
    onPaid();
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <PaymentElement onReady={() => setReady(true)} />
      {error && (
        <p className="text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button
        type="submit"
        disabled={!stripe || !ready || busy}
        className="h-12 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
      >
        {busy ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> …
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <Lock className="h-4 w-4" /> {payLabel} · £{amountLabel}
          </span>
        )}
      </Button>
    </form>
  );
}

// Card-entry modal shown after a (real-mode) PaymentIntent is created. Mounts
// the Stripe Payment Element against the intent's client secret.
export function TipPaymentModal({
  open,
  clientSecret,
  amountLabel,
  title,
  payLabel,
  errorLabel,
  returnUrl,
  onClose,
  onPaid,
}: {
  open: boolean;
  clientSecret: string | null;
  amountLabel: string;
  title: string;
  payLabel: string;
  errorLabel: string;
  returnUrl: string;
  onClose: () => void;
  onPaid: () => void;
}) {
  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title={title}>
      {clientSecret && stripePromise ? (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: "stripe",
              variables: { colorPrimary: "#1D9E75", borderRadius: "12px" },
            },
          }}
        >
          <PayForm
            amountLabel={amountLabel}
            payLabel={payLabel}
            errorLabel={errorLabel}
            returnUrl={returnUrl}
            onPaid={onPaid}
          />
        </Elements>
      ) : (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}
    </Modal>
  );
}
