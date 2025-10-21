// pages/pipeline.js
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import PageContainer from "../components/layout/PageContainer";
import PageHeader from "../components/layout/PageHeader";

import { Input, Select, Button, Card } from "../components/ui";
import Column from "../features/pipeline/components/Column";
import ApplicationCard from "../features/pipeline/components/ApplicationCard";
import PipelineCustomizer from "../features/pipeline/components/PipelineCustomizer";
import usePipelineData from "../features/pipeline/hooks/usePipelineData";
import { KNOWN_STATUSES } from "../features/pipeline/utils/status";

// Lazy-load large overlays to keep SSR happy
const ApplicationDrawer = dynamic(
  () => import("../features/pipeline/components/ApplicationDrawer").then(m => m.default || m),
  { ssr: false }
);

export default function PipelinePage() {
  const router = useRouter();

  // ---------------- UI state ----------------
  const [view, setView] = useState("board"); // "board" | "cards"
  const [showSettings, setShowSettings] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

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
    archiveApplication,
  } = usePipelineData(showArchived);

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

  const handleArchive = useCallback(
    async (id) => {
      await archiveApplication(id);
    },
    [archiveApplication]
  );

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedFilter("all");
    setSortBy("recent");
    setQuickStatusFilter(null);
    setShowArchived(false);
  };

  return (
    <>
      <Head><title>Pipeline</title></Head>

      <PageContainer>
        <PageHeader
          title="Pipeline"
          subtitle="Manage applications and track your progress"
          actions={
            <div className="flex items-center gap-2">
              <Button variant={view === "cards" ? "default" : "outline"} onClick={() => setView("cards")}>Cards</Button>
              <Button variant={view === "board" ? "default" : "outline"} onClick={() => setView("board")}>Board</Button>
              <Button variant="outline" onClick={() => setShowSettings(true)}>Customize Pipeline</Button>
            </div>
          }
        />

        {/* SUMMARY analytics – always on top (big colorful cards) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <BigStat label="Total Applications" value={stats.totalApps} color="indigo" icon="📄" />
          <BigStat label="In Progress" value={stats.activeApps} color="amber" icon="⏳" />
          <BigStat label="Offers" value={stats.offers} color="emerald" icon="🌱" />
          <BigStat label="Success Rate" value={`${stats.successRate}%`} color="violet" icon="📈" />
          <BigStat label="7d New" value={stats.recentApps} color="cyan" icon="✨" />
          <BigStat label="Rejected" value={stats.rejections} color="rose" icon="⛔" />
        </div>

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
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 transition cursor-pointer">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/10 text-indigo-500 focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-sm text-white/90">
                  {showArchived ? '📦 Show Active' : '📦 Show Archived'}
                </span>
              </label>
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
                onArchive={handleArchive}
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
                  onArchive={handleArchive}
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
      </PageContainer>

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
