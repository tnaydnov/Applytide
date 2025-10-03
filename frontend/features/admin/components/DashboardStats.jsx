// frontend/features/admin/components/DashboardStats.jsx
import { formatDistanceToNow } from 'date-fns';

export default function DashboardStats({ stats }) {
  if (!stats) return null;

  const statCards = [
    {
      title: 'Total Users',
      value: stats.total_users.toLocaleString(),
      subtitle: `${stats.new_users_7d} new in last 7 days`,
      color: 'violet'
    },
    {
      title: 'Active Users (7d)',
      value: stats.active_users_7d.toLocaleString(),
      subtitle: `${((stats.active_users_7d / stats.total_users) * 100).toFixed(1)}% of total`,
      color: 'cyan'
    },
    {
      title: 'Premium Users',
      value: stats.premium_users.toLocaleString(),
      subtitle: `${((stats.premium_users / stats.total_users) * 100).toFixed(1)}% conversion`,
      color: 'amber'
    },
    {
      title: 'OAuth Users',
      value: stats.oauth_users.toLocaleString(),
      subtitle: `${((stats.oauth_users / stats.total_users) * 100).toFixed(1)}% use OAuth`,
      color: 'rose'
    },
    {
      title: 'Applications',
      value: stats.total_applications.toLocaleString(),
      subtitle: `${stats.applications_7d} this week`,
      color: 'violet'
    },
    {
      title: 'Documents',
      value: stats.total_documents.toLocaleString(),
      subtitle: `${stats.documents_analyzed} analyzed`,
      color: 'cyan'
    },
    {
      title: 'Jobs Tracked',
      value: stats.total_jobs.toLocaleString(),
      subtitle: `${stats.jobs_7d} added this week`,
      color: 'amber'
    },
    {
      title: 'Cache Hit Rate',
      value: `${(stats.analysis_cache_hit_rate * 100).toFixed(1)}%`,
      subtitle: 'Document analysis cache',
      color: 'rose'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((card, idx) => (
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
  );
}
