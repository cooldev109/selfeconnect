import {
  Briefcase,
  LineChart,
  Star,
  QrCode,
  CreditCard,
  Search,
  Plus,
  Settings,
  ClipboardList,
  ShieldCheck,
} from "lucide-react";
import type { NavItem } from "@/components/DashboardShell";

// Professional dashboard — "Find work" leads; tips move to a secondary tab.
export const PRO_NAV: NavItem[] = [
  { to: "/jobs", label: "Find work", icon: Briefcase },
  { to: "/my-jobs", label: "My jobs", icon: ClipboardList },
  { to: "/dashboard", label: "Payments & tips", icon: LineChart },
  { to: "/reviews", label: "My reviews", icon: Star },
  { to: "/verify", label: "Verification", icon: ShieldCheck },
  { to: "/profile", label: "Profile & QR", icon: QrCode },
  { to: "/account", label: "Account", icon: CreditCard },
];

// Customer / business dashboard.
export const CUSTOMER_NAV: NavItem[] = [
  { to: "/customer/search", label: "Find a professional", icon: Search },
  { to: "/customer/jobs/new", label: "Post a job", icon: Plus },
  { to: "/customer", label: "My jobs", icon: Briefcase, exact: true },
  { to: "/customer/account", label: "Account", icon: Settings },
];
