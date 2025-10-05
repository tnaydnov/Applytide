// frontend/features/admin/storage/hooks/useStorage.js
import { useState, useCallback } from 'react';
import { getStorageStats, getStorageByUser } from '../../../../services/admin';
import toast from '../../../../lib/toast';

export function useStorageStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getStorageStats();
      setStats(data);
    } catch (err) {
      setError(err.message);
      toast.error(`Failed to load storage stats: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  return { stats, loading, error, refresh: loadStats };
}

export function useStorageByUser() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadUsers = useCallback(async (limit = 100) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getStorageByUser(limit);
      setUsers(data.users);
    } catch (err) {
      setError(err.message);
      toast.error(`Failed to load user storage: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  return { users, loading, error, loadUsers };
}
