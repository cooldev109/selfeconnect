import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, Users, Receipt, Settings, LogOut, Truck } from "lucide-react";
import { me, logout, type AuthDriver } from "@/lib/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — SelfeConnect" },
      { name: "description", content: "SelfeConnect admin console." },
    ],
  }),
  component: AdminLayout,
});

const ITEMS = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard, exact: true },
  { title: "Drivers", url: "/admin/drivers", icon: Users },
  { title: "Transactions", url: "/admin/transactions", icon: Receipt },
  { title: "Settings", url: "/admin", icon: Settings, disabled: true },
] as const;

function AdminLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Admin-only gate: unauthenticated → /login, non-admin driver → /dashboard.
  const authQ = useQuery<{ driver: AuthDriver }>({
    queryKey: ["auth-me"],
    queryFn: me,
    retry: false,
  });
  const role = authQ.data?.driver.role;
  useEffect(() => {
    if (authQ.isError) navigate({ to: "/login" });
    else if (authQ.data && role !== "admin") navigate({ to: "/dashboard" });
  }, [authQ.isError, authQ.data, role, navigate]);

  const isActive = (url: string, exact?: boolean) =>
    exact ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  if (!authQ.data || role !== "admin") return null;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <Link to="/admin" className="flex items-center gap-2 px-2 py-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Truck className="h-4 w-4" />
              </div>
              <span className="font-bold tracking-tight">SelfeConnect</span>
            </Link>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {ITEMS.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.url, "exact" in item ? item.exact : false)}
                      >
                        <Link to={item.url} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={async () => {
                    await logout().catch(() => {});
                    navigate({ to: "/login" });
                  }}
                  className="text-destructive hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-1 flex-col">
          <header className="flex h-14 items-center gap-3 border-b border-border bg-background px-4">
            <SidebarTrigger />
            <span className="text-sm font-semibold text-foreground">Admin</span>
          </header>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
