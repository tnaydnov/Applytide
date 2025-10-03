// frontend/pages/admin/index.js
import { useState } from 'react';
import AdminGuard from '../../components/guards/AdminGuard';
import PageContainer from '../../components/layout/PageContainer';
import PageHeader from '../../components/layout/PageHeader';
import { useAdminDashboard, useSystemHealth } from '../../features/admin/hooks/useAdminData';
import DashboardStats from '../../features/admin/components/DashboardStats';
import SystemHealthCard from '../../features/admin/components/SystemHealthCard';
import { Button } from '../../components/ui';

export default function AdminDashboard() {
  const { stats, loading: statsLoading, error: statsError, refresh: refreshStats } = useAdminDashboard();
  const { health, loading: healthLoading, error: healthError, refresh: refreshHealth } = useSystemHealth();

  return (
    <AdminGuard>
      <PageContainer>
        <PageHeader
          title="Admin Dashboard"
          subtitle="System overview and management"
          actions={
            <Button 
              onClick={() => {
                refreshStats();
                refreshHealth();
              }}
              variant="outline"
            >
              Refresh
            </Button>
          }
        />

        {/* Stats Overview */}
        {statsLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
          </div>
        ) : statsError ? (
          <div className="glass-card p-6 text-center text-red-300">
            Error: {statsError}
          </div>
        ) : (
          <div className="space-y-6">
            <DashboardStats stats={stats} />
            
            {/* System Health */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SystemHealthCard health={health} />
              
              {/* Quick Actions */}
              <div className="glass-card p-6 space-y-4">
                <h3 className="text-lg font-semibold text-slate-100">Quick Actions</h3>
                
                <div className="space-y-3">
                  <a 
                    href="/admin/users" 
                    className="block p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-100">Manage Users</div>
                        <div className="text-sm text-slate-400">View and update user accounts</div>
                      </div>
                      <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </a>

                  <a 
                    href="/admin/analytics" 
                    className="block p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-100">View Analytics</div>
                        <div className="text-sm text-slate-400">Detailed usage analytics</div>
                      </div>
                      <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </a>

                  <a 
                    href="/admin/system" 
                    className="block p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-100">System Logs</div>
                        <div className="text-sm text-slate-400">View admin action logs</div>
                      </div>
                      <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    </AdminGuard>
  );
}
