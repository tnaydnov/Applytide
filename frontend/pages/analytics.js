import Head from "next/head";
import { Button } from "../components/ui";
import { useMemo, useState } from "react";
import PageContainer from "../components/layout/PageContainer";
import PageHeader from "../components/layout/PageHeader";
import { useAuth } from "../contexts/AuthContext";
import { usePremiumFeature } from "../components/PremiumFeature";

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

function ExportMenu({ onExport }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="relative inline-block text-left"
      tabIndex={0}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}
      onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
    >
      <Button
        variant="outline"
        className="text-xs sm:text-sm border-slate-600 text-slate-300 hover:bg-slate-700 flex-1 sm:flex-none"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
        Export ▾
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-44 origin-top-right rounded-md border border-slate-600/60 bg-slate-800/90 backdrop-blur p-1 shadow-lg"
        >
          <button
            role="menuitem"
            onClick={() => { onExport("csv"); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-sm rounded hover:bg-slate-700/60 text-slate-200"
          >
            CSV (all sections)
          </button>
          <button
            role="menuitem"
            onClick={() => { onExport("pdf"); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-sm rounded hover:bg-slate-700/60 text-slate-200"
          >
            PDF summary
          </button>
        </div>
      )}
    </div>
  );
}



export default function AnalyticsPage() {
  const { user } = useAuth();
  const { checkPremium, PremiumModal } = usePremiumFeature({ isPremium: user?.is_premium });
  
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
      <div className="min-h-screen flex items-center justify-center">
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
    if (!data) {
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
      case "companies": return <CompaniesSection analytics={data} isPremium={user?.is_premium} onPremiumRequired={checkPremium} />;
      case "sources": return <SourcesSection analytics={data} />;
      case "habits": return <BestTimeSection analytics={data} />;
      case "experiments": return <ExperimentsSection analytics={data} />;
      case "timeline": return <TimelineSection analytics={data} />;
      default: return <OverviewSection analytics={data} />;
    }
  };

  return (
    <>
      <Head><title>Analytics - Applytide</title></Head>

      <PageContainer>
        <PageHeader
          title="Analytics Dashboard"
          subtitle="Track your job search progress and insights"
          actions={
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="rounded-md border border-slate-600 py-2 px-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-800/50 text-slate-200 min-w-0"
              >
                {TIME_RANGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <div className="flex gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={() => setDemoMode((v) => !v)}
                  className={`text-xs sm:text-sm border-slate-600 flex-1 sm:flex-none ${demoMode ? "text-yellow-300 hover:bg-yellow-900/20" : "text-slate-300 hover:bg-slate-700"}`}
                >
                  {demoMode ? "Exit Demo" : "Demo"}
                </Button>
                <ExportMenu onExport={exportReport} />
              </div>
            </div>
          }
        />

        {/* Tabs + Sections */}
        <CategoryTabs 
          selected={currentTab} 
          onSelect={setSelectedMetric} 
          isPremium={user?.is_premium}
          onPremiumRequired={checkPremium}
        />
        {renderSection()}
        
        <PremiumModal feature="company analytics and AI-powered insights" />
      </PageContainer>
    </>
  );
}
