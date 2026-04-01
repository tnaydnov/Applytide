/**
 * Dashboard Page - Complete Redesign
 * Professional layout that uses full screen width
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { logger } from "../../lib/logger";
import {
  TrendingUp,
  Send,
  Users,
  Briefcase,
  Trophy,
  Target,
  Calendar,
  FileText,
  Clock,
  ArrowRight,
  Sparkles,
  Bell,
  CheckCircle2,
  AlertCircle,
  Zap,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { dashboardApi } from "../../features/dashboard/api";
import { LoadingSpinner } from "../../components/shared/LoadingSpinner";
import { Button } from "../../components/ui/button";
import { Progress } from "../../components/ui/progress";
import { Badge } from "../../components/ui/badge";
import { PageBackground } from "../../components/background/PageBackground";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../../components/ui/sheet";
import { WeeklyGoalSelector } from "./components/WeeklyGoalSelector";
import { toast } from "sonner";
import { DashboardHelp } from "../../components/help/DashboardHelp";
import { DashboardAnnotations } from "./components/DashboardAnnotations";

import type {
  DashboardMetrics,
  DashboardInsights,
  ApplicationCard,
} from "../../features/dashboard/api";

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === "he";

  // State
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] =
    useState<DashboardMetrics | null>(null);
  const [insights, setInsights] =
    useState<DashboardInsights | null>(null);
  const [applications, setApplications] = useState<
    ApplicationCard[]
  >([]);
  const [weeklyGoal, setWeeklyGoal] = useState(5);
  const [showInsights, setShowInsights] = useState(false);
  const [showPageTour, setShowPageTour] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (user) {
      loadDashboardData().catch(() => {/* handled inside */});
    }
    return () => { cancelled = true; };

    async function loadDashboardData() {
      try {
        setLoading(true);

        const [metricsData, insightsData, appsData, goalData] =
          await Promise.all([
            dashboardApi.getMetrics(),
            dashboardApi.getInsights(),
            dashboardApi.getApplicationCards(),
            dashboardApi.getWeeklyGoal(),
          ]);

        if (cancelled) return;
        setMetrics(metricsData);
        setInsights(
          insightsData || { weekly_goal: 5, insights: [] },
        );
        setApplications(appsData || []);
        setWeeklyGoal(insightsData?.weekly_goal || goalData || 5);
      } catch (error) {
        if (cancelled) return;
        logger.error("Failed to load dashboard:", error);
        toast.error(
          isRTL
            ? "שגיאה בטעינת הדשבורד"
            : "Failed to load dashboard",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
  }, [user]);

  const handleGoalUpdate = async (newGoal: number) => {
    try {
      await dashboardApi.updateWeeklyGoal(newGoal);
      setWeeklyGoal(newGoal);
      toast.success(
        isRTL
          ? `יעד שבועי עודכן ל-${newGoal} בקשות`
          : `Weekly goal updated to ${newGoal} applications`,
      );
    } catch (error) {
      toast.error(
        isRTL ? "שגיאה בעדכון יעד" : "Failed to update goal",
      );
    }
  };

  if (loading) {
    return (
      <>
        <PageBackground />
        <div className="relative flex items-center justify-center min-h-screen">
          <LoadingSpinner size="lg" />
        </div>
      </>
    );
  }

  const firstName =
    user?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "there";
  const thisWeekApplications =
    metrics?.this_week_applications || 0;
  const goalProgress =
    weeklyGoal > 0
      ? (thisWeekApplications / weeklyGoal) * 100
      : 0;
  const totalApplications = metrics?.total_applications || 0;
  const responseRate = metrics?.response_rate || 0;
  const interviewCount = metrics?.interviews || 0;
  const offerCount = metrics?.offers || 0;

  // Recent activity — derived from real application cards
  const recentActivity = applications.slice(0, 3).map((app, i) => {
    const statusIcon = app.status === 'Interview' ? Users
      : app.status === 'Offer' ? Trophy
      : app.status === 'Rejected' ? AlertCircle
      : Send;
    const statusBg = app.status === 'Interview' ? 'bg-[#A855F7]'
      : app.status === 'Offer' ? 'bg-[#10B981]'
      : app.status === 'Rejected' ? 'bg-red-500'
      : 'bg-[#3B82F6]';
    const timeAgo = app.created_at
      ? (() => {
          const diff = Date.now() - new Date(app.created_at).getTime();
          const hours = Math.floor(diff / 3600000);
          if (hours < 1) return isRTL ? 'עכשיו' : 'Just now';
          if (hours < 24) return isRTL ? `לפני ${hours} שעות` : `${hours}h ago`;
          const days = Math.floor(hours / 24);
          return isRTL ? `לפני ${days} ימים` : `${days}d ago`;
        })()
      : '';
    return {
      id: i + 1,
      title: app.status || (isRTL ? 'הגשת מועמדות' : 'Applied'),
      description: `${app.job_title || app.job?.title || ''}${app.company_name || app.job?.company_name ? (isRTL ? ' ב-' : ' at ') + (app.company_name || app.job?.company_name) : ''}`,
      time: timeAgo,
      icon: statusIcon,
      iconBg: statusBg,
    };
  });

  // Upcoming events — derived from applications with Interview status
  const upcomingEvents = applications
    .filter((a) => a.status === 'Interview')
    .slice(0, 3)
    .map((app, i) => ({
      id: i + 1,
      title: `${app.job_title || app.job?.title || (isRTL ? 'ראיון' : 'Interview')}${app.company_name || app.job?.company_name ? ' - ' + (app.company_name || app.job?.company_name) : ''}`,
      date: app.updated_at
        ? new Date(app.updated_at).toLocaleDateString(isRTL ? 'he-IL' : 'en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit' })
        : isRTL ? 'בקרוב' : 'Upcoming',
    }));

  return (
    <>
      <PageBackground />
      <div
        className="relative min-h-screen"
        dir={isRTL ? "rtl" : "ltr"}
      >
        {/* Comprehensive Dashboard Guide */}
        <DashboardHelp 
          isRTL={isRTL} 
          onShowVisualGuide={() => setShowPageTour(true)}
        />

        {/* Page Tour - Interactive Hover Guide */}
        <DashboardAnnotations
          isActive={showPageTour}
          onClose={() => setShowPageTour(false)}
          isRTL={isRTL}
        />

        {/* AI Insights - Floating Badge */}
        {insights?.insights && insights.insights.length > 0 && (
          <Sheet
            open={showInsights}
            onOpenChange={setShowInsights}
          >
            <SheetTrigger asChild>
              <Button
                className="fixed bottom-20 sm:bottom-6 z-50 rounded-full shadow-lg transition-transform hover:scale-110 bg-[#A855F7] hover:bg-[#9333EA]"
                style={{
                  [isRTL ? "right" : "left"]: "1rem",
                }}
              >
                <Sparkles className="h-5 w-5 mr-2" />
                <span className="hidden sm:inline">
                  {isRTL ? "תובנות AI" : "AI Insights"}
                </span>
                <Badge className="ml-2 bg-white/20">
                  {insights.insights.length}
                </Badge>
              </Button>
            </SheetTrigger>
            <SheetContent
              side={isRTL ? "right" : "left"}
              className="w-[400px] sm:w-[540px]"
            >
              <SheetHeader className={isRTL ? "text-right" : "text-left"}>
                <SheetTitle className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                  <Sparkles className="h-5 w-5 text-[#A855F7]" />
                  {isRTL
                    ? "תובנות מבוססות AI"
                    : "AI-Powered Insights"}
                </SheetTitle>
                <SheetDescription className={isRTL ? "text-right" : "text-left"}>
                  {isRTL
                    ? "המלצות מותאמות אישית לשיפור חיפוש העבודה שלכם"
                    : "Personalized recommendations to improve your job search"}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                {insights.insights.map((insight, index) => (
                  <motion.div
                    key={`insight-${insight.type}-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 rounded-xl bg-white dark:bg-[#383e4e] border border-gray-200 dark:border-[#b6bac5]/20"
                  >
                    <div className={`flex items-start gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#A855F7]/20 flex items-center justify-center">
                        {insight.type === "warning" ? (
                          <AlertCircle className="h-4 w-4 text-[#A855F7]" />
                        ) : insight.type === "success" ? (
                          <CheckCircle2 className="h-4 w-4 text-[#A855F7]" />
                        ) : (
                          <Zap className="h-4 w-4 text-[#A855F7]" />
                        )}
                      </div>
                      <p className={`text-sm flex-1 leading-relaxed ${isRTL ? "text-right" : "text-left"}`}>
                        {insight.text}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        )}

        {/* Full Width Dashboard - Grid Layout */}
        <div className="w-full min-h-screen p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12">
          {/* Top Row: Greeting + Weekly Goal */}
          <div className="flex flex-col lg:flex-row items-start justify-between gap-6 mb-6 sm:mb-8 lg:mb-10">
            {/* Greeting */}
            <div className={isRTL ? "text-right" : "text-left"}>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl mb-2">
                {isRTL
                  ? `👋 שלום, ${firstName}`
                  : `Hello, ${firstName} 👋`}
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground">
                {isRTL
                  ? "הנה סקירה של חיפוש העבודה שלכם"
                  : "Here's an overview of your job search"}
              </p>
            </div>

            {/* Weekly Goal - Compact Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full lg:w-[320px] p-5 sm:p-6 rounded-2xl bg-[#9F5F80] text-white shadow-lg"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  <span className="text-sm opacity-90">
                    {isRTL ? "יעד שבועי" : "Weekly Goal"}
                  </span>
                </div>
                <WeeklyGoalSelector
                  weeklyGoal={weeklyGoal}
                  onUpdate={handleGoalUpdate}
                  isRTL={isRTL}
                />
              </div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-4xl font-bold">
                  {thisWeekApplications}
                </span>
                <span className="text-xl opacity-75">
                  / {weeklyGoal}
                </span>
              </div>
              <Progress
                value={goalProgress}
                className="h-2.5 bg-white/20 mb-2"
              />
              <p className="text-sm opacity-90">
                {goalProgress >= 100
                  ? isRTL
                    ? "🎉 השגתם את היעד!"
                    : "🎉 Goal achieved!"
                  : isRTL
                    ? `עוד ${weeklyGoal - thisWeekApplications} לסיום`
                    : `${weeklyGoal - thisWeekApplications} more to go`}
              </p>
            </motion.div>
          </div>

          {/* Metrics Row - 4 Solid Color Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8 lg:mb-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              onClick={() => navigate("/pipeline")}
              className="group relative p-8 rounded-2xl bg-[#10B981] text-white shadow-lg hover:shadow-xl transition-all cursor-pointer overflow-hidden"
              data-tour="stat-job-offers"
            >
              <div className={`relative z-10 ${isRTL ? "text-right" : "text-left"}`}>
                <div className={`flex items-center ${isRTL ? "flex-row-reverse" : "flex-row"} justify-between mb-6`}>
                  <Trophy className="h-8 w-8" />
                  <ArrowRight className={`h-6 w-6 opacity-0 group-hover:opacity-100 transition-all ${isRTL ? "rotate-180 group-hover:-translate-x-1" : "group-hover:translate-x-1"}`} />
                </div>
                <div className="text-sm mb-2 opacity-90">
                  {isRTL ? "הצעות עבודה" : "Job Offers"}
                </div>
                <div className="text-5xl font-bold">
                  {offerCount}
                </div>
              </div>
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              onClick={() => navigate("/analytics")}
              className="group relative p-8 rounded-2xl bg-[#A855F7] text-white shadow-lg hover:shadow-xl transition-all cursor-pointer overflow-hidden"
              data-tour="stat-response-rate"
            >
              <div className={`relative z-10 ${isRTL ? "text-right" : "text-left"}`}>
                <div className={`flex items-center ${isRTL ? "flex-row-reverse" : "flex-row"} justify-between mb-6`}>
                  <TrendingUp className="h-8 w-8" />
                  <ArrowRight className={`h-6 w-6 opacity-0 group-hover:opacity-100 transition-all ${isRTL ? "rotate-180 group-hover:-translate-x-1" : "group-hover:translate-x-1"}`} />
                </div>
                <div className="text-sm mb-2 opacity-90">
                  {isRTL ? "שיעור תגובה" : "Response Rate"}
                </div>
                <div className="text-5xl font-bold">
                  {responseRate}%
                </div>
              </div>
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onClick={() => navigate("/reminders")}
              className="group relative p-8 rounded-2xl bg-[#F97316] text-white shadow-lg hover:shadow-xl transition-all cursor-pointer overflow-hidden"
              data-tour="stat-interviews"
            >
              <div className={`relative z-10 ${isRTL ? "text-right" : "text-left"}`}>
                <div className={`flex items-center ${isRTL ? "flex-row-reverse" : "flex-row"} justify-between mb-6`}>
                  <Users className="h-8 w-8" />
                  <ArrowRight className={`h-6 w-6 opacity-0 group-hover:opacity-100 transition-all ${isRTL ? "rotate-180 group-hover:-translate-x-1" : "group-hover:translate-x-1"}`} />
                </div>
                <div className="text-sm mb-2 opacity-90">
                  {isRTL ? "ראיונות" : "Interviews"}
                </div>
                <div className="text-5xl font-bold">
                  {interviewCount}
                </div>
              </div>
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              onClick={() => navigate("/pipeline")}
              className="group relative p-8 rounded-2xl bg-[#3B82F6] text-white shadow-lg hover:shadow-xl transition-all cursor-pointer overflow-hidden"
              data-tour="stat-total-applications"
            >
              <div className={`relative z-10 ${isRTL ? "text-right" : "text-left"}`}>
                <div className={`flex items-center ${isRTL ? "flex-row-reverse" : "flex-row"} justify-between mb-6`}>
                  <Send className="h-8 w-8" />
                  <ArrowRight className={`h-6 w-6 opacity-0 group-hover:opacity-100 transition-all ${isRTL ? "rotate-180 group-hover:-translate-x-1" : "group-hover:translate-x-1"}`} />
                </div>
                <div className="text-sm mb-2 opacity-90">
                  {isRTL
                    ? 'סה"כ מועמדויות'
                    : "Total Applications"}
                </div>
                <div className="text-5xl font-bold">
                  {totalApplications}
                </div>
              </div>
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors" />
            </motion.div>
          </div>

          {/* Middle Row: Recent Activity + Upcoming */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8 lg:mb-10">
            {/* Recent Activity */}
            <div className="bg-white/50 dark:bg-[#383e4e]/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 dark:border-[#b6bac5]/10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Clock className="h-6 w-6 text-[#9F5F80]" />
                  <h2 className="text-2xl font-semibold">
                    {isRTL
                      ? "פעילות אחרונה"
                      : "Recent Activity"}
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/pipeline")}
                >
                  {isRTL ? "הצג הכל" : "View all"}
                </Button>
              </div>

              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-[#383e4e]/50 border border-gray-200 dark:border-[#b6bac5]/20 hover:border-[#9F5F80]/30 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div
                      className={`p-3 rounded-xl ${activity.iconBg} flex-shrink-0`}
                    >
                      <activity.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium mb-1">
                        {activity.title}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {activity.description}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-nowrap">
                      {activity.time}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Upcoming Events */}
            <div className="bg-white/50 dark:bg-[#383e4e]/30 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 dark:border-[#b6bac5]/10">
              <div className="flex items-center gap-3 mb-6">
                <Calendar className="h-6 w-6 text-[#9F5F80]" />
                <h2 className="text-2xl font-semibold">
                  {isRTL ? "אירועים קרובים" : "Upcoming"}
                </h2>
              </div>

              <div className="space-y-4 mb-4">
                {upcomingEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-4 p-4 rounded-xl bg-[#9F5F80]/5 border border-[#9F5F80]/20 hover:border-[#9F5F80]/40 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="p-3 rounded-xl bg-[#9F5F80]/20 flex-shrink-0">
                      <Bell className="h-5 w-5 text-[#9F5F80]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium mb-1">
                        {event.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {event.date}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/reminders")}
              >
                {isRTL ? "לוח שנה מלא" : "Full Calendar"}
                <Calendar
                  className={`h-5 w-5 ${isRTL ? "mr-2" : "ml-2"}`}
                />
              </Button>
            </div>
          </div>

          {/* Bottom Row: Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              whileHover={{ y: -4 }}
              onClick={() => navigate("/documents")}
              className="group flex items-center gap-6 p-6 rounded-2xl bg-white/50 dark:bg-[#383e4e]/30 backdrop-blur-sm border border-gray-200 dark:border-[#b6bac5]/10 hover:border-pink-500/40 hover:shadow-lg transition-all cursor-pointer"
            >
              <div className={`flex items-center gap-6 w-full ${isRTL ? "flex-row-reverse" : "flex-row"}`}>
                <div className="p-4 rounded-xl bg-pink-500/10 flex-shrink-0">
                  <FileText className="h-8 w-8 text-pink-500" />
                </div>
                <div className={`flex-1 ${isRTL ? "text-right" : "text-left"}`}>
                  <h3 className="text-lg font-semibold mb-1">
                    {isRTL ? "העלו קורות חיים" : "Upload Resume"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {isRTL
                      ? "העלו או עדכנו קורות חיים"
                      : "Upload or update resume"}
                  </p>
                </div>
                <ArrowRight className={`h-6 w-6 text-pink-500 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 ${isRTL ? "rotate-180 group-hover:-translate-x-1" : "group-hover:translate-x-1"}`} />
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -4 }}
              onClick={() => navigate("/jobs")}
              className="group flex items-center gap-6 p-6 rounded-2xl bg-white/50 dark:bg-[#383e4e]/30 backdrop-blur-sm border border-gray-200 dark:border-[#b6bac5]/10 hover:border-[#3B82F6]/40 hover:shadow-lg transition-all cursor-pointer"
            >
              <div className={`flex items-center gap-6 w-full ${isRTL ? "flex-row-reverse" : "flex-row"}`}>
                <div className="p-4 rounded-xl bg-[#3B82F6]/10 flex-shrink-0">
                  <Briefcase className="h-8 w-8 text-[#3B82F6]" />
                </div>
                <div className={`flex-1 ${isRTL ? "text-right" : "text-left"}`}>
                  <h3 className="text-lg font-semibold mb-1">
                    {isRTL ? "חפשו משרות" : "Find Jobs"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {isRTL
                      ? "עיינו בהזדמנויות חדשות"
                      : "Browse new opportunities"}
                  </p>
                </div>
                <ArrowRight className={`h-6 w-6 text-[#3B82F6] opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 ${isRTL ? "rotate-180 group-hover:-translate-x-1" : "group-hover:translate-x-1"}`} />
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -4 }}
              onClick={() => navigate("/pipeline")}
              className="group flex items-center gap-6 p-6 rounded-2xl bg-white/50 dark:bg-[#383e4e]/30 backdrop-blur-sm border border-gray-200 dark:border-[#b6bac5]/10 hover:border-[#10B981]/40 hover:shadow-lg transition-all cursor-pointer"
            >
              <div className={`flex items-center gap-6 w-full ${isRTL ? "flex-row-reverse" : "flex-row"}`}>
                <div className="p-4 rounded-xl bg-[#10B981]/10 flex-shrink-0">
                  <Target className="h-8 w-8 text-[#10B981]" />
                </div>
                <div className={`flex-1 ${isRTL ? "text-right" : "text-left"}`}>
                  <h3 className="text-lg font-semibold mb-1">
                    {isRTL
                      ? "עקבו אחר מועמדויות"
                      : "Track Applications"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {isRTL
                      ? "נהלו את תהליך המועמדויות שלכם"
                      : "Manage your pipeline"}
                  </p>
                </div>
                <ArrowRight className={`h-6 w-6 text-[#10B981] opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 ${isRTL ? "rotate-180 group-hover:-translate-x-1" : "group-hover:translate-x-1"}`} />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}