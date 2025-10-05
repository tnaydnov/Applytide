// frontend/features/admin/gdpr/hooks/useGDPR.js
import { useState, useCallback } from 'react';
import { getGDPRStats, listDataRequests, exportUserData, deleteUserData } from '../../../../services/admin';
import toast from '../../../../lib/toast';

export function useGDPRStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getGDPRStats();
      setStats(data);
    } catch (err) {
      setError(err.message);
      toast.error(`Failed to load GDPR stats: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  return { stats, loading, error, refresh: loadStats };
}

export function useDataRequests() {
  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadRequests = useCallback(async (page = 0, limit = 50) => {
    try {
      setLoading(true);
      setError(null);
      const data = await listDataRequests(page, limit);
      setRequests(data.requests);
      setTotal(data.total);
    } catch (err) {
      setError(err.message);
      toast.error(`Failed to load data requests: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  return { requests, total, loading, error, loadRequests };
}

export function useGDPRActions() {
  const [actionLoading, setActionLoading] = useState(false);

  const exportData = async (userId, justification, password) => {
    try {
      setActionLoading(true);
      const result = await exportUserData({ userId, justification, password });
      toast.success('User data export initiated');
      return result;
    } catch (err) {
      toast.error(`Failed to export data: ${err.message}`);
      return null;
    } finally {
      setActionLoading(false);
    }
  };

  const deleteData = async (userId, justification, password) => {
    try {
      setActionLoading(true);
      await deleteUserData({ userId, justification, password });
      toast.success('User data deleted successfully');
      return true;
    } catch (err) {
      toast.error(`Failed to delete data: ${err.message}`);
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  return { actionLoading, exportData, deleteData };
}
