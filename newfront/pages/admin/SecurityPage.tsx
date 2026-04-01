import { useState, useEffect } from "react";
import { AdminGuard } from "../../components/guards/AdminGuard";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { adminApi, SecurityEvent } from "../../features/admin/api";
import { Shield } from "lucide-react";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import { useLanguage } from "../../contexts/LanguageContext";
import { PageTransition } from "../../components/layout/PageTransition";
import { format } from "date-fns";

export default function SecurityPage() {
  const { t } = useLanguage();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [severityFilter, setSeverityFilter] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    loadEvents(() => cancelled);
    return () => { cancelled = true; };
  }, [page, severityFilter]);

  const loadEvents = async (isCancelled?: () => boolean) => {
    try {
      setLoading(true);
      const data = await adminApi.getSecurityEvents({ page, severity: severityFilter });
      if (isCancelled?.()) return;
      setEvents(data.events);
      setTotalPages(data.pages);
    } catch (error) {
      if (isCancelled?.()) return;
      toast.error(t("Failed to load security events", "שגיאה בטעינת אירועי אבטחה"));
    } finally {
      if (!isCancelled?.()) setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "#dc2626";
      case "high":
        return "#ef4444";
      case "medium":
        return "#f59e0b";
      case "low":
        return "#10b981";
      default:
        return "#9F5F80";
    }
  };

  return (
    <AdminGuard>
      <PageTransition>
        <AdminLayout>
          <div className="mb-8">
            <h1 className="text-3xl mb-2" style={{ color: "#b6bac5" }}>
              {t("Security Events", "אירועי אבטחה")}
            </h1>
            <p style={{ color: "rgba(182, 186, 197, 0.7)" }}>
              {t("Monitor security incidents", "ניטור אירועי אבטחה")}
            </p>
          </div>

          {/* Filter */}
          <div className="mb-6">
            <select
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-3 rounded-lg border outline-none"
              style={{
                backgroundColor: "rgba(90, 94, 106, 0.4)",
                borderColor: "rgba(159, 95, 128, 0.3)",
                color: "#b6bac5",
              }}
            >
              <option value="">{t("All Severities", "כל הרמות")}</option>
              <option value="critical">{t("Critical", "קריטי")}</option>
              <option value="high">{t("High", "גבוה")}</option>
              <option value="medium">{t("Medium", "בינוני")}</option>
              <option value="low">{t("Low", "נמוך")}</option>
            </select>
          </div>

          {/* Events List */}
          <div className="space-y-4">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-24 rounded-xl animate-pulse"
                  style={{ backgroundColor: "rgba(90, 94, 106, 0.3)" }}
                />
              ))
            ) : events.length === 0 ? (
              <div
                className="text-center py-12 rounded-xl"
                style={{
                  backgroundColor: "rgba(90, 94, 106, 0.2)",
                  color: "rgba(182, 186, 197, 0.7)",
                }}
              >
                {t("No security events", "אין אירועי אבטחה")}
              </div>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className="p-6 rounded-xl backdrop-blur-xl"
                  style={{
                    backgroundColor: "rgba(90, 94, 106, 0.4)",
                    border: `1px solid ${getSeverityColor(event.severity)}40`,
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="p-3 rounded-lg shrink-0"
                      style={{
                        backgroundColor: `${getSeverityColor(event.severity)}20`,
                      }}
                    >
                      <Shield
                        className="w-5 h-5"
                        style={{ color: getSeverityColor(event.severity) }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 style={{ color: "#b6bac5" }}>{event.event_type}</h3>
                            <span
                              className="text-xs px-2 py-1 rounded"
                              style={{
                                backgroundColor: `${getSeverityColor(event.severity)}20`,
                                color: getSeverityColor(event.severity),
                              }}
                            >
                              {event.severity}
                            </span>
                          </div>
                          <p
                            className="text-sm"
                            style={{ color: "rgba(182, 186, 197, 0.8)" }}
                          >
                            {event.description}
                          </p>
                        </div>
                        <span
                          className="text-sm shrink-0"
                          style={{ color: "rgba(182, 186, 197, 0.6)" }}
                        >
                          {format(new Date(event.timestamp), "MMM d, HH:mm")}
                        </span>
                      </div>
                      <div className="flex gap-4 text-sm" style={{ color: "rgba(182, 186, 197, 0.7)" }}>
                        {event.user_email && <div>{t("User", "משתמש")}: {event.user_email}</div>}
                        <div>IP: {event.ip_address}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                {t("Previous", "הקודם")}
              </Button>
              <div className="px-4 py-2" style={{ color: "#b6bac5" }}>
                {page} / {totalPages}
              </div>
              <Button
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                {t("Next", "הבא")}
              </Button>
            </div>
          )}
        </AdminLayout>
      </PageTransition>
    </AdminGuard>
  );
}
