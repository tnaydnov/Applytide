// frontend/features/admin/documents/index.js
import { useState } from 'react';
import { useDocuments, useDocumentAnalytics, useDocumentActions } from './hooks/useDocuments';
import DocumentsTable from './components/DocumentsTable';
import StorageDashboard from './components/StorageDashboard';
import OrphanedFilesPanel from './components/OrphanedFilesPanel';
import DeleteConfirm from '../shared/components/DeleteConfirm';
import { DOCUMENT_TYPES, exportToCSV, validateSizeFilter } from './utils/helpers';

export default function DocumentsPage() {
  const [activeTab, setActiveTab] = useState('documents'); // documents, analytics, orphaned
  const { documents, total, loading, filters, updateFilters, resetFilters, refresh } = useDocuments();
  const { analytics, loading: analyticsLoading, refresh: refreshAnalytics } = useDocumentAnalytics();
  const { actionLoading, deleteDoc } = useDocumentActions();
  
  const [selected, setSelected] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [minSize, setMinSize] = useState('');
  const [maxSize, setMaxSize] = useState('');

  // Selection handlers
  const handleSelect = (id, checked) => {
    setSelected(checked ? [...selected, id] : selected.filter(i => i !== id));
  };

  const handleSelectAll = (checked) => {
    setSelected(checked ? documents.map(d => d.id) : []);
  };

  // Delete handlers
  const handleDelete = async (justification, password) => {
    if (!deleteTarget) return;
    
    const success = await deleteDoc(deleteTarget.id, justification, password);
    if (success) {
      setDeleteTarget(null);
      refresh();
      refreshAnalytics();
    }
  };

  // Filter handlers
  const applyFilters = () => {
    const sizeValidation = validateSizeFilter(
      minSize ? parseFloat(minSize) * 1024 * 1024 : null, 
      maxSize ? parseFloat(maxSize) * 1024 * 1024 : null
    );
    
    if (!sizeValidation.valid) {
      alert(sizeValidation.message);
      return;
    }
    
    updateFilters({
      page: 0,
      document_type: typeFilter || null,
      min_size: minSize ? parseFloat(minSize) * 1024 * 1024 : null,
      max_size: maxSize ? parseFloat(maxSize) * 1024 * 1024 : null,
    });
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setTypeFilter('');
    setMinSize('');
    setMaxSize('');
    resetFilters();
  };

  // Export handler
  const handleExport = () => {
    exportToCSV(documents);
  };

  // Pagination
  const currentPage = filters.page + 1;
  const totalPages = Math.ceil(total / filters.limit);

  const handlePageChange = (newPage) => {
    updateFilters({ page: newPage - 1 });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
            📄 Documents Management
          </h1>
          <p className="text-gray-400 mt-2">
            Manage user documents, storage, and cleanup orphaned files
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'documents'
                ? 'text-violet-400 border-b-2 border-violet-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            📋 Documents ({total})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'analytics'
                ? 'text-violet-400 border-b-2 border-violet-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            📊 Storage Analytics
          </button>
          <button
            onClick={() => setActiveTab('orphaned')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'orphaned'
                ? 'text-violet-400 border-b-2 border-violet-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🗑️ Orphaned Files
          </button>
        </div>

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <>
            {/* Filters */}
            <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">🔍 Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Search</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search files..."
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Document Type</label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white focus:border-violet-500 focus:outline-none"
                  >
                    <option value="">All Types</option>
                    {DOCUMENT_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Min Size (MB)</label>
                  <input
                    type="number"
                    value={minSize}
                    onChange={(e) => setMinSize(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Max Size (MB)</label>
                  <input
                    type="number"
                    value={maxSize}
                    onChange={(e) => setMaxSize(e.target.value)}
                    placeholder="∞"
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:border-violet-500 focus:outline-none"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-4">
                <button
                  onClick={applyFilters}
                  className="px-4 py-2 bg-violet-500 text-white rounded hover:bg-violet-600 transition-colors"
                >
                  Apply Filters
                </button>
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={handleExport}
                  className="ml-auto px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                >
                  📥 Export CSV
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
              <DocumentsTable
                documents={documents}
                loading={loading}
                onDelete={(doc) => setDeleteTarget(doc)}
                selected={selected}
                onSelect={handleSelect}
                onSelectAll={handleSelectAll}
              />
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-gray-400">
                  Showing {(currentPage - 1) * filters.limit + 1} to {Math.min(currentPage * filters.limit, total)} of {total} documents
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Previous
                  </button>
                  <span className="px-4 py-2 bg-gray-800 text-white rounded">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <StorageDashboard analytics={analytics} loading={analyticsLoading} />
        )}

        {/* Orphaned Files Tab */}
        {activeTab === 'orphaned' && (
          <OrphanedFilesPanel />
        )}

        {/* Delete Confirmation Modal */}
        {deleteTarget && (
          <DeleteConfirm
            title="Delete Document"
            message={`Are you sure you want to delete "${deleteTarget.file_name}"? This will permanently remove the file from storage.`}
            onConfirm={handleDelete}
            onCancel={() => setDeleteTarget(null)}
            itemName={deleteTarget.file_name}
            loading={actionLoading}
          />
        )}
      </div>
    </div>
  );
}
