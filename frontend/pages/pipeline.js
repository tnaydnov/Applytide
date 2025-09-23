// pages/pipeline.js
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";

import { Input, Select, Button, Card} from "../components/ui";
import Column from "../features/pipeline/components/Column";
import ApplicationCard from "../features/pipeline/components/ApplicationCard";
import PipelineCustomizer from "../features/pipeline/components/PipelineCustomizer";
import usePipelineData from "../features/pipeline/hooks/usePipelineData";
import { KNOWN_STATUSES, getStatusConfig } from "../features/pipeline/utils/status";

// Lazy-load large overlays to keep SSR happy
const ApplicationDrawer = dynamic(
  () => import("../features/pipeline/components/ApplicationDrawer").then(m => m.default || m),
  { ssr: false }
);

export default function PipelinePage() {
  const router = useRouter();

  // ---------------- Data layer ----------------
  const {
    currentStages,
    setCurrentStages,
    columns,
    filteredColumns,
    loading,
    stats,

    searchTerm,
    setSearchTerm,
    selectedFilter,
    setSelectedFilter,
    sortBy,
    setSortBy,
    quickStatusFilter,
    setQuickStatusFilter,

    hasAnyApplications,
    hasFilteredResults,

    reload,
    move,
    deleteApplication,
  } = usePipelineData();

  // ---------------- UI state ----------------
  const [view, setView] = useState("cards"); // "board" | "cards"
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);

  // Drawer state from ?app=ID
  const [activeApp, setActiveApp] = useState(null);

  // Focus handle for "/"
  const searchRef = useRef(null);

  // Flattened list for "cards" view
  const flatApps = useMemo(() => {
    const list = [];
    (currentStages || []).forEach((st) => {
      const arr = filteredColumns?.[st] || [];
      arr.forEach((app) => list.push(app));
    });
    // Already sorted within filteredColumns; leave order as-is
    return list;
  }, [filteredColumns, currentStages]);

  // -------------- App drawer sync with URL --------------
  const appIdFromQuery = router.query.app ? String(router.query.app) : null;

  // Find an application by id in the full data (not only filtered) so it still opens even if filtered out
  const findAppById = useCallback(
    (id) => {
      if (!id) return null;
      for (const st of currentStages || []) {
        const arr = columns?.[st] || [];
        const found = arr.find((a) => String(a?.id) === id || String(a?.application_id) === id);
        if (found) return found;
      }
      return null;
    },
    [columns, currentStages]
  );

  useEffect(() => {
    if (!appIdFromQuery) { setActiveApp(null); return; }
    const app = findAppById(appIdFromQuery);
    setActiveApp(app || null);
  }, [appIdFromQuery, findAppById]);

  const closeDrawer = useCallback(() => {
    const q = { ...router.query };
    delete q.app;
    router.push({ pathname: router.pathname, query: q }, undefined, { shallow: true });
    setActiveApp(null);
  }, [router]);

  // ----------------- Keyboard shortcuts -----------------
  useEffect(() => {
    const onKey = (e) => {
      // "/" focuses search
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        searchRef.current?.focus?.();
      }
      // Alt + [1..9] scroll to column header
      if (e.altKey && !e.metaKey && !e.ctrlKey) {
        const n = Number(e.key);
        if (n >= 1 && n <= 9) {
          const idx = n - 1;
          const stage = currentStages?.[idx];
          if (!stage) return;
          const el = document.querySelector(`[data-stage-anchor="${stage}"]`) || document.querySelector(`[data-stage-anchor]`);
          el?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentStages]);

  // ----------------- Actions with UX sugar -----------------
  const handleMove = useCallback((id, newStatus) => move(id, newStatus), [move]);

  const handleDelete = useCallback(
    async (id) => {
      await deleteApplication(id);
    },
    [deleteApplication]
  );

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedFilter("all");
    setSortBy("recent");
    setQuickStatusFilter(null);
  };

  // ----------------- Render helpers -----------------
  const renderAnalytics = () => (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-300 mb-6">Application Overview</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card rounded-2xl p-8 border border-white/20 hover:border-blue-400/50 transition-all duration-300 group">
          <div className="text-center">
            <div className="inline-flex p-4 bg-gradient-to-br from-blue-500/30 to-blue-600/20 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-8 h-8 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-blue-300 mb-2">Total Applications</p>
            <p className="text-4xl font-bold text-white group-hover:text-blue-300 transition-colors">{stats.totalApps || 0}</p>
          </div>
        </div>
        
        <div className="glass-card rounded-2xl p-8 border border-white/20 hover:border-yellow-400/50 transition-all duration-300 group">
          <div className="text-center">
            <div className="inline-flex p-4 bg-gradient-to-br from-yellow-500/30 to-yellow-600/20 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-8 h-8 text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-yellow-300 mb-2">Active</p>
            <p className="text-4xl font-bold text-white group-hover:text-yellow-300 transition-colors">{stats.activeApps || 0}</p>
          </div>
        </div>
        
        <div className="glass-card rounded-2xl p-8 border border-white/20 hover:border-green-400/50 transition-all duration-300 group">
          <div className="text-center">
            <div className="inline-flex p-4 bg-gradient-to-br from-green-500/30 to-green-600/20 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-8 h-8 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-green-300 mb-2">Offers</p>
            <p className="text-4xl font-bold text-white group-hover:text-green-300 transition-colors">{stats.offers || 0}</p>
          </div>
        </div>
        
        <div className="glass-card rounded-2xl p-8 border border-white/20 hover:border-purple-400/50 transition-all duration-300 group">
          <div className="text-center">
            <div className="inline-flex p-4 bg-gradient-to-br from-purple-500/30 to-purple-600/20 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-8 h-8 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-purple-300 mb-2">Success Rate</p>
            <p className="text-4xl font-bold text-white group-hover:text-purple-300 transition-colors">{stats.successRate || 0}%</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Head><title>Pipeline</title></Head>

      <div 
        className="min-h-screen"
        style={{ background: "linear-gradient(180deg, #111827 0%, #0b101e 100%)" }}
      >
        <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-200">Application Pipeline</h1>
            <p className="text-slate-400 mt-1">Track your journey to success</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex bg-white/10 border border-white/20 rounded-lg p-1 backdrop-blur-sm">
              <button
                onClick={() => setView("cards")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  view === "cards"
                    ? "bg-indigo-500 text-white shadow-sm"
                    : "text-gray-300 hover:text-white border border-gray-300 hover:border-white"
                }`}
              >
                <svg className="w-4 h-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                Cards
              </button>
              <button
                onClick={() => setView("board")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  view === "board"
                    ? "bg-indigo-500 text-white shadow-sm"
                    : "text-gray-300 hover:text-white border border-gray-300 hover:border-white"
                }`}
              >
                <svg className="w-4 h-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Board
              </button>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setShowAnalytics((v) => !v)}
              className="text-purple-400 border-purple-400 hover:bg-purple-500/20"
            >
              <svg className="w-4 h-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              {showAnalytics ? "Hide Analytics" : "Show Analytics"}
            </Button>
            <Button variant="outline" onClick={() => setShowSettings(true)}>Customize Pipeline</Button>
            <Button onClick={reload}>Reload</Button>
          </div>
        </div>

        {/* Analytics */}
        {showAnalytics && renderAnalytics()}

        {/* Controls */}
        <div className="glass-card border border-white/15 rounded-xl p-3 md:p-4 mb-5">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <Input
                ref={searchRef}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search title, company, location ( / to focus )"
              />
            </div>
            <div>
              <Select value={selectedFilter} onChange={(e) => setSelectedFilter(e.target.value)}>
                <option value="all">All time</option>
                <option value="recent">Last 7 days</option>
              </Select>
            </div>
            <div>
              <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="recent">Sort by Recent</option>
                <option value="company">Sort by Company</option>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={clearFilters} title="Clear filters">
                Reset
              </Button>
            </div>
          </div>

          {/* Quick status filter chips */}
          <div className="mt-3 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 min-w-max">
              <Chip
                active={!quickStatusFilter}
                onClick={() => setQuickStatusFilter(null)}
                label="All"
              />
              {KNOWN_STATUSES.map((s) => (
                <Chip
                  key={s}
                  active={quickStatusFilter === s}
                  onClick={() => setQuickStatusFilter(s)}
                  label={s}
                  icon={getStatusConfig(s).icon}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-400 mx-auto"></div>
              <p className="text-white/70 mt-4">Loading pipeline...</p>
            </div>
          </div>
        ) : !hasAnyApplications ? (
          <EmptyState />
        ) : view === "cards" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {flatApps.map((app) => (
              <ApplicationCard
                key={app.id}
                application={app}
                onMove={handleMove}
                onDelete={handleDelete}
                onUpdate={reload}
                statuses={currentStages}
                onDragStart={setDraggedItem}
                onDragEnd={() => setDraggedItem(null)}
                viewMode="cards"
              />
            ))}
            {!hasFilteredResults && (
              <div className="col-span-full">
                <NoMatches />
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {(currentStages || []).map((status, i) => (
              <div key={status} data-stage-anchor={status}>
                <Column
                  status={status}
                  items={filteredColumns?.[status] || []}
                  onMove={handleMove}
                  onDelete={handleDelete}
                  onUpdate={reload}
                  availableStatuses={currentStages}
                  draggedItem={draggedItem}
                  onDragStart={(app) => setDraggedItem(app)}
                  onDragEnd={() => setDraggedItem(null)}
                  stageNumber={i + 1}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drawer */}
      {activeApp && (
        <ApplicationDrawer application={activeApp} onClose={closeDrawer} />
      )}

      {/* Pipeline customizer */}
      {showSettings && (
        <ModalShell onClose={() => setShowSettings(false)} title="Customize Pipeline">
          <PipelineCustomizer
            stages={currentStages}
            onStagesChange={setCurrentStages}
            availableStages={KNOWN_STATUSES}
            onClose={() => setShowSettings(false)}
          />
        </ModalShell>
      )}
      </div>
    </>
  );
}

/* ---------- Little UI helpers (kept local to the page) ---------- */

function StatCard({ label, value }) {
  return (
    <Card className="bg-white/5 border-white/10">
      <div className="text-sm text-white/70">{label}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </Card>
  );
}

function Chip({ active, label, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={[
        "inline-flex items-center gap-1 px-3 py-1.5 rounded-full border transition-all",
        active
          ? "bg-indigo-600/70 text-white border-indigo-400/50"
          : "bg-white/5 text-white/80 border-white/15 hover:bg-white/10",
      ].join(" ")}
      title={String(label)}
    >
      {icon ? <span className="text-xs">{icon}</span> : null}
      <span className="text-sm">{label}</span>
    </button>
  );
}

function EmptyState() {
  return (
    <div className="text-center text-white/70 py-20">
      <div className="text-3xl mb-2">🗂️</div>
      <p className="font-medium">No applications yet</p>
      <p className="text-sm text-white/50">Start applying and they’ll show up here.</p>
    </div>
  );
}

function NoMatches() {
  return (
    <div className="text-center text-white/70 py-10 glass-card border border-white/10 rounded-xl">
      <div className="text-2xl mb-2">🔎</div>
      <p className="font-medium">No matches for your current filters</p>
      <p className="text-sm text-white/50">Try clearing or changing filters.</p>
    </div>
  );
}

function ModalShell({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[9998]">
      <button className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Close" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl rounded-xl border border-white/15 bg-[#0f1422] shadow-2xl">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h3 className="text-white font-semibold">{title}</h3>
            <button onClick={onClose} className="text-white/70 hover:text-white" aria-label="Close">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
