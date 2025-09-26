import Head from "next/head";
import { Button } from "../components/ui";
import { useMemo, useState } from "react";

import useAnalytics from "../features/analytics/hooks/useAnalytics";
import CategoryTabs from "../features/analytics/components/CategoryTabs";
import OverviewSection from "../features/analytics/components/OverviewSection";
import ApplicationsSection from "../features/analytics/components/ApplicationsSection";
import InterviewsSection from "../features/analytics/components/InterviewsSection";
import CompaniesSection from "../features/analytics/components/CompaniesSection";
import TimelineSection from "../features/analytics/components/TimelineSection";
import SourcesSection from "../features/analytics/components/SourcesSection";
import ExperimentsSection from "../features/analytics/components/ExperimentsSection";
import BestTimeSection from "../features/analytics/components/BestTimeSection";
import { generateDemoAnalytics } from "../features/analytics/utils/sampleData";

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

    exportReport,
  } = useAnalytics();

  const [demoMode, setDemoMode] = useState(false);
  const demoData = useMemo(() => (demoMode ? generateDemoAnalytics() : null), [demoMode]);
  const data = demoData || analytics;

  // ---------------------------------- Loading ---------------------------------
  if (loading && !analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading analytics...</p>
        </div>
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
      case "overview": return <OverviewSection analytics={data} />;
      case "applications": return <ApplicationsSection analytics={data} />;
      case "interviews": return <InterviewsSection analytics={data} />;
      case "companies": return <CompaniesSection analytics={data} />;
      case "sources": return <SourcesSection analytics={data} />;
      case "habits": return <BestTimeSection analytics={data} />;
      case "experiments": return <ExperimentsSection analytics={data} />;
      case "timeline": return <TimelineSection analytics={data} />;
      default: return <OverviewSection analytics={data} />;
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
                onClick={() => setDemoMode((v) => !v)}
                className={`text-sm border-slate-600 ${demoMode ? "text-yellow-300 hover:bg-yellow-900/20" : "text-slate-300 hover:bg-slate-700"}`}
                title="Preview with sample data"
              >
                {demoMode ? "Exit Demo" : "Try Demo Data"}
              </Button>

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
