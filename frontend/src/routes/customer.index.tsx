import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, LogOut, Briefcase, Search } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { Button, Card, CardContent } from "@/components/shared";
import { customerMe, customerLogout } from "@/lib/customer-auth";
import { ApiError } from "@/lib/api";

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
  const meQ = useQuery({
    queryKey: ["customer-me"],
    queryFn: customerMe,
    retry: false,
  });

  // Not logged in as a customer → send to the customer login.
  useEffect(() => {
    if (meQ.isError && meQ.error instanceof ApiError && meQ.error.status === 401) {
      navigate({ to: "/customer/login" });
    }
  }, [meQ.isError, meQ.error, navigate]);

  const onLogout = async () => {
    await customerLogout().catch(() => {});
    navigate({ to: "/customer/login" });
  };

  if (meQ.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  const customer = meQ.data?.customer;
  if (!customer) return null;

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
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={onLogout}
          >
            <LogOut className="mr-2 h-4 w-4" /> Log out
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-bold text-foreground font-display">
          Welcome, {customer.companyName || customer.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Signed in as {customer.email}
          {customer.type === "business" ? " · Business account" : ""}
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Card className="rounded-2xl">
            <CardContent className="flex flex-col items-start gap-2 p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E1F5EE] text-primary">
                <Briefcase className="h-5 w-5" />
              </span>
              <h2 className="mt-1 text-base font-semibold text-foreground">
                Post a job
              </h2>
              <p className="text-sm text-muted-foreground">
                Describe what you need and reach professionals in that category.
              </p>
              <Button className="mt-3 rounded-xl" disabled>
                Coming next
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="flex flex-col items-start gap-2 p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E1F5EE] text-primary">
                <Search className="h-5 w-5" />
              </span>
              <h2 className="mt-1 text-base font-semibold text-foreground">
                Find a professional
              </h2>
              <p className="text-sm text-muted-foreground">
                Browse reviewed professionals near you by category and distance.
              </p>
              <Button className="mt-3 rounded-xl" disabled>
                Coming next
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
