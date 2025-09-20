import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useToast } from '../lib/toast';
import AuthGuard from "../components/AuthGuard";
import Link from "next/link";
import Head from "next/head";

/* -------------------------------- Mobile Metric Card -------------------------------- */
function MobileMetricCard({ title, value, subtitle, icon, color = "blue", onClick }) {
  const colorClasses = {
    blue: "bg-blue-500/20 border-blue-500/30 text-blue-400",
    green: "bg-green-500/20 border-green-500/30 text-green-400",
    yellow: "bg-yellow-500/20 border-yellow-500/30 text-yellow-400",
    purple: "bg-purple-500/20 border-purple-500/30 text-purple-400",
    red: "bg-red-500/20 border-red-500/30 text-red-400"
  };

  const CardComponent = onClick ? "button" : "div";

  return (
    <CardComponent
      onClick={onClick}
      className={`mobile-card ${colorClasses[color]} border-2 ${onClick ? 'hover:scale-105 active:scale-95' : ''} transition-all duration-200`}
    >
      <div className="mobile-flex-between">
        <div className="text-left">
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
    </CardComponent>
  );
}

/* -------------------------------- Mobile Application Card -------------------------------- */
function MobileApplicationCard({ application }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'applied': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'interview': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'phone screen': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'tech': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'on-site': return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
      case 'offer': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'rejected': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <Link href={`/applications/${application.id}`}>
      <div className="mobile-card bg-gray-800/50 border border-gray-700/50 hover:border-blue-500/30 hover:bg-gray-800/70 transition-all duration-200 cursor-pointer">
        <div className="mobile-space-sm">
          <div className="mobile-flex-between mb-2">
            <h3 className="mobile-subtitle text-white truncate mr-2">
              {application.job_title}
            </h3>
            <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getStatusColor(application.status)}`}>
              {application.status || 'Applied'}
            </span>
          </div>
          
          <div className="mobile-flex-between">
            <p className="mobile-body text-blue-400 truncate mr-2">
              {application.company_name}
            </p>
            <span className="mobile-caption text-gray-500 flex-shrink-0">
              {formatDate(application.created_at)}
            </span>
          </div>
          
          {application.location && (
            <p className="mobile-caption text-gray-400 mt-1 flex items-center">
              <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              {application.location}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

/* -------------------------------- Mobile Progress Ring -------------------------------- */
function MobileProgressRing({ progress, size = 60, strokeWidth = 6, color = "#3B82F6" }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-gray-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700 ease-out"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-white">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
}

/* -------------------------------- Quick Actions -------------------------------- */
function QuickActions() {
  const actions = [
    { 
      title: "Add Application", 
      href: "/pipeline?action=add", 
      icon: "➕", 
      color: "blue",
      description: "Track new job"
    },
    { 
      title: "Job Search", 
      href: "/jobs", 
      icon: "🔍", 
      color: "green",
      description: "Find opportunities"
    },
    { 
      title: "Schedule", 
      href: "/calendar", 
      icon: "📅", 
      color: "purple",
      description: "View calendar"
    },
    { 
      title: "Analytics", 
      href: "/analytics", 
      icon: "📊", 
      color: "yellow",
      description: "Track progress"
    }
  ];

  return (
    <div className="mobile-grid-2">
      {actions.map((action, index) => (
        <Link key={index} href={action.href}>
          <div className={`mobile-card border-2 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer ${
            action.color === 'blue' ? 'bg-blue-500/20 border-blue-500/30' :
            action.color === 'green' ? 'bg-green-500/20 border-green-500/30' :
            action.color === 'purple' ? 'bg-purple-500/20 border-purple-500/30' :
            'bg-yellow-500/20 border-yellow-500/30'
          }`}>
            <div className="text-center">
              <div className="text-2xl mb-2">{action.icon}</div>
              <h3 className="mobile-subtitle text-white mb-1">{action.title}</h3>
              <p className="mobile-caption opacity-70">{action.description}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

/* -------------------------------- Main Dashboard -------------------------------- */
export default function MobileDashboard() {
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500/20 border-t-blue-500 mx-auto"></div>
          </div>
          <p className="mobile-body text-gray-400 mt-4">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Calculate metrics
  const now = new Date();
  const weekStart = new Date(now.getTime() - (now.getDay() * 24 * 60 * 60 * 1000));
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const thisWeekApps = applications.filter(app => new Date(app.created_at) >= weekStart).length;
  const thisMonthApps = applications.filter(app => new Date(app.created_at) >= monthStart).length;
  const totalApps = metrics?.total_applications || 0;

  const responseRate = totalApps > 0 ? Math.round(((applications.filter(app => 
    ['interview', 'phone screen', 'tech', 'on-site', 'offer'].includes(app.status?.toLowerCase() || '')).length / totalApps) * 100)) : 0;
  
  const inProgressCount = Object.entries(metrics?.applications_by_status || {})
    .filter(([status]) => ['interview', 'phone screen', 'tech', 'on-site'].includes(status.toLowerCase()))
    .reduce((sum, [, count]) => sum + count, 0);

  const offerCount = metrics?.applications_by_status?.offer || 0;
  
  const recentApps = applications
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 4);

  const weeklyGoal = 5;
  const weekProgress = Math.min((thisWeekApps / weeklyGoal) * 100, 100);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <AuthGuard>
      <Head>
        <title>Dashboard - Applytide</title>
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="mobile-container">
          {/* Header */}
          <div className="mobile-space-xl">
            <div className="mobile-card bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-2 border-blue-500/30">
              <div className="mobile-flex-between">
                <div>
                  <h1 className="mobile-title text-white">
                    {getGreeting()}! 👋
                  </h1>
                  <p className="mobile-body text-blue-200 opacity-80">
                    Your job search is gaining momentum
                  </p>
                </div>
                <div className="text-center">
                  <div className="mobile-title text-white">{responseRate}%</div>
                  <div className="mobile-caption text-blue-300">Response Rate</div>
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Progress */}
          <div className="mobile-space-lg">
            <div className="mobile-card bg-gray-800/30 border border-gray-700/50">
              <div className="mobile-flex-between">
                <div>
                  <h3 className="mobile-subtitle text-white mb-1">Weekly Goal</h3>
                  <p className="mobile-body text-gray-300">
                    {thisWeekApps} of {weeklyGoal} applications
                  </p>
                  <p className="mobile-caption text-gray-500 mt-1">
                    {weeklyGoal - thisWeekApps > 0 
                      ? `${weeklyGoal - thisWeekApps} more to reach goal`
                      : 'Goal achieved! 🎉'
                    }
                  </p>
                </div>
                <MobileProgressRing progress={weekProgress} />
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="mobile-space-lg">
            <h2 className="mobile-subtitle text-white mb-4">Overview</h2>
            <div className="mobile-grid-2">
              <MobileMetricCard
                title="Total Applied"
                value={totalApps}
                subtitle="All time"
                icon="📝"
                color="blue"
                onClick={() => window.location.href = '/pipeline'}
              />
              <MobileMetricCard
                title="In Progress"
                value={inProgressCount}
                subtitle="Active interviews"
                icon="🎯"
                color="purple"
                onClick={() => window.location.href = '/pipeline?status=interview'}
              />
              <MobileMetricCard
                title="This Month"
                value={thisMonthApps}
                subtitle="Applications sent"
                icon="📅"
                color="green"
              />
              <MobileMetricCard
                title="Offers"
                value={offerCount}
                subtitle="Received"
                icon="🎉"
                color="yellow"
                onClick={() => window.location.href = '/pipeline?status=offer'}
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mobile-space-lg">
            <h2 className="mobile-subtitle text-white mb-4">Quick Actions</h2>
            <QuickActions />
          </div>

          {/* Recent Applications */}
          <div className="mobile-space-xl">
            <div className="mobile-flex-between mb-4">
              <h2 className="mobile-subtitle text-white">Recent Applications</h2>
              <Link href="/pipeline">
                <span className="mobile-caption text-blue-400 hover:text-blue-300">
                  View all →
                </span>
              </Link>
            </div>

            {recentApps.length > 0 ? (
              <div className="space-y-3">
                {recentApps.map(app => (
                  <MobileApplicationCard key={app.id} application={app} />
                ))}
              </div>
            ) : (
              <div className="mobile-card bg-gray-800/30 border border-gray-700/50 text-center">
                <div className="mobile-flex-center mobile-space-md">
                  <svg className="w-12 h-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="mobile-subtitle text-gray-400 mb-2">No applications yet</h3>
                <p className="mobile-body text-gray-500 mb-4">
                  Start tracking your job applications to see them here
                </p>
                <Link href="/pipeline?action=add">
                  <button className="mobile-btn bg-blue-600 hover:bg-blue-700 text-white">
                    Add Your First Application
                  </button>
                </Link>
              </div>
            )}
          </div>

          {/* Motivation Section */}
          <div className="mobile-space-xl pb-8">
            <div className="mobile-card bg-gradient-to-r from-green-500/20 to-blue-500/20 border-2 border-green-500/30 text-center">
              <div className="mobile-space-md">
                <div className="text-3xl mb-2">💪</div>
                <h3 className="mobile-subtitle text-green-300 mb-2">Keep Going!</h3>
                <p className="mobile-body text-green-200">
                  {thisWeekApps === 0 
                    ? "Start strong this week - every application counts!"
                    : thisWeekApps >= weeklyGoal
                    ? "Amazing week! You've exceeded your goal 🚀"
                    : `You're doing great! ${weeklyGoal - thisWeekApps} more to hit your weekly goal.`
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}