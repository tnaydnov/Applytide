import { BarChart, DonutChart } from "../../../components/charts";
import KPICard from "./KPICard";

/**
 * SourcesSection
 * Source/channel breakdown + simple funnel-by-source.
 *
 * Expects analytics.sources:
 * - breakdown: [{ label, value }]
 * - interviewRateBySource: [{ label, value }]  // value as percent
 * - offerRateBySource: [{ label, value }]
 * - topSources: [{ label, applications, interviewRate, offerRate }]
 */
export default function SourcesSection({ analytics }) {
  const s = analytics?.sources || {};
  const breakdown = Array.isArray(s.breakdown) ? s.breakdown : [];
  const intRate = Array.isArray(s.interviewRateBySource) ? s.interviewRateBySource : [];
  const offerRate = Array.isArray(s.offerRateBySource) ? s.offerRateBySource : [];
  const top = Array.isArray(s.topSources) ? s.topSources : [];

  const kpis = [
    { title: "Tracked Sources", value: breakdown.length || 0, change: 0, icon: "🧭" },
    { title: "Top Source (Interview)", value: top?.[0]?.label || "—", change: 0, icon: "🎯" },
    { title: "Top Source (Offer)", value: (offerRate[0]?.label) || "—", change: 0, icon: "🏆" },
  ];

  if (!breakdown.length && !intRate.length && !offerRate.length) return null;

  return (
    <section className="space-y-6" id="panel-sources" role="tabpanel" aria-labelledby="tab-sources">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {kpis.map((k, i) => (
          <KPICard key={i} title={k.title} value={k.value} change={k.change} icon={k.icon} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-card glass-cyan lg:col-span-1">
          <h3 className="text-lg font-semibold mb-4 text-slate-200">Source Breakdown</h3>
          <DonutChart data={breakdown} height={300} />
          {!breakdown.length && <p className="text-sm text-slate-400 mt-2">No source data yet.</p>}
        </div>

        <div className="glass-card glass-cyan lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 text-slate-200">Conversion by Source</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm text-slate-300 mb-2">Interview Rate</h4>
              <BarChart data={intRate} height={260} />
            </div>
            <div>
              <h4 className="text-sm text-slate-300 mb-2">Offer Rate</h4>
              <BarChart data={offerRate} height={260} />
            </div>
          </div>
          {!intRate.length && !offerRate.length && (
            <p className="text-sm text-slate-400 mt-2">We’ll show conversion once you have a few outcomes.</p>
          )}
        </div>
      </div>

      {!!top.length && (
        <div className="glass-card glass-cyan">
          <h3 className="text-lg font-semibold mb-4 text-slate-200">Top Sources</h3>
          <div className="space-y-2">
            {top.slice(0, 8).map((row, i) => (
              <div key={`${row.label}-${i}`} className="flex items-center justify-between p-3 rounded-lg border border-slate-700/50 bg-slate-800/40">
                <div className="text-slate-200">{row.label}</div>
                <div className="text-sm text-slate-400">
                  {row.applications || 0} apps ·{" "}
                  <span className="text-green-400">{row.interviewRate ?? 0}% interview</span>{" "}
                  · <span className="text-indigo-300">{row.offerRate ?? 0}% offer</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
