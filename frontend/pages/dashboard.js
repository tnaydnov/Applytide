import { useEffect, useState } from "react";
import { api, downloadApplicationsCSV, importApplicationsCSV } from "../lib/api";
import { Button, Card } from "../components/ui";
import { useToast } from '../lib/toast';

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => { 
    loadMetrics();
  }, []);

  async function loadMetrics() {
    try {
      const data = await api.getMetrics();
      setMetrics(data);
    } catch (err) {
      toast.error("Failed to load dashboard metrics");
    } finally {
      setLoading(false);
    }
  }

  async function doExport() {
    try { 
      await downloadApplicationsCSV();
      toast.success("Applications exported successfully!");
    } catch (e) { 
      toast.error(`Export failed: ${e.message || e}`);
    }
  }

  async function doImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const res = await importApplicationsCSV(file);
      toast.success(`Imported ${res.created} applications successfully!`);
      await loadMetrics(); // refresh metrics
    } catch (e2) { 
      toast.error(`Import failed: ${e2.message || e2}`);
    }
    e.target.value = "";
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-600 text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <Card className="text-center py-16">
        <div className="space-y-4">
          <div className="text-6xl">❌</div>
          <h3 className="text-xl font-semibold text-gray-900">Failed to Load Dashboard</h3>
          <p className="text-gray-600">Please try refreshing the page</p>
          <Button onClick={() => window.location.reload()}>
            Refresh
          </Button>
        </div>
      </Card>
    );
  }

  const statusData = Object.entries(metrics.applications_by_status || {});
  const totalApplications = statusData.reduce((sum, [_, count]) => sum + count, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of your job search progress</p>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard 
          title="Total Jobs" 
          value={metrics.total_jobs} 
          icon="💼"
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <MetricCard 
          title="Total Resumes" 
          value={metrics.total_resumes} 
          icon="📄"
          color="text-green-600"
          bgColor="bg-green-50"
        />
        <MetricCard 
          title="Total Applications" 
          value={metrics.total_applications} 
          icon="📨"
          color="text-purple-600"
          bgColor="bg-purple-50"
        />
      </div>

      {/* Applications by Status */}
      <Card>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Application Status Breakdown</h2>
            <span className="text-sm text-gray-500">{totalApplications} total applications</span>
          </div>
          
          {statusData.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📊</div>
              <p className="text-gray-500">No application data yet</p>
              <p className="text-sm text-gray-400 mt-2">Start applying to jobs to see your progress here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {statusData.map(([status, count]) => {
                const percentage = totalApplications > 0 ? (count / totalApplications) * 100 : 0;
                return (
                  <div key={status} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900">{status}</span>
                      <span className="text-sm text-gray-600">{count} ({Math.round(percentage)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Data Management */}
      <Card>
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">💾</span>
            <h2 className="text-xl font-semibold text-gray-900">Data Management</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Export Data</h3>
              <p className="text-sm text-gray-600">
                Download all your application data as a CSV file for backup or analysis.
              </p>
              <Button onClick={doExport} variant="outline" className="w-full">
                <span className="mr-2">📥</span>
                Export Applications CSV
              </Button>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Import Data</h3>
              <p className="text-sm text-gray-600">
                Import application data from a CSV file to quickly populate your dashboard.
              </p>
              <label className="block">
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={doImport} 
                  className="hidden" 
                />
                <Button variant="outline" className="w-full cursor-pointer">
                  <span className="mr-2">📤</span>
                  Import Applications CSV
                </Button>
              </label>
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card>
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">⚡</span>
            <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a href="/jobs" className="block">
              <div className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-md transition-all duration-200 text-center">
                <div className="text-2xl mb-2">💼</div>
                <div className="text-sm font-medium text-gray-900">Add Job</div>
              </div>
            </a>
            <a href="/pipeline" className="block">
              <div className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-md transition-all duration-200 text-center">
                <div className="text-2xl mb-2">🔄</div>
                <div className="text-sm font-medium text-gray-900">View Pipeline</div>
              </div>
            </a>
            <a href="/resumes" className="block">
              <div className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-md transition-all duration-200 text-center">
                <div className="text-2xl mb-2">📄</div>
                <div className="text-sm font-medium text-gray-900">Manage Resumes</div>
              </div>
            </a>
            <button onClick={() => window.location.reload()} className="block w-full">
              <div className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-md transition-all duration-200 text-center">
                <div className="text-2xl mb-2">🔄</div>
                <div className="text-sm font-medium text-gray-900">Refresh Data</div>
              </div>
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function MetricCard({ title, value, icon, color, bgColor }) {
  return (
    <Card className={`${bgColor} border-none`}>
      <div className="flex items-center space-x-4">
        <div className="text-3xl">{icon}</div>
        <div>
          <div className={`text-3xl font-bold ${color}`}>{value}</div>
          <div className="text-gray-600 font-medium">{title}</div>
        </div>
      </div>
    </Card>
  );
}
