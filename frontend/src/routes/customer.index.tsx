import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Loader2, LogOut, Plus, MapPin, Search, Trash2, Pencil } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { Badge, Button, Card, CardContent } from "@/components/shared";
import { customerLogout } from "@/lib/customer-auth";
import { listMyJobs, updateJob, deleteJob, type Job } from "@/lib/jobs";
import { useRequireCustomer } from "@/lib/useRequireCustomer";

export const Route = createFileRoute("/customer/")({
  head: () => ({
    meta: [
      { title: "Your account — SelfeConnect" },
      { name: "description", content: "Manage your jobs and find professionals." },
    ],
  }),
  component: CustomerHome,
});

function CustomerHome() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { customer, loading } = useRequireCustomer();
  const jobsQ = useQuery({
    queryKey: ["my-jobs"],
    queryFn: listMyJobs,
    retry: false,
    enabled: !!customer,
  });

  const toggleStatus = useMutation({
    mutationFn: (j: Job) =>
      updateJob(j.id, { status: j.status === "open" ? "closed" : "open" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-jobs"] }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteJob(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-jobs"] }),
  });

  const onLogout = async () => {
    await customerLogout().catch(() => {});
    navigate({ to: "/customer/login" });
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }
  if (!customer) return null;

  const jobs = jobsQ.data ?? [];

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <LogoMark className="h-8 w-8" />
            <span className="text-lg font-bold tracking-tight text-foreground font-display">
              SelfeConnect
            </span>
          </div>
          <Button variant="outline" className="rounded-xl" onClick={onLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Log out
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground font-display">
              Welcome, {customer.companyName || customer.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Signed in as {customer.email}
              {customer.type === "business" ? " · Business account" : ""}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl" disabled title="Coming next">
              <Search className="mr-2 h-4 w-4" /> Find a professional
            </Button>
            <Button
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => navigate({ to: "/customer/jobs/new" })}
            >
              <Plus className="mr-2 h-4 w-4" /> Post a job
            </Button>
          </div>
        </div>

        <h2 className="mt-9 text-lg font-semibold text-foreground">Your jobs</h2>

        {jobsQ.isLoading ? (
          <div className="mt-6 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : jobs.length === 0 ? (
          <Card className="mt-4 rounded-2xl border-dashed">
            <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
              <p className="text-sm text-muted-foreground">
                You haven't posted any jobs yet.
              </p>
              <Button
                className="mt-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => navigate({ to: "/customer/jobs/new" })}
              >
                <Plus className="mr-2 h-4 w-4" /> Post your first job
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="mt-4 space-y-3">
            {jobs.map((j) => (
              <Card key={j.id} className="rounded-2xl">
                <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold text-foreground">
                        {j.title}
                      </h3>
                      <Badge
                        className={`rounded-full ${
                          j.status === "open"
                            ? "bg-[#E1F5EE] text-primary hover:bg-[#E1F5EE]"
                            : "bg-muted text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {j.status}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {j.description}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {j.categoryName}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {j.postcode}
                      </span>
                      {j.budget && <span>{j.budget}</span>}
                      {j.workingHours && <span>{j.workingHours}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="outline"
                      className="h-9 rounded-lg px-3 text-xs"
                      onClick={() => toggleStatus.mutate(j)}
                      disabled={toggleStatus.isPending}
                    >
                      {j.status === "open" ? "Close" : "Reopen"}
                    </Button>
                    <Link
                      to="/customer/jobs/$jobId/edit"
                      params={{ jobId: j.id }}
                      className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-xs font-medium text-foreground hover:bg-secondary"
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                    </Link>
                    <Button
                      variant="outline"
                      className="h-9 rounded-lg border-destructive/30 px-3 text-xs text-destructive hover:bg-destructive/10"
                      onClick={() => remove.mutate(j.id)}
                      disabled={remove.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
