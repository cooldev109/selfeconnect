import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { CustomerShell } from "@/components/CustomerShell";
import { DashCard } from "@/components/DashKit";
import { JobForm } from "@/components/JobForm";
import { getJob, updateJob } from "@/lib/jobs";

export const Route = createFileRoute("/customer/jobs/$jobId_/edit")({
  head: () => ({ meta: [{ title: "Edit job — SelfeConnect" }] }),
  component: EditJobPage,
});

function EditJobPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { jobId } = useParams({ from: "/customer/jobs/$jobId_/edit" });
  const jobQ = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => getJob(jobId),
    retry: false,
  });

  const job = jobQ.data;

  return (
    <CustomerShell title="Edit job">
      <div className="mx-auto max-w-2xl">
        <DashCard>
            {jobQ.isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : job ? (
              <JobForm
                submitLabel="Save changes"
                showConsent={false}
                initial={{
                  categorySlug: job.categorySlug,
                  title: job.title,
                  description: job.description,
                  postcode: job.postcode,
                  addressLine: job.addressLine ?? undefined,
                  workingDays: job.workingDays,
                  workingHours: job.workingHours ?? undefined,
                  budget: job.budget ?? undefined,
                  maxContacts: job.maxContacts,
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
        </DashCard>
      </div>
    </CustomerShell>
  );
}
