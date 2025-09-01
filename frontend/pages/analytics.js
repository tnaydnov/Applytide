import { useState, useEffect } from "react";
import Head from "next/head";
import { Card, Button, Badge } from "../components/ui";
import { BarChart, LineChart, PieChart, DonutChart, AreaChart } from "../components/charts";
import api from "../lib/api";
import { useToast } from "../lib/toast";

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [timeRange, setTimeRange] = useState('6m'); // 1m, 3m, 6m, 1y, all
  const [selectedMetric, setSelectedMetric] = useState('overview');
  const toast = useToast();

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  async function loadAnalytics() {
    setLoading(true);
    try {
      const data = await api.getAnalytics(timeRange);
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }

  async function exportReport(format) {
    try {
      if (format === 'pdf') {
        await api.exportAnalyticsPDF(timeRange);
        toast.success('PDF report downloaded successfully');
      } else if (format === 'csv') {
        await api.exportAnalyticsCSV(timeRange);
        toast.success('CSV data exported successfully');
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast.error(`Failed to export ${format.toUpperCase()} report`);
    }
  }

  const timeRangeOptions = [
    { value: '1m', label: 'Last Month' },
    { value: '3m', label: 'Last 3 Months' },
    { value: '6m', label: 'Last 6 Months' },
    { value: '1y', label: 'Last Year' },
    { value: 'all', label: 'All Time' }
  ];

  const metricCategories = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'applications', label: 'Applications', icon: '📝' },
    { id: 'interviews', label: 'Interviews', icon: '🎯' },
    { id: 'companies', label: 'Companies', icon: '🏢' },
    { id: 'timeline', label: 'Timeline', icon: '⏱️' },
    { id: 'salary', label: 'Salary', icon: '💰' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Analytics - JobFlow</title>
      </Head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="mt-2 text-gray-600">Track your job search progress and insights</p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="rounded-md border border-gray-300 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {timeRangeOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <Button 
                variant="outline" 
                onClick={() => exportReport('csv')}
                className="text-sm"
              >
                Export CSV
              </Button>
              <Button 
                variant="outline" 
                onClick={() => exportReport('pdf')}
                className="text-sm"
              >
                Export PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Metric Categories */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {metricCategories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedMetric(category.id)}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedMetric === category.id 
                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-200' 
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span className="mr-2">{category.icon}</span>
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {analytics && (
          <>
            {/* Overview Metrics */}
            {selectedMetric === 'overview' && (
              <OverviewSection analytics={analytics} />
            )}

            {/* Application Metrics */}
            {selectedMetric === 'applications' && (
              <ApplicationsSection analytics={analytics} />
            )}

            {/* Interview Metrics */}
            {selectedMetric === 'interviews' && (
              <InterviewsSection analytics={analytics} />
            )}

            {/* Company Metrics */}
            {selectedMetric === 'companies' && (
              <CompaniesSection analytics={analytics} />
            )}

            {/* Timeline Metrics */}
            {selectedMetric === 'timeline' && (
              <TimelineSection analytics={analytics} />
            )}

            {/* Salary Metrics */}
            {selectedMetric === 'salary' && (
              <SalarySection analytics={analytics} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Overview Section Component
function OverviewSection({ analytics }) {
  const kpis = [
    {
      title: "Total Applications",
      value: analytics.overview.totalApplications,
      change: analytics.overview.applicationsChange,
      icon: "📝"
    },
    {
      title: "Interview Rate",
      value: `${analytics.overview.interviewRate}%`,
      change: analytics.overview.interviewRateChange,
      icon: "🎯"
    },
    {
      title: "Offer Rate",
      value: `${analytics.overview.offerRate}%`,
      change: analytics.overview.offerRateChange,
      icon: "✅"
    },
    {
      title: "Avg. Response Time",
      value: `${analytics.overview.avgResponseTime} days`,
      change: analytics.overview.responseTimeChange,
      icon: "⏱️"
    }
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{kpi.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
                <div className="flex items-center mt-2">
                  <span className={`text-sm ${kpi.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {kpi.change >= 0 ? '↗' : '↘'} {Math.abs(kpi.change)}%
                  </span>
                  <span className="text-xs text-gray-500 ml-1">vs last period</span>
                </div>
              </div>
              <div className="text-3xl">{kpi.icon}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Application Status Distribution</h3>
          <DonutChart 
            data={analytics.overview.statusDistribution}
            height={300}
          />
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Applications Over Time</h3>
          <AreaChart 
            data={analytics.overview.applicationsOverTime}
            height={300}
          />
        </Card>
      </div>

      {/* Funnel Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Application Funnel</h3>
        <div className="space-y-4">
          {analytics.overview.funnel.map((stage, index) => (
            <div key={stage.name} className="flex items-center">
              <div className="w-24 text-sm text-gray-600">{stage.name}</div>
              <div className="flex-1 mx-4">
                <div className="bg-gray-200 rounded-full h-8 relative">
                  <div 
                    className="bg-blue-600 h-8 rounded-full flex items-center justify-end pr-3"
                    style={{ width: `${(stage.count / analytics.overview.funnel[0].count) * 100}%` }}
                  >
                    <span className="text-white text-sm font-medium">{stage.count}</span>
                  </div>
                </div>
              </div>
              <div className="w-16 text-sm text-gray-600 text-right">
                {Math.round((stage.count / analytics.overview.funnel[0].count) * 100)}%
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// Additional section components would be implemented similarly...
function ApplicationsSection({ analytics }) {
  const appData = analytics.applications || {};
  
  return (
    <div className="space-y-6">
      {/* Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Application Status Breakdown</h3>
          <DonutChart 
            data={appData.statusBreakdown || []}
            height={300}
          />
        </Card>
        
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Applications by Month</h3>
          <BarChart 
            data={appData.monthlyData || []}
            height={300}
          />
        </Card>
      </div>

      {/* Job Titles Analysis */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Top Job Titles Applied For</h3>
        <div className="space-y-3">
          {(appData.jobTitles || []).slice(0, 8).map((title, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center flex-1">
                <div className="w-32 text-sm text-gray-700 truncate">{title.title}</div>
                <div className="flex-1 mx-4">
                  <div className="bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-blue-600 h-4 rounded-full"
                      style={{ width: `${(title.count / (appData.jobTitles[0]?.count || 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              <div className="w-12 text-sm text-gray-600 text-right">{title.count}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 text-center">
          <div className="text-3xl font-bold text-blue-600">{appData.totalApplications || 0}</div>
          <div className="text-sm text-gray-600 mt-1">Total Applications</div>
        </Card>
        <Card className="p-6 text-center">
          <div className="text-3xl font-bold text-green-600">{appData.successRate || 0}%</div>
          <div className="text-sm text-gray-600 mt-1">Success Rate</div>
        </Card>
        <Card className="p-6 text-center">
          <div className="text-3xl font-bold text-purple-600">{appData.avgResponseTime || 0}</div>
          <div className="text-sm text-gray-600 mt-1">Avg Response Days</div>
        </Card>
      </div>
    </div>
  );
}

function InterviewsSection({ analytics }) {
  const interviewData = analytics.interviews || {};
  
  return (
    <div className="space-y-6">
      {/* Interview Types and Success Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Interview Types</h3>
          <PieChart 
            data={interviewData.typeBreakdown || []}
            height={300}
          />
        </Card>
        
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Success by Interview Type</h3>
          <BarChart 
            data={interviewData.successByType || []}
            height={300}
          />
        </Card>
      </div>

      {/* Interview Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 text-center">
          <div className="text-3xl font-bold text-blue-600">{interviewData.totalInterviews || 0}</div>
          <div className="text-sm text-gray-600 mt-1">Total Interviews</div>
        </Card>
        <Card className="p-6 text-center">
          <div className="text-3xl font-bold text-green-600">{interviewData.successRate || 0}%</div>
          <div className="text-sm text-gray-600 mt-1">Success Rate</div>
        </Card>
        <Card className="p-6 text-center">
          <div className="text-3xl font-bold text-purple-600">{interviewData.avgInterviewsPerApp || 0}</div>
          <div className="text-sm text-gray-600 mt-1">Avg Interviews/App</div>
        </Card>
        <Card className="p-6 text-center">
          <div className="text-3xl font-bold text-orange-600">{interviewData.conversionRate || 0}%</div>
          <div className="text-sm text-gray-600 mt-1">Interview → Offer</div>
        </Card>
      </div>

      {/* Interview Performance Over Time */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Interview Performance Trends</h3>
        <LineChart 
          data={interviewData.performanceOverTime || []}
          height={300}
        />
      </Card>
    </div>
  );
}

function CompaniesSection({ analytics }) {
  const companyData = analytics.companies || {};
  
  return (
    <div className="space-y-6">
      {/* Top Companies */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Top Companies by Applications</h3>
        <div className="space-y-3">
          {(companyData.topCompanies || []).slice(0, 10).map((company, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center flex-1">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{company.name}</div>
                  <div className="text-sm text-gray-600">{company.applications} applications</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-green-600">{company.successRate}% success</div>
                <div className="text-xs text-gray-500">{company.responseRate}% response</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Company Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Company Size Distribution</h3>
          <DonutChart 
            data={companyData.sizeDistribution || []}
            height={300}
          />
        </Card>
        
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Success Rate by Company Size</h3>
          <BarChart 
            data={companyData.successBySize || []}
            height={300}
          />
        </Card>
      </div>

      {/* Company Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 text-center">
          <div className="text-3xl font-bold text-blue-600">{companyData.totalCompanies || 0}</div>
          <div className="text-sm text-gray-600 mt-1">Total Companies</div>
        </Card>
        <Card className="p-6 text-center">
          <div className="text-3xl font-bold text-green-600">{companyData.avgSuccessRate || 0}%</div>
          <div className="text-sm text-gray-600 mt-1">Avg Success Rate</div>
        </Card>
        <Card className="p-6 text-center">
          <div className="text-3xl font-bold text-purple-600">{companyData.responseRate || 0}%</div>
          <div className="text-sm text-gray-600 mt-1">Avg Response Rate</div>
        </Card>
      </div>
    </div>
  );
}

function TimelineSection({ analytics }) {
  const timelineData = analytics.timeline || {};
  
  return (
    <div className="space-y-6">
      {/* Process Duration Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 text-center">
          <div className="text-3xl font-bold text-blue-600">{timelineData.avgProcessDuration || 0}</div>
          <div className="text-sm text-gray-600 mt-1">Avg Process Days</div>
        </Card>
        <Card className="p-6 text-center">
          <div className="text-3xl font-bold text-green-600">{timelineData.avgResponseTime || 0}</div>
          <div className="text-sm text-gray-600 mt-1">Avg Response Days</div>
        </Card>
        <Card className="p-6 text-center">
          <div className="text-3xl font-bold text-purple-600">{timelineData.avgInterviewTime || 0}</div>
          <div className="text-sm text-gray-600 mt-1">Avg Interview Days</div>
        </Card>
        <Card className="p-6 text-center">
          <div className="text-3xl font-bold text-orange-600">{timelineData.avgDecisionTime || 0}</div>
          <div className="text-sm text-gray-600 mt-1">Avg Decision Days</div>
        </Card>
      </div>

      {/* Timeline Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Stage Duration Breakdown</h3>
          <BarChart 
            data={timelineData.stageDurations || []}
            height={300}
          />
        </Card>
        
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Process Timeline Trends</h3>
          <LineChart 
            data={timelineData.timelineTrends || []}
            height={300}
          />
        </Card>
      </div>

      {/* Bottleneck Analysis */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Process Bottlenecks</h3>
        <div className="space-y-4">
          {(timelineData.bottlenecks || []).map((bottleneck, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                <div>
                  <div className="font-medium text-gray-900">{bottleneck.stage}</div>
                  <div className="text-sm text-gray-600">{bottleneck.description}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-yellow-600">{bottleneck.avgDays} days</div>
                <div className="text-sm text-gray-500">average duration</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SalarySection({ analytics }) {
  const salaryData = analytics.salary || {};
  
  return (
    <div className="space-y-6">
      {/* Salary Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 text-center">
          <div className="text-3xl font-bold text-green-600">${(salaryData.avgSalaryOffered || 0).toLocaleString()}</div>
          <div className="text-sm text-gray-600 mt-1">Avg Salary Offered</div>
        </Card>
        <Card className="p-6 text-center">
          <div className="text-3xl font-bold text-blue-600">${(salaryData.salaryRange?.min || 0).toLocaleString()}</div>
          <div className="text-sm text-gray-600 mt-1">Min Salary Range</div>
        </Card>
        <Card className="p-6 text-center">
          <div className="text-3xl font-bold text-purple-600">${(salaryData.salaryRange?.max || 0).toLocaleString()}</div>
          <div className="text-sm text-gray-600 mt-1">Max Salary Range</div>
        </Card>
        <Card className="p-6 text-center">
          <div className="text-3xl font-bold text-orange-600">{salaryData.applicationsWithSalary || 0}</div>
          <div className="text-sm text-gray-600 mt-1">Applications w/ Salary</div>
        </Card>
      </div>

      {/* Salary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Salary Range Distribution</h3>
          <DonutChart 
            data={salaryData.salaryRangeDistribution || []}
            height={300}
          />
        </Card>
        
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Average Salary by Job Title</h3>
          <BarChart 
            data={(salaryData.salaryByTitle || []).map(item => ({
              name: item.title,
              value: item.avg_salary
            }))}
            height={300}
          />
        </Card>
      </div>

      {/* Salary by Job Title Table */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Detailed Salary Analysis by Role</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Salary</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applications</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(salaryData.salaryByTitle || []).map((title, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{title.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${title.avg_salary.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{title.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(!salaryData.salaryByTitle || salaryData.salaryByTitle.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            No salary data available. Add salary information to your job applications to see insights here.
          </div>
        )}
      </Card>
    </div>
  );
}
