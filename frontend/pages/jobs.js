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

        {/* Extension Banner */}
        {showExtensionBanner && (
          <div className="mb-6 relative">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl p-6 border border-blue-400/30 shadow-lg">
              <button
                onClick={dismissExtensionBanner}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4 text-white" />
              </button>
              
              <div className="flex items-start gap-4 pr-8">
                <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                  <Chrome className="h-8 w-8 text-white" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-5 w-5 text-yellow-300" />
                    <h3 className="text-xl font-bold text-white">Save Jobs Instantly with Our Chrome Extension!</h3>
                  </div>
                  
                  <p className="text-blue-50 mb-4 text-sm leading-relaxed max-w-3xl">
                    Browse jobs on LinkedIn, Indeed, or any job board and save them to Applytide with a single click. 
                    No more copy-pasting! The extension automatically extracts job details and adds them to your tracker.
                  </p>
                  
                  <div className="flex flex-wrap gap-3">
                    <a
                      href="https://chrome.google.com/webstore"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl"
                    >
                      <Chrome className="h-5 w-5" />
                      Add to Chrome - It's Free!
                    </a>
                  </div>
                  
                  <div className="mt-4 flex items-center gap-4 text-xs text-blue-100">
                    <div className="flex items-center gap-1">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Works on all job sites</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Auto-extracts details</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>100% secure</span>
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
