import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/shared";
import { CustomerShell } from "@/components/CustomerShell";
import { PostJobWizard } from "@/components/PostJobWizard";
import { createJob } from "@/lib/jobs";

export const Route = createFileRoute("/customer/jobs/new")({
  head: () => ({ meta: [{ title: "Post a job — SelfeConnect" }] }),
  component: NewJobPage,
});

function NewJobPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  return (
    <CustomerShell
      title="Post a job"
      subtitle="Describe what you need — professionals in that category can find it."
    >
      <div className="mx-auto max-w-2xl">
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <PostJobWizard
              onSubmit={async (input) => {
                await createJob(input);
                await qc.invalidateQueries({ queryKey: ["my-jobs"] });
                navigate({ to: "/customer" });
              }}
            />
          </CardContent>
        </Card>
      </div>
    </CustomerShell>
  );
}
