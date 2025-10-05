// frontend/features/admin/applications/components/ConversionFunnel.jsx
import { formatConversionFunnel } from '../utils/helpers';

export default function ConversionFunnelChart({ analytics }) {
  if (!analytics) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">Conversion Funnel</h3>
        <p className="text-slate-400 text-sm">Loading analytics...</p>
      </div>
    );
  }

  const funnelData = formatConversionFunnel(analytics);

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold text-slate-100 mb-6">Conversion Funnel</h3>
      
      <div className="space-y-6">
        {funnelData.map((stage, index) => {
          // Calculate bar width based on count (relative to max)
          const maxCount = funnelData[0].count;
          const widthPercentage = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;

          return (
            <div key={stage.stage} className="relative">
              {/* Stage Info */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-violet-400">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium text-slate-100">
                    {stage.stage}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-slate-100">
                    {stage.count}
                  </span>
                  {index > 0 && (
                    <span className="text-xs text-slate-400 ml-2">
                      ({stage.rate}% conversion)
                    </span>
                  )}
                </div>
              </div>

              {/* Funnel Bar */}
              <div className="relative">
                <div className="w-full bg-white/5 rounded-lg h-12 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-violet-500/60 to-violet-500/40 flex items-center px-4 transition-all duration-500"
                    style={{ width: `${widthPercentage}%` }}
                  >
                    {stage.count > 0 && (
                      <span className="text-xs font-medium text-white">
                        {widthPercentage.toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Drop-off Indicator */}
              {index < funnelData.length - 1 && (
                <div className="flex items-center justify-center my-2">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    <span>
                      {100 - stage.rate > 0 && `${(100 - stage.rate).toFixed(1)}% drop-off`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Overall Conversion Rate */}
      <div className="mt-6 pt-6 border-t border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">Overall Conversion Rate</span>
          <span className="text-xl font-bold text-violet-400">
            {funnelData.length > 0 && funnelData[0].count > 0
              ? ((funnelData[funnelData.length - 1].count / funnelData[0].count) * 100).toFixed(1)
              : 0}%
          </span>
        </div>
      </div>
    </div>
  );
}
