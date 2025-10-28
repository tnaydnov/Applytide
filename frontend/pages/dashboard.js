import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Button, Card, Input } from "../components/ui";
import { useToast } from '../lib/toast';
import AuthGuard from "../components/guards/AuthGuard";
import { usePremiumFeature } from '../components/PremiumFeature';
import WelcomeModal from '../components/WelcomeModal';
import Link from "next/link";
import Head from "next/head";

function ActionCard({
  icon = "✨",
  title,
  accentClass = "text-indigo-300",
  subtitle,
  description,
  gradientClass = "from-indigo-500/10 to-purple-500/10",
  borderClass = "border-indigo-500/20",
  href,
  onClick,
}) {
  const Inner = (
    <div
      className={`
        relative rounded-xl border ${borderClass}
        bg-gradient-to-r ${gradientClass}
        p-4 md:p-5 h-full
        transition-all
        hover:border-white/30 hover:shadow-lg
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
        flex flex-col
      `}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 grid place-items-center w-9 h-9 rounded-lg bg-white/10">
          <span className="text-xl">{icon}</span>
        </div>
        <div className="min-w-0">
          <h3 className={`font-semibold ${accentClass} leading-tight`}>{title}</h3>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
      </div>

      {description && (
        <p className="mt-3 text-sm text-slate-300 line-clamp-2">{description}</p>
      )}
    </div>
  );

  // Always render as a single block so spacing/hover are consistent
  if (href) {
    return (
      <Link href={href} className="block h-full">
        {Inner}
      </Link>
    );
  }
  return (
    <button onClick={onClick} className="block w-full text-left h-full">
      {Inner}
    </button>
  );
}

export default function Dashboard() {
  const [applications, setApplications] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('week'); // week, month, all
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const toast = useToast();
  const { checkPremium, PremiumModal } = usePremiumFeature();

  useEffect(() => {
    loadData();
    checkWelcomeModalStatus();
  }, []);

  async function checkWelcomeModalStatus() {
    try {
      const response = await api.get('/profile/welcome-modal-status');
      const hasSeenModal = response.has_seen_welcome_modal;
      
      // Only show modal if user hasn't seen it (backend decides this)
      if (!hasSeenModal) {
        // Show modal after a short delay for better UX
        setTimeout(() => {
          setShowWelcomeModal(true);
        }, 500);
      }
    } catch (error) {
      console.error('Failed to check welcome modal status:', error);
      // Fallback to localStorage if API fails
      const hasSeenWelcome = localStorage.getItem('welcomeModalDismissed');
      if (!hasSeenWelcome) {
        setTimeout(() => {
          setShowWelcomeModal(true);
        }, 500);
      }
    }
  }

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
          <p className="text-slate-300 text-xl font-medium">Loading your command center...</p>
        </div>
      </div>
    );
  }

  // Enhanced calculations
  const now = new Date();
  const weekStart = new Date(now.getTime() - (now.getDay() * 24 * 60 * 60 * 1000));
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const thisWeekApps = applications.filter(app => new Date(app.created_at) >= weekStart).length;
  const thisMonthApps = applications.filter(app => new Date(app.created_at) >= monthStart).length;
  const totalApps = metrics?.total_applications || 0;

  // Calculate response rate and other insights
  const responseRate = totalApps > 0 ? Math.round(((applications.filter(app =>
    ['interview', 'phone screen', 'tech', 'on-site', 'offer'].includes(app.status?.toLowerCase() || '')).length / totalApps) * 100)) : 0;

  const inProgressCount = Object.entries(metrics?.applications_by_status || {})
    .filter(([status]) => ['interview', 'phone screen', 'tech', 'on-site'].includes(status.toLowerCase()))
    .reduce((sum, [, count]) => sum + count, 0);

  const offerCount = metrics?.applications_by_status?.offer || 0;

  // Get recent applications (last 3 for better UX)
  const recentApps = applications
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 3);

  // Calculate weekly goal progress (assuming 5 apps per week goal)
  const weeklyGoal = 5;
  const weekProgress = Math.min((thisWeekApps / weeklyGoal) * 100, 100);

  return (
    <AuthGuard>
      <Head>
        <title>Command Center - Applytide</title>
      </Head>

      {/* Welcome Modal */}
      <WelcomeModal 
        isOpen={showWelcomeModal} 
        onClose={() => setShowWelcomeModal(false)} 
      />

      <div className="mobile-p-4 space-y-6 max-w-7xl mx-auto">
        {/* AI-Powered Header with Personalized Insights */}
        <div className="relative overflow-hidden rounded-xl mobile-m-2 bg-gradient-to-r from-indigo-900/40 via-purple-900/40 to-pink-900/40 p-4 md:p-8 border border-indigo-500/20">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10"></div>
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4 md:mb-6">
              <div className="mb-4 md:mb-0">
                <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}! 👋</h1>
                <p className="text-indigo-200 mobile-text-base md:text-lg">Your job search is gaining momentum</p>
              </div>
              <div className="text-left md:text-right">
                <div className="text-xl md:text-2xl font-bold text-white">{responseRate}%</div>
                <div className="text-indigo-200 text-sm">Response Rate</div>
              </div>
            </div>

            {/* AI Insights Bar */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl mobile-p-3 md:p-4 border border-white/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">AI</span>
                </div>
                <h3 className="text-white font-semibold mobile-text-base">Today's Intelligence</h3>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4 mobile-text-sm">
                <div className="text-indigo-100 p-2 bg-white/5 rounded-lg md:bg-transparent md:p-0">
                  <span className="text-indigo-300">💡 Insight:</span> Tuesday applications get 23% more responses
                </div>
                <div className="text-indigo-100 p-2 bg-white/5 rounded-lg md:bg-transparent md:p-0">
                  <span className="text-indigo-300">🎯 Trend:</span> Tech companies respond faster (avg. 3.2 days)
                </div>
                <div className="text-indigo-100 p-2 bg-white/5 rounded-lg md:bg-transparent md:p-0">
                  <span className="text-indigo-300">⚡ Action:</span> 2 follow-ups are overdue - send today
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Smart Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mobile-p-2 *:min-w-0">{/* Applications This Week with Progress */}
          <div className="glass-card glass-violet mobile-p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xl md:text-2xl">📊</div>
              <div className="text-xs text-slate-400">This Week</div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-2xl md:text-3xl font-bold text-indigo-400">{thisWeekApps}</div>
                <div className="text-slate-300 font-medium mobile-text-sm">Applications</div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Weekly Goal</span>
                  <span>{thisWeekApps}/{weeklyGoal}</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${weekProgress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Active Pipeline */}
          <div className="glass-card glass-amber mobile-p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-2xl">🔥</div>
              <div className="text-xs text-slate-400">Active</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-amber-400">{inProgressCount}</div>
              <div className="text-slate-300 font-medium">In Pipeline</div>
              <div className="text-xs text-slate-400 mt-1">
                {inProgressCount > 0 ? 'Interviews coming up!' : 'Ready to apply more'}
              </div>
            </div>
          </div>

          {/* Success Rate */}
          <div className="glass-card glass-rose mobile-p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xl md:text-2xl">🎯</div>
              <div className="text-xs text-slate-400">Performance</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-bold text-rose-400">{responseRate}%</div>
              <div className="text-slate-300 font-medium mobile-text-sm">Response Rate</div>
              <div className="text-xs text-slate-400 mt-1">
                {responseRate > 15 ? 'Above average!' : 'Room for improvement'}
              </div>
            </div>
          </div>

          {/* Offers & Success */}
          <div className="glass-card glass-cyan mobile-p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xl md:text-2xl">🏆</div>
              <div className="text-xs text-slate-400">Success</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-bold text-emerald-400">{offerCount}</div>
              <div className="text-slate-300 font-medium mobile-text-sm">Offers Received</div>
              <div className="text-xs text-slate-400 mt-1">
                {offerCount > 0 ? 'Congratulations!' : 'Keep pushing!'}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mobile-p-2">

          {/* Left Column - Pipeline & Activity */}
          <div className="lg:col-span-2 space-y-6">

            {/* AI-Powered Quick Actions */}
            <div className="glass-card glass-violet">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-[1fr]">
                <ActionCard
                  icon="🎯"
                  title="AI Job Matching"
                  subtitle="Find perfect matches"
                  description="3 new high-match positions found based on your profile"
                  gradientClass="from-indigo-500/10 to-purple-500/10"
                  borderClass="border-indigo-500/20"
                  accentClass="text-indigo-300"
                  onClick={() => checkPremium(() => { }, "AI Job Matching")}
                />

                <ActionCard
                  icon="✨"
                  title="Generate Cover Letter"
                  subtitle="AI-powered personalization"
                  description="Create tailored cover letters in seconds"
                  gradientClass="from-emerald-500/10 to-cyan-500/10"
                  borderClass="border-emerald-500/20"
                  accentClass="text-emerald-300"
                  href="/documents"
                />

                <ActionCard
                  icon="📧"
                  title="Smart Follow-ups"
                  subtitle="Automated reminders"
                  description="2 applications need follow-up this week"
                  gradientClass="from-amber-500/10 to-orange-500/10"
                  borderClass="border-amber-500/20"
                  accentClass="text-amber-300"
                  onClick={() => checkPremium(() => { }, "Follow-up Automation")}
                />

                <ActionCard
                  icon="📈"
                  title="Performance Insights"
                  subtitle="Track your progress"
                  description="Your response rate improved 12% this month"
                  gradientClass="from-rose-500/10 to-pink-500/10"
                  borderClass="border-rose-500/20"
                  accentClass="text-rose-300"
                  onClick={() => checkPremium(() => { }, "Analytics Dashboard")}
                />
              </div>
            </div>

            {/* Pipeline Overview */}
            <div className="glass-card glass-cyan">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-slate-200">Active Pipeline</h2>
                  <Link href="/pipeline">
                    <Button variant="outline" className="border-white/15 text-white/80 hover:bg-white/10 hover:text-white text-sm">
                      View Full Pipeline
                    </Button>
                  </Link>
                </div>

                {recentApps.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">�</div>
                    <h3 className="text-xl font-semibold text-slate-200 mb-2">Ready to launch your job search?</h3>
                    <p className="text-slate-400 mb-6">Add your first application to start tracking your progress</p>
                    <Link href="/jobs">
                      <Button className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-medium px-6 py-2">
                        Browse Jobs
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentApps.map((app, index) => (
                      <div key={app.id} className="bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 transition-all duration-200 hover:shadow-lg hover:border-slate-600/50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                {(app.job?.company_name || app.company_name || 'UK').slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <h3 className="font-semibold text-slate-100">
                                  {app.job?.title || app.job_title || 'Unknown Position'}
                                </h3>
                                <p className="text-sm text-slate-400">
                                  {app.job?.company_name || app.job?.company || app.company_name || 'Unknown Company'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              <span>Applied {new Date(app.created_at).toLocaleDateString()}</span>
                              <span>•</span>
                              <span>{Math.floor((Date.now() - new Date(app.created_at)) / (1000 * 60 * 60 * 24))} days ago</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex px-3 py-2 text-xs font-medium rounded-lg border ${app.status === 'offer' ? 'text-emerald-300 bg-emerald-300/15 border-emerald-300/25' :
                                app.status === 'interview' ? 'text-indigo-300 bg-indigo-300/15 border-indigo-300/25' :
                                  app.status === 'applied' ? 'text-amber-300 bg-amber-300/15 border-amber-300/25' :
                                    app.status === 'rejected' ? 'text-rose-300 bg-rose-300/15 border-rose-300/25' :
                                      'text-slate-300 bg-white/10 border-white/15'
                              }`}>
                              {(app.status || 'applied').charAt(0).toUpperCase() + (app.status || 'applied').slice(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Insights & Tools */}
          <div className="space-y-6">

            {/* Weekly Progress */}
            <div className="glass-card glass-violet">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-slate-200 mb-4">This Week's Progress</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-300">Applications</span>
                      <span className="text-indigo-400 font-medium">{thisWeekApps} / {weeklyGoal}</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-1000 shadow-lg shadow-indigo-500/20"
                        style={{ width: `${weekProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      {weekProgress >= 100 ? '🎉 Goal achieved!' :
                        weekProgress >= 80 ? '🔥 Almost there!' :
                          '� Keep pushing!'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <h4 className="text-sm font-medium text-slate-300 mb-3">Quick Stats</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Response Rate</span>
                        <span className="text-slate-300">{responseRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">In Pipeline</span>
                        <span className="text-slate-300">{inProgressCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">This Month</span>
                        <span className="text-slate-300">{thisMonthApps}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Smart Tools */}
            <div className="glass-card glass-amber">
              <div className="mobile-p-4 md:p-6">
                <h3 className="text-lg font-semibold text-slate-200 mb-4">Smart Tools</h3>
                <div className="grid grid-cols-1 gap-4">
                  <Link href="/documents">
                    <div className="flex items-center gap-3 mobile-p-3 md:p-4 bg-slate-800/30 hover:bg-slate-800/50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-slate-600/30">
                      <div className="text-xl">�</div>
                      <div>
                        <div className="text-sm font-medium text-slate-200">Documents</div>
                        <div className="text-xs text-slate-400">Manage resumes & cover letters</div>
                      </div>
                    </div>
                  </Link>

                  <Link href="/reminders">
                    <div className="flex items-center gap-3 mobile-p-3 md:p-4 bg-slate-800/30 hover:bg-slate-800/50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-slate-600/30">
                      <div className="text-xl">⏰</div>
                      <div>
                        <div className="text-sm font-medium text-slate-200">Reminders</div>
                        <div className="text-xs text-slate-400">Never miss a follow-up</div>
                      </div>
                    </div>
                  </Link>

                  <div
                    className="flex items-center gap-3 mobile-p-3 md:p-4 bg-slate-800/30 hover:bg-slate-800/50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-slate-600/30"
                    onClick={() => checkPremium(() => { }, "Advanced Analytics")}
                  >
                    <div className="text-xl">📊</div>
                    <div>
                      <div className="text-sm font-medium text-slate-200 flex items-center gap-2">
                        Analytics
                        <span className="px-1.5 py-0.5 text-xs bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-md">PRO</span>
                      </div>
                      <div className="text-xs text-slate-400">Deep performance insights</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Motivation Box */}
            <div className="glass-card bg-gradient-to-br from-emerald-900/20 to-cyan-900/20 border-emerald-500/20">
              <div className="p-6 text-center">
                <div className="text-3xl mb-3">🌟</div>
                <h3 className="text-lg font-semibold text-emerald-300 mb-2">You're doing great!</h3>
                <p className="text-sm text-slate-300">
                  {totalApps === 0 ? "Every expert was once a beginner. Start your journey today!" :
                    responseRate > 20 ? `${responseRate}% response rate is excellent! Keep it up!` :
                      inProgressCount > 0 ? `${inProgressCount} active opportunities - you're in the game!` :
                        "Consistency is key. Every application gets you closer to your goal!"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <PremiumModal feature="advanced dashboard features" />
      </div>
    </AuthGuard>
  );
}
