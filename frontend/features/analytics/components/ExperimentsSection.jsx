import { BarChart } from "../../../components/charts";
import KPICard from "./KPICard";

/**
 * ExperimentsSection
 * Resume version performance + Cover letter impact (only if data exists).
 *
 * Expects analytics.experiments:
 * - resumeVersions: [{ label, value, interviewRate, count }]
 * - coverLetterImpact: { withCL: { rate, count }, withoutCL: { rate, count } }
 */
export default function ExperimentsSection({ analytics }) {
  const e = analytics?.experiments || {};
  const versions = Array.isArray(e.resumeVersions) ? e.resumeVersions : [];
  const cl = e.coverLetterImpact || null;

  if (!versions.length && !cl) return null;

  const kpis = [
    versions.length
      ? { title: "Resume Variants", value: versions.length, change: 0, icon: "📄" }
      : null,
    cl
      ? { title: "Cover Letter Impact", value: `${(cl?.withCL?.rate ?? 0) - (cl?.withoutCL?.rate ?? 0)}% vs no CL`, change: 0, icon: "✉️" }
      : null,
  ].filter(Boolean);

  return (
    <section className="space-y-6" id="panel-experiments" role="tabpanel" aria-labelledby="tab-experiments">
      {!!kpis.length && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {kpis.map((k, i) => (
            <KPICard key={i} title={k.title} value={k.value} change={k.change} icon={k.icon} />
          ))}
        </div>
      )}

      {!!versions.length && (
        <div className="glass-card glass-cyan">
          <h3 className="text-lg font-semibold mb-4 text-slate-200">Resume Version Performance</h3>
          <BarChart data={versions.map(v => ({ label: v.label, value: v.interviewRate ?? 0 }))} height={300} />
          <p className="text-xs text-slate-500 mt-2">Showing interview rate per variant (requires outcomes).</p>
        </div>
      )}

      {!!cl && (
        <div className="glass-card glass-cyan">
          <h3 className="text-lg font-semibold mb-2 text-slate-200">Cover Letter Impact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-slate-700/50 bg-slate-800/40">
              <div className="text-sm text-slate-400">With cover letter</div>
              <div className="text-2xl font-bold text-slate-100 mt-1">{cl?.withCL?.rate ?? 0}%</div>
              <div className="text-xs text-slate-500">{cl?.withCL?.count ?? 0} applications</div>
            </div>
            <div className="p-4 rounded-lg border border-slate-700/50 bg-slate-800/40">
              <div className="text-sm text-slate-400">Without cover letter</div>
              <div className="text-2xl font-bold text-slate-100 mt-1">{cl?.withoutCL?.rate ?? 0}%</div>
              <div className="text-xs text-slate-500">{cl?.withoutCL?.count ?? 0} applications</div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
