import KPICard from "./KPICard";
import { PieChart, BarChart, LineChart } from "../../../components/charts";

/**
 * InterviewsSection
 * Mirrors the original "Interviews" panel from the legacy Analytics page.
 *
 * Props:
 * - analytics: full analytics payload; expects analytics.interviews
 */
export default function InterviewsSection({ analytics }) {
  const interview = analytics?.interviews || {};

  const typeBreakdown = Array.isArray(interview.typeBreakdown)
    ? interview.typeBreakdown
    : [];

  const successByType = Array.isArray(interview.successByType)
    ? interview.successByType
    : [];

  const performanceOverTime = Array.isArray(interview.performanceOverTime)
    ? interview.performanceOverTime
    : [];

  const kpis = [
    {
      title: "Total Interviews",
      value: interview.totalInterviews ?? 0,
      change: 0,
      icon: "🎯",
    },
    {
      title: "Success Rate",
      value:
        typeof interview.successRate === "number"
          ? `${interview.successRate}%`
          : "0%",
      change: 0,
      icon: "✅",
    },
    {
      title: "Avg Interviews/App",
      value:
        typeof interview.avgInterviewsPerApp === "number"
          ? interview.avgInterviewsPerApp
          : "—",
      change: 0,
      icon: "📊",
    },
    {
      title: "Interview → Offer",
      value:
        typeof interview.conversionRate === "number"
          ? `${interview.conversionRate}%`
          : "0%",
      change: 0,
      icon: "✅",
    },
  ];

  return (
    <section
      className="space-y-6"
      id="panel-interviews"
      role="tabpanel"
      aria-labelledby="tab-interviews"
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

      {/* Charts: Types + Success by Type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card glass-cyan p-4 sm:p-6 overflow-visible">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-slate-200">
            Interview Types
          </h3>
          <PieChart data={typeBreakdown} height={300} />
          {typeBreakdown.length === 0 && (
            <p className="mt-3 text-sm text-slate-400">
              No interview type data yet.
            </p>
          )}
        </div>

        <div className="glass-card glass-cyan p-4 sm:p-6 overflow-visible">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-slate-200">
            Success by Interview Type
          </h3>
          <BarChart data={successByType} height={300} />
          {successByType.length === 0 && (
            <p className="mt-3 text-sm text-slate-400">
              No success data by type yet.
            </p>
          )}
        </div>
      </div>

      {/* Performance Over Time */}
      <div className="glass-card glass-cyan p-4 sm:p-6 overflow-visible">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-slate-200">
          Interview Performance Trends
        </h3>
        <LineChart data={performanceOverTime} height={300} />
        {performanceOverTime.length === 0 && (
          <p className="mt-3 text-sm text-slate-400">
            No performance trend data yet.
          </p>
        )}
      </div>
    </section>
  );
}
