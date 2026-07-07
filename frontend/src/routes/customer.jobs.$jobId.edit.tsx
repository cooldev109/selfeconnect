import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/shared";
import { CustomerShell } from "@/components/CustomerShell";
import { JobForm } from "@/components/JobForm";
import { getJob, updateJob } from "@/lib/jobs";

export const Route = createFileRoute("/customer/jobs/$jobId/edit")({
  head: () => ({ meta: [{ title: "Edit job — SelfeConnect" }] }),
  component: EditJobPage,
});

function EditJobPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { jobId } = useParams({ from: "/customer/jobs/$jobId/edit" });
  const jobQ = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => getJob(jobId),
    retry: false,
  });

  const job = jobQ.data;

  return (
    <CustomerShell title="Edit job">
      <div className="mx-auto max-w-2xl">
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            {jobQ.isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : job ? (
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
    </CustomerShell>
  );
}
