import Head from "next/head";
import { Button } from "../components/ui";
import { PremiumModal } from "../components/PremiumFeature";

import useAnalytics from "../features/analytics/hooks/useAnalytics";
import CategoryTabs from "../features/analytics/components/CategoryTabs";
import OverviewSection from "../features/analytics/components/OverviewSection";
import ApplicationsSection from "../features/analytics/components/ApplicationsSection";
import InterviewsSection from "../features/analytics/components/InterviewsSection";
import CompaniesSection from "../features/analytics/components/CompaniesSection";
import TimelineSection from "../features/analytics/components/TimelineSection";

import {
  TIME_RANGE_OPTIONS,
  DEFAULT_METRIC,
} from "../features/analytics/utils/constants";

export default function AnalyticsPage() {
  const {
    analytics,
    loading,

    timeRange,
    setTimeRange,
    selectedMetric,
    setSelectedMetric,

    isPremium,
    showPremiumModal,
    openPremiumModal,
    closePremiumModal,

    exportReport,
  } = useAnalytics();

  // ---------------------------------- Loading ---------------------------------
  if (loading && !analytics && isPremium) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // ------------------------------- Premium Gate -------------------------------
  if (!isPremium) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Head>
          <title>Analytics - Applytide</title>
        </Head>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-20">
            <div className="glass-card glass-cyan max-w-2xl mx-auto">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-slate-200 mb-4">Analytics Dashboard</h2>
              <p className="text-slate-400 mb-8 text-lg">
                Unlock powerful insights about your job search progress, trends, and performance metrics.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-left">
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-300">Application success rates</span>
                </div>
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-300">Interview performance trends</span>
                </div>
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-300">Company response patterns</span>
                </div>
              </div>

              <Button
                onClick={openPremiumModal}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 text-lg font-semibold"
              >
                Upgrade to Pro
              </Button>
            </div>
          </div>
        </div>

        <PremiumModal
          isOpen={showPremiumModal}
          onClose={closePremiumModal}
          feature="Analytics Dashboard"
        />
      </div>
    );
  }

  // ------------------------------ Main Dashboard -----------------------------
  const currentTab = selectedMetric || DEFAULT_METRIC;

  const renderSection = () => {
    if (!analytics) {
      return (
        <div className="glass-card glass-cyan p-8 text-center text-slate-400">
          No analytics yet. Start tracking applications to see insights here.
        </div>
      );
    }
    switch (currentTab) {
      case "overview":
        return <OverviewSection analytics={analytics} />;
      case "applications":
        return <ApplicationsSection analytics={analytics} />;
      case "interviews":
        return <InterviewsSection analytics={analytics} />;
      case "companies":
        return <CompaniesSection analytics={analytics} />;
      case "timeline":
        return <TimelineSection analytics={analytics} />;
      default:
        return <OverviewSection analytics={analytics} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Head>
        <title>Analytics - Applytide</title>
      </Head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-200">Analytics Dashboard</h1>
              <p className="mt-2 text-slate-400">Track your job search progress and insights</p>
            </div>

            <div className="mt-4 md:mt-0 flex space-x-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="rounded-md border border-slate-600 py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-800/50 text-slate-200"
                aria-label="Select time range"
              >
                {TIME_RANGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <Button
                variant="outline"
                onClick={() => exportReport("csv")}
                className="text-sm border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Export CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => exportReport("pdf")}
                className="text-sm border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Export PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <CategoryTabs selected={currentTab} onSelect={setSelectedMetric} />

        {/* Sections */}
        {renderSection()}
      </div>
    </div>
  );
}
