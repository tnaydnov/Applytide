import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import {
  LayoutDashboard,
  Users,
  AlertCircle,
  Cpu,
  Shield,
  LogOut as LogOutIcon,
  Settings,
} from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { PageBackground } from "../background/PageBackground";

interface AdminLayoutProps {
  children: ReactNode;
}

const adminNavItems = [
  {
    label: { en: "Dashboard", he: "לוח בקרה" },
    icon: LayoutDashboard,
    href: "/admin",
  },
  { label: { en: "Users", he: "משתמשים" }, icon: Users, href: "/admin/users" },
  {
    label: { en: "Errors", he: "שגיאות" },
    icon: AlertCircle,
    href: "/admin/errors",
  },
  {
    label: { en: "LLM Usage", he: "שימוש LLM" },
    icon: Cpu,
    href: "/admin/llm-usage",
  },
  {
    label: { en: "Security", he: "אבטחה" },
    icon: Shield,
    href: "/admin/security",
  },
  {
    label: { en: "Sessions", he: "חיבורים" },
    icon: Settings,
    href: "/admin/sessions",
  },
  {
    label: { en: "System", he: "מערכת" },
    icon: Settings,
    href: "/admin/system",
  },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen relative">
      <PageBackground />

      <div className="relative">
        {/* Header */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="border-b"
          style={{
            backgroundColor: "rgba(56, 62, 78, 0.8)",
            borderColor: "rgba(159, 95, 128, 0.2)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: "rgba(159, 95, 128, 0.2)" }}
                >
                  <Shield className="w-6 h-6" style={{ color: "#9F5F80" }} />
                </div>
                <div>
                  <h1 className="text-xl" style={{ color: "#b6bac5" }}>
                    {t("Admin Panel", "פאנל ניהול")}
                  </h1>
                  <p
                    className="text-sm"
                    style={{ color: "rgba(182, 186, 197, 0.7)" }}
                  >
                    {t("System Management", "ניהול מערכת")}
                  </p>
                </div>
              </div>

              <Link
                to="/dashboard"
                className="flex items-center gap-2 px-4 py-2 rounded-lg hover:opacity-80 transition-opacity"
                style={{
                  backgroundColor: "rgba(159, 95, 128, 0.2)",
                  color: "#b6bac5",
                }}
              >
                <LogOutIcon className="w-4 h-4" />
                <span className="text-sm">
                  {t("Exit Admin", "יציאה מניהול")}
                </span>
              </Link>
            </div>
          </div>
        </motion.header>

        {/* Navigation */}
        <div
          className="border-b"
          style={{
            backgroundColor: "rgba(56, 62, 78, 0.6)",
            borderColor: "rgba(159, 95, 128, 0.1)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex gap-1 overflow-x-auto py-2">
              {adminNavItems.map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all"
                    style={{
                      backgroundColor: isActive
                        ? "rgba(159, 95, 128, 0.3)"
                        : "transparent",
                      color: isActive ? "#9F5F80" : "rgba(182, 186, 197, 0.7)",
                      borderBottom: isActive
                        ? "2px solid #9F5F80"
                        : "2px solid transparent",
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">
                      {t(item.label.en, item.label.he)}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}