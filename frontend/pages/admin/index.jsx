import { useState, useEffect } from 'react';
import { FiUsers, FiCreditCard, FiFileText, FiActivity, FiAlertCircle } from 'react-icons/fi';
import AdminGuard from '@/components/guards/AdminGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import StatCard from '@/components/admin/StatCard';
import ActivityFeed from '@/components/admin/ActivityFeed';
import SimpleChart from '@/components/admin/SimpleChart';
import { adminApi } from '@/features/admin/api';
import { useToast } from '@/lib/toast';

export default function AdminDashboard() {
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [charts, setCharts] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load all dashboard data in parallel
      const [statsData, activitiesData, chartsData] = await Promise.all([
        adminApi.getDashboardStats(),
        adminApi.getActivityFeed(20),
        adminApi.getDashboardCharts()
      ]);

      setStats(statsData);
      setActivities(activitiesData);
      setCharts(chartsData);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const signupsChartData = charts ? {
    labels: charts.signups_last_7_days.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [{
      label: 'Signups',
      data: charts.signups_last_7_days.map(d => d.count),
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.4
    }]
  } : null;

  const applicationsChartData = charts ? {
    labels: charts.applications_last_7_days.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [{
      label: 'Applications',
      data: charts.applications_last_7_days.map(d => d.count),
      borderColor: 'rgb(34, 197, 94)',
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      fill: true,
      tension: 0.4
    }]
  } : null;

  const errorsChartData = charts ? {
    labels: charts.errors_last_7_days.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [{
      label: 'Errors',
      data: charts.errors_last_7_days.map(d => d.count),
      borderColor: 'rgb(239, 68, 68)',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      fill: true,
      tension: 0.4
    }]
  } : null;

  return (
    <AdminGuard>
      <AdminLayout>
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Overview of your application</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Users"
            value={stats?.total_users}
            icon={FiUsers}
            change={`${stats?.new_users_today || 0} today`}
            trend="up"
            loading={loading}
          />
          <StatCard
            title="Premium Users"
            value={stats?.premium_users}
            icon={FiCreditCard}
            loading={loading}
          />
          <StatCard
            title="Applications"
            value={stats?.total_applications}
            icon={FiFileText}
            loading={loading}
          />
          <StatCard
            title="Active Sessions"
            value={stats?.active_sessions}
            icon={FiActivity}
            loading={loading}
          />
        </div>

        {/* Error Alert (if any recent errors) */}
        {stats && stats.recent_errors_count > 0 && (
          <div className="mb-8 bg-red-50 border-l-4 border-red-400 p-4 rounded">
            <div className="flex items-center">
              <FiAlertCircle className="text-red-400 mr-3" size={20} />
              <div>
                <p className="text-sm font-medium text-red-800">
                  {stats.recent_errors_count} error{stats.recent_errors_count !== 1 ? 's' : ''} in the last 24 hours
                </p>
                <p className="text-sm text-red-700 mt-1">
                  <a href="/admin/errors" className="underline">View error logs →</a>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <SimpleChart
            title="User Signups (7 Days)"
            data={signupsChartData}
            loading={loading}
          />
          <SimpleChart
            title="Applications Created (7 Days)"
            data={applicationsChartData}
            loading={loading}
          />
          <SimpleChart
            title="Errors (7 Days)"
            data={errorsChartData}
            loading={loading}
          />
        </div>

        {/* Activity Feed */}
        <ActivityFeed activities={activities} loading={loading} />
      </AdminLayout>
    </AdminGuard>
  );
}
