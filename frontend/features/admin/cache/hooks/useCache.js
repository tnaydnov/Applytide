// frontend/features/admin/cache/hooks/useCache.js
import { useState, useCallback } from 'react';
import { getCacheStats, listCacheKeys, getCacheValue, deleteCacheKey, flushCache } from '../../../../services/admin';
import { showToast } from '../../../../lib/toast';

export function useCacheStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCacheStats();
      setStats(data);
    } catch (err) {
      setError(err.message);
      showToast.error(`Failed to load cache stats: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  return { stats, loading, error, refresh: loadStats };
}

export function useCacheKeys(pattern = '*') {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadKeys = useCallback(async (searchPattern = pattern) => {
    try {
      setLoading(true);
      setError(null);
      const data = await listCacheKeys(searchPattern);
      setKeys(data.keys);
    } catch (err) {
      setError(err.message);
      showToast.error(`Failed to load cache keys: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [pattern]);

  return { keys, loading, error, loadKeys };
}

export function useCacheValue(key) {
  const [value, setValue] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadValue = useCallback(async () => {
    if (!key) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await getCacheValue(key);
      setValue(data);
    } catch (err) {
      setError(err.message);
      showToast.error(`Failed to load cache value: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [key]);

  return { value, loading, error, loadValue };
}

export function useCacheActions() {
  const [actionLoading, setActionLoading] = useState(false);

  const deleteKey = async (key, justification, password) => {
    try {
      setActionLoading(true);
      await deleteCacheKey({ key, justification, password });
      showToast.success(`Cache key "${key}" deleted successfully`);
      return true;
    } catch (err) {
      showToast.error(`Failed to delete key: ${err.message}`);
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const flush = async (justification, password) => {
    try {
      setActionLoading(true);
      await flushCache({ justification, password });
      showToast.success('Cache flushed successfully');
      return true;
    } catch (err) {
      showToast.error(`Failed to flush cache: ${err.message}`);
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  return { actionLoading, deleteKey, flush };
}
