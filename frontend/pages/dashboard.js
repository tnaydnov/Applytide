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
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [newApplication, setNewApplication] = useState({
    job_title: '',
    company_name: '',
    application_url: ''
  });
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

  async function handleQuickAdd(e) {
    e.preventDefault();
    if (!newApplication.job_title || !newApplication.company_name) {
      toast.error("Please fill in job title and company name");
      return;
    }

    try {
      await api.createApplication(newApplication);
      toast.success("Application added successfully!");
      setNewApplication({ job_title: '', company_name: '', application_url: '' });
      setShowQuickAdd(false);
      loadData(); // Refresh data
    } catch (err) {
      toast.error("Failed to add application");
    }
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
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">Welcome back! 👋</h1>
          <p className="text-gray-600">Here's what's happening with your job search</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="text-center p-8 bg-gradient-to-br from-blue-50 to-indigo-100 border-none">
            <div className="text-5xl font-black text-indigo-600 mb-2">
              {metrics?.total_applications || 0}
            </div>
            <div className="text-gray-700 font-medium">Total Applications</div>
            <div className="text-sm text-gray-500 mt-1">All time</div>
          </Card>
          
          <Card className="text-center p-8 bg-gradient-to-br from-green-50 to-emerald-100 border-none">
            <div className="text-5xl font-black text-emerald-600 mb-2">
              {thisWeekApps}
            </div>
            <div className="text-gray-700 font-medium">This Week</div>
            <div className="text-sm text-gray-500 mt-1">Applications added</div>
          </Card>
          
          <Card className="text-center p-8 bg-gradient-to-br from-purple-50 to-violet-100 border-none">
            <div className="text-5xl font-black text-violet-600 mb-2">
              {inProgressCount}
            </div>
            <div className="text-gray-700 font-medium">In Progress</div>
            <div className="text-sm text-gray-500 mt-1">Active interviews</div>
          </Card>
        </div>

        {/* Quick Add Application */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Quick Add Application</h2>
            {!showQuickAdd && (
              <Button onClick={() => setShowQuickAdd(true)} className="bg-indigo-600 hover:bg-indigo-700">
                + Add Application
              </Button>
            )}
          </div>
          
          {showQuickAdd ? (
            <form onSubmit={handleQuickAdd} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Job Title"
                  value={newApplication.job_title}
                  onChange={(e) => setNewApplication({...newApplication, job_title: e.target.value})}
                  required
                />
                <Input
                  placeholder="Company Name"
                  value={newApplication.company_name}
                  onChange={(e) => setNewApplication({...newApplication, company_name: e.target.value})}
                  required
                />
              </div>
              <Input
                placeholder="Application URL (optional)"
                value={newApplication.application_url}
                onChange={(e) => setNewApplication({...newApplication, application_url: e.target.value})}
              />
              <div className="flex space-x-3">
                <Button type="submit" className="bg-green-600 hover:bg-green-700">
                  Add Application
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowQuickAdd(false);
                    setNewApplication({ job_title: '', company_name: '', application_url: '' });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-gray-600">Quickly add a new job application to your pipeline</p>
          )}
        </Card>

        {/* Recent Applications */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Recent Applications</h2>
            <Link href="/pipeline">
              <Button variant="outline">View All</Button>
            </Link>
          </div>
          
          {recentApps.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📝</div>
              <p className="text-gray-500 text-lg">No applications yet</p>
              <p className="text-sm text-gray-400 mt-2">Add your first application above to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentApps.map((app) => (
                <div key={app.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">
                      {app.job?.title || app.job_title || 'Unknown Position'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {app.job?.company_name || app.job?.company || app.company_name || 'Unknown Company'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(app.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      app.status === 'offer' ? 'bg-green-100 text-green-800' :
                      app.status === 'interview' ? 'bg-blue-100 text-blue-800' :
                      app.status === 'applied' ? 'bg-yellow-100 text-yellow-800' :
                      app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {app.status || 'applied'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/jobs">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer text-center bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <div className="text-3xl mb-2">💼</div>
              <div className="font-medium text-gray-900">Browse Jobs</div>
            </Card>
          </Link>
          
          <Link href="/pipeline">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer text-center bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <div className="text-3xl mb-2">🔄</div>
              <div className="font-medium text-gray-900">View Pipeline</div>
            </Card>
          </Link>
          
          <Link href="/documents">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer text-center bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <div className="text-3xl mb-2">📄</div>
              <div className="font-medium text-gray-900">Documents</div>
            </Card>
          </Link>
          
          <Link href="/reminders">
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer text-center bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <div className="text-3xl mb-2">⏰</div>
              <div className="font-medium text-gray-900">Reminders</div>
            </Card>
          </Link>
        </div>
      </div>
    </AuthGuard>
  );
}
