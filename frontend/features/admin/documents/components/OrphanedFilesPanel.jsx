// frontend/features/admin/documents/components/OrphanedFilesPanel.jsx
import { useState, useEffect } from 'react';
import { useOrphanedDocuments, useDocumentActions } from '../hooks/useDocuments';
import { formatFileSize } from '../utils/helpers';
import DeleteConfirm from '../../shared/components/DeleteConfirm';

export default function OrphanedFilesPanel() {
  const { orphaned, loading, loadOrphaned } = useOrphanedDocuments();
  const { actionLoading, cleanup } = useDocumentActions();
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);

  useEffect(() => {
    loadOrphaned();
  }, []);

  const handleCleanup = async (justification, password) => {
    const success = await cleanup(justification, password);
    if (success) {
      setShowCleanupConfirm(false);
      loadOrphaned();
    }
  };

  const totalOrphanedSize = orphaned.reduce((sum, file) => sum + (file.size || 0), 0);

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            🗑️ Orphaned Files
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Files not linked to any database record
          </p>
        </div>
        <button
          onClick={() => loadOrphaned()}
          disabled={loading}
          className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '🔄 Scanning...' : '🔍 Scan'}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500"></div>
          <p className="text-gray-400 mt-2">Scanning for orphaned files...</p>
        </div>
      ) : orphaned.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-green-400">✓ No orphaned files found</p>
          <p className="text-sm text-gray-500 mt-1">All files are properly linked</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <p className="text-yellow-400 font-medium">
                  Found {orphaned.length} orphaned file{orphaned.length !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-yellow-300/70 mt-1">
                  Total storage: {formatFileSize(totalOrphanedSize)} can be freed
                </p>
              </div>
              <button
                onClick={() => setShowCleanupConfirm(true)}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {actionLoading ? '🔄 Cleaning...' : '🧹 Cleanup All'}
              </button>
            </div>
          </div>

          {/* Orphaned Files List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {orphaned.map((file, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-3 bg-gray-900/50 rounded border border-gray-700 hover:border-gray-600 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-white truncate font-mono text-sm">{file.path}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatFileSize(file.size)} · Last modified: {new Date(file.modified).toLocaleString()}
                  </p>
                </div>
                <span className="ml-3 px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                  Orphaned
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Cleanup Confirmation Modal */}
      {showCleanupConfirm && (
        <DeleteConfirm
          title="⚠️ Cleanup Orphaned Files"
          message={`You are about to permanently delete ${orphaned.length} orphaned file${orphaned.length !== 1 ? 's' : ''} (${formatFileSize(totalOrphanedSize)}). This action cannot be undone.`}
          onConfirm={handleCleanup}
          onCancel={() => setShowCleanupConfirm(false)}
          itemName="orphaned files"
          loading={actionLoading}
        />
      )}
    </div>
  );
}
