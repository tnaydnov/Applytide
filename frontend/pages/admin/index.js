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
                        <div className="font-medium text-slate-100">👥 Manage Users</div>
                        <div className="text-sm text-slate-400">View and update user accounts</div>
                      </div>
                      <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </a>

                  <a 
                    href="/admin/jobs" 
                    className="block p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-100">💼 Manage Jobs</div>
                        <div className="text-sm text-slate-400">View, edit, and delete job listings</div>
                      </div>
                      <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </a>

                  <a 
                    href="/admin/applications" 
                    className="block p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-100">📝 Applications Management</div>
                        <div className="text-sm text-slate-400">Track and manage job applications</div>
                      </div>
                      <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </a>

                  <a 
                    href="/admin/documents" 
                    className="block p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-100">📄 Documents Management</div>
                        <div className="text-sm text-slate-400">Manage user documents and storage</div>
                      </div>
                      <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </a>

                  <a 
                    href="/admin/cache" 
                    className="block p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-100">🔑 Cache Management</div>
                        <div className="text-sm text-slate-400">Monitor Redis cache and keys</div>
                      </div>
                      <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </a>

                  <a 
                    href="/admin/email" 
                    className="block p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-100">📧 Email Monitoring</div>
                        <div className="text-sm text-slate-400">View email logs and test sending</div>
                      </div>
                      <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </a>

                  <a 
                    href="/admin/storage" 
                    className="block p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-100">💾 Storage Management</div>
                        <div className="text-sm text-slate-400">Monitor disk usage and cleanup</div>
                      </div>
                      <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </a>

                  <a 
                    href="/admin/security" 
                    className="block p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-100">🔒 Security Monitoring</div>
                        <div className="text-sm text-slate-400">Failed logins, IP blocking, sessions</div>
                      </div>
                      <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </a>

                  <a 
                    href="/admin/gdpr" 
                    className="block p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-100">⚖️ GDPR Compliance</div>
                        <div className="text-sm text-slate-400">Data requests and user deletion</div>
                      </div>
                      <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </a>

                  <a 
                    href="/admin/analytics-advanced" 
                    className="block p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-100">📊 Enhanced Analytics</div>
                        <div className="text-sm text-slate-400">Cohorts, churn prediction, funnels</div>
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
                        <div className="font-medium text-slate-100">📈 Basic Analytics</div>
                        <div className="text-sm text-slate-400">User engagement and trends</div>
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
                        <div className="font-medium text-slate-100">📋 System Logs</div>
                        <div className="text-sm text-slate-400">View admin action logs</div>
                      </div>
                      <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </a>

                  <a 
                    href="/admin/database" 
                    className="block p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-100">🗄️ Database Queries</div>
                        <div className="text-sm text-slate-400">Execute SQL for debugging</div>
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
