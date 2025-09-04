import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Button, Card, Input } from "../components/ui";
import { useToast } from '../lib/toast';
import AuthGuard from "../components/AuthGuard";
import Link from "next/link";
import Head from "next/head";

export default function Dashboard() {
  const [applications, setApplications] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [applicationsResponse, metricsData] = await Promise.all([
        api.getApplicationCards(),
        api.getMetrics()
      ]);
      
      const applicationsData = applicationsResponse.items || applicationsResponse;
      setApplications(applicationsData);
      setMetrics(metricsData);
    } catch (err) {
      console.error("Dashboard load error:", err);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-indigo-500/20 border-t-indigo-500 mx-auto"></div>
            <div className="absolute inset-0 rounded-full border-4 border-purple-500/20 border-t-purple-500 mx-auto animate-spin animation-delay-300"></div>
          </div>
          <p className="text-slate-300 dark:text-slate-400 text-xl font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Calculate this week's applications
  const now = new Date();
  const weekStart = new Date(now.getTime() - (now.getDay() * 24 * 60 * 60 * 1000));
  const thisWeekApps = applications.filter(app => 
    new Date(app.created_at) >= weekStart
  ).length;

  // Get recent applications (last 5)
  const recentApps = applications
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  // Calculate in-progress applications
  const inProgressCount = Object.entries(metrics?.applications_by_status || {})
    .filter(([status]) => ['interview', 'phone screen', 'tech', 'on-site'].includes(status.toLowerCase()))
    .reduce((sum, [, count]) => sum + count, 0);

  return (
    <AuthGuard>
      <Head>
        <title>Dashboard - Applytide</title>
      </Head>
      
      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="text-center space-y-6 mb-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold text-gradient animate-fadeIn">
              Welcome back!
            </h1>
            <p className="text-xl text-slate-300 dark:text-slate-400 animate-fadeIn animation-delay-200">
              Here's what's happening with your job search
            </p>
          </div>
          <div className="flex justify-center">
            <div className="h-1 w-32 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full animate-pulse-glow"></div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card glass-cyan text-center py-12">
            <div className="text-5xl font-black text-indigo-400 mb-2">
              {metrics?.total_applications || 0}
            </div>
            <div className="text-slate-200 font-medium">Total Applications</div>
            <div className="text-sm text-slate-400 mt-1">All time</div>
          </div>
          
          <div className="glass-card glass-cyan text-center py-12">
            <div className="text-5xl font-black text-emerald-400 mb-2">
              {thisWeekApps}
            </div>
            <div className="text-slate-200 font-medium">This Week</div>
            <div className="text-sm text-slate-400 mt-1">Applications added</div>
          </div>
          
          <div className="glass-card glass-cyan text-center py-12">
            <div className="text-5xl font-black text-violet-400 mb-2">
              {inProgressCount}
            </div>
            <div className="text-slate-200 font-medium">In Progress</div>
            <div className="text-sm text-slate-400 mt-1">Active interviews</div>
          </div>
        </div>

        {/* Recent Applications */}
        <div className="glass-card glass-cyan">
          <div className="px-6 py-6">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-white/10">
              <h2 className="text-xl font-semibold text-slate-200">Recent Applications</h2>
              <Link href="/pipeline">
                <Button variant="outline" className="border-white/15 text-white/80 hover:bg-white/10 hover:text-white">
                  View All
                </Button>
              </Link>
            </div>
            
            {recentApps.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📝</div>
                <p className="text-slate-400 text-lg">No applications yet</p>
                <p className="text-sm text-slate-500 mt-2">Add your first application above to get started</p>
              </div>
            ) : (
              <div className="space-y-4 max-w-4xl">
                {recentApps.map((app) => (
                  <div key={app.id} className="bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 transition-all duration-200 hover:shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-slate-100">
                          {app.job?.title || app.job_title || 'Unknown Position'}
                        </h3>
                        <p className="text-sm text-slate-400">
                          {app.job?.company_name || app.job?.company || app.company_name || 'Unknown Company'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(app.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex px-3 py-1.5 text-xs font-medium rounded-full border ${
                          app.status === 'offer' ? 'text-emerald-300 bg-emerald-300/15 border-emerald-300/25' :
                          app.status === 'interview' ? 'text-indigo-300 bg-indigo-300/15 border-indigo-300/25' :
                          app.status === 'applied' ? 'text-amber-300 bg-amber-300/15 border-amber-300/25' :
                          app.status === 'rejected' ? 'text-rose-300 bg-rose-300/15 border-rose-300/25' :
                          'text-slate-300 bg-white/10 border-white/15'
                        }`}>
                          {app.status || 'applied'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/jobs">
            <div className="glass-card glass-cyan hover:shadow-lg transition-shadow cursor-pointer text-center py-8">
              <div className="text-3xl mb-2">💼</div>
              <div className="font-medium text-slate-200">Browse Jobs</div>
            </div>
          </Link>
          
          <Link href="/pipeline">
            <div className="glass-card glass-cyan hover:shadow-lg transition-shadow cursor-pointer text-center py-8">
              <div className="text-3xl mb-2">🔄</div>
              <div className="font-medium text-slate-200">View Pipeline</div>
            </div>
          </Link>
          
          <Link href="/documents">
            <div className="glass-card glass-cyan hover:shadow-lg transition-shadow cursor-pointer text-center py-8">
              <div className="text-3xl mb-2">📄</div>
              <div className="font-medium text-slate-200">Documents</div>
            </div>
          </Link>
          
          <Link href="/reminders">
            <div className="glass-card glass-cyan hover:shadow-lg transition-shadow cursor-pointer text-center py-8">
              <div className="text-3xl mb-2">⏰</div>
              <div className="font-medium text-slate-200">Reminders</div>
            </div>
          </Link>
        </div>
      </div>
    </AuthGuard>
  );
}
