import { createFileRoute, useNavigate, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { Card, CardContent } from "@/components/shared";
import { JobForm } from "@/components/JobForm";
import { getJob, updateJob } from "@/lib/jobs";
import { useRequireCustomer } from "@/lib/useRequireCustomer";

export const Route = createFileRoute("/customer/jobs/$jobId/edit")({
  head: () => ({ meta: [{ title: "Edit job — SelfeConnect" }] }),
  component: EditJobPage,
});

function EditJobPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { jobId } = useParams({ from: "/customer/jobs/$jobId/edit" });
  const { customer, loading } = useRequireCustomer();
  const jobQ = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => getJob(jobId),
    retry: false,
    enabled: !!customer,
  });

  if (loading || jobQ.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }
  if (!customer) return null;

  const job = jobQ.data;

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <LogoMark className="h-8 w-8" />
            <span className="text-lg font-bold tracking-tight text-foreground font-display">
              SelfeConnect
            </span>
          </div>
          <Link
            to="/customer"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="text-2xl font-bold text-foreground font-display">
          Edit job
        </h1>
        <Card className="mt-6 rounded-2xl">
          <CardContent className="p-6">
            {job ? (
              <JobForm
                submitLabel="Save changes"
                initial={{
                  categorySlug: job.categorySlug,
                  title: job.title,
                  description: job.description,
                  postcode: job.postcode,
                  addressLine: job.addressLine ?? undefined,
                  workingDays: job.workingDays,
                  workingHours: job.workingHours ?? undefined,
                  budget: job.budget ?? undefined,
                }}
                onSubmit={async (input) => {
                  await updateJob(jobId, input);
                  await qc.invalidateQueries({ queryKey: ["my-jobs"] });
                  navigate({ to: "/customer" });
                }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                This job could not be found.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
