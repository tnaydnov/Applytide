import { cn } from "../utils/formatters";
import { buildInsights } from "../utils/insights";

/**
 * InsightsPanel
 * Lightweight “coach-like” insights from your existing analytics payload.
 *
 * Props:
 * - analytics: full analytics payload
 */
export default function InsightsPanel({ analytics, className }) {
  const insights = buildInsights(analytics).slice(0, 6);

  if (!insights.length) {
    return null;
  }

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4", className)}>
      {insights.map((ins, i) => (
        <div
          key={`${ins.id}-${i}`}
          className={cn(
            "glass-card p-4 border",
            ins.severity === "high"
              ? "glass-cyan border-indigo-500/30"
              : ins.severity === "med"
              ? "glass-cyan border-sky-500/20"
              : "glass-cyan border-slate-600/40"
          )}
        >
          <div className="flex items-start justify-between">
            <div className="pr-3">
              <div className="text-sm text-indigo-300/80 mb-1">{ins.tag || "Insight"}</div>
              <h4 className="font-semibold text-slate-100">{ins.headline}</h4>
              {ins.body ? <p className="text-sm text-slate-400 mt-1">{ins.body}</p> : null}
            </div>
            <div className="shrink-0 rounded-lg border border-slate-600/30 bg-slate-800/40 px-2 py-1 text-xs text-slate-300">
              {ins.severity.toUpperCase()}
            </div>
          </div>

          {ins.cta ? (
            <div className="mt-3">
              <button
                type="button"
                onClick={ins.cta.onClick || (() => {})}
                className="text-sm text-indigo-300 hover:text-indigo-200 underline decoration-indigo-500/40"
              >
                {ins.cta.label}
              </button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
