// frontend/features/admin/cache/index.js
import { useState, useEffect } from 'react';
import { useCacheStats, useCacheKeys, useCacheValue, useCacheActions } from './hooks/useCache';
import CacheStats from './components/CacheStats';
import KeyBrowser from './components/KeyBrowser';
import ValueViewer from './components/ValueViewer';
import DeleteConfirm from '../shared/components/DeleteConfirm';
import PasswordPrompt from '../shared/components/PasswordPrompt';

export default function CachePage() {
  const { stats, loading: statsLoading, refresh: refreshStats } = useCacheStats();
  const { keys, loading: keysLoading, loadKeys } = useCacheKeys();
  const { value, loading: valueLoading, loadValue } = useCacheValue();
  const { actionLoading, deleteKey, flush } = useCacheActions();

  const [selectedKey, setSelectedKey] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showFlushConfirm, setShowFlushConfirm] = useState(false);

  useEffect(() => {
    refreshStats();
    loadKeys('*');
  }, []);

  const handleSelectKey = (key) => {
    setSelectedKey(key);
  };

  const handleDeleteKey = async (justification, password) => {
    if (!deleteTarget) return;

    const success = await deleteKey(deleteTarget, justification, password);
    if (success) {
      setDeleteTarget(null);
      if (selectedKey === deleteTarget) {
        setSelectedKey(null);
      }
      loadKeys('*');
      refreshStats();
    }
  };

  const handleFlushCache = async (justification, password) => {
    const success = await flush(justification, password);
    if (success) {
      setShowFlushConfirm(false);
      setSelectedKey(null);
      loadKeys('*');
      refreshStats();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
            🔑 Cache Management
          </h1>
          <p className="text-gray-400 mt-2">
            Monitor Redis cache, browse keys, and manage cache data
          </p>
        </div>

        {/* Statistics */}
        <div className="mb-8">
          <CacheStats 
            stats={stats} 
            loading={statsLoading} 
            onRefresh={refreshStats} 
          />
        </div>

        {/* Danger Zone */}
        <div className="mb-8 bg-red-900/10 border border-red-500/30 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h3>
              <p className="text-sm text-red-300/70 mb-4">
                Flushing the cache will delete ALL cached data. This action cannot be undone and may cause temporary performance degradation.
              </p>
              <button
                onClick={() => setShowFlushConfirm(true)}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                🧹 Flush All Cache
              </button>
            </div>
          </div>
        </div>

        {/* Key Browser and Value Viewer */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">🗂️ Key Browser</h2>
            <KeyBrowser
              keys={keys}
              loading={keysLoading}
              onSearch={loadKeys}
              onSelectKey={handleSelectKey}
              onDeleteKey={(key) => setDeleteTarget(key)}
              selectedKey={selectedKey}
            />
          </div>

          <div>
            <h2 className="text-xl font-semibold text-white mb-4">📄 Value Viewer</h2>
            <ValueViewer
              cacheKey={selectedKey}
              value={selectedKey ? value : null}
              loading={valueLoading}
              onLoad={loadValue}
            />
          </div>
        </div>

        {/* Delete Key Confirmation */}
        {deleteTarget && (
          <DeleteConfirm
            title="Delete Cache Key"
            message={`Are you sure you want to delete the cache key "${deleteTarget}"? This action cannot be undone.`}
            onConfirm={handleDeleteKey}
            onCancel={() => setDeleteTarget(null)}
            itemName={deleteTarget}
            loading={actionLoading}
          />
        )}

        {/* Flush Cache Confirmation */}
        {showFlushConfirm && (
          <PasswordPrompt
            title="⚠️ Flush All Cache"
            message="You are about to flush ALL cache data. This will delete every key in Redis and cannot be undone. Are you absolutely sure?"
            onConfirm={handleFlushCache}
            onCancel={() => setShowFlushConfirm(false)}
            requireJustification={true}
            justificationMinLength={30}
            loading={actionLoading}
            dangerMode={true}
          />
        )}
      </div>
    </div>
  );
}
