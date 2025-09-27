import { BarChart } from "../../../components/charts";

export default function BestTimeSection({ analytics }) {
  const bt = analytics?.bestTime || {};
  const byWeekday = Array.isArray(bt.byWeekday) ? bt.byWeekday : [];
  const byHour = Array.isArray(bt.byHour) ? bt.byHour : [];
  const annotation = bt.bestWindowText || "";

  return (
    <section id="panel-habits" role="tabpanel" aria-labelledby="tab-habits" className="space-y-6">
      <div className="glass-card glass-cyan p-4 sm:p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-slate-200">Best Time to Apply</h3>
          {annotation && (
            <span className="text-xs text-slate-400">{annotation}</span>
          )}
        </div>

        {/* Make the charts 2-up on large screens, 1-up on small; prevent overflow */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 min-w-0">
          <div className="min-w-0 overflow-hidden">
            <p className="text-xs text-slate-400 mb-2">By Day of Week</p>
            {/* Your chart component should use parent width; height is fixed */}
            <div className="w-full h-[280px] min-w-0">
              <BarChart data={byWeekday} height={280} />
            </div>
          </div>

          <div className="min-w-0 overflow-hidden">
            <p className="text-xs text-slate-400 mb-2">By Hour of Day</p>
            <div className="w-full h-[320px] min-w-0">
              {/* Increased height and removed narrow barWidth for better hour labels */}
              <BarChart data={byHour} height={320} />
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Use this to plan your weekly cadence. Times reflect <em>your</em> activity/outcomes, not generic advice.
        </p>
      </div>
    </section>
  );
}
