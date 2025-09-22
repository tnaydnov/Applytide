import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../../../lib/api';

export function useJobs(options = {}) {
  const pageSize = options.pageSize ?? 12;

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    page_size: pageSize,
    pages: 1,
    has_next: false,
    has_prev: false,
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at'); // 'created_at' | 'title'
  const [sortOrder, setSortOrder] = useState('desc');  // 'asc' | 'desc'
  const [locationFilter, setLocationFilter] = useState('');
  const [remoteTypeFilter, setRemoteTypeFilter] = useState('');

  const params = useMemo(() => ({
    q: searchTerm.trim(),
    sort: sortBy,
    order: sortOrder,
    location: locationFilter.trim(),
    remote_type: remoteTypeFilter,
  }), [searchTerm, sortBy, sortOrder, locationFilter, remoteTypeFilter]);

  const abortRef = useRef();

  const loadJobs = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);

    // cancel in-flight
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const qs = new URLSearchParams({
        page: String(page),
        page_size: String(pagination.page_size),
        sort: params.sort,
        order: params.order,
      });
      if (params.q) qs.append('q', params.q);
      if (params.location) qs.append('location', params.location);
      if (params.remote_type) qs.append('remote_type', params.remote_type);

      const resp = await apiFetch(`/jobs?${qs.toString()}`, { signal: ac.signal });
      const data = await resp.json();

      setJobs(Array.isArray(data.items) ? data.items : []);
      setPagination({
        total: data.total ?? 0,
        page: data.page ?? page,
        page_size: data.page_size ?? pagination.page_size,
        pages: data.pages ?? 1,
        has_next: !!data.has_next,
        has_prev: !!data.has_prev,
      });
    } catch (e) {
      if (e?.name === 'AbortError') return; // ignore race
      console.error('Load jobs error:', e);
      setError(e?.message || 'Failed to load jobs');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [params, pagination.page_size]);

  // Debounced reload whenever params change (also runs on mount)
  useEffect(() => {
    const t = setTimeout(() => { loadJobs(1); }, options.debounce ?? 300);
    return () => clearTimeout(t);
  }, [params, loadJobs, options.debounce]);

  // Cleanup on unmount
  useEffect(() => () => { if (abortRef.current) abortRef.current.abort(); }, []);

  return {
    jobs,
    loading,
    error,
    pagination,
    setPage: (p) => loadJobs(p),
    refresh: () => loadJobs(pagination.page),

    // expose filters
    searchTerm, setSearchTerm,
    sortBy, setSortBy,
    sortOrder, setSortOrder,
    locationFilter, setLocationFilter,
    remoteTypeFilter, setRemoteTypeFilter,
  };
}

export default useJobs;
