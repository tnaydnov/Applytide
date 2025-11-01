import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { toast } from '../lib/toast';
import WelcomeModal from '../components/WelcomeModal';
import {
  Sparkles, TrendingUp, Target, Award, Zap, FileText, 
  Bell, BarChart3, Calendar, ArrowRight, Clock, AlertCircle,
  CheckCircle2, Briefcase, Users, ChevronRight, Settings
} from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [applications, setApplications] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [insights, setInsights] = useState([]);
  const [weeklyGoal, setWeeklyGoal] = useState(5);
  const [loading, setLoading] = useState(true);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showGoalMenu, setShowGoalMenu] = useState(false);
  const [customGoalInput, setCustomGoalInput] = useState('');

  useEffect(() => {
    if (user) {
      console.log('Dashboard - User loaded:', {
        has_seen_welcome_modal: user.has_seen_welcome_modal,
        has_dismissed_extension_banner: user.has_dismissed_extension_banner
      });
      
      if (!user.has_seen_welcome_modal) {
        console.log('Dashboard - Showing welcome modal');
        setShowWelcomeModal(true);
      }
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [appsRes, metricsRes, insightsRes] = await Promise.all([
        api.getApplicationCards(),
        api.getMetrics(),
        api.getDashboardInsights()
      ]);
      
      setApplications(appsRes.applications || []);
      setMetrics(metricsRes || {});
      setInsights(insightsRes.insights || []);
      setWeeklyGoal(insightsRes.weekly_goal || 5);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseWelcome = () => {
    setShowWelcomeModal(false);
    // Note: Don't refresh user here - WelcomeModal handles backend updates when needed
  };

  const updateWeeklyGoal = async (newGoal) => {
    try {
      setWeeklyGoal(newGoal);
      setShowGoalMenu(false);
      setCustomGoalInput('');
      // Wrap the value in an object since the API expects preference_value to be a dict
      await api.updatePreference('weekly_goal', { value: newGoal });
      toast.success(`Weekly goal updated to ${newGoal} applications`);
    } catch (err) {
      console.error('Failed to update weekly goal:', err);
      toast.error('Failed to update weekly goal');
    }
  };

  const handleCustomGoalSubmit = (e) => {
    e.preventDefault();
    const value = parseInt(customGoalInput, 10);
    if (value > 0 && value <= 100) {
      updateWeeklyGoal(value);
    } else {
      toast.error('Please enter a number between 1 and 100');
    }
  };

  // Calculate metrics
  const totalApps = metrics.total_applications || 0;
  const statusCounts = metrics.applications_by_status || {};
  const thisWeekApps = applications.filter(app => {
    const created = new Date(app.created_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return created >= weekAgo;
  }).length;

  const inProgressCount = Object.entries(statusCounts)
    .filter(([status]) => !['Rejected', 'Withdrawn', 'Offer Accepted', 'Offer Declined'].includes(status))
    .reduce((sum, [, count]) => sum + count, 0);

  const responseRate = totalApps > 0 
    ? Math.round(((totalApps - (statusCounts['Applied'] || 0)) / totalApps) * 100) 
    : 0;

  const offerCount = (statusCounts['Offer'] || 0) + (statusCounts['Offer Accepted'] || 0);

  const weeklyProgress = weeklyGoal > 0 ? Math.min((thisWeekApps / weeklyGoal) * 100, 100) : 0;

  // Get recent applications (last 3)
  const recentApps = applications.slice(0, 3);

  // Insight type styling
  const getInsightStyle = (type) => {
    switch (type) {
      case 'warning':
        return {
          bg: 'bg-gradient-to-br from-amber-500/10 to-orange-500/10',
          border: 'border-amber-500/30',
          icon: 'text-amber-400',
          IconComponent: AlertCircle
        };
      case 'success':
        return {
          bg: 'bg-gradient-to-br from-emerald-500/10 to-green-500/10',
          border: 'border-emerald-500/30',
          icon: 'text-emerald-400',
          IconComponent: CheckCircle2
        };
      case 'tip':
        return {
          bg: 'bg-gradient-to-br from-blue-500/10 to-cyan-500/10',
          border: 'border-blue-500/30',
          icon: 'text-blue-400',
          IconComponent: Sparkles
        };
      default:
        return {
          bg: 'bg-gradient-to-br from-slate-500/10 to-slate-600/10',
          border: 'border-slate-500/30',
          icon: 'text-slate-400',
          IconComponent: Sparkles
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
          <p className="mt-4 text-slate-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <WelcomeModal isOpen={showWelcomeModal} onClose={handleCloseWelcome} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header with greeting */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-blue-400" />
              Welcome back{user?.first_name ? `, ${user.first_name}` : ''}!
            </h1>
            <p className="text-slate-400 mt-1">Here's your job search progress</p>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowGoalMenu(!showGoalMenu)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-blue-500/50 hover:bg-slate-800 transition-all text-slate-300 hover:text-white"
            >
              <Target className="h-4 w-4" />
              <span className="text-sm">Weekly Goal: {weeklyGoal}</span>
            </button>

            {showGoalMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                <div className="p-3 border-b border-slate-700">
                  <p className="text-xs text-slate-400 font-medium mb-2">Set your weekly goal</p>
                  <form onSubmit={handleCustomGoalSubmit} className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={customGoalInput}
                      onChange={(e) => setCustomGoalInput(e.target.value)}
                      placeholder="Custom"
                      className="flex-1 px-3 py-1.5 text-sm bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                    >
                      Set
                    </button>
                  </form>
                </div>
                <div className="py-1">
                  <p className="px-4 py-2 text-xs text-slate-500">Quick presets:</p>
                  {[3, 5, 7, 10, 15, 20].map((goal) => (
                    <button
                      key={goal}
                      onClick={() => updateWeeklyGoal(goal)}
                      className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                        weeklyGoal === goal
                          ? 'bg-blue-500/20 text-blue-400 font-medium'
                          : 'text-slate-300 hover:bg-slate-700/50'
                      }`}
                    >
                      {goal} applications/week
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AI Insights Bar - REAL INSIGHTS! */}
        {insights.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
              <Sparkles className="h-4 w-4 text-blue-400" />
              <span className="font-medium">AI Insights</span>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {insights.map((insight, idx) => {
                const style = getInsightStyle(insight.type);
                const Icon = style.IconComponent;
                
                return (
                  <div
                    key={idx}
                    className={`${style.bg} ${style.border} border backdrop-blur-sm rounded-xl p-4 flex items-center justify-between group hover:scale-[1.02] transition-all cursor-pointer`}
                    onClick={() => insight.action && router.push(insight.action)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`${style.icon} p-2 rounded-lg bg-slate-800/50`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="text-slate-200 text-sm font-medium">{insight.text}</p>
                    </div>
                    
                    {insight.action && (
                      <ArrowRight className="h-5 w-5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Smart Metrics Grid - 4 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* This Week Progress */}
          <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 hover:border-blue-500/50 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30">
                <Target className="h-6 w-6 text-blue-400" />
              </div>
              <span className="text-2xl font-bold text-white">{thisWeekApps}/{weeklyGoal}</span>
            </div>
            <h3 className="text-slate-400 text-sm font-medium mb-3">This Week</h3>
            <div className="w-full bg-slate-700/30 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                style={{ width: `${weeklyProgress}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {thisWeekApps >= weeklyGoal ? '🎉 Goal reached!' : `${weeklyGoal - thisWeekApps} more to goal`}
            </p>
          </div>

          {/* Active Pipeline */}
          <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 hover:border-purple-500/50 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
                <Briefcase className="h-6 w-6 text-purple-400" />
              </div>
              <span className="text-2xl font-bold text-white">{inProgressCount}</span>
            </div>
            <h3 className="text-slate-400 text-sm font-medium">Active Pipeline</h3>
            <p className="text-xs text-slate-500 mt-2">Applications in progress</p>
          </div>

          {/* Response Rate */}
          <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 hover:border-emerald-500/50 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30">
                <TrendingUp className="h-6 w-6 text-emerald-400" />
              </div>
              <span className="text-2xl font-bold text-white">{responseRate}%</span>
            </div>
            <h3 className="text-slate-400 text-sm font-medium">Response Rate</h3>
            <p className="text-xs text-slate-500 mt-2">Companies responding</p>
          </div>

          {/* Offers */}
          <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 hover:border-amber-500/50 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
                <Award className="h-6 w-6 text-amber-400" />
              </div>
              <span className="text-2xl font-bold text-white">{offerCount}</span>
            </div>
            <h3 className="text-slate-400 text-sm font-medium">Offers</h3>
            <p className="text-xs text-slate-500 mt-2">Job offers received</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Quick Actions + Pipeline */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Quick Actions */}
            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-400" />
                Quick Actions
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Track Jobs */}
                <ActionCard
                  icon={Briefcase}
                  title="Track Your Jobs"
                  subtitle="Organize saved jobs"
                  description="Manage and track job opportunities"
                  gradientClass="from-blue-500/20 to-cyan-500/20"
                  borderClass="border-blue-500/30"
                  onClick={() => router.push('/jobs')}
                />

                {/* Generate Cover Letter */}
                <ActionCard
                  icon={FileText}
                  title="Generate Cover Letter"
                  subtitle="AI-powered writing"
                  description="Create tailored cover letters"
                  gradientClass="from-purple-500/20 to-pink-500/20"
                  borderClass="border-purple-500/30"
                  href="/documents"
                />

                {/* Smart Follow-ups */}
                <ActionCard
                  icon={Bell}
                  title="Smart Follow-ups"
                  subtitle="Never miss a deadline"
                  description="Set intelligent reminders"
                  gradientClass="from-emerald-500/20 to-green-500/20"
                  borderClass="border-emerald-500/30"
                  onClick={() => router.push('/reminders')}
                />

                {/* Performance Insights */}
                <ActionCard
                  icon={BarChart3}
                  title="Performance Insights"
                  subtitle="Track your progress"
                  description="Detailed analytics & trends"
                  gradientClass="from-amber-500/20 to-orange-500/20"
                  borderClass="border-amber-500/30"
                  onClick={() => router.push('/analytics')}
                />
              </div>
            </div>

            {/* Active Pipeline */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-purple-400" />
                  Active Pipeline
                </h2>
                <button
                  onClick={() => router.push('/pipeline')}
                  className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  View all
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {recentApps.length > 0 ? (
                <div className="space-y-3">
                  {recentApps.map((app) => (
                    <div
                      key={app.id}
                      onClick={() => router.push(`/pipeline?app=${app.id}`)}
                      className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 hover:border-blue-500/50 transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-white font-medium group-hover:text-blue-400 transition-colors">
                            {app.job_title}
                          </h3>
                          <p className="text-slate-400 text-sm mt-1">{app.company_name}</p>
                          <div className="flex items-center gap-3 mt-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                              {app.status}
                            </span>
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(app.created_at)}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-sm border border-slate-700/50 rounded-xl p-8 text-center">
                  <Briefcase className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 mb-4">No applications yet</p>
                  <button
                    onClick={() => router.push('/jobs')}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition-all"
                  >
                    Track Jobs
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            
            {/* Weekly Progress Card */}
            <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-400" />
                Weekly Progress
              </h3>
              
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-white mb-2">
                  {thisWeekApps}<span className="text-2xl text-slate-500">/{weeklyGoal}</span>
                </div>
                <p className="text-slate-400 text-sm">Applications this week</p>
              </div>

              <div className="w-full bg-slate-700/30 rounded-full h-3 overflow-hidden mb-4">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 bg-[length:200%_100%] rounded-full transition-all duration-500 animate-shimmer"
                  style={{ width: `${weeklyProgress}%` }}
                />
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-700/50">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Total Applications</span>
                  <span className="text-white font-medium">{totalApps}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Active</span>
                  <span className="text-white font-medium">{inProgressCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Response Rate</span>
                  <span className="text-white font-medium">{responseRate}%</span>
                </div>
              </div>
            </div>

            {/* Smart Tools */}
            <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-400" />
                Smart Tools
              </h3>

              <div className="space-y-3">
                <ToolButton
                  icon={FileText}
                  label="Documents"
                  description="Resumes & cover letters"
                  onClick={() => router.push('/documents')}
                />
                <ToolButton
                  icon={Bell}
                  label="Reminders"
                  description="Follow-up notifications"
                  onClick={() => router.push('/reminders')}
                />
                <ToolButton
                  icon={BarChart3}
                  label="Analytics"
                  description="Track your performance"
                  onClick={() => router.push('/analytics')}
                  badge="PRO"
                />
              </div>
            </div>

            {/* Motivation Box */}
            <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-sm border border-blue-500/30 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
                  <Sparkles className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-white font-medium mb-1">Keep Going!</h4>
                  <p className="text-slate-300 text-sm">
                    {getMotivationMessage(totalApps, responseRate, inProgressCount)}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

// Action Card Component
function ActionCard({ icon: Icon, title, subtitle, description, gradientClass, borderClass, onClick, href }) {
  const router = useRouter();
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      router.push(href);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`bg-gradient-to-br ${gradientClass} backdrop-blur-sm border ${borderClass} rounded-xl p-5 hover:scale-[1.02] transition-all cursor-pointer group`}
    >
      <Icon className="h-8 w-8 text-white mb-3 group-hover:scale-110 transition-transform" />
      <h3 className="text-white font-bold text-lg mb-1">{title}</h3>
      <p className="text-slate-400 text-xs mb-2">{subtitle}</p>
      <p className="text-slate-300 text-sm">{description}</p>
    </div>
  );
}

// Tool Button Component
function ToolButton({ icon: Icon, label, description, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:border-blue-500/50 hover:bg-slate-800/50 transition-all group text-left"
    >
      <div className="p-2 rounded-lg bg-slate-700/50 group-hover:bg-blue-500/20 transition-colors">
        <Icon className="h-5 w-5 text-slate-400 group-hover:text-blue-400 transition-colors" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-white font-medium text-sm">{label}</span>
          {badge && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white">
              {badge}
            </span>
          )}
        </div>
        <span className="text-slate-400 text-xs">{description}</span>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
    </button>
  );
}

// Helper Functions
function getStatusColor(status) {
  const colors = {
    'Applied': 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    'Screening': 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
    'Interview': 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
    'Offer': 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    'Rejected': 'bg-red-500/20 text-red-400 border border-red-500/30',
  };
  return colors[status] || 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}

function getMotivationMessage(totalApps, responseRate, inProgress) {
  if (totalApps === 0) {
    return "Start your journey! Every great success begins with a single application.";
  }
  if (responseRate >= 30) {
    return "Outstanding! Your applications are getting great responses. Keep up the excellent work!";
  }
  if (inProgress > 5) {
    return "Wow! You've got a strong pipeline. Stay organized and follow up consistently.";
  }
  if (totalApps < 10) {
    return "You're building momentum! Keep applying to increase your chances of success.";
  }
  return "Stay consistent! Every application brings you closer to your dream job.";
}
