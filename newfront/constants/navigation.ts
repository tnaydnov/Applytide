import {
  Home,
  LayoutDashboard,
  Briefcase,
  HelpCircle,
  Settings,
  CreditCard,
  LogOut,
  Target,
  FileText,
  Bell,
  BarChart3,
} from "lucide-react";
import { NavigationItem, UserMenuItem } from "../types";

// Public navigation items (accessible without login)
export const publicNavigationItems: NavigationItem[] = [
  { label: { en: "Home", he: "בית" }, icon: Home, href: "/" },
  {
    label: { en: "Pricing", he: "מסלולים ומחירים" },
    icon: CreditCard,
    href: "/pricing",
  },
  {
    label: { en: "How It Works", he: "איך זה עובד" },
    icon: HelpCircle,
    href: "/how-it-works",
  },
];

// Authenticated navigation items (require login)
export const authenticatedNavigationItems: NavigationItem[] = [
  // PRIMARY NAVIGATION - Job Search Workflow
  {
    label: { en: "Dashboard", he: "לוח בקרה" },
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    label: { en: "Jobs", he: "משרות" },
    icon: Briefcase,
    href: "/jobs",
  },
  {
    label: { en: "Pipeline", he: "מועמדויות" },
    icon: Target,
    href: "/pipeline",
  },
  {
    label: { en: "Documents", he: "מסמכים" },
    icon: FileText,
    href: "/documents",
  },
  {
    label: { en: "Reminders", he: "תזכורות" },
    icon: Bell,
    href: "/reminders",
  },
  {
    label: { en: "Analytics", he: "ניתוח נתונים" },
    icon: BarChart3,
    href: "/analytics",
  },
];

export const userMenuItems: UserMenuItem[] = [
  {
    label: { en: "Profile Settings", he: "הגדרות פרופיל" },
    icon: Settings,
    href: "/profile",
  },
  {
    label: { en: "Sign Out", he: "התנתק" },
    icon: LogOut,
    href: "#",
    variant: "danger",
  },
];