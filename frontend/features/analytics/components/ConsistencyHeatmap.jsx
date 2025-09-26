import { formatDate } from "../utils/formatters";

/**
 * ConsistencyHeatmap
 * GitHub-like day grid for last ~12 weeks. Data shape:
 * analytics.activity.activityByDay: [{ date: "YYYY-MM-DD", count: number }]
 * analytics.activity.streak: { current: number, best: number }
 */
export default function ConsistencyHeatmap({ analytics }) {
  const activity = analytics?.activity || {};
  const days = Array.isArray(activity.activityByDay) ? activity.activityByDay : [];

  if (!days.length) return null;

  const max = Math.max(1, ...days.map((d) => d.count || 0));
  const buckets = (n) =>
    n === 0 ? "bg-slate-800/50"
    : n < max * 0.25 ? "bg-indigo-900/50"
    : n < max * 0.5 ? "bg-indigo-700/60"
    : n < max * 0.75 ? "bg-indigo-500/70"
    : "bg-indigo-400/80";

  // Group into weeks of 7
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div className="glass-card glass-cyan p-4 sm:p-6 overflow-visible">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-slate-200">Consistency (last 12 weeks)</h3>
        <div className="text-sm text-slate-400">
          Streak: <span className="text-indigo-300">{activity.streak?.current || 0}</span> days
          {" · "}
          Best: <span className="text-indigo-300">{activity.streak?.best || 0}</span>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {weeks.map((w, i) => (
          <div key={i} className="flex flex-col gap-1">
            {w.map((d, j) => (
              <div
                key={`${d.date}-${j}`}
                className={`h-3.5 w-3.5 rounded ${buckets(d.count || 0)} border border-slate-700/40`}
                title={`${formatDate(d.date)} — ${d.count || 0} application${(d.count||0)===1 ? "" : "s"}`}
              />
            ))}
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-500 mt-3">
        Tip: A steady cadence beats spikes. Try small daily goals to keep momentum.
      </p>
    </div>
  );
}
