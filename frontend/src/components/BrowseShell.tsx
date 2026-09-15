import { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Eye, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/shared";
import { CustomerShell } from "@/components/CustomerShell";
import { useCustomer } from "@/lib/useCustomer";

// Chrome for the pages anyone may look at: professional search and profiles.
// A signed-in customer gets their normal dashboard shell (side-nav and all);
// everyone else gets the public site header, and is invited — not forced — to
// create a free account.
export function BrowseShell({
  title,
  subtitle,
  preview,
  children,
}: {
  title?: string;
  subtitle?: string;
  /** A professional previewing their own public profile. Shows a clear
   * "preview" frame instead of the public "Log in / Sign up" header, so they
   * don't mistake the visitor's-eye view for having been logged out. */
  preview?: boolean;
  children: ReactNode;
}) {
  const { customer, loading } = useCustomer();

  // Preview mode is a signed-in professional looking at their own page, so it
  // must never fall through to the customer dashboard or the public login CTAs.
  if (preview) {
    return (
      <div className="min-h-screen bg-[#F4F8F8]">
        <header className="sticky top-0 z-30 border-b border-primary/20 bg-[#E1F5EE]/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
            <span className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-primary">
              <Eye className="h-4 w-4 shrink-0" />
              <span className="truncate">Preview · this is how customers see your profile</span>
            </span>
            <Button asChild size="sm" variant="outline" className="shrink-0 rounded-xl bg-background">
              <Link to="/profile">
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to editing
              </Link>
            </Button>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
          <div aria-busy={loading || undefined}>{children}</div>
        </main>
      </div>
    );
  }

  if (customer) {
    return (
      <CustomerShell title={title} subtitle={subtitle}>
        {children}
      </CustomerShell>
    );
  }

  // While the session is still resolving, render the public frame rather than a
  // spinner — the results below don't depend on being signed in.
  return (
    <div className="min-h-screen bg-[#F4F8F8]">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3.5">
          <Link to="/" className="flex min-w-0 items-center">
            <Logo withTagline={false} />
          </Link>
          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            <Link
              to="/customer/login"
              className="whitespace-nowrap text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Log in
            </Link>
            <Button asChild size="sm" className="shrink-0 rounded-xl">
              <Link to="/customer/signup">Sign up free</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        {title && (
          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold text-foreground">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        )}
        <div aria-busy={loading || undefined}>{children}</div>
      </main>

      <footer className="border-t border-border/60 py-8">
        <p className="text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} SelfeConnect · Free to search, free to
          post a job, no commission.
        </p>
      </footer>
    </div>
  );
}
