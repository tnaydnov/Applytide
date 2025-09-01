import { useEffect, useState } from "react";
import { api, downloadApplicationsCSV, importApplicationsCSV } from "../lib/api";
import { Button, Card, Input } from "../components/ui";
import { useToast } from '../lib/toast';
import RemindersWidget from "../components/RemindersWidget";
import QuickSearchWidget from "../components/QuickSearchWidget";

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [insights, setInsights] = useState(null);
  const toast = useToast();

  useEffect(() => { 
    loadData();
  }, [dateRange]);

  async function loadData() {
    try {
      setLoading(true);
      const [metricsData, applicationsResponse] = await Promise.all([
        api.getMetrics(),
        api.getApplications()
      ]);
      setMetrics(metricsData);
      
      // Handle paginated response
      const applicationsData = applicationsResponse.items || applicationsResponse;
      setApplications(applicationsData);
      generateInsights(applicationsData, metricsData);
    } catch (err) {
      console.error("Dashboard load error:", err);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }

  function generateInsights(apps, metrics) {
    const now = new Date();
    const rangeInDays = parseInt(dateRange);
    const startDate = new Date(now.getTime() - rangeInDays * 24 * 60 * 60 * 1000);
    
    // Filter applications by date range
    const recentApps = apps.filter(app => 
      new Date(app.created_at) >= startDate
    );

    // Calculate trends
    const applicationsPerWeek = recentApps.length / (rangeInDays / 7);
    
    // Use metrics for status distribution if available
    const statusCounts = metrics?.applications_by_status || {};
    const totalApps = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
    
    // Calculate response rate from status distribution
    const responseStatuses = ['Phone Screen', 'Tech', 'On-site', 'Offer', 'Accepted'];
    const responseCount = responseStatuses.reduce((sum, status) => sum + (statusCounts[status] || 0), 0);
    const responseRate = totalApps > 0 ? (responseCount / totalApps * 100) : 0;

    // Time-based analysis using available data
    const today = new Date();
    const thisWeek = recentApps.filter(app => {
      const appDate = new Date(app.created_at);
      const daysDiff = (today - appDate) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7;
    }).length;

    const lastWeek = recentApps.filter(app => {
      const appDate = new Date(app.created_at);
      const daysDiff = (today - appDate) / (1000 * 60 * 60 * 24);
      return daysDiff > 7 && daysDiff <= 14;
    }).length;

    const weeklyTrend = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek * 100) : 0;

    // Generate actionable insights
    const insights = [];
    
    if (responseRate < 20) {
      insights.push({
        type: 'warning',
        title: 'Low Response Rate',
        message: `Your response rate is ${responseRate.toFixed(1)}%. Consider improving your resume or application strategy.`,
        action: 'Review your resume and cover letter templates'
      });
    }
    
    if (weeklyTrend > 50) {
      insights.push({
        type: 'success',
        title: 'Great Momentum!',
        message: `You've increased applications by ${weeklyTrend.toFixed(1)}% this week.`,
        action: 'Keep up the great work!'
      });
    } else if (weeklyTrend < -30) {
      insights.push({
        type: 'info',
        title: 'Application Slowdown',
        message: `Applications decreased by ${Math.abs(weeklyTrend).toFixed(1)}% this week.`,
        action: 'Consider setting a daily application goal'
      });
    }
    
    if (applicationsPerWeek < 5) {
      insights.push({
        type: 'info',
        title: 'Increase Application Volume',
        message: `You're averaging ${applicationsPerWeek.toFixed(1)} applications per week.`,
        action: 'Aim for 10-15 applications per week for better results'
      });
    }

    setInsights({
      applicationsPerWeek: applicationsPerWeek.toFixed(1),
      responseRate: responseRate.toFixed(1),
      weeklyTrend: weeklyTrend.toFixed(1),
      statusDistribution: statusCounts,
      recommendations: insights,
      timeRange: `Last ${rangeInDays} days`
    });
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
      await loadData(); // refresh all data
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
      {/* Header with Date Range Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Comprehensive overview of your job search progress</p>
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Time Range:</label>
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 3 months</option>
            <option value="365">Last year</option>
          </select>
        </div>
      </div>

      {/* Enhanced Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard 
          title="Total Applications" 
          value={metrics.total_applications} 
          icon="�"
          color="text-blue-600"
          bgColor="bg-blue-50"
          trend={insights?.weeklyTrend}
          subtitle="All time"
        />
        <MetricCard 
          title="Response Rate" 
          value={`${insights?.responseRate || 0}%`}
          icon="�"
          color="text-green-600"
          bgColor="bg-green-50"
          subtitle={`Last ${dateRange} days`}
        />
        <MetricCard 
          title="Weekly Average" 
          value={insights?.applicationsPerWeek || 0}
          icon="📊"
          color="text-purple-600"
          bgColor="bg-purple-50"
          subtitle="Applications/week"
        />
        <MetricCard 
          title="Total Jobs" 
          value={metrics.total_jobs} 
          icon="💼"
          color="text-orange-600"
          bgColor="bg-orange-50"
          subtitle="In database"
        />
      </div>

      {/* Quick Search Widget */}
      <QuickSearchWidget />

      {/* Reminders Widget */}
      <RemindersWidget maxItems={3} />

      {/* Insights Panel */}
      {insights && (
        <Card>
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🔍</span>
              <h2 className="text-xl font-semibold text-gray-900">Key Insights</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">📈</span>
                  <h3 className="font-semibold text-gray-900">Weekly Trend</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-2xl font-bold ${insights.weeklyTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {insights.weeklyTrend > 0 ? '+' : ''}{insights.weeklyTrend}%
                  </span>
                  <span className="text-sm text-gray-600">vs last week</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🎯</span>
                  <h3 className="font-semibold text-gray-900">Most Common Status</h3>
                </div>
                <div className="capitalize text-lg font-medium text-indigo-600">
                  {insights.mostCommonStatus}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🚀</span>
                  <h3 className="font-semibold text-gray-900">Activity Level</h3>
                </div>
                <div className="text-lg font-medium text-purple-600">
                  {insights.timeRange}
                </div>
              </div>
            </div>

            {/* Top Companies - Temporarily disabled due to data structure change */}
            {false && insights.topCompanies && insights.topCompanies.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                  <span>🏢</span>
                  <span>Top Companies Applied To</span>
                </h3>
                <div className="space-y-2">
                  {insights.topCompanies.map(([company, count], index) => (
                    <div key={company} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-bold text-gray-500">#{index + 1}</span>
                        <span className="font-medium text-gray-900">{company}</span>
                      </div>
                      <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-sm font-medium">
                        {count} {count === 1 ? 'application' : 'applications'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Enhanced Applications by Status */}
      <Card>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
              <span>📊</span>
              <span>Application Status Breakdown</span>
            </h2>
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
                const getStatusColor = (status) => {
                  switch (status.toLowerCase()) {
                    case 'offer': return 'bg-green-500';
                    case 'interview': return 'bg-blue-500';
                    case 'applied': return 'bg-yellow-500';
                    case 'rejected': return 'bg-red-500';
                    default: return 'bg-gray-500';
                  }
                };
                const getStatusIcon = (status) => {
                  switch (status.toLowerCase()) {
                    case 'offer': return '🎉';
                    case 'interview': return '🗣️';
                    case 'applied': return '📨';
                    case 'rejected': return '❌';
                    default: return '📋';
                  }
                };
                return (
                  <div key={status} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <span>{getStatusIcon(status)}</span>
                        <span className="font-medium text-gray-900 capitalize">{status}</span>
                      </div>
                      <span className="text-sm text-gray-600">{count} ({Math.round(percentage)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all duration-500 ${getStatusColor(status)}`}
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

      {/* Performance Analytics */}
      {insights && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <span>⚡</span>
                <span>Performance Metrics</span>
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600">Applications per week</span>
                  <span className="font-semibold text-lg">{insights.applicationsPerWeek}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600">Response rate</span>
                  <span className="font-semibold text-lg text-green-600">{insights.responseRate}%</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-gray-600">Week-over-week change</span>
                  <span className={`font-semibold text-lg ${insights.weeklyTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {insights.weeklyTrend > 0 ? '+' : ''}{insights.weeklyTrend}%
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <span>💡</span>
                <span>Recommendations</span>
              </h3>
              <div className="space-y-3">
                {insights.applicationsPerWeek < 5 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>💪 Increase Activity:</strong> Consider applying to more jobs per week for better results.
                    </p>
                  </div>
                )}
                {insights.responseRate < 10 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>📝 Optimize Applications:</strong> Low response rate - consider improving your resume or cover letter.
                    </p>
                  </div>
                )}
                {insights.weeklyTrend > 20 && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>🚀 Great Momentum:</strong> You're increasing your application rate - keep it up!
                    </p>
                  </div>
                )}
                {/* {insights.topCompanies && insights.topCompanies.length > 0 && insights.topCompanies[0][1] > 3 && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm text-purple-800">
                      <strong>🎯 Diversify:</strong> Consider expanding to new companies beyond your top targets.
                    </p>
                  </div>
                )} */}
              </div>
            </div>
          </Card>
        </div>
      )}

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
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
            <a href="/profile" className="block">
              <div className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-md transition-all duration-200 text-center">
                <div className="text-2xl mb-2">👤</div>
                <div className="text-sm font-medium text-gray-900">Profile Settings</div>
              </div>
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
}

function MetricCard({ title, value, icon, color, bgColor, trend, subtitle }) {
  return (
    <Card className={`${bgColor} border-none`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="text-3xl">{icon}</div>
          <div>
            <div className={`text-3xl font-bold ${color} flex items-center space-x-2`}>
              <span>{value}</span>
              {trend !== undefined && (
                <span className={`text-sm font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {trend > 0 ? '↗' : trend < 0 ? '↘' : '→'} {Math.abs(trend)}%
                </span>
              )}
            </div>
            <div className="text-gray-600 font-medium">{title}</div>
            {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
          </div>
        </div>
      </div>
    </Card>
  );
}
