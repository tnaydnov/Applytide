// frontend/features/admin/gdpr/index.js
import { useState, useEffect } from 'react';
import { useGDPRStats, useDataRequests, useGDPRActions } from './hooks/useGDPR';
import DataRequestsTable from './components/DataRequestsTable';
import ExportPanel from './components/ExportPanel';
import DeletionPanel from './components/DeletionPanel';
import PasswordPrompt from '../shared/components/PasswordPrompt';
import StatsCard from '../shared/components/StatsCard';

export default function GDPRPage() {
  const { stats, loading: statsLoading, refresh: refreshStats } = useGDPRStats();
  const { requests, total, loading: requestsLoading, loadRequests } = useDataRequests();
  const { actionLoading, exportData, deleteData } = useGDPRActions();

  const [exportPrompt, setExportPrompt] = useState(null);
  const [deletePrompt, setDeletePrompt] = useState(null);

  useEffect(() => {
    refreshStats();
    loadRequests();
  }, []);

  const handleExport = async (justification, password) => {
    if (!exportPrompt) return;
    
    const result = await exportData(exportPrompt, justification, password);
    if (result) {
      setExportPrompt(null);
      loadRequests();
    }
  };

  const handleDelete = async (justification, password) => {
    if (!deletePrompt) return;
    
    const success = await deleteData(deletePrompt, justification, password);
    if (success) {
      setDeletePrompt(null);
      loadRequests();
      refreshStats();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
            ⚖️ GDPR Compliance
          </h1>
          <p className="text-gray-400 mt-2">
            Manage data requests, export user data, and ensure GDPR compliance
          </p>
        </div>

        {/* Statistics */}
        {statsLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-violet-500"></div>
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <StatsCard
              title="Total Requests"
              value={stats.total_requests?.toLocaleString() || '0'}
              icon="📋"
              color="violet"
            />
            <StatsCard
              title="Export Requests"
              value={stats.export_requests?.toLocaleString() || '0'}
              icon="📥"
              color="blue"
            />
            <StatsCard
              title="Delete Requests"
              value={stats.delete_requests?.toLocaleString() || '0'}
              icon="🗑️"
              color="red"
            />
            <StatsCard
              title="Pending"
              value={stats.pending_requests?.toLocaleString() || '0'}
              icon="⏳"
              color="yellow"
            />
          </div>
        ) : null}

        {/* Data Requests Table */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">📋 Data Requests History</h2>
          <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
            <DataRequestsTable requests={requests} loading={requestsLoading} />
          </div>
        </div>

        {/* Action Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ExportPanel onExport={(userId) => setExportPrompt(userId)} loading={actionLoading} />
          <DeletionPanel onDelete={(userId) => setDeletePrompt(userId)} loading={actionLoading} />
        </div>

        {/* Export Confirmation */}
        {exportPrompt && (
          <PasswordPrompt
            title="Export User Data"
            message={`Export all data for user ID ${exportPrompt}? This will create a data export package.`}
            onConfirm={handleExport}
            onCancel={() => setExportPrompt(null)}
            requireJustification={true}
            loading={actionLoading}
          />
        )}

        {/* Delete Confirmation */}
        {deletePrompt && (
          <PasswordPrompt
            title="⚠️ DELETE ALL USER DATA"
            message={`You are about to PERMANENTLY DELETE all data for user ID ${deletePrompt}. This includes profile, applications, documents, and all activity logs. THIS ACTION CANNOT BE UNDONE.`}
            onConfirm={handleDelete}
            onCancel={() => setDeletePrompt(null)}
            requireJustification={true}
            justificationMinLength={50}
            loading={actionLoading}
            dangerMode={true}
          />
        )}
      </div>
    </div>
  );
}
