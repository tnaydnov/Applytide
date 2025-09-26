import KPICard from "./KPICard";
import { DonutChart, BarChart } from "../../../components/charts";

/**
 * CompaniesSection
 * Mirrors the legacy "Companies" panel of the Analytics page.
 *
 * Props:
 * - analytics: full analytics payload; expects analytics.companies
 */
export default function CompaniesSection({ analytics }) {
  const companies = analytics?.companies || {};

  const topCompanies = Array.isArray(companies.topCompanies)
    ? companies.topCompanies
    : [];

  const sizeDistribution = Array.isArray(companies.sizeDistribution)
    ? companies.sizeDistribution
    : [];

  const successBySize = Array.isArray(companies.successBySize)
    ? companies.successBySize
    : [];

  const kpis = [
    {
      title: "Total Companies",
      value: companies.totalCompanies ?? 0,
      change: 0,
      icon: "🏢",
    },
    {
      title: "Avg Success Rate",
      value:
        typeof companies.avgSuccessRate === "number"
          ? `${companies.avgSuccessRate}%`
          : "0%",
      change: 0,
      icon: "✅",
    },
    {
      title: "Avg Response Rate",
      value:
        typeof companies.responseRate === "number"
          ? `${companies.responseRate}%`
          : "0%",
      change: 0,
      icon: "📨",
    },
  ];

  return (
    <section
      className="space-y-6"
      id="panel-companies"
      role="tabpanel"
      aria-labelledby="tab-companies"
    >
      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

      {/* Charts: Size Distribution + Success by Size */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card glass-cyan">
          <h3 className="text-lg font-semibold mb-4 text-slate-200">
            Company Size Distribution
          </h3>
          <DonutChart data={sizeDistribution} height={300} />
          {sizeDistribution.length === 0 && (
            <p className="mt-3 text-sm text-slate-400">
              No company size data yet.
            </p>
          )}
        </div>

        <div className="glass-card glass-cyan">
          <h3 className="text-lg font-semibold mb-4 text-slate-200">
            Success Rate by Company Size
          </h3>
          <BarChart data={successBySize} height={300} />
          {successBySize.length === 0 && (
            <p className="mt-3 text-sm text-slate-400">
              No success-by-size data yet.
            </p>
          )}
        </div>
      </div>

      {/* Top Companies */}
      <div className="glass-card glass-cyan">
        <h3 className="text-lg font-semibold mb-4 text-slate-200">
          Top Companies by Applications
        </h3>

        {topCompanies.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            No company data yet. Start tracking applications to see insights here.
          </div>
        ) : (
          <div className="space-y-3">
            {topCompanies.slice(0, 10).map((company, index) => (
              <div
                key={`${company?.name ?? "company"}-${index}`}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-700/50 bg-slate-800/40"
              >
                <div className="flex items-center flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3 bg-indigo-600/80">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-200 truncate">
                      {company?.name ?? "—"}
                    </div>
                    <div className="text-sm text-slate-400">
                      {(company?.applications ?? 0).toLocaleString()} applications
                    </div>
                  </div>
                </div>

                <div className="text-right ml-4">
                  <div className="text-sm font-medium text-green-400">
                    {typeof company?.successRate === "number"
                      ? `${company.successRate}%`
                      : "0%"}{" "}
                    success
                  </div>
                  <div className="text-xs text-slate-400">
                    {typeof company?.responseRate === "number"
                      ? `${company.responseRate}%`
                      : "0%"}{" "}
                    response
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
