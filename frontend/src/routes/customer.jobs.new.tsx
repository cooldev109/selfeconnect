import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { Card, CardContent } from "@/components/shared";
import { JobForm } from "@/components/JobForm";
import { createJob } from "@/lib/jobs";
import { useRequireCustomer } from "@/lib/useRequireCustomer";

export const Route = createFileRoute("/customer/jobs/new")({
  head: () => ({ meta: [{ title: "Post a job — SelfeConnect" }] }),
  component: NewJobPage,
});

function NewJobPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { customer, loading } = useRequireCustomer();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }
  if (!customer) return null;

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
          Post a job
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Describe what you need — professionals in that category can find it.
        </p>
        <Card className="mt-6 rounded-2xl">
          <CardContent className="p-6">
            <JobForm
              submitLabel="Post job"
              onSubmit={async (input) => {
                await createJob(input);
                await qc.invalidateQueries({ queryKey: ["my-jobs"] });
                navigate({ to: "/customer" });
              }}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
