// frontend/features/admin/email/hooks/useEmail.js
import { useState, useCallback } from 'react';
import { getEmailStats, listEmailLogs, testEmail } from '../../../../services/admin';
import { showToast } from '../../../../lib/toast';

export function useEmailStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getEmailStats();
      setStats(data);
    } catch (err) {
      setError(err.message);
      showToast.error(`Failed to load email stats: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  return { stats, loading, error, refresh: loadStats };
}

export function useEmailLogs(initialFilters = {}) {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    page: 0,
    limit: 50,
    status: null,
    date_from: null,
    date_to: null,
    ...initialFilters
  });

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listEmailLogs(filters);
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err) {
      setError(err.message);
      showToast.error(`Failed to load email logs: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const updateFilters = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  return { logs, total, loading, error, filters, updateFilters, refresh: loadLogs };
}

export function useEmailActions() {
  const [actionLoading, setActionLoading] = useState(false);

  const sendTestEmail = async (to, subject, body) => {
    try {
      setActionLoading(true);
      await testEmail({ to, subject, body });
      showToast.success(`Test email sent to ${to}`);
      return true;
    } catch (err) {
      showToast.error(`Failed to send test email: ${err.message}`);
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  return { actionLoading, sendTestEmail };
}
