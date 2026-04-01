import { useState, useEffect, useCallback } from "react";
import { AdminGuard } from "../../components/guards/AdminGuard";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { StatCard } from "../../components/admin/StatCard";
import { ActivityFeed } from "../../components/admin/ActivityFeed";
import { SimpleChart } from "../../components/admin/SimpleChart";
import { adminApi, DashboardStats, Activity, DashboardCharts } from "../../features/admin/api";
import { Users, CreditCard, FileText, Activity as ActivityIcon, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "../../contexts/LanguageContext";
import { PageTransition } from "../../components/layout/PageTransition";
import { logger } from "../../lib/logger";

export default function AdminDashboardPage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      const [statsData, activitiesData, chartsData] = await Promise.all([
        adminApi.getDashboardStats(),
        adminApi.getActivityFeed(20),
        adminApi.getDashboardCharts(),
      ]);

      setStats(statsData);
      setActivities(activitiesData);
      setCharts(chartsData);
    } catch (error) {
      logger.error("Error loading dashboard:", error);
      toast.error(t("Failed to load dashboard data", "שגיאה בטעינת נתוני הדשבורד"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  return (
    <AdminGuard>
      <PageTransition>
        <AdminLayout>
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl mb-2" style={{ color: "#b6bac5" }}>
                {t("Admin Dashboard", "דשבורד ניהול")}
              </h1>
              <p style={{ color: "rgba(182, 186, 197, 0.7)" }}>
                {t("System overview and activity", "מבט כללי על המערכת ופעילות")}
              </p>
            </div>

            {/* Stats Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-32 rounded-xl animate-pulse"
                    style={{ backgroundColor: "rgba(90, 94, 106, 0.3)" }}
                  />
                ))}
              </div>
            ) : stats ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <StatCard
                  title={t("Total Users", "סך משתמשים")}
                  value={stats.total_users.toLocaleString()}
                  icon={Users}
                  color="#9F5F80"
                />
                <StatCard
                  title={t("Premium Users", "משתמשי פרימיום")}
                  value={stats.premium_users.toLocaleString()}
                  icon={CreditCard}
                  color="#3b82f6"
                />
                <StatCard
                  title={t("Total Applications", "סך בקשות")}
                  value={stats.total_applications.toLocaleString()}
                  icon={FileText}
                  color="#10b981"
                />
                <StatCard
                  title={t("Active Users", "משתמשים פעילים")}
                  value={stats.active_users.toLocaleString()}
                  icon={ActivityIcon}
                  color="#8b5cf6"
                />
                <StatCard
                  title={t("New Users Today", "משתמשים חדשים היום")}
                  value={stats.new_users_today.toLocaleString()}
                  icon={Users}
                  color="#f59e0b"
                />
                <StatCard
                  title={t("Recent Errors", "שגיאות אחרונות")}
                  value={stats.recent_errors_count.toLocaleString()}
                  icon={AlertCircle}
                  color="#ef4444"
                />
              </div>
            ) : null}

            {/* Charts */}
            {charts && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <SimpleChart
                  data={charts.signups_last_7_days}
                  title={t("Signups (Last 7 Days)", "הרשמות (7 ימים אחרונים)")}
                  color="#9F5F80"
                />
                <SimpleChart
                  data={charts.applications_last_7_days}
                  title={t("Applications (Last 7 Days)", "בקשות (7 ימים אחרונים)")}
                  color="#3b82f6"
                />
              </div>
            )}

            {/* Activity Feed */}
            <div>
              <h2 className="text-xl mb-4" style={{ color: "#b6bac5" }}>
                {t("Recent Activity", "פעילות אחרונה")}
              </h2>
              <ActivityFeed activities={activities} loading={loading} />
            </div>
          </AdminLayout>
        </PageTransition>
      </AdminGuard>
  );
}
