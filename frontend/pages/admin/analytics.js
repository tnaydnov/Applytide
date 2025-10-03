// frontend/pages/admin/analytics.js
import AdminGuard from '../../components/guards/AdminGuard';
import PageContainer from '../../components/layout/PageContainer';
import PageHeader from '../../components/layout/PageHeader';
import { useAnalytics } from '../../features/admin/hooks/useAdminData';
import { useState } from 'react';
import { Button } from '../../components/ui';

export default function AdminAnalytics() {
  const [days, setDays] = useState(30);
  const { analytics, loading, error, refresh } = useAnalytics(days);

  return (
    <AdminGuard>
      <PageContainer>
        <PageHeader
          title="Analytics"
          subtitle="Usage analytics and insights"
          actions={
            <div className="flex gap-2">
              <select
                className="input-glass input-cyan"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
              <Button onClick={refresh} variant="outline">
                Refresh
              </Button>
            </div>
          }
        />

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
          </div>
        ) : error ? (
          <div className="glass-card p-6 text-center text-red-300">
            Error: {error}
          </div>
        ) : analytics ? (
          <div className="space-y-6">
            {/* Feature Usage */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Feature Usage</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(analytics.feature_usage).map(([feature, count]) => (
                  <div key={feature} className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="text-sm text-slate-400 capitalize">
                      {feature.replace(/_/g, ' ')}
                    </div>
                    <div className="text-2xl font-bold text-slate-100 mt-1">
                      {count.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Application Statuses */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Application Pipeline</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(analytics.application_statuses).map(([status, count]) => (
                  <div key={status} className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="text-sm text-slate-400">{status}</div>
                    <div className="text-xl font-bold text-slate-100 mt-1">
                      {count.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Users */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Top Active Users</h3>
              <div className="space-y-2">
                {analytics.top_users.map((user, idx) => (
                  <div key={user.user_id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400">#{idx + 1}</span>
                      <span className="text-slate-100">{user.email}</span>
                    </div>
                    <span className="text-violet-300 font-medium">
                      {user.activity_score} activities
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </PageContainer>
    </AdminGuard>
  );
}
