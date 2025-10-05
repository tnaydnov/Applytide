// frontend/features/admin/applications/components/StatusPipeline.jsx
import { APPLICATION_STATUSES } from '../utils/helpers';

export default function ApplicationStatusPipeline({ analytics }) {
  if (!analytics || !analytics.status_distribution) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">Application Pipeline</h3>
        <p className="text-slate-400 text-sm">Loading analytics...</p>
      </div>
    );
  }

  const total = analytics.total_count;
  const distribution = analytics.status_distribution;

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold text-slate-100 mb-6">Application Pipeline</h3>
      
      <div className="space-y-4">
        {APPLICATION_STATUSES.map((status, index) => {
          const count = distribution[status.value] || 0;
          const percentage = total > 0 ? (count / total) * 100 : 0;

          return (
            <div key={status.value} className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${status.bgColor}`}></div>
                  <span className="text-sm font-medium text-slate-100">{status.label}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-slate-100">{count}</span>
                  <span className="text-xs text-slate-400 ml-2">({percentage.toFixed(1)}%)</span>
                </div>
              </div>
              
              <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-full ${status.bgColor.replace('/20', '')} transition-all duration-500`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-white/10">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-violet-400">{total}</div>
            <div className="text-xs text-slate-400 uppercase mt-1">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {distribution.accepted || 0}
            </div>
            <div className="text-xs text-slate-400 uppercase mt-1">Accepted</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {distribution.interviewing || 0}
            </div>
            <div className="text-xs text-slate-400 uppercase mt-1">Active</div>
          </div>
        </div>
      </div>
    </div>
  );
}
