import KPICard from "./KPICard";
import { BarChart, DonutChart } from "../../../components/charts";

/**
 * ApplicationsSection
 * Mirrors the original "Applications" panel from the legacy Analytics page.
 *
 * Props:
 * - analytics: full analytics payload; expects analytics.applications
 */
export default function ApplicationsSection({ analytics }) {
  const app = analytics?.applications || {};

  const statusBreakdown = Array.isArray(app.statusBreakdown) ? app.statusBreakdown : [];
  const monthlyData = Array.isArray(app.monthlyData) ? app.monthlyData
                    : Array.isArray(app.applicationsByMonth) ? app.applicationsByMonth
                    : [];
  const jobTitles = Array.isArray(app.jobTitles) ? app.jobTitles
                   : Array.isArray(app.topJobTitles) ? app.topJobTitles
                   : [];

  const kpis = [
    {
      title: "Total Applications",
      value: app.totalApplications ?? 0,
      change: 0,
      icon: "📝",
    },
    {
      title: "Success Rate",
      value:
        typeof app.successRate === "number" ? `${app.successRate}%` : "0%",
      change: 0,
      icon: "✅",
    },
    {
      title: "Avg Response Days",
      value:
        typeof app.avgResponseTime === "number" ? app.avgResponseTime : "—",
      change: 0,
      icon: "⏱️",
    },
  ];

  // For the inline bars in "Top Job Titles", find the max for width scaling
  const maxTitleCount =
    jobTitles.length > 0 ? Math.max(...jobTitles.map((t) => t.count || 0)) : 1;

  return (
    <section
      className="space-y-6"
      id="panel-applications"
      role="tabpanel"
      aria-labelledby="tab-applications"
    >
      {/* Status Breakdown + Applications by Month */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card glass-cyan p-4 sm:p-6 overflow-visible">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-slate-200">
            Application Status Breakdown
          </h3>
          <DonutChart data={statusBreakdown} height={300} />
        </div>

        <div className="glass-card glass-cyan p-4 sm:p-6 overflow-visible">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-slate-200">
            Applications by Month
          </h3>
          <BarChart data={monthlyData} height={300} />
        </div>
      </div>

      {/* Top Job Titles Applied For */}
      <div className="glass-card glass-cyan p-4 sm:p-6 overflow-visible">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-slate-200">
          Top Job Titles Applied For
        </h3>

        {jobTitles.length === 0 ? (
          <div className="text-sm text-slate-400">No data to display.</div>
        ) : (
          <div className="space-y-3">
            {jobTitles.slice(0, 8).map((title, index) => {
              const pct =
                maxTitleCount > 0
                  ? Math.min(100, Math.round(((title.count || 0) / maxTitleCount) * 100))
                  : 0;

              return (
                <div
                  key={`${title?.title ?? "title"}-${index}`}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center flex-1">
                    <div className="w-24 sm:w-32 text-xs sm:text-sm text-slate-300 truncate">
                      {title?.title ?? "—"}
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="bg-slate-700 rounded-full h-3 sm:h-4">
                        <div
                          className="bg-blue-500 h-4 rounded-full transition-[width] duration-300 ease-out"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="w-12 text-sm text-slate-400 text-right">
                    {title?.count ?? 0}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* KPI Trio */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {kpis.map((kpi, idx) => (
          <KPICard
            key={idx}
            title={kpi.title}
            value={kpi.value}
            change={kpi.change}
            icon={kpi.icon}
          />
        ))}
      </div>
    </section>
  );
}
