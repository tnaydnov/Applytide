import AuthGuard from "../components/AuthGuard";
import { Button, Card } from "../components/ui";

import JobFilters from "../features/jobs/components/JobFilters";
import JobList from "../features/jobs/components/JobList";
import ApplyModal from "../features/jobs/components/ApplyModal";
import JobDetailsModal from "../features/jobs/components/JobDetailsModal";
import Pagination from "../features/jobs/components/Pagination";
import ManualJobModal from "../features/jobs/components/ManualJobModal";

import { useJobs } from "../features/jobs/hooks/useJobs";
import { useState } from "react";


export default function JobsPage() {
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

  // local: manual job modal
  const [showManualModal, setShowManualModal] = useState(false);

  return (
    <AuthGuard>
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div>
                <h1 className="text-3xl font-bold text-slate-200">Job Board</h1>
                <p className="text-slate-400 mt-1">Discover and track amazing opportunities</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-400">
                  {pagination.total} job{pagination.total !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

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

            {/* Jobs grid */}
            <JobList
              jobs={jobs}
              loading={loading}
              expandedJobs={expandedJobs}
              toggleJobExpanded={toggleJobExpanded}
              onOpenDetails={openJobDetails}
              onOpenApply={openApply}
              onDelete={deleteJob}
            />

            {/* Pagination */}
            {pagination.pages > 1 && (
              <Pagination
                pagination={pagination}
                loading={loading}
                onGo={(p) => reloadJobs({ page: p })}
              />
            )}
          </div>
        </div>
      </div>

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
        onClose={closeJobDetails}
        onSaved={() => reloadJobs(pagination.page)}
      />
    </AuthGuard>
  );
}
