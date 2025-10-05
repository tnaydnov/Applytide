// frontend/features/admin/hooks/useApplications.js
import { useState, useEffect, useCallback } from 'react';
import { 
  listApplications, 
  getApplicationDetail,
  getApplicationAnalytics,
  updateApplicationStatus,
  deleteApplication,
  bulkDeleteApplications
} from '../../../../services/admin';
import toast from '../../../../lib/toast';

export function useApplications(initialFilters = {}) {
  const [applications, setApplications] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    page: 0,
    limit: 50,
    search: '',
    status: null,
    date_from: null,
    date_to: null,
    sort_by: 'created_at',
    sort_order: 'desc',
    ...initialFilters
  });

  const loadApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listApplications(filters);
      setApplications(data.applications);
      setTotal(data.total);
    } catch (err) {
      setError(err.message);
      toast.error(`Failed to load applications: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const updateFilters = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const resetFilters = () => {
    setFilters({
      page: 0,
      limit: 50,
      search: '',
      status: null,
      date_from: null,
      date_to: null,
      sort_by: 'created_at',
      sort_order: 'desc',
    });
  };

  return {
    applications,
    total,
    loading,
    error,
    filters,
    updateFilters,
    resetFilters,
    refresh: loadApplications
  };
}

export function useApplicationDetail(applicationId) {
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadApplication = useCallback(async () => {
    if (!applicationId) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await getApplicationDetail(applicationId);
      setApplication(data);
    } catch (err) {
      setError(err.message);
      toast.error(`Failed to load application: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    loadApplication();
  }, [loadApplication]);

  return {
    application,
    loading,
    error,
    refresh: loadApplication
  };
}

export function useApplicationAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getApplicationAnalytics();
      setAnalytics(data);
    } catch (err) {
      setError(err.message);
      toast.error(`Failed to load analytics: ${err.message}`);
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

export function useApplicationActions() {
  const [actionLoading, setActionLoading] = useState(false);

  const updateStatus = async (applicationId, status, notes, justification, password) => {
    try {
      setActionLoading(true);
      await updateApplicationStatus({ applicationId, status, notes, justification, password });
      toast.success('Application status updated successfully');
      return true;
    } catch (err) {
      toast.error(`Failed to update status: ${err.message}`);
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const deleteApp = async (applicationId, justification, password) => {
    try {
      setActionLoading(true);
      await deleteApplication({ applicationId, justification, password });
      toast.success('Application deleted successfully');
      return true;
    } catch (err) {
      toast.error(`Failed to delete application: ${err.message}`);
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const bulkDelete = async (applicationIds, justification, password) => {
    try {
      setActionLoading(true);
      const result = await bulkDeleteApplications({ applicationIds, justification, password });
      toast.success(`Successfully deleted ${result.deleted_count} applications`);
      return true;
    } catch (err) {
      toast.error(`Failed to bulk delete: ${err.message}`);
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  return {
    actionLoading,
    updateStatus,
    deleteApp,
    bulkDelete
  };
}
