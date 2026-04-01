import { useState, useEffect, useCallback } from "react";
import { AdminGuard } from "../../components/guards/AdminGuard";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { StatCard } from "../../components/admin/StatCard";
import { adminApi, SystemHealth } from "../../features/admin/api";
import { Database, HardDrive, Activity } from "lucide-react";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import { useLanguage } from "../../contexts/LanguageContext";
import { PageTransition } from "../../components/layout/PageTransition";

export default function SystemPage() {
  const { t } = useLanguage();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSystemHealth = useCallback(async () => {
    try {
      const data = await adminApi.getSystemHealth();
      setHealth(data);
      setLoading(false);
    } catch (error) {
      toast.error(t("Failed to load system health", "שגיאה בטעינת בריאות המערכת"));
    }
  }, [t]);

  useEffect(() => {
    loadSystemHealth();
    const interval = setInterval(loadSystemHealth, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [loadSystemHealth]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "#10b981";
      case "degraded":
        return "#f59e0b";
      case "down":
        return "#ef4444";
      default:
        return "#9F5F80";
    }
  };

  return (
    <AdminGuard>
      <PageTransition>
        <AdminLayout>
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl mb-2" style={{ color: "#b6bac5" }}>
                {t("System Health", "בריאות המערכת")}
              </h1>
              <p style={{ color: "rgba(182, 186, 197, 0.7)" }}>
                {t("Monitor system components", "ניטור רכיבי מערכת")}
              </p>
            </div>
            <Button onClick={loadSystemHealth} disabled={loading}>
              {t("Refresh", "רענן")}
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-32 rounded-xl animate-pulse"
                  style={{ backgroundColor: "rgba(90, 94, 106, 0.3)" }}
                />
              ))}
            </div>
          ) : health ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard
                  title={t("Database", "מסד נתונים")}
                  value={health.database.status}
                  icon={Database}
                  color={getStatusColor(health.database.status)}
                />
                <StatCard
                  title={t("Redis", "Redis")}
                  value={health.redis.status}
                  icon={HardDrive}
                  color={getStatusColor(health.redis.status)}
                />
                <StatCard
                  title={t("LLM Service", "שירות LLM")}
                  value={health.llm_service.status}
                  icon={Activity}
                  color={getStatusColor(health.llm_service.status)}
                />
              </div>

              {/* Detailed Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Database Details */}
                <div
                  className="p-6 rounded-xl"
                  style={{
                    backgroundColor: "rgba(90, 94, 106, 0.4)",
                    border: "1px solid rgba(159, 95, 128, 0.2)",
                  }}
                >
                  <h3 className="mb-4" style={{ color: "#b6bac5" }}>
                    {t("Database Details", "פרטי מסד נתונים")}
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span style={{ color: "rgba(182, 186, 197, 0.7)" }}>
                        {t("Connections", "חיבורים")}
                      </span>
                      <span style={{ color: "#b6bac5" }}>
                        {health.database.connections}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: "rgba(182, 186, 197, 0.7)" }}>
                        {t("Size", "גודל")}
                      </span>
                      <span style={{ color: "#b6bac5" }}>
                        {health.database.size_mb} MB
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: "rgba(182, 186, 197, 0.7)" }}>
                        {t("Response Time", "זמן תגובה")}
                      </span>
                      <span style={{ color: "#b6bac5" }}>
                        {health.database.response_time_ms} ms
                      </span>
                    </div>
                  </div>
                </div>

                {/* Redis Details */}
                <div
                  className="p-6 rounded-xl"
                  style={{
                    backgroundColor: "rgba(90, 94, 106, 0.4)",
                    border: "1px solid rgba(159, 95, 128, 0.2)",
                  }}
                >
                  <h3 className="mb-4" style={{ color: "#b6bac5" }}>
                    {t("Redis Details", "פרטי Redis")}
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span style={{ color: "rgba(182, 186, 197, 0.7)" }}>
                        {t("Memory Used", "זיכרון בשימוש")}
                      </span>
                      <span style={{ color: "#b6bac5" }}>
                        {health.redis.memory_used_mb} MB
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: "rgba(182, 186, 197, 0.7)" }}>
                        {t("Total Memory", "סך זיכרון")}
                      </span>
                      <span style={{ color: "#b6bac5" }}>
                        {health.redis.memory_total_mb} MB
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: "rgba(182, 186, 197, 0.7)" }}>
                        {t("Keys", "מפתחות")}
                      </span>
                      <span style={{ color: "#b6bac5" }}>{health.redis.keys}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </AdminLayout>
      </PageTransition>
    </AdminGuard>
  );
}
