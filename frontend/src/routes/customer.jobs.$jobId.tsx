import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowLeft } from "lucide-react";
import { Card, CardContent, Button } from "@/components/shared";
import { CustomerShell } from "@/components/CustomerShell";
import { JobWorkspace } from "@/components/JobWorkspace";
import { getJob } from "@/lib/jobs";

export const Route = createFileRoute("/customer/jobs/$jobId")({
  head: () => ({
    meta: [{ title: "Job — SelfeConnect" }],
  }),
  component: JobDetailPage,
});

function JobDetailPage() {
  const { jobId } = Route.useParams();
  const jobQ = useQuery({
    queryKey: ["my-job", jobId],
    queryFn: () => getJob(jobId),
    retry: false,
  });

  return (
    <CustomerShell title="Job details" subtitle="">
      <div className="space-y-4">
        <Link
          to="/customer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to my jobs
        </Link>

        {jobQ.isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : jobQ.isError || !jobQ.data ? (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
              <p className="text-sm text-muted-foreground">
                We couldn't find this job — it may have been removed.
              </p>
              <Link to="/customer">
                <Button className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
                  Back to my jobs
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <JobWorkspace job={jobQ.data} />
        )}
      </div>
    </CustomerShell>
  );
}
