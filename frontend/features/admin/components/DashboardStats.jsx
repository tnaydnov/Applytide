// frontend/features/admin/components/DashboardStats.jsx
import { formatDistanceToNow } from 'date-fns';

export default function DashboardStats({ stats }) {
  if (!stats) return null;

  const formatCost = (cents) => {
    return cents ? `$${(cents / 100).toFixed(2)}` : '$0.00';
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats.total_users?.toLocaleString(),
      subtitle: `${stats.new_users_7d || 0} new in last 7 days`,
      color: 'violet'
    },
    {
      title: 'Active Users (7d)',
      value: stats.active_users_7d?.toLocaleString(),
      subtitle: stats.total_users > 0 
        ? `${((stats.active_users_7d / stats.total_users) * 100).toFixed(1)}% of total`
        : '0% of total',
      color: 'cyan'
    },
    {
      title: 'Premium Users',
      value: stats.premium_users?.toLocaleString(),
      subtitle: stats.total_users > 0
        ? `${((stats.premium_users / stats.total_users) * 100).toFixed(1)}% conversion`
        : '0% conversion',
      color: 'amber'
    },
    {
      title: 'Applications',
      value: stats.total_applications?.toLocaleString(),
      subtitle: `${stats.applications_7d || 0} this week`,
      color: 'rose'
    },
    {
      title: 'LLM Cost (24h)',
      value: formatCost(stats.llm_cost_24h),
      subtitle: `${stats.llm_calls_24h || 0} API calls`,
      color: 'violet',
      highlight: true
    },
    {
      title: 'LLM Cost (7d)',
      value: formatCost(stats.llm_cost_7d),
      subtitle: `${stats.llm_calls_7d || 0} API calls`,
      color: 'cyan',
      highlight: true
    },
    {
      title: 'Active Sessions',
      value: stats.active_sessions_count?.toLocaleString() || '0',
      subtitle: 'Users currently online',
      color: 'amber',
      highlight: true
    },
    {
      title: 'Unresolved Issues',
      value: ((stats.error_logs_unresolved || 0) + (stats.security_events_unresolved || 0)).toLocaleString(),
      subtitle: `${stats.error_logs_unresolved || 0} errors, ${stats.security_events_unresolved || 0} security`,
      color: 'rose',
      highlight: true
    },
    {
      title: 'Documents',
      value: stats.total_documents?.toLocaleString(),
      subtitle: `${stats.documents_analyzed || 0} analyzed`,
      color: 'violet'
    },
    {
      title: 'Jobs Tracked',
      value: stats.total_jobs?.toLocaleString(),
      subtitle: `${stats.jobs_7d || 0} added this week`,
      color: 'cyan'
    },
    {
      title: 'Cache Hit Rate',
      value: `${((stats.analysis_cache_hit_rate || 0) * 100).toFixed(1)}%`,
      subtitle: 'Document analysis cache',
      color: 'amber'
    },
    {
      title: 'Total LLM Cost',
      value: formatCost(stats.total_llm_cost),
      subtitle: `${stats.total_llm_calls || 0} total API calls`,
      color: 'rose',
      highlight: true
    }
  ];

  return (
    <div className="space-y-6">
      {/* Highlighted Metrics - New Tracking Features */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">
          🆕 Real-Time Monitoring
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.filter(card => card.highlight).map((card, idx) => (
            <div 
              key={idx} 
              className={`glass-card glass-${card.color} p-6 border-2 ${
                card.color === 'violet' ? 'border-violet-500/50' :
                card.color === 'cyan' ? 'border-cyan-500/50' :
                card.color === 'amber' ? 'border-amber-500/50' :
                'border-rose-500/50'
              }`}
            >
              <div className="text-sm font-medium text-slate-300 mb-1">
                {card.title}
              </div>
              <div className="text-3xl font-bold text-slate-100 mb-2">
                {card.value}
              </div>
              <div className="text-xs text-slate-400">
                {card.subtitle}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Standard Metrics */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">
          Platform Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.filter(card => !card.highlight).map((card, idx) => (
            <div key={idx} className={`glass-card glass-${card.color} p-6`}>
              <div className="text-sm font-medium text-slate-300 mb-1">
                {card.title}
              </div>
              <div className="text-3xl font-bold text-slate-100 mb-2">
                {card.value}
              </div>
              <div className="text-xs text-slate-400">
                {card.subtitle}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
