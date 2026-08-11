import { Link } from "@tanstack/react-router";

// A segmented toggle so both login types are reachable straight from the main
// "Log in" button. Each tab links to the other role's login page.
export function LoginRoleTabs({
  active,
}: {
  active: "professional" | "customer";
}) {
  const tab =
    "flex-1 rounded-xl px-3 py-2.5 text-center text-[13px] font-semibold leading-tight text-balance transition";
  const on = "bg-primary text-primary-foreground shadow-soft";
  const off = "text-muted-foreground hover:text-foreground";
  return (
    <div className="mx-auto mb-6 flex w-full max-w-sm gap-1 rounded-2xl border border-border/70 bg-card p-1 shadow-soft">
      <Link
        to="/login"
        aria-current={active === "professional" ? "page" : undefined}
        className={`${tab} ${active === "professional" ? on : off}`}
      >
        Log in as a professional
      </Link>
      <Link
        to="/customer/login"
        aria-current={active === "customer" ? "page" : undefined}
        className={`${tab} ${active === "customer" ? on : off}`}
      >
        Log in as a customer
      </Link>
    </div>
  );
}
