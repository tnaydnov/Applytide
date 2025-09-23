// pages/pipeline.js
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";

import { Input, Select, Button, Card } from "../components/ui";
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
  const [view, setView] = useState("board"); // "board" | "cards"
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
    <Card className="mb-6 bg-white/5 border-white/10 overflow-hidden">
      <div className="p-4 border-b border-white/10">
        <div className="text-sm text-white/70 mb-1">Detailed Analytics</div>
        <div className="text-xs text-white/50">Performance Metrics</div>
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: conversion + recent */}
        <div className="space-y-4">
          {/* Conversion Rate bar */}
          <div>
            <div className="flex items-center justify-between text-xs text-white/70 mb-1">
              <span>Conversion Rate</span>
              <span className="font-semibold text-white">{stats.conversionRate}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                style={{ width: `${Math.min(100, Math.max(0, stats.conversionRate))}%` }}
              />
            </div>
          </div>

          {/* Success Rate bar */}
          <div>
            <div className="flex items-center justify-between text-xs text-white/70 mb-1">
              <span>Success Rate</span>
              <span className="font-semibold text-white">{stats.successRate}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-fuchsia-500"
                style={{ width: `${Math.min(100, Math.max(0, stats.successRate))}%` }}
              />
            </div>
          </div>

          {/* Quick KPIs row */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Total" value={stats.totalApps} />
            <StatCard label="Active" value={stats.activeApps} />
            <StatCard label="7d New" value={stats.recentApps} />
          </div>
        </div>

        {/* Middle: top companies rail */}
        <div className="space-y-2">
          <div className="text-sm text-white/70">Top Companies</div>
          <div className="space-y-1">
            {(stats.topCompanies || []).map(([name, count]) => (
              <div key={name} className="flex items-center justify-between text-xs bg-white/5 border border-white/10 rounded-md px-3 py-2">
                <span className="truncate pr-3 text-white/80">{name}</span>
                <span className="text-white/60">{count}</span>
              </div>
            ))}
            {(!stats.topCompanies || stats.topCompanies.length === 0) && (
              <div className="text-xs text-white/50">No data yet</div>
            )}
          </div>
        </div>

        {/* Right: Insights panel (simple line) */}
        <div className="space-y-2">
          <div className="text-sm text-white/70">Insights</div>
          <div className="text-xs text-white/60 bg-white/5 border border-white/10 rounded-md p-3">
            {stats.totalApps === 0
              ? "Start adding applications to see insights."
              : `You’ve added ${stats.recentApps} application${stats.recentApps === 1 ? "" : "s"} this week.`}
          </div>
        </div>
      </div>
    </Card>
  );


  return (
    <>
      <Head><title>Pipeline</title></Head>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <h1 className="text-2xl font-bold text-white">Pipeline</h1>
          <div className="flex items-center gap-2">
            <Button
              variant={view === "cards" ? "default" : "outline"}
              onClick={() => setView("cards")}
            >
              Cards
            </Button>
            <Button
              variant={view === "board" ? "default" : "outline"}
              onClick={() => setView("board")}
            >
              Board
            </Button>
            <Button
              variant={showAnalytics ? "default" : "outline"}
              onClick={() => setShowAnalytics((v) => !v)}
              className={showAnalytics ? "bg-purple-600 hover:bg-purple-700" : ""}
            >
              Analytics
            </Button>
            <Button variant="outline" onClick={() => setShowSettings(true)}>
              Customize Pipeline
            </Button>
          </div>

        </div>

        {/* SUMMARY analytics – always on top (big colorful cards) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <BigStat label="Total Applications" value={stats.totalApps} color="indigo" icon="📄" />
          <BigStat label="In Progress" value={stats.activeApps} color="amber" icon="⏳" />
          <BigStat label="Offers" value={stats.offers} color="emerald" icon="🌱" />
          <BigStat label="Success Rate" value={`${stats.successRate}%`} color="violet" icon="📈" />
          <BigStat label="7d New" value={stats.recentApps} color="cyan" icon="✨" />
          <BigStat label="Rejected" value={stats.rejections} color="rose" icon="⛔" />
        </div>

        {/* DETAILED analytics – appears only when the "Analytics" pill is ON */}
        {showAnalytics && (
          <Card className="mb-6 bg-[#0b1222]/80 border-white/10 shadow-[0_0_0_1px_rgba(255,255,255,.06)]">
            <div className="text-sm text-white/70 mb-2">Detailed Analytics</div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-2">
                <div className="text-xs text-white/60">Conversion Rate</div>
                <div className="h-2 bg-white/10 rounded">
                  <div style={{ width: `${stats.conversionRate || 0}%` }} className="h-2 rounded bg-gradient-to-r from-cyan-400 to-blue-500"></div>
                </div>
                <div className="text-xs text-white/60">Success Rate</div>
                <div className="h-2 bg-white/10 rounded">
                  <div style={{ width: `${stats.successRate || 0}%` }} className="h-2 rounded bg-gradient-to-r from-violet-400 to-fuchsia-500"></div>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-3">
                  <MiniStat label="Total" value={stats.totalApps} />
                  <MiniStat label="Active" value={stats.activeApps} />
                  <MiniStat label="7d New" value={stats.recentApps} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xs text-white/60">Top Companies</div>
                <div className="glass-card border border-white/10 rounded-lg p-3">
                  {(stats.topCompanies || []).length === 0 ? (
                    <div className="text-xs text-white/50">—</div>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {stats.topCompanies.map(([name, count]) => (
                        <li key={name} className="flex items-center justify-between">
                          <span className="truncate">{name}</span>
                          <span className="text-white/60">{count}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="text-xs text-white/60">Insights</div>
                <div className="glass-card border border-white/10 rounded-lg p-3 text-xs text-white/70">
                  You’ve added {stats.recentApps} application{stats.recentApps === 1 ? '' : 's'} this week.
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Controls */}
        <div className="rounded-xl border border-white/15 bg-[#0b1222]/80 shadow-[0_0_0_1px_rgba(255,255,255,.06)] p-3 md:p-4 mb-5">
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
            <div className="flex items-center justify-start md:justify-end gap-2">
              <Button size="sm" variant="outline" onClick={clearFilters} title="Clear filters">Reset</Button>
            </div>
          </div>
        </div>


        {/* Content */}
        {loading ? (
          <div className="text-center text-white/70 py-16">Loading pipeline…</div>
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
        <div className="w-full max-w-4xl rounded-xl border border-white/15 bg-[#0f1422] shadow-2xl
                    max-h-[86vh] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h3 className="text-white font-semibold">{title}</h3>
            <button onClick={onClose} className="text-white/70 hover:text-white" aria-label="Close">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* Scrollable body */}
          <div className="p-4 overflow-y-auto max-h-[74vh]">{children}</div>
        </div>
      </div>
    </div>
  );
}

function BigStat({ label, value, color = "indigo", icon }) {
  const colorMap = {
    indigo: "from-indigo-500/20 to-indigo-500/10 border-indigo-400/20",
    amber: "from-amber-500/20 to-amber-500/10 border-amber-400/20",
    emerald: "from-emerald-500/20 to-emerald-500/10 border-emerald-400/20",
    violet: "from-violet-500/20 to-violet-500/10 border-violet-400/20",
    cyan: "from-cyan-500/20 to-cyan-500/10 border-cyan-400/20",
    rose: "from-rose-500/20 to-rose-500/10 border-rose-400/20",
  }[color] || "from-indigo-500/20 to-indigo-500/10 border-indigo-400/20";

  return (
    <div className={`rounded-xl border ${colorMap} bg-gradient-to-br p-4`}>
      <div className="text-xs text-white/70 mb-1">{label}</div>
      <div className="text-2xl font-bold text-white flex items-center gap-2">
        {icon ? <span className="text-white/80">{icon}</span> : null}
        <span>{value}</span>
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <div className="text-xs text-white/60">{label}</div>
      <div className="text-lg font-semibold text-white">{value}</div>
    </div>
  );
}
