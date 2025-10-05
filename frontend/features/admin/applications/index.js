// frontend/features/admin/applications/index.js
import { useState } from 'react';
import AdminGuard from '../../../components/guards/AdminGuard';
import PageContainer from '../../../components/layout/PageContainer';
import PageHeader from '../../../components/layout/PageHeader';
import { Button } from '../../../components/ui';
import { useApplications, useApplicationAnalytics, useApplicationActions } from './hooks/useApplications';
import { exportToCSV, validateBulkSelection } from './utils/helpers';
import ApplicationsTable from './components/ApplicationsTable';
import StatusPipeline from './components/StatusPipeline';
import ConversionFunnel from './components/ConversionFunnel';
import PasswordPrompt from '../shared/components/PasswordPrompt';
import DeleteConfirm from '../shared/components/DeleteConfirm';

export default function ApplicationsPage() {
  const { applications, total, loading, error, filters, updateFilters, resetFilters, refresh } = useApplications();
  const { analytics, loading: analyticsLoading } = useApplicationAnalytics();
  const { actionLoading, updateStatus, deleteApp, bulkDelete } = useApplicationActions();

  const [selectedIds, setSelectedIds] = useState([]);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    updateFilters({ search: searchTerm, page: 0 });
  };

  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    updateFilters({ status: status || null, page: 0 });
  };

  const handleExport = () => {
    exportToCSV(applications);
  };

  const handleBulkDelete = () => {
    const validation = validateBulkSelection(selectedIds, applications);
    if (!validation.valid) {
      alert(validation.message);
      return;
    }
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = async (password, justification) => {
    const success = await bulkDelete(selectedIds, justification, password);
    if (success) {
      setSelectedIds([]);
      setShowBulkDeleteConfirm(false);
      refresh();
    }
  };

  const handleDeleteSingle = (appId) => {
    setPendingAction({ type: 'delete', id: appId });
    setShowDeleteConfirm(true);
  };

  const confirmDeleteSingle = async (password, justification) => {
    const success = await deleteApp(pendingAction.id, justification, password);
    if (success) {
      setShowDeleteConfirm(false);
      setPendingAction(null);
      refresh();
    }
  };

  return (
    <AdminGuard>
      <PageContainer>
        <PageHeader
          title="Application Management"
          subtitle={`Manage ${total} job applications across all users`}
          actions={
            <div className="flex gap-3">
              <Button onClick={refresh} variant="outline" disabled={loading}>
                Refresh
              </Button>
              <Button onClick={handleExport} variant="outline" disabled={applications.length === 0}>
                Export CSV
              </Button>
            </div>
          }
        />

        {/* Filters */}
        <div className="glass-card p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search applications..."
                className="flex-1 rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-slate-100 placeholder-slate-400 focus:outline-none focus:border-violet-500"
              />
              <Button type="submit" disabled={loading}>Search</Button>
            </form>

            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-slate-100 focus:outline-none focus:border-violet-500"
            >
              <option value="">All Statuses</option>
              <option value="applied">Applied</option>
              <option value="screening">Screening</option>
              <option value="interviewing">Interviewing</option>
              <option value="offer">Offer</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="withdrawn">Withdrawn</option>
            </select>

            <Button onClick={resetFilters} variant="outline">Reset Filters</Button>
          </div>

          {selectedIds.length > 0 && (
            <div className="mt-4 flex items-center justify-between p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg">
              <span className="text-sm text-slate-100">
                {selectedIds.length} application{selectedIds.length !== 1 ? 's' : ''} selected
              </span>
              <Button onClick={handleBulkDelete} variant="danger" size="sm">
                Delete Selected
              </Button>
            </div>
          )}
        </div>

        {/* Analytics Cards */}
        {!analyticsLoading && analytics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <StatusPipeline analytics={analytics} />
            <ConversionFunnel analytics={analytics} />
          </div>
        )}

        {/* Applications Table */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
          </div>
        ) : error ? (
          <div className="glass-card p-6 text-center text-red-300">
            Error: {error}
          </div>
        ) : (
          <>
            <ApplicationsTable
              applications={applications}
              selectedIds={selectedIds}
              onSelectIds={setSelectedIds}
              onViewDetails={(id) => console.log('View details:', id)}
              onUpdateStatus={(app) => console.log('Update status:', app)}
              onDelete={handleDeleteSingle}
            />

            {/* Pagination */}
            {total > filters.limit && (
              <div className="mt-6 flex items-center justify-between glass-card p-4">
                <div className="text-sm text-slate-400">
                  Showing {filters.page * filters.limit + 1} - {Math.min((filters.page + 1) * filters.limit, total)} of {total}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => updateFilters({ page: filters.page - 1 })}
                    disabled={filters.page === 0}
                    variant="outline"
                    size="sm"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() => updateFilters({ page: filters.page + 1 })}
                    disabled={(filters.page + 1) * filters.limit >= total}
                    variant="outline"
                    size="sm"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Modals */}
        {showDeleteConfirm && (
          <DeleteConfirm
            title="Delete Application"
            message="Are you sure you want to delete this application? This action cannot be undone."
            onConfirm={confirmDeleteSingle}
            onCancel={() => {
              setShowDeleteConfirm(false);
              setPendingAction(null);
            }}
            loading={actionLoading}
          />
        )}

        {showBulkDeleteConfirm && (
          <DeleteConfirm
            title="Bulk Delete Applications"
            message={`Are you sure you want to delete ${selectedIds.length} applications? This action cannot be undone.`}
            onConfirm={confirmBulkDelete}
            onCancel={() => setShowBulkDeleteConfirm(false)}
            loading={actionLoading}
          />
        )}
      </PageContainer>
    </AdminGuard>
  );
}
