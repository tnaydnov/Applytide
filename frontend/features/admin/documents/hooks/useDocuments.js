// frontend/features/admin/documents/hooks/useDocuments.js
import { useState, useEffect, useCallback } from 'react';
import { 
  listDocuments, 
  getDocumentDetail,
  getDocumentAnalytics,
  getOrphanedDocuments,
  deleteDocument,
  cleanupOrphanedDocuments
} from '../../../../services/admin';
import { showToast } from '../../../../lib/toast';

export function useDocuments(initialFilters = {}) {
  const [documents, setDocuments] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    page: 0,
    limit: 50,
    user_id: null,
    document_type: null,
    min_size: null,
    max_size: null,
    date_from: null,
    date_to: null,
    sort_by: 'created_at',
    sort_order: 'desc',
    ...initialFilters
  });

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listDocuments(filters);
      setDocuments(data.documents);
      setTotal(data.total);
    } catch (err) {
      setError(err.message);
      showToast.error(`Failed to load documents: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const updateFilters = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const resetFilters = () => {
    setFilters({
      page: 0,
      limit: 50,
      user_id: null,
      document_type: null,
      min_size: null,
      max_size: null,
      date_from: null,
      date_to: null,
      sort_by: 'created_at',
      sort_order: 'desc',
    });
  };

  return {
    documents,
    total,
    loading,
    error,
    filters,
    updateFilters,
    resetFilters,
    refresh: loadDocuments
  };
}

export function useDocumentAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDocumentAnalytics();
      setAnalytics(data);
    } catch (err) {
      setError(err.message);
      showToast.error(`Failed to load analytics: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  return {
    analytics,
    loading,
    error,
    refresh: loadAnalytics
  };
}

export function useOrphanedDocuments() {
  const [orphaned, setOrphaned] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadOrphaned = useCallback(async (limit = 100) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getOrphanedDocuments(limit);
      setOrphaned(data.orphaned_files);
    } catch (err) {
      setError(err.message);
      showToast.error(`Failed to load orphaned documents: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    orphaned,
    loading,
    error,
    loadOrphaned
  };
}

export function useDocumentActions() {
  const [actionLoading, setActionLoading] = useState(false);

  const deleteDoc = async (documentId, justification, password) => {
    try {
      setActionLoading(true);
      await deleteDocument({ documentId, justification, password });
      showToast.success('Document deleted successfully');
      return true;
    } catch (err) {
      showToast.error(`Failed to delete document: ${err.message}`);
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const cleanup = async (justification, password) => {
    try {
      setActionLoading(true);
      const result = await cleanupOrphanedDocuments({ justification, password });
      showToast.success(`Cleaned up ${result.deleted_count} orphaned files, freed ${result.space_freed} storage`);
      return true;
    } catch (err) {
      showToast.error(`Failed to cleanup: ${err.message}`);
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  return {
    actionLoading,
    deleteDoc,
    cleanup
  };
}
