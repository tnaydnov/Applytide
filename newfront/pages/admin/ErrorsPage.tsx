import { useState, useEffect } from "react";
import { AdminGuard } from "../../components/guards/AdminGuard";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { adminApi, ErrorLog } from "../../features/admin/api";
import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import { useLanguage } from "../../contexts/LanguageContext";
import { PageTransition } from "../../components/layout/PageTransition";
import { format } from "date-fns";

export default function ErrorsPage() {
  const { t } = useLanguage();
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [levelFilter, setLevelFilter] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    loadErrors(() => cancelled);
    return () => { cancelled = true; };
  }, [page, levelFilter]);

  const loadErrors = async (isCancelled?: () => boolean) => {
    try {
      setLoading(true);
      const data = await adminApi.getErrorLogs({ page, level: levelFilter });
      if (isCancelled?.()) return;
      setErrors(data.errors);
      setTotalPages(data.pages);
    } catch (error) {
      if (isCancelled?.()) return;
      toast.error(t("Failed to load errors", "שגיאה בטעינת שגיאות"));
    } finally {
      if (!isCancelled?.()) setLoading(false);
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <AdminGuard>
      <PageTransition>
        <AdminLayout>
          <div className="mb-8">
            <h1 className="text-3xl mb-2" style={{ color: "#b6bac5" }}>
              {t("Error Logs", "לוג שגיאות")}
            </h1>
            <p style={{ color: "rgba(182, 186, 197, 0.7)" }}>
              {t("System error monitoring", "ניטור שגיאות מערכת")}
            </p>
          </div>

          {/* Filter */}
          <div className="mb-6">
            <select
              value={levelFilter}
              onChange={(e) => {
                setLevelFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-3 rounded-lg border outline-none"
              style={{
                backgroundColor: "rgba(90, 94, 106, 0.4)",
                borderColor: "rgba(159, 95, 128, 0.3)",
                color: "#b6bac5",
              }}
            >
              <option value="">{t("All Levels", "כל הרמות")}</option>
              <option value="error">{t("Error", "שגיאה")}</option>
              <option value="warning">{t("Warning", "אזהרה")}</option>
              <option value="info">{t("Info", "מידע")}</option>
            </select>
          </div>

          {/* Errors List */}
          <div className="space-y-4">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-24 rounded-xl animate-pulse"
                  style={{ backgroundColor: "rgba(90, 94, 106, 0.3)" }}
                />
              ))
            ) : errors.length === 0 ? (
              <div
                className="text-center py-12 rounded-xl"
                style={{
                  backgroundColor: "rgba(90, 94, 106, 0.2)",
                  color: "rgba(182, 186, 197, 0.7)",
                }}
              >
                {t("No errors found", "לא נמצאו שגיאות")}
              </div>
            ) : (
              errors.map((error) => (
                <div
                  key={error.id}
                  className="p-6 rounded-xl backdrop-blur-xl"
                  style={{
                    backgroundColor: "rgba(90, 94, 106, 0.4)",
                    border: "1px solid rgba(159, 95, 128, 0.2)",
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div className="shrink-0">{getLevelIcon(error.level)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 style={{ color: "#b6bac5" }}>{error.message}</h3>
                        <span
                          className="text-sm shrink-0"
                          style={{ color: "rgba(182, 186, 197, 0.6)" }}
                        >
                          {format(new Date(error.timestamp), "MMM d, HH:mm")}
                        </span>
                      </div>
                      {error.user_email && (
                        <div
                          className="text-sm mb-2"
                          style={{ color: "rgba(182, 186, 197, 0.7)" }}
                        >
                          {t("User", "משתמש")}: {error.user_email}
                        </div>
                      )}
                      {error.stack && (
                        <details className="mt-3">
                          <summary
                            className="cursor-pointer text-sm"
                            style={{ color: "#9F5F80" }}
                          >
                            {t("View stack trace", "הצג stack trace")}
                          </summary>
                          <pre
                            className="mt-2 p-4 rounded-lg text-xs overflow-x-auto"
                            style={{
                              backgroundColor: "rgba(0, 0, 0, 0.3)",
                              color: "rgba(182, 186, 197, 0.8)",
                            }}
                          >
                            {error.stack}
                          </pre>
                        </details>
                      )}
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
