import { useState, useEffect } from "react";
import { AdminGuard } from "../../components/guards/AdminGuard";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { adminApi, Session } from "../../features/admin/api";
import { LogOut } from "lucide-react";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import { useLanguage } from "../../contexts/LanguageContext";
import { PageTransition } from "../../components/layout/PageTransition";
import { format, formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";

export default function SessionsPage() {
  const { t, language } = useLanguage();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    let cancelled = false;
    loadSessions(() => cancelled);
    return () => { cancelled = true; };
  }, [page]);

  const loadSessions = async (isCancelled?: () => boolean) => {
    try {
      setLoading(true);
      const data = await adminApi.getSessions({ page });
      if (isCancelled?.()) return;
      setSessions(data.sessions);
      setTotalPages(data.pages);
    } catch (error) {
      if (isCancelled?.()) return;
      toast.error(t("Failed to load sessions", "שגיאה בטעינת חיבורים"));
    } finally {
      if (!isCancelled?.()) setLoading(false);
    }
  };

  const handleTerminate = async (sessionId: string) => {
    if (!confirm(t("Are you sure you want to terminate this session?", "האם אתה בטוח שברצונך לנתק חיבור זה?"))) {
      return;
    }

    try {
      await adminApi.revokeSession(sessionId);
      toast.success(t("Session terminated", "החיבור נותק"));
      loadSessions();
    } catch (error) {
      toast.error(t("Failed to terminate session", "שגיאה בניתוק חיבור"));
    }
  };

  return (
    <AdminGuard>
      <PageTransition>
        <AdminLayout>
          <div className="mb-8">
            <h1 className="text-3xl mb-2" style={{ color: "#b6bac5" }}>
              {t("Active Sessions", "חיבורים פעילים")}
            </h1>
            <p style={{ color: "rgba(182, 186, 197, 0.7)" }}>
              {t("Manage user sessions", "ניהול חיבורי משתמשים")}
            </p>
          </div>

          {/* Sessions Table */}
          <div
            className="rounded-xl overflow-hidden mb-6"
            style={{
              backgroundColor: "rgba(90, 94, 106, 0.4)",
              border: "1px solid rgba(159, 95, 128, 0.2)",
            }}
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr
                    style={{
                      backgroundColor: "rgba(56, 62, 78, 0.6)",
                      borderBottom: "1px solid rgba(159, 95, 128, 0.2)",
                    }}
                  >
                    <th className="px-6 py-4 text-left text-sm" style={{ color: "#b6bac5" }}>
                      {t("User", "משתמש")}
                    </th>
                    <th className="px-6 py-4 text-left text-sm" style={{ color: "#b6bac5" }}>
                      {t("IP Address", "כתובת IP")}
                    </th>
                    <th className="px-6 py-4 text-left text-sm" style={{ color: "#b6bac5" }}>
                      {t("User Agent", "דפדפן")}
                    </th>
                    <th className="px-6 py-4 text-left text-sm" style={{ color: "#b6bac5" }}>
                      {t("Last Activity", "פעילות אחרונה")}
                    </th>
                    <th className="px-6 py-4 text-left text-sm" style={{ color: "#b6bac5" }}>
                      {t("Created", "נוצר")}
                    </th>
                    <th className="px-6 py-4 text-right text-sm" style={{ color: "#b6bac5" }}>
                      {t("Actions", "פעולות")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i}>
                        <td colSpan={6} className="px-6 py-4">
                          <div
                            className="h-12 rounded animate-pulse"
                            style={{ backgroundColor: "rgba(90, 94, 106, 0.3)" }}
                          />
                        </td>
                      </tr>
                    ))
                  ) : sessions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center"
                        style={{ color: "rgba(182, 186, 197, 0.7)" }}
                      >
                        {t("No active sessions", "אין חיבורים פעילים")}
                      </td>
                    </tr>
                  ) : (
                    sessions.map((session) => (
                      <tr
                        key={session.id}
                        style={{
                          borderBottom: "1px solid rgba(159, 95, 128, 0.1)",
                        }}
                      >
                        <td className="px-6 py-4" style={{ color: "#b6bac5" }}>
                          {session.user_email}
                        </td>
                        <td className="px-6 py-4" style={{ color: "rgba(182, 186, 197, 0.8)" }}>
                          {session.ip_address}
                        </td>
                        <td className="px-6 py-4" style={{ color: "rgba(182, 186, 197, 0.7)" }}>
                          <div className="max-w-xs truncate">
                            {session.user_agent}
                          </div>
                        </td>
                        <td className="px-6 py-4" style={{ color: "rgba(182, 186, 197, 0.7)" }}>
                          {formatDistanceToNow(new Date(session.last_activity), {
                            addSuffix: true,
                            locale: language === "he" ? he : undefined,
                          })}
                        </td>
                        <td className="px-6 py-4" style={{ color: "rgba(182, 186, 197, 0.7)" }}>
                          {format(new Date(session.created_at), "MMM d, HH:mm")}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTerminate(session.id)}
                          >
                            <LogOut className="w-4 h-4 mr-2" />
                            {t("Terminate", "נתק")}
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
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
