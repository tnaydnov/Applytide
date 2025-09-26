import KPICard from "./KPICard";
import { DonutChart, AreaChart } from "../../../components/charts";
import { cn } from "../utils/formatters";

/**
 * OverviewSection
 * Mirrors the original Overview UI using the shared KPICard and basic charts.
 *
 * Props:
 * - analytics: full analytics payload; expects analytics.overview
 */
export default function OverviewSection({ analytics }) {
  const o = analytics?.overview || {};

  const kpis = [
    {
      title: "Total Applications",
      value: o.totalApplications ?? 0,
      change: o.applicationsChange ?? 0,
      icon: "📝",
    },
    {
      title: "Interview Rate",
      value: typeof o.interviewRate === "number" ? `${o.interviewRate}%` : "0%",
      change: o.interviewRateChange ?? 0,
      icon: "🎯",
    },
    {
      title: "Offer Rate",
      value: typeof o.offerRate === "number" ? `${o.offerRate}%` : "0%",
      change: o.offerRateChange ?? 0,
      icon: "✅",
    },
    {
      title: "Avg. Response Time",
      value:
        typeof o.avgResponseTime === "number"
          ? `${o.avgResponseTime} days`
          : "—",
      change: o.responseTimeChange ?? 0,
      icon: "⏱️",
    },
  ];

  const statusDistribution = Array.isArray(o.statusDistribution)
    ? o.statusDistribution
    : [];

  const applicationsOverTime = Array.isArray(o.applicationsOverTime)
    ? o.applicationsOverTime
    : [];

  const funnel = Array.isArray(o.funnel) ? o.funnel : [];
  const funnelStart = funnel?.[0]?.count || 1;

  return (
    <section className="space-y-6" id="panel-overview" role="tabpanel" aria-labelledby="tab-overview">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card glass-cyan">
          <h3 className="text-lg font-semibold mb-4 text-slate-200">
            Application Status Distribution
          </h3>
          <DonutChart data={statusDistribution} height={300} />
        </div>

        <div className="glass-card glass-cyan">
          <h3 className="text-lg font-semibold mb-4 text-slate-200">
            Applications Over Time
          </h3>
          <AreaChart data={applicationsOverTime} height={300} />
        </div>
      </div>

      {/* Funnel */}
      <div className="glass-card glass-cyan">
        <h3 className="text-lg font-semibold mb-4 text-slate-200">
          Application Funnel
        </h3>

        {funnel.length === 0 ? (
          <div className="text-sm text-slate-400">No funnel data to display.</div>
        ) : (
          <div className="space-y-4">
            {funnel.map((stage) => {
              const pct =
                typeof stage?.count === "number" && funnelStart > 0
                  ? Math.round((stage.count / funnelStart) * 100)
                  : 0;

              return (
                <div key={stage?.name ?? Math.random()} className="flex items-center">
                  <div className="w-24 text-sm text-slate-400">{stage?.name ?? "—"}</div>
                  <div className="flex-1 mx-4">
                    <div className="bg-slate-700 rounded-full h-8 relative">
                      <div
                        className={cn(
                          "bg-indigo-600 h-8 rounded-full flex items-center justify-end pr-3 transition-[width] duration-300 ease-out"
                        )}
                        style={{ width: `${pct}%` }}
                      >
                        <span className="text-white text-sm font-medium">
                          {stage?.count ?? 0}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="w-16 text-sm text-slate-400 text-right">{pct}%</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
