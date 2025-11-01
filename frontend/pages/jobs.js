import AuthGuard from "../components/guards/AuthGuard";
import { Button, Card } from "../components/ui";

import JobFilters from "../features/jobs/components/JobFilters";
import JobList from "../features/jobs/components/JobList";
import ApplyModal from "../features/jobs/components/ApplyModal";
import JobDetailsModal from "../features/jobs/components/JobDetailsModal";
import Pagination from "../features/jobs/components/Pagination";
import ManualJobModal from "../features/jobs/components/ManualJobModal";
import PageContainer from "../components/layout/PageContainer";
import PageHeader from "../components/layout/PageHeader";

import { useJobs } from "../features/jobs/hooks/useJobs";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { api } from "../lib/api";
import { Sparkles, Chrome, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";


export default function JobsPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const {
    jobs,
    pagination,
    loading,

    // search/filter state + actions (these should already be in your useJobs.js)
    searchTerm, setSearchTerm,
    sortBy, setSortBy,
    sortOrder, setSortOrder,
    locationFilter, setLocationFilter,
    remoteTypeFilter, setRemoteTypeFilter,
    searchSuggestions, showSuggestions, setShowSuggestions, fetchSearchSuggestions,

    // job actions
    openApply, openJobDetails,
    applyState, // { isOpen, targetJob, ... }
    detailsState, // { isOpen, job, mode, ... }
    closeApply,
    closeJobDetails, deleteJob,

    // list expansion
    expandedJobs, toggleJobExpanded,

    // reloader
    reloadJobs
  } = useJobs();

  useEffect(() => {
    const id = router.query?.job ? String(router.query.job) : null;
    if (!id) return;

    const local = jobs.find(j => String(j.id) === id);
    if (local) { openJobDetails(local); return; }

    (async () => {
      try {
        const fetched = await api.getJob(id);
        if (fetched) openJobDetails(fetched);
      } catch { }
    })();
  }, [router.query?.job, jobs, openJobDetails]);

  const closeDetailsAndClearQuery = () => {
    closeJobDetails();
    const q = { ...router.query }; delete q.job;
    router.replace({ pathname: router.pathname, query: q }, undefined, { shallow: true });
  };

  // later
  <JobDetailsModal
    isOpen={detailsState.isOpen}
    job={detailsState.job}
    mode={detailsState.mode}
    onClose={closeDetailsAndClearQuery}
    onSaved={() => reloadJobs(pagination.page)}
  />


  // local: manual job modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [showExtensionBanner, setShowExtensionBanner] = useState(false);

  useEffect(() => {
    // Check backend state for extension banner dismissal
    if (user && !user.has_dismissed_extension_banner) {
      setShowExtensionBanner(true);
    } else {
      setShowExtensionBanner(false);
    }
  }, [user]);

  const dismissExtensionBanner = async () => {
    try {
      await api.post('/profile/extension-banner-dismissed');
      setShowExtensionBanner(false);
      // Refresh user data to update has_dismissed_extension_banner
      await refreshUser();
    } catch (error) {
      console.error('Failed to dismiss extension banner:', error);
      // Still hide it locally even if backend fails
      setShowExtensionBanner(false);
    }
  };

  return (
    <AuthGuard>
      <PageContainer>
        <PageHeader
          title="Job Board"
          subtitle="Discover and track amazing opportunities"
          actions={<span className="text-sm text-slate-400">{pagination.total} job{pagination.total !== 1 ? "s" : ""}</span>}
        />

        {/* Extension Banner - WOW Version */}
        {showExtensionBanner && (
          <div className="mb-8 relative group animate-fade-in">
            {/* Animated gradient border glow - ONLY PULSE */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 via-pink-500 to-yellow-500 rounded-2xl opacity-75 blur-lg group-hover:opacity-100 transition duration-500 animate-pulse"></div>
            
            {/* Main banner container - COMPACT */}
            <div className="relative bg-gradient-to-br from-orange-600 via-red-600 to-pink-600 rounded-2xl overflow-hidden border border-orange-300/30 shadow-2xl">
              {/* Close button */}
              <button
                onClick={dismissExtensionBanner}
                className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all hover:scale-110 hover:rotate-90 duration-300"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4 text-white" />
              </button>
              
              {/* Content - COMPACT */}
              <div className="relative p-6">
                <div className="flex items-center gap-6">
                  {/* MASSIVE Chrome icon - CENTERED VERTICALLY */}
                  <div className="relative flex-shrink-0 self-center">
                    <div className="absolute inset-0 bg-yellow-400/40 rounded-3xl blur-2xl animate-pulse"></div>
                    <div className="relative p-6 rounded-3xl bg-white/20 backdrop-blur-md border-2 border-yellow-400/50 shadow-2xl transform hover:scale-110 transition-transform duration-300">
                      <Chrome className="h-20 w-20 text-white drop-shadow-2xl" />
                      {/* Chrome badge */}
                      <div className="absolute -bottom-2 -right-2 px-2 py-1 bg-yellow-400 text-orange-900 text-xs font-black rounded-full border-2 border-white shadow-lg">
                        FREE
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 pr-8">
                    {/* Headline - Chrome focused, NO TOP BADGE */}
                    <h3 className="text-3xl font-black text-white mb-3 leading-tight tracking-tight">
                      Install Our{' '}
                      <span className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-300 via-orange-300 to-pink-300 bg-clip-text text-transparent">
                        Chrome Extension
                      </span>
                      {' '}& Save Jobs in One Click!
                    </h3>
                    
                    {/* Description - Chrome focused */}
                    <p className="text-orange-100 mb-5 text-base leading-relaxed max-w-2xl">
                      Browse any job site and click the{' '}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded font-bold text-white">
                        <Chrome className="h-3 w-3" />
                        extension icon
                      </span>
                      {' '}to instantly save jobs. It automatically extracts all details—
                      <span className="font-bold text-white">no more copy-pasting</span>!
                    </p>
                    
                    {/* CTA Button - Chrome focused, NO FREE BADGE */}
                    <div className="mb-5">
                      <a
                        href="https://chrome.google.com/webstore"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-3 px-8 py-3.5 bg-white text-orange-600 rounded-xl font-black text-lg hover:bg-yellow-300 hover:text-orange-700 transition-all shadow-xl hover:shadow-2xl hover:scale-105 transform duration-300"
                      >
                        <Chrome className="h-7 w-7 group-hover:rotate-12 transition-transform" />
                        <span>Install Chrome Extension</span>
                        <svg className="h-5 w-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </a>
                    </div>
                    
                    {/* Features - NO BOXES, JUST CHECKMARKS */}
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <svg className="h-5 w-5 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-semibold text-white">All Job Sites</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="h-5 w-5 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-semibold text-white">One-Click Save</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="h-5 w-5 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-semibold text-white">Auto-Extract</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick create card */}
        <Card className="glass-card glass-rose">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <h2 className="text-xl font-semibold text-slate-200">Add New Job</h2>
              </div>
            </div>

            <div className="p-4 border-2 border-dashed border-blue-500/30 bg-blue-900/20 rounded-lg hover:border-blue-400/50 transition-all backdrop-blur-sm">
              <div className="flex items-center space-x-2 mb-2">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <h3 className="font-semibold text-slate-200">Manual Entry</h3>
              </div>
              <p className="text-sm text-slate-400 mb-3">
                Enter job details manually with our user-friendly form
              </p>
              <Button
                onClick={() => setShowManualModal(true)}
                variant="outline"
                className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                type="button"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Create Job Manually
              </Button>
            </div>
          </div>
        </Card>

        {/* Filters */}
        <JobFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          locationFilter={locationFilter}
          setLocationFilter={setLocationFilter}
          remoteTypeFilter={remoteTypeFilter}
          setRemoteTypeFilter={setRemoteTypeFilter}
          searchSuggestions={searchSuggestions}
          showSuggestions={showSuggestions}
          setShowSuggestions={setShowSuggestions}
          fetchSearchSuggestions={fetchSearchSuggestions}
          total={pagination.total}
          resultsCount={jobs.length}
          onClearFilters={() => {
            setSearchTerm("");
            setLocationFilter("");
            setRemoteTypeFilter("");
          }}
        />

        {/* Jobs grid - separated from filters */}
        <div className="mt-8">
          <JobList
            jobs={jobs}
            loading={loading}
            expandedJobs={expandedJobs}
            toggleJobExpanded={toggleJobExpanded}
            onOpenDetails={openJobDetails}
            onOpenApply={openApply}
            onDelete={deleteJob}
          />
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <Pagination
            pagination={pagination}
            loading={loading}
            onGo={(p) => reloadJobs({ page: p })}
          />
        )}
      </PageContainer>

      {/* Modals */}
      <ManualJobModal
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
        onSaved={() => reloadJobs(1)}
      />

      <ApplyModal
        isOpen={applyState.isOpen}
        job={applyState.targetJob}
        onClose={closeApply}
        onApplied={() => reloadJobs(pagination.page)}
      />

      <JobDetailsModal
        isOpen={detailsState.isOpen}
        job={detailsState.job}
        mode={detailsState.mode}
        onClose={closeDetailsAndClearQuery}
        onSaved={() => reloadJobs(pagination.page)}
      />
    </AuthGuard>
  );
}
