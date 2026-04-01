/**
 * Analytics Page
 * Comprehensive analytics dashboard with 8 category tabs
 */

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  BarChart3,
  Download,
  Lock,
  X,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { analyticsApi, type AnalyticsData, type TimeRange } from "../../features/analytics/api";
import { PageContainer } from "../../components/layout/PageContainer";
import { Button } from "../../components/ui/button";
import { LoadingSpinner } from "../../components/shared/LoadingSpinner";
import { CategoryTabs } from "./components/CategoryTabs";
import { OverviewSection } from "./components/OverviewSection";
import { ApplicationsSection } from "./components/ApplicationsSection";
import { CompaniesSection } from "./components/CompaniesSection";
import { TimelineSection } from "./components/TimelineSection";
import { BestTimeSection } from "./components/BestTimeSection";
import { SourcesSection } from "./components/SourcesSection";
import { InterviewsSection } from "./components/InterviewsSection";
import { DateRangeSelector } from "./components/DateRangeSelector";
import { toast } from "sonner";
import { useAnalyticsUnlock } from "../../hooks/useAnalyticsUnlock";
import { AnalyticsLock } from "../../components/analytics/AnalyticsLock";
import { AnalyticsHelp } from "../../components/help/AnalyticsHelp";
import { AnalyticsAnnotations } from "./components/AnalyticsAnnotations";
import { PageBackground } from "../../components/background/PageBackground";
import { logger } from "../../lib/logger";

export type AnalyticsCategory =
  | "overview"
  | "applications"
  | "companies"
  | "timeline"
  | "best-time"
  | "sources"
  | "interviews";

export function AnalyticsPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === "he";
  const { isUnlocked } = useAnalyticsUnlock();

  // State
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] =
    useState<AnalyticsCategory>("overview");
  const [timeRange, setTimeRange] = useState<TimeRange>("6m");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [showPageTour, setShowPageTour] = useState(false);

  // Premium check from user profile
  const isPremium = user?.is_premium ?? false;

  // Load analytics when user, timeRange, or demo mode changes
  useEffect(() => {
    if (!user && !isDemoMode) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        if (isDemoMode) {
          const demoData = await analyticsApi.getDemoAnalytics();
          if (cancelled) return;
          setData(demoData);
        } else {
          const analyticsData = await analyticsApi.getAnalytics(timeRange);
          if (cancelled) return;
          setData(analyticsData);
        }
      } catch (error) {
        if (cancelled) return;
        logger.error("Failed to load analytics:", error);
        toast.error(
          isRTL
            ? "שגיאה בטעינת נתונים"
            : "Failed to load analytics",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user, timeRange, isDemoMode]);

  const handleDemoMode = () => {
    setIsDemoMode(true);
    toast.success(
      isRTL
        ? "מצב דמו הופעל - מציג 127 בקשות"
        : "Demo mode activated - showing 127 applications",
    );
  };

  const handleExitDemoMode = () => {
    setIsDemoMode(false);
    setTimeRange("1m");
  };

  const handleExport = async () => {
    try {
      await analyticsApi.exportPDF(timeRange);
      toast.success(
        isRTL
          ? "הדוח יוצא בהצלחה"
          : "Report exported successfully",
      );
    } catch (error) {
      toast.error(
        isRTL ? "שגיאה בייצוא הדוח" : "Failed to export report",
      );
    }
  };

  const renderSection = () => {
    if (!data) return null;

    switch (activeCategory) {
      case "overview":
        return (
          <OverviewSection
            data={data.overview}
            isRTL={isRTL}
            isPremium={isPremium}
          />
        );
      case "applications":
        return (
          <ApplicationsSection
            data={data.applications}
            isRTL={isRTL}
            isPremium={isPremium}
          />
        );
      case "companies":
        return (
          <CompaniesSection
            data={data.companies}
            isRTL={isRTL}
            isPremium={isPremium}
          />
        );
      case "timeline":
        return (
          <TimelineSection
            data={data.timeline}
            isRTL={isRTL}
            isPremium={isPremium}
          />
        );
      case "best-time":
        return (
          <BestTimeSection
            data={data.bestTime}
            isRTL={isRTL}
            isPremium={isPremium}
          />
        );
      case "sources":
        return (
          <SourcesSection
            data={data.sources}
            isRTL={isRTL}
            isPremium={isPremium}
          />
        );
      case "interviews":
        return (
          <InterviewsSection
            data={data.interviews}
            isRTL={isRTL}
            isPremium={isPremium}
          />
        );
      default:
        return null;
    }
  };

  // Show lock screen if analytics is not unlocked
  if (!isUnlocked) {
    return (
      <PageContainer>
        <AnalyticsLock />
      </PageContainer>
    );
  }

  return (
    <>
      <PageBackground />
      
      <div className="relative z-10 min-h-screen overflow-x-hidden" dir={isRTL ? "rtl" : "ltr"}>
        <div className="w-full min-h-screen px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Analytics Help Guide */}
          <AnalyticsHelp 
            isRTL={isRTL}
            onShowVisualGuide={() => setShowPageTour(true)}
          />

          {/* Page Tour - Interactive Hover Guide */}
          <AnalyticsAnnotations
            isActive={showPageTour}
            onClose={() => setShowPageTour(false)}
            isRTL={isRTL}
            activeCategory={activeCategory}
          />

          {/* Header */}
          <div
            className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6 lg:mb-8"
            data-tour="page-header"
          >
            {/* Title Row */}
            <motion.div
              initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-start justify-between gap-2"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                  <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-[#9F5F80] flex-shrink-0" />
                  <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-[#383e4e] dark:text-white truncate">
                    {isRTL ? "ניתוח נתונים" : "Analytics"}
                  </h1>
                </div>
                <p className="text-xs sm:text-sm lg:text-base text-[#6c757d] dark:text-[#b6bac5] truncate">
                  {isRTL
                    ? "תובנות מבוססות נתונים לחיפוש העבודה שלך"
                    : "Data-driven insights for your job search"}
                </p>
              </div>
            </motion.div>

            {/* Actions Row */}
            <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
              {/* Demo Mode Button */}
              {!isDemoMode && (
                <Button
                  variant="outline"
                  onClick={handleDemoMode}
                  className="border-[#9F5F80] text-[#9F5F80] hover:bg-[#9F5F80]/10 text-xs sm:text-sm flex-shrink-0"
                  size="sm"
                  data-tour="demo-mode"
                >
                  <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  {isRTL ? "מצב דמו" : "Demo Mode"}
                </Button>
              )}

              {isDemoMode && (
                <Button
                  variant="outline"
                  onClick={handleExitDemoMode}
                  className="border-amber-500 text-amber-600 hover:bg-amber-50 text-xs sm:text-sm flex-shrink-0"
                  size="sm"
                >
                  <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  {isRTL ? "יציאה ממצב דמו" : "Exit Demo"}
                </Button>
              )}

              {/* Date Range Selector */}
              {!isDemoMode && (
                <div className="flex-shrink-0 w-full sm:w-auto" data-tour="date-range">
                  <DateRangeSelector
                    dateRange={
                      timeRange === 'all' ? null
                      : timeRange === '1y' ? { from: new Date(Date.now() - 365 * 86400000), to: new Date() }
                      : timeRange === '6m' ? { from: new Date(Date.now() - 180 * 86400000), to: new Date() }
                      : timeRange === '3m' ? { from: new Date(Date.now() - 90 * 86400000), to: new Date() }
                      : { from: new Date(Date.now() - 30 * 86400000), to: new Date() }
                    }
                    onChange={(range) => {
                      if (!range) {
                        setTimeRange('all');
                      } else {
                        const days = Math.round((range.to.getTime() - range.from.getTime()) / 86400000);
                        if (days <= 31) setTimeRange('1m');
                        else if (days <= 92) setTimeRange('3m');
                        else if (days <= 183) setTimeRange('6m');
                        else setTimeRange('1y');
                      }
                      setIsDemoMode(false);
                    }}
                    isRTL={isRTL}
                  />
                </div>
              )}

              {/* Export Button */}
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={!isPremium}
                size="sm"
                className="text-xs sm:text-sm flex-shrink-0"
                data-tour="export-data"
              >
                <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                <span className="hidden xs:inline">
                  {isRTL ? "ייצא דוח" : "Export Report"}
                </span>
                <span className="xs:hidden">
                  {isRTL ? "ייצא" : "Export"}
                </span>
                {!isPremium && <Lock className="h-3 w-3 ml-1.5 sm:ml-2" />}
              </Button>
            </div>
          </div>

          {/* Demo Mode Banner */}
          {isDemoMode && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-[#9F5F80] to-[#383e4e] text-white rounded-lg lg:rounded-xl p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6 lg:mb-8"
            >
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm sm:text-base lg:text-lg mb-1">
                    {isRTL ? "מצב דמו פעיל" : "Demo Mode Active"}
                  </h3>
                  <p className="text-white/90 text-xs sm:text-sm lg:text-base">
                    {isRTL
                      ? "מציג נתוני דוגמה של 127 מועמדויות כדי להדגים את יכולות ניתוח הנתונים"
                      : "Showing sample data with 127 applications to demonstrate analytics capabilities"}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Premium Banner */}
          {!isPremium && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg lg:rounded-xl p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6 lg:mb-8"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm sm:text-base lg:text-lg mb-1">
                    {isRTL
                      ? "שדרгу ל-Premium לניתוח מלא"
                      : "Upgrade to Premium for Full Analytics"}
                  </h3>
                  <p className="text-white/90 text-xs sm:text-sm lg:text-base">
                    {isRTL
                      ? "קבלו גישה לכל התובנות, גרפים מתקדמים וייצוא דוחות"
                      : "Get access to all insights, advanced charts, and report exports"}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="text-xs sm:text-sm lg:text-base flex-shrink-0 w-full sm:w-auto"
                >
                  {isRTL ? "שדרгу עכשיו" : "Upgrade Now"}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Category Tabs */}
          <div data-tour="category-tabs">
            <CategoryTabs
              activeCategory={activeCategory}
              onChange={setActiveCategory}
              isRTL={isRTL}
            />
          </div>

          {/* Loading State */}
          {loading && (
            <LoadingSpinner
              size="lg"
              text={
                isRTL ? "טוען נתונים..." : "Loading analytics..."
              }
            />
          )}

          {/* Content */}
          {!loading && data && (
            <div className="min-h-[600px]">
              <motion.div
                key={activeCategory}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                {renderSection()}
              </motion.div>
            </div>
          )}

          {/* No Data State */}
          {!loading && !data && (
            <div className="text-center py-16">
              <BarChart3 className="h-16 w-16 text-[#b6bac5] mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-[#383e4e] dark:text-white mb-2">
                {isRTL ? "אין נתונים זמינו" : "No Data Available"}
              </h3>
              <p className="text-[#6c757d] dark:text-[#b6bac5]">
                {isRTL
                  ? "תחילו להגיש מועמדות כדי לראות ניתוח"
                  : "Start applying to jobs to see analytics"}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default AnalyticsPage;