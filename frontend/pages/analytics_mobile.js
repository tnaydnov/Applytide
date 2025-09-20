import { useState, useEffect } from "react";
import Head from "next/head";
import { PremiumModal } from "../components/PremiumFeature";
import api from "../lib/api";
import { useToast } from "../lib/toast";
import { useAuth } from "../contexts/AuthContext";

/* -------------------------------- Mobile Metric Card -------------------------------- */
function MobileMetricCard({ title, value, subtitle, trend, icon, color = "blue" }) {
  const colorClasses = {
    blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    green: "bg-green-500/20 text-green-400 border-green-500/30",
    yellow: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    red: "bg-red-500/20 text-red-400 border-red-500/30",
    purple: "bg-purple-500/20 text-purple-400 border-purple-500/30"
  };

  return (
    <div className={`mobile-card ${colorClasses[color]} border-2`}>
      <div className="mobile-flex-between">
        <div>
          <p className="mobile-caption opacity-80 mb-1">{title}</p>
          <p className="mobile-title text-white">{value}</p>
          {subtitle && (
            <p className="mobile-caption opacity-60 mt-1">{subtitle}</p>
          )}
        </div>
        <div className="text-2xl opacity-80">
          {icon}
        </div>
      </div>
      {trend && (
        <div className="mt-3 pt-3 border-t border-current opacity-30">
          <div className={`flex items-center text-xs ${trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-gray-400'}`}>
            {trend > 0 ? (
              <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
              </svg>
            ) : trend < 0 ? (
              <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10h10" />
              </svg>
            ) : null}
            <span>{Math.abs(trend)}% vs last period</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------- Mobile Chart Card -------------------------------- */
function MobileChartCard({ title, data, type = "bar", color = "blue" }) {
  const [expanded, setExpanded] = useState(false);
  
  const renderSimpleChart = () => {
    if (!data || data.length === 0) {
      return (
        <div className="mobile-flex-center py-8">
          <p className="mobile-body text-gray-500">No data available</p>
        </div>
      );
    }

    const maxValue = Math.max(...data.map(d => d.value));
    
    return (
      <div className="space-y-3">
        {data.slice(0, expanded ? data.length : 5).map((item, index) => (
          <div key={index} className="space-y-2">
            <div className="mobile-flex-between">
              <span className="mobile-caption text-gray-300 truncate mr-2">
                {item.label}
              </span>
              <span className="mobile-caption text-blue-400 font-medium">
                {item.value}
              </span>
            </div>
            <div className="w-full bg-gray-700/30 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))}
        {data.length > 5 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full text-blue-400 text-sm py-2 hover:text-blue-300"
          >
            {expanded ? 'Show less' : `Show ${data.length - 5} more`}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="mobile-card bg-gray-800/30 border border-gray-700/50">
      <h3 className="mobile-subtitle text-white mb-4">{title}</h3>
      {renderSimpleChart()}
    </div>
  );
}

/* -------------------------------- Overview Section -------------------------------- */
function MobileOverviewSection({ analytics }) {
  const overview = analytics?.overview || {};
  
  return (
    <div className="space-y-4">
      <h2 className="mobile-title">Overview</h2>
      <div className="mobile-grid-2">
        <MobileMetricCard
          title="Total Applications"
          value={overview.total_applications || 0}
          subtitle="All time"
          trend={overview.applications_trend}
          icon="📝"
          color="blue"
        />
        <MobileMetricCard
          title="Response Rate"
          value={`${overview.response_rate || 0}%`}
          subtitle="Companies responded"
          trend={overview.response_trend}
          icon="📈"
          color="green"
        />
        <MobileMetricCard
          title="Interviews"
          value={overview.total_interviews || 0}
          subtitle="Scheduled"
          trend={overview.interview_trend}
          icon="🎯"
          color="purple"
        />
        <MobileMetricCard
          title="Offers"
          value={overview.total_offers || 0}
          subtitle="Received"
          trend={overview.offer_trend}
          icon="🎉"
          color="yellow"
        />
      </div>
      
      {analytics.monthly_progress && (
        <MobileChartCard
          title="Monthly Application Progress"
          data={analytics.monthly_progress}
          type="bar"
        />
      )}
    </div>
  );
}

/* -------------------------------- Applications Section -------------------------------- */
function MobileApplicationsSection({ analytics }) {
  const apps = analytics?.applications || {};
  
  return (
    <div className="space-y-4">
      <h2 className="mobile-title">Application Analytics</h2>
      
      <div className="mobile-grid-2">
        <MobileMetricCard
          title="This Month"
          value={apps.this_month || 0}
          subtitle="Applications sent"
          icon="📅"
          color="blue"
        />
        <MobileMetricCard
          title="Average/Week"
          value={apps.weekly_average || 0}
          subtitle="Applications"
          icon="📊"
          color="green"
        />
      </div>

      <div className="space-y-4">
        {apps.by_status && (
          <MobileChartCard
            title="Applications by Status"
            data={apps.by_status}
          />
        )}
        
        {apps.by_company_size && (
          <MobileChartCard
            title="Applications by Company Size"
            data={apps.by_company_size}
          />
        )}
        
        {apps.top_job_sources && (
          <MobileChartCard
            title="Top Job Sources"
            data={apps.top_job_sources}
          />
        )}
      </div>
    </div>
  );
}

/* -------------------------------- Companies Section -------------------------------- */
function MobileCompaniesSection({ analytics }) {
  const companies = analytics?.companies || {};
  
  return (
    <div className="space-y-4">
      <h2 className="mobile-title">Company Insights</h2>
      
      <div className="mobile-grid-2">
        <MobileMetricCard
          title="Companies Applied"
          value={companies.total_companies || 0}
          subtitle="Unique companies"
          icon="🏢"
          color="blue"
        />
        <MobileMetricCard
          title="Avg Response Time"
          value={`${companies.avg_response_time || 0} days`}
          subtitle="Company response"
          icon="⏱️"
          color="yellow"
        />
      </div>

      <div className="space-y-4">
        {companies.top_companies && (
          <MobileChartCard
            title="Most Applied Companies"
            data={companies.top_companies}
          />
        )}
        
        {companies.by_industry && (
          <MobileChartCard
            title="Applications by Industry"
            data={companies.by_industry}
          />
        )}
        
        {companies.response_rates && (
          <MobileChartCard
            title="Response Rates by Company Size"
            data={companies.response_rates}
          />
        )}
      </div>
    </div>
  );
}

/* -------------------------------- Time Range Selector -------------------------------- */
function MobileTimeRangeSelector({ value, onChange, options }) {
  return (
    <div className="mobile-card bg-gray-800/30 border border-gray-700/50">
      <div className="grid grid-cols-3 gap-2">
        {options.map(option => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`mobile-btn text-sm transition-colors ${
              value === option.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------- Main Analytics Page -------------------------------- */
export default function AnalyticsPage() {
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [timeRange, setTimeRange] = useState('6m');
  const [selectedMetric, setSelectedMetric] = useState('overview');
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const toast = useToast();

  const timeRangeOptions = [
    { value: '1m', label: '1M' },
    { value: '3m', label: '3M' },
    { value: '6m', label: '6M' },
    { value: '1y', label: '1Y' },
    { value: 'all', label: 'All' }
  ];

  const metricTabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'applications', label: 'Apps', icon: '📝' },
    { id: 'companies', label: 'Companies', icon: '🏢' },
  ];

  useEffect(() => {
    checkPremiumStatus();
  }, [isAuthenticated]);

  useEffect(() => {
    if (isPremium) {
      loadAnalytics();
    }
  }, [timeRange, isPremium]);

  async function checkPremiumStatus() {
    try {
      if (isAuthenticated) {
        const response = await fetch('/api/user/premium-status', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setIsPremium(data.isPremium);
        }
      } else {
        setIsPremium(false);
      }
    } catch (error) {
      console.error('Premium status check failed:', error);
      setIsPremium(false);
    } finally {
      setLoading(false);
    }
  }

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
        toast.success('PDF report downloaded');
      } else if (format === 'csv') {
        await api.exportAnalyticsCSV(timeRange);
        toast.success('CSV data exported');
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast.error(`Failed to export ${format.toUpperCase()}`);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="mobile-body text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // Premium gate
  if (!isPremium) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Head>
          <title>Analytics - Applytide</title>
        </Head>
        
        <div className="mobile-container">
          <div className="mobile-space-xl">
            <div className="mobile-card bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-500/30 text-center">
              <div className="mobile-flex-center mobile-space-lg">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              
              <h2 className="mobile-title text-white mb-3">Analytics Dashboard</h2>
              <p className="mobile-body text-purple-200 mb-6">
                Unlock powerful insights about your job search progress and performance metrics.
              </p>
              
              <div className="space-y-3 mb-8 text-left">
                {[
                  'Application success rates',
                  'Interview performance trends', 
                  'Company response patterns',
                  'Timeline analytics',
                  'Export detailed reports'
                ].map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="mobile-body text-purple-100">{feature}</span>
                  </div>
                ))}
              </div>
              
              <button
                onClick={() => setShowPremiumModal(true)}
                className="w-full mobile-btn bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold"
              >
                Upgrade to Pro
              </button>
            </div>
          </div>
        </div>

        <PremiumModal 
          isOpen={showPremiumModal} 
          onClose={() => setShowPremiumModal(false)} 
          feature="Analytics Dashboard" 
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Head>
        <title>Analytics - Applytide</title>
      </Head>

      <div className="mobile-container">
        {/* Header */}
        <div className="mobile-space-xl">
          <h1 className="mobile-title">Analytics</h1>
          <p className="mobile-body text-gray-400">
            Track your job search progress and insights
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="mobile-space-lg">
          <MobileTimeRangeSelector
            value={timeRange}
            onChange={setTimeRange}
            options={timeRangeOptions}
          />
        </div>

        {/* Metric Tabs */}
        <div className="mobile-space-lg">
          <div className="flex space-x-2 overflow-x-auto">
            {metricTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedMetric(tab.id)}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  selectedMetric === tab.id 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Export Actions */}
        <div className="mobile-grid-2 mobile-space-lg">
          <button
            onClick={() => exportReport('csv')}
            className="mobile-btn bg-gray-600 hover:bg-gray-700 text-white"
          >
            Export CSV
          </button>
          <button
            onClick={() => exportReport('pdf')}
            className="mobile-btn bg-gray-600 hover:bg-gray-700 text-white"
          >
            Export PDF
          </button>
        </div>

        {/* Analytics Content */}
        {analytics && (
          <div className="mobile-space-xl">
            {selectedMetric === 'overview' && (
              <MobileOverviewSection analytics={analytics} />
            )}

            {selectedMetric === 'applications' && (
              <MobileApplicationsSection analytics={analytics} />
            )}

            {selectedMetric === 'companies' && (
              <MobileCompaniesSection analytics={analytics} />
            )}

            {loading && (
              <div className="mobile-flex-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-3 mobile-body text-gray-400">Updating...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}