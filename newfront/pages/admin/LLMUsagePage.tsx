import { useState, useEffect } from "react";
import { AdminGuard } from "../../components/guards/AdminGuard";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { StatCard } from "../../components/admin/StatCard";
import { adminApi, LLMUsage, LLMStats } from "../../features/admin/api";
import { Cpu, DollarSign, Activity, Download } from "lucide-react";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import { useLanguage } from "../../contexts/LanguageContext";
import { PageTransition } from "../../components/layout/PageTransition";
import { format } from "date-fns";

export default function LLMUsagePage() {
  const { t } = useLanguage();
  const [usage, setUsage] = useState<LLMUsage[]>([]);
  const [stats, setStats] = useState<LLMStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [featureFilter, setFeatureFilter] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    loadData(() => cancelled);
    return () => { cancelled = true; };
  }, [page, featureFilter]);

  const loadData = async (isCancelled?: () => boolean) => {
    try {
      setLoading(true);
      const [usageData, statsData] = await Promise.all([
        adminApi.getLLMUsage({ page, feature: featureFilter }),
        adminApi.getLLMStats(30),
      ]);
      if (isCancelled?.()) return;
      setUsage(usageData.usage);
      setTotalPages(usageData.pages);
      setStats(statsData);
    } catch (error) {
      if (isCancelled?.()) return;
      toast.error(t("Failed to load LLM usage", "שגיאה בטעינת שימוש LLM"));
    } finally {
      if (!isCancelled?.()) setLoading(false);
    }
  };

  const handleExport = async (format: "csv" | "json") => {
    try {
      let content: string;
      let mimeType: string;

      if (format === "csv") {
        const header = "ID,Feature,Model,Input Tokens,Output Tokens,Cost,Timestamp\n";
        const rows = usage.map((u) =>
          `"${u.id}","${u.feature}","${u.model}",${u.input_tokens},${u.output_tokens},${u.estimated_cost ?? 0},"${u.timestamp}"`
        ).join("\n");
        content = header + rows;
        mimeType = "text/csv;charset=utf-8";
      } else {
        content = JSON.stringify({ usage, stats, exported_at: new Date().toISOString() }, null, 2);
        mimeType = "application/json;charset=utf-8";
      }

      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `llm-usage.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(t("Export successful", "יצוא הצליח"));
    } catch (error) {
      toast.error(t("Export failed", "יצוא נכשל"));
    }
  };

  return (
    <AdminGuard>
      <PageTransition>
        <AdminLayout>
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl mb-2" style={{ color: "#b6bac5" }}>
                {t("LLM Usage", "שימוש LLM")}
              </h1>
              <p style={{ color: "rgba(182, 186, 197, 0.7)" }}>
                {t("Track AI model usage and costs", "מעקב אחר שימוש ועלויות AI")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleExport("csv")}>
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" onClick={() => handleExport("json")}>
                <Download className="w-4 h-4 mr-2" />
                JSON
              </Button>
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <StatCard
                title={t("Total Requests", "סך בקשות")}
                value={stats.total_requests.toLocaleString()}
                icon={Cpu}
                color="#9F5F80"
              />
              <StatCard
                title={t("Total Tokens", "סך טוקנים")}
                value={stats.total_tokens.toLocaleString()}
                icon={Activity}
                color="#3b82f6"
              />
              <StatCard
                title={t("Total Cost", "עלות כוללת")}
                value={`$${stats.total_cost.toFixed(2)}`}
                icon={DollarSign}
                color="#10b981"
              />
              <StatCard
                title={t("Avg Tokens/Request", "ממוצע טוקנים")}
                value={Math.round(stats.avg_tokens_per_request).toLocaleString()}
                icon={Activity}
                color="#8b5cf6"
              />
            </div>
          )}

          {/* Filter */}
          <div className="mb-6">
            <select
              value={featureFilter}
              onChange={(e) => {
                setFeatureFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-3 rounded-lg border outline-none"
              style={{
                backgroundColor: "rgba(90, 94, 106, 0.4)",
                borderColor: "rgba(159, 95, 128, 0.3)",
                color: "#b6bac5",
              }}
            >
              <option value="">{t("All Features", "כל התכונות")}</option>
              <option value="resume_analysis">{t("Resume Analysis", "ניתוח קורות חיים")}</option>
              <option value="cover_letter">{t("Cover Letter", "מכתב נלווה")}</option>
              <option value="job_matching">{t("Job Matching", "התאמת משרות")}</option>
            </select>
          </div>

          {/* Usage Table */}
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
                      {t("Feature", "תכונה")}
                    </th>
                    <th className="px-6 py-4 text-left text-sm" style={{ color: "#b6bac5" }}>
                      {t("Model", "מודל")}
                    </th>
                    <th className="px-6 py-4 text-right text-sm" style={{ color: "#b6bac5" }}>
                      {t("Tokens", "טוקנים")}
                    </th>
                    <th className="px-6 py-4 text-right text-sm" style={{ color: "#b6bac5" }}>
                      {t("Cost", "עלות")}
                    </th>
                    <th className="px-6 py-4 text-right text-sm" style={{ color: "#b6bac5" }}>
                      {t("Time", "זמן")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(10)].map((_, i) => (
                      <tr key={i}>
                        <td colSpan={6} className="px-6 py-4">
                          <div
                            className="h-10 rounded animate-pulse"
                            style={{ backgroundColor: "rgba(90, 94, 106, 0.3)" }}
                          />
                        </td>
                      </tr>
                    ))
                  ) : usage.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center"
                        style={{ color: "rgba(182, 186, 197, 0.7)" }}
                      >
                        {t("No usage data", "אין נתוני שימוש")}
                      </td>
                    </tr>
                  ) : (
                    usage.map((item) => (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: "1px solid rgba(159, 95, 128, 0.1)",
                        }}
                      >
                        <td className="px-6 py-4" style={{ color: "#b6bac5" }}>
                          {item.user_email}
                        </td>
                        <td className="px-6 py-4" style={{ color: "rgba(182, 186, 197, 0.8)" }}>
                          {item.feature}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className="px-2 py-1 rounded text-sm"
                            style={{
                              backgroundColor: "rgba(159, 95, 128, 0.2)",
                              color: "#9F5F80",
                            }}
                          >
                            {item.model}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right" style={{ color: "#b6bac5" }}>
                          {item.total_tokens.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right" style={{ color: "#10b981" }}>
                          ${item.estimated_cost.toFixed(4)}
                        </td>
                        <td className="px-6 py-4 text-right" style={{ color: "rgba(182, 186, 197, 0.7)" }}>
                          {format(new Date(item.timestamp), "MMM d, HH:mm")}
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
