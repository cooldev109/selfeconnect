import { useState } from "react";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button, Input } from "@/components/shared";
import { CategorySelect } from "@/components/CategoryPicker";
import { PostcodeInput } from "@/components/PostcodeInput";
import { WEEK_DAYS, type JobInput } from "@/lib/jobs";
import { ApiError } from "@/lib/api";

const schema = z.object({
  categorySlug: z.string().min(1, "Choose a service category"),
  title: z.string().trim().min(3, "Enter a short title").max(120),
  description: z
    .string()
    .trim()
    .min(10, "Please describe the job (at least 10 characters)")
    .max(2000),
  postcode: z.string().trim().min(5, "Enter the job postcode").max(12),
  addressLine: z.string().trim().max(200).optional(),
  workingHours: z.string().trim().max(120).optional(),
  budget: z.string().trim().max(60).optional(),
});

type FieldErrors = Partial<
  Record<
    "categorySlug" | "title" | "description" | "postcode" | "addressLine" | "workingHours" | "budget",
    string
  >
>;

// How many professionals may contact the customer. null = no limit.
const QUOTE_OPTIONS: { value: number | null; label: string }[] = [
  { value: 5, label: "Up to 5 quotes" },
  { value: 10, label: "Up to 10 quotes" },
  { value: 20, label: "Up to 20 quotes" },
  { value: null, label: "No limit" },
];

export function JobForm({
  initial,
  submitLabel,
  onSubmit,
  showConsent = true,
}: {
  initial?: Partial<JobInput>;
  submitLabel: string;
  onSubmit: (input: JobInput) => Promise<void>;
  /** Consent is asked at creation; on edit it's already been given, so hide it. */
  showConsent?: boolean;
}) {
  const [categorySlug, setCategorySlug] = useState(initial?.categorySlug ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [postcode, setPostcode] = useState(initial?.postcode ?? "");
  const [addressLine, setAddressLine] = useState(initial?.addressLine ?? "");
  const [workingDays, setWorkingDays] = useState<string[]>(
    initial?.workingDays ?? [],
  );
  const [workingHours, setWorkingHours] = useState(initial?.workingHours ?? "");
  const [budget, setBudget] = useState(initial?.budget ?? "");
  // Default to 10 — Raul's suggestion, enough choice without a flood of quotes.
  const [maxContacts, setMaxContacts] = useState<number | null>(
    initial?.maxContacts !== undefined ? initial.maxContacts : 10,
  );
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toggleDay = (d: string) =>
    setWorkingDays((days) =>
      days.includes(d) ? days.filter((x) => x !== d) : [...days, d],
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      categorySlug,
      title,
      description,
      postcode,
      addressLine: addressLine || undefined,
      workingHours: workingHours || undefined,
      budget: budget || undefined,
    });
    if (!parsed.success) {
      const fe: FieldErrors = {};
      for (const i of parsed.error.issues) {
        const k = i.path[0] as keyof FieldErrors;
        if (!fe[k]) fe[k] = i.message;
      }
      setErrors(fe);
      return;
    }
    if (showConsent && !consent) {
      setConsentError(true);
      return;
    }
    setErrors({});
    setConsentError(false);
    setFormError(null);
    setBusy(true);
    try {
      await onSubmit({
        ...parsed.data,
        workingDays,
        maxContacts,
        ...(showConsent ? { contactConsent: true } : {}),
      });
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.status === 400 &&
        String((err.body as { message?: string })?.message ?? "").includes("postcode")
      ) {
        setErrors((x) => ({ ...x, postcode: "Enter a valid UK postcode." }));
      } else {
        setFormError("Something went wrong. Please try again.");
      }
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="block">
        <span className="mb-1.5 block text-sm font-medium text-foreground">
          Service category
        </span>
        <CategorySelect value={categorySlug} onChange={setCategorySlug} />
        {errors.categorySlug && (
          <p className="mt-1 text-xs text-destructive">{errors.categorySlug}</p>
        )}
        <p className="mt-1.5 text-xs text-muted-foreground">
          Can't find the service you need?{" "}
          <a
            href="mailto:support@selfeconnect.com?subject=Please%20add%20a%20service"
            className="font-medium text-primary hover:underline"
          >
            Let us know
          </a>
          .
        </p>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-foreground">Title</span>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Office cleaner needed"
          maxLength={120}
        />
        {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title}</p>}
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-foreground">
          Description
        </span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the job, what you need and any requirements…"
          rows={4}
          maxLength={2000}
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
        />
        {errors.description && (
          <p className="mt-1 text-xs text-destructive">{errors.description}</p>
        )}
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-foreground">
            Job postcode
          </span>
          <PostcodeInput
            value={postcode}
            onChange={setPostcode}
            ariaLabel="Job postcode"
          />
          {errors.postcode ? (
            <p className="mt-1 text-xs text-destructive">{errors.postcode}</p>
          ) : (
            <span className="mt-1 block text-xs text-muted-foreground">
              Where the work is — this is how nearby professionals find it.
            </span>
          )}
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-foreground">
            Budget <span className="text-muted-foreground">(optional)</span>
          </span>
          <Input
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="e.g. £15/hr"
            maxLength={60}
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-foreground">
          Address line <span className="text-muted-foreground">(optional)</span>
        </span>
        <Input
          value={addressLine}
          onChange={(e) => setAddressLine(e.target.value)}
          placeholder="Street / area (kept private until you share it)"
          maxLength={200}
        />
      </label>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-foreground">
          Working days <span className="text-muted-foreground">(optional)</span>
        </span>
        <div className="flex flex-wrap gap-2">
          {WEEK_DAYS.map((d) => {
            const active = workingDays.includes(d.value);
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDay(d.value)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "border-primary bg-[#E1F5EE] text-primary"
                    : "border-border text-muted-foreground hover:bg-secondary"
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-foreground">
          Working hours <span className="text-muted-foreground">(optional)</span>
        </span>
        <Input
          value={workingHours}
          onChange={(e) => setWorkingHours(e.target.value)}
          placeholder="e.g. After 5:00 PM, 3 hours/day"
          maxLength={120}
        />
      </label>

      {/* #6 — how many professionals may get in touch. */}
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-foreground">
          How many professionals may contact you?
        </span>
        <select
          value={maxContacts === null ? "none" : String(maxContacts)}
          onChange={(e) =>
            setMaxContacts(e.target.value === "none" ? null : Number(e.target.value))
          }
          className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
        >
          {QUOTE_OPTIONS.map((o) => (
            <option key={o.label} value={o.value === null ? "none" : o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-muted-foreground">
          Once this many have been in touch, no more can see your details. You can
          raise it any time by editing the job.
        </span>
      </label>

      {/* #7 — consent to share contact details (create only). */}
      {showConsent && (
        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border/70 bg-secondary/30 p-3">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => {
              setConsent(e.target.checked);
              if (e.target.checked) setConsentError(false);
            }}
            className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
          />
          <span className="text-xs leading-relaxed text-foreground/90">
            I authorise SelfeConnect to share my contact details (name, phone and
            email) with the professionals I've chosen to allow, so they can quote
            for this job.
            {consentError && (
              <span className="mt-1 block font-medium text-destructive">
                Please tick this to post your job.
              </span>
            )}
          </span>
        </label>
      )}

      {formError && (
        <p className="text-sm text-destructive" role="alert">
          {formError}
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
          submitLabel
        )}
      </Button>
    </form>
  );
}
