import KPICard from "./KPICard";
import { BarChart, LineChart } from "../../../components/charts";

/**
 * TimelineSection
 * Mirrors the legacy "Timeline" panel of the Analytics page.
 *
 * Props:
 * - analytics: full analytics payload; expects analytics.timeline
 */
export default function TimelineSection({ analytics }) {
  const timeline = analytics?.timeline || {};

  const kpis = [
    {
      title: "Avg Process Days",
      value:
        typeof timeline.avgProcessDuration === "number"
          ? timeline.avgProcessDuration
          : 0,
      change: 0,
      icon: "⏱️",
    },
    {
      title: "Avg Response Days",
      value:
        typeof timeline.avgResponseTime === "number"
          ? timeline.avgResponseTime
          : 0,
      change: 0,
      icon: "📨",
    },
    {
      title: "Avg Interview Days",
      value:
        typeof timeline.avgInterviewTime === "number"
          ? timeline.avgInterviewTime
          : 0,
      change: 0,
      icon: "🎯",
    },
    {
      title: "Avg Decision Days",
      value:
        typeof timeline.avgDecisionTime === "number"
          ? timeline.avgDecisionTime
          : 0,
      change: 0,
      icon: "✅",
    },
  ];

  const stageDurations = Array.isArray(timeline.stageDurations)
    ? timeline.stageDurations
    : [];

  const timelineTrends = Array.isArray(timeline.timelineTrends)
    ? timeline.timelineTrends
    : [];

  const bottlenecks = Array.isArray(timeline.bottlenecks)
    ? timeline.bottlenecks
    : [];

  return (
    <section
      className="space-y-6"
      id="panel-timeline"
      role="tabpanel"
      aria-labelledby="tab-timeline"
    >
      {/* KPI row */}
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

      {/* Charts: Stage Duration + Timeline Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card glass-cyan p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-slate-200">
            Stage Duration Breakdown
          </h3>
          <BarChart data={stageDurations} height={300} />
          {stageDurations.length === 0 && (
            <p className="mt-3 text-sm text-slate-400">
              No stage duration data yet.
            </p>
          )}
        </div>

        <div className="glass-card glass-cyan p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-slate-200">
            Process Timeline Trends
          </h3>
          <LineChart data={timelineTrends} height={300} />
          {timelineTrends.length === 0 && (
            <p className="mt-3 text-sm text-slate-400">
              No timeline trend data yet.
            </p>
          )}
        </div>
      </div>

      {/* Bottleneck Analysis */}
      <div className="glass-card glass-cyan p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-slate-200">
          Process Bottlenecks
        </h3>

        {bottlenecks.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            No bottlenecks identified yet.
          </div>
        ) : (
          <div className="space-y-4">
            {bottlenecks.map((b, i) => (
              <div
                key={`${b?.stage ?? "stage"}-${i}`}
                className="flex items-center justify-between p-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5"
              >
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3" />
                  <div>
                    <div className="font-medium text-slate-200">
                      {b?.stage ?? "—"}
                    </div>
                    <div className="text-sm text-slate-400">
                      {b?.description ?? "No description"}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-yellow-400">
                    {(b?.avgDays ?? 0).toLocaleString()} days
                  </div>
                  <div className="text-xs text-slate-400">average duration</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
