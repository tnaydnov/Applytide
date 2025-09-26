import { BarChart } from "../../../components/charts";

/**
 * BestTimeSection
 * Day-of-week and Hour-of-day histograms, with a “best window” callout.
 *
 * Expects analytics.bestTime:
 * - byWeekday: [{ label, value }]       // Mon..Sun
 * - byHour: [{ label, value }]          // 0..23 or 4h buckets
 * - bestWindowText: string
 */
export default function BestTimeSection({ analytics }) {
  const t = analytics?.bestTime || {};
  const dows = Array.isArray(t.byWeekday) ? t.byWeekday : [];
  const hours = Array.isArray(t.byHour) ? t.byHour : [];
  const hint = t.bestWindowText || (dows[0]?.label ? `Most active on ${dows[0].label}` : "");

  if (!dows.length && !hours.length) return null;

  return (
    <section className="space-y-6" id="panel-habits" role="tabpanel" aria-labelledby="tab-habits">
      <div className="glass-card glass-cyan">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-200">Best Time to Apply</h3>
          {hint && <div className="text-sm text-indigo-300">{hint}</div>}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm text-slate-300 mb-2">By Day of Week</h4>
            <BarChart data={dows} height={260} />
          </div>
          <div>
            <h4 className="text-sm text-slate-300 mb-2">By Hour of Day</h4>
            <BarChart data={hours} height={260} />
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Use this to plan your weekly cadence. Times reflect *your* activity/outcomes, not generic advice.
        </p>
      </div>
    </section>
  );
}
