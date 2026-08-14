import { useRef, useState } from "react";
import { z } from "zod";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, X } from "lucide-react";
import { Button, Input } from "@/components/shared";
import { CategorySelect } from "@/components/CategoryPicker";
import { PostcodeInput } from "@/components/PostcodeInput";
import { WEEK_DAYS, uploadJobPhoto, type JobInput } from "@/lib/jobs";
import { ApiError } from "@/lib/api";

// A guided, mobile-first flow for posting a job. Splits the old single long
// form into four focused steps so a first-time customer is never staring at a
// wall of fields — each step asks one clear thing, validates, then advances.

const MAX_PHOTOS = 8;

// Suggested "when" phrases — one tap instead of typing, but still editable.
const TIMING_OPTIONS = [
  "As soon as possible",
  "Within a few days",
  "Within a week",
  "Within a month",
  "I'm flexible",
];

// How many professionals may contact the customer. null = no limit.
const QUOTE_OPTIONS: { value: number | null; label: string }[] = [
  { value: 5, label: "Up to 5 quotes" },
  { value: 10, label: "Up to 10 quotes" },
  { value: 20, label: "Up to 20 quotes" },
  { value: null, label: "No limit" },
];

const STEPS = ["Service", "Details", "Location", "Finish"] as const;

// Per-step validation. Each step only checks its own fields so "Next" gives
// immediate, local feedback rather than a pile of errors at the end.
const stepSchemas = [
  z.object({
    categorySlug: z.string().min(1, "Choose a service category"),
    title: z.string().trim().min(3, "Enter a short title").max(120),
  }),
  z.object({
    description: z
      .string()
      .trim()
      .min(10, "Please describe the job (at least 10 characters)")
      .max(2000),
  }),
  z.object({
    postcode: z.string().trim().min(5, "Enter the job postcode").max(12),
  }),
];

// Validation for the inline guest account (job-first signup).
const accountSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(120),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

type FieldErrors = Record<string, string>;

// The account a logged-out visitor creates inline at the final step (job-first
// signup). Phone is deliberately omitted — the job carries no phone unless they
// add one later, keeping this the lowest-friction path to posting.
export interface GuestAccount {
  name: string;
  email: string;
  password: string;
}

export function PostJobWizard({
  onSubmit,
  requireAccount = false,
}: {
  // When requireAccount is set, `account` is provided (a logged-out visitor
  // creating their account inline); otherwise the customer is already signed in.
  onSubmit: (input: JobInput, account?: GuestAccount) => Promise<void>;
  requireAccount?: boolean;
}) {
  const [step, setStep] = useState(0);

  // Guest account (only used when requireAccount).
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPassword, setGuestPassword] = useState("");

  const [categorySlug, setCategorySlug] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const [postcode, setPostcode] = useState("");
  const [timing, setTiming] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [workingDays, setWorkingDays] = useState<string[]>([]);
  const [workingHours, setWorkingHours] = useState("");
  const [budget, setBudget] = useState("");
  const [maxContacts, setMaxContacts] = useState<number | null>(10);
  const [consent, setConsent] = useState(false);
  const [consentError, setConsentError] = useState(false);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toggleDay = (d: string) =>
    setWorkingDays((days) => (days.includes(d) ? days.filter((x) => x !== d) : [...days, d]));

  const values: Record<string, unknown> = {
    categorySlug,
    title,
    description,
    postcode,
  };

  const validateStep = (i: number): boolean => {
    const schema = stepSchemas[i];
    if (!schema) return true;
    const parsed = schema.safeParse(values);
    if (parsed.success) {
      setErrors({});
      return true;
    }
    const fe: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0] as string;
      if (!fe[k]) fe[k] = issue.message;
    }
    setErrors(fe);
    return false;
  };

  const next = () => {
    if (!validateStep(step)) return;
    setErrors({});
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const back = () => {
    setErrors({});
    setFormError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  const onPickFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploadError(null);
    const room = MAX_PHOTOS - photos.length;
    const picked = Array.from(files).slice(0, room);
    setUploading(true);
    try {
      for (const file of picked) {
        const { url } = await uploadJobPhoto(file);
        setPhotos((p) => (p.length < MAX_PHOTOS ? [...p, url] : p));
      }
    } catch {
      setUploadError("Couldn't upload that image. Please try another.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const removePhoto = (url: string) => setPhotos((p) => p.filter((x) => x !== url));

  const submit = async () => {
    // Re-check every gated step in case someone skipped ahead via Back.
    for (let i = 0; i < stepSchemas.length; i++) {
      if (!validateStep(i)) {
        setStep(i);
        return;
      }
    }
    if (!consent) {
      setConsentError(true);
      return;
    }
    let account: GuestAccount | undefined;
    if (requireAccount) {
      const acc = accountSchema.safeParse({
        name: guestName,
        email: guestEmail,
        password: guestPassword,
      });
      if (!acc.success) {
        const fe: FieldErrors = {};
        for (const issue of acc.error.issues) {
          const k = issue.path[0] as string;
          if (!fe[k]) fe[k] = issue.message;
        }
        setErrors((x) => ({ ...x, ...fe }));
        return;
      }
      account = {
        name: acc.data.name.trim(),
        email: acc.data.email.trim(),
        password: acc.data.password,
      };
    }
    setFormError(null);
    setBusy(true);
    try {
      await onSubmit(
        {
          categorySlug,
          title: title.trim(),
          description: description.trim(),
          postcode: postcode.trim(),
          addressLine: addressLine.trim() || undefined,
          workingDays,
          workingHours: workingHours.trim() || undefined,
          budget: budget.trim() || undefined,
          timing: timing.trim() || undefined,
          photos,
          maxContacts,
          contactConsent: true,
        },
        account,
      );
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.status === 400 &&
        String((err.body as { message?: string })?.message ?? "").includes("postcode")
      ) {
        setErrors((x) => ({ ...x, postcode: "Enter a valid UK postcode." }));
        setStep(2);
      } else {
        // A route handling guest signup throws a friendly Error message
        // (e.g. wrong password for an existing email) — surface it as-is.
        setFormError(
          err instanceof Error && err.message && !(err instanceof ApiError)
            ? err.message
            : "Something went wrong. Please try again.",
        );
      }
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Stepper step={step} />

      {step === 0 && (
        <div className="space-y-5">
          <div className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">
              What service do you need?
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
            <span className="mb-1.5 block text-sm font-medium text-foreground">
              Give it a short title
            </span>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Office cleaner needed"
              maxLength={120}
            />
            {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title}</p>}
          </label>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">
              Describe the job
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What needs doing, any requirements, and anything a professional should know before quoting…"
              rows={5}
              maxLength={2000}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            />
            {errors.description && (
              <p className="mt-1 text-xs text-destructive">{errors.description}</p>
            )}
          </label>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-foreground">
              Add photos <span className="text-muted-foreground">(optional)</span>
            </span>
            <p className="mb-2 text-xs text-muted-foreground">
              Photos help professionals quote accurately without a site visit.
            </p>
            <div className="flex flex-wrap gap-2.5">
              {photos.map((url) => (
                <div
                  key={url}
                  className="relative h-20 w-20 overflow-hidden rounded-xl border border-border"
                >
                  <img src={url} alt="Job photo" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(url)}
                    aria-label="Remove photo"
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  disabled={uploading}
                  className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-input text-muted-foreground transition hover:border-primary hover:text-primary disabled:opacity-60"
                >
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <ImagePlus className="h-5 w-5" />
                      <span className="text-[11px] font-medium">Add</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => onPickFiles(e.target.files)}
            />
            {uploadError && <p className="mt-1.5 text-xs text-destructive">{uploadError}</p>}
            {photos.length > 0 && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                {photos.length} of {MAX_PHOTOS} added
              </p>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">
              Where is the job?
            </span>
            <PostcodeInput value={postcode} onChange={setPostcode} ariaLabel="Job postcode" />
            {errors.postcode ? (
              <p className="mt-1 text-xs text-destructive">{errors.postcode}</p>
            ) : (
              <span className="mt-1 block text-xs text-muted-foreground">
                Just the postcode — this is how nearby professionals find your job. Your address
                stays private.
              </span>
            )}
          </label>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-foreground">
              When do you need it done? <span className="text-muted-foreground">(optional)</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {TIMING_OPTIONS.map((t) => {
                const active = timing === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTiming(active ? "" : t)}
                    aria-pressed={active}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                      active
                        ? "border-primary bg-[#E1F5EE] text-primary"
                        : "border-border text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
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
              Once this many have been in touch, no more can see your details. You can raise it any
              time by editing the job.
            </span>
          </label>

          {/* Job-first signup — a logged-out visitor creates their account
              right here, at the moment they're most committed. */}
          {requireAccount && (
            <div className="space-y-4 rounded-xl border border-border/70 bg-secondary/30 p-4">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Create your free account to post
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  So professionals can send you quotes. Already have one?{" "}
                  <a href="/customer/login" className="font-medium text-primary hover:underline">
                    Log in
                  </a>
                  .
                </p>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-foreground">Your name</span>
                <Input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Jane Doe"
                  autoComplete="name"
                  maxLength={120}
                />
                {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-foreground">Email</span>
                <Input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  maxLength={255}
                />
                {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-foreground">Password</span>
                <Input
                  type="password"
                  value={guestPassword}
                  onChange={(e) => setGuestPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  maxLength={72}
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-destructive">{errors.password}</p>
                )}
              </label>
            </div>
          )}

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
              I authorise SelfeConnect to share my contact details (name, phone and email) with the
              professionals I've chosen to allow, so they can quote for this job.
              {consentError && (
                <span className="mt-1 block font-medium text-destructive">
                  Please tick this to post your job.
                </span>
              )}
            </span>
          </label>
        </div>
      )}

      {formError && (
        <p className="text-sm text-destructive" role="alert">
          {formError}
        </p>
      )}

      {/* Navigation — Back on the left once past step 1, primary action right. */}
      <div className="flex items-center gap-3 pt-1">
        {step > 0 && (
          <Button type="button" onClick={back} variant="outline" className="h-12 rounded-xl px-5">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button
            type="button"
            onClick={next}
            className="h-12 flex-1 rounded-xl bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Next <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={submit}
            disabled={busy}
            className="h-12 flex-1 rounded-xl bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Posting…
              </>
            ) : (
              "Post job"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// A compact numbered progress bar that reads at a glance on a phone.
function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <div key={label} className="flex flex-1 flex-col gap-1.5">
            <div
              className={`h-1.5 rounded-full transition ${
                done || active ? "bg-primary" : "bg-border"
              }`}
            />
            <span
              className={`text-[11px] font-medium ${
                active ? "text-primary" : done ? "text-foreground/70" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
