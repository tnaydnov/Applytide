import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../../../lib/api';

// Optional helpers that call your backend for job CRUD.
// If you already have nicer API helpers elsewhere, you can swap these.
async function updateJob(id, payload) {
  const resp = await apiFetch(`/jobs/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) throw new Error(`Update failed (${resp.status})`);
  return resp.json().catch(() => ({}));
}

async function deleteJobById(id) {
  const resp = await apiFetch(`/jobs/${id}`, { method: 'DELETE' });
  if (!resp.ok) throw new Error(`Delete failed (${resp.status})`);
  return true;
}

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

  // Track initial mount to prevent loading flicker
  const mountedRef = useRef(false);

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
    // Only show loading state after initial mount to prevent flickering
    if (mountedRef.current) {
      setLoading(true);
    }
    setError(null);

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
      if (e?.name === 'AbortError') return;
      console.error('Load jobs error:', e);
      setError(e?.message || 'Failed to load jobs');
      setJobs([]);
    } finally {
      setLoading(false);
      // Mark as mounted after first successful load
      mountedRef.current = true;
    }
  }, [params]); // Removed pagination.page_size dependency to prevent loops

  // Debounced reload whenever params change (also runs on mount)
  useEffect(() => {
    const t = setTimeout(() => { loadJobs(1); }, options.debounce ?? 300);
    return () => clearTimeout(t);
  }, [params]); // Removed loadJobs and options.debounce dependencies

  // Cleanup on unmount
  useEffect(() => () => { if (abortRef.current) abortRef.current.abort(); }, []);

  // -------------------------
  // Modal state expected by page
  // -------------------------

  // Apply modal
  const [applyState, setApplyState] = useState({
    isOpen: false,
    targetJob: null,
  });

  const openApply = useCallback((job) => {
    setApplyState({ isOpen: true, targetJob: job || null });
  }, []);
  const closeApply = useCallback(() => {
    setApplyState((s) => ({ ...s, isOpen: false }));
  }, []);
  const submitApplyChoice = useCallback(() => {
    // Your ApplyModal handles creating an application + attachments itself.
    // Here we just close & refresh the list.
    closeApply();
    loadJobs(pagination.page);
  }, [closeApply, loadJobs, pagination.page]);

  // Job details modal (view/edit)
  const [detailsState, setDetailsState] = useState({
    isOpen: false,
    job: null,
    mode: 'view', // or 'edit'
    saving: false,
  });

  const openJobDetails = useCallback((job) => {
    setDetailsState({ isOpen: true, job: job || null, mode: 'view', saving: false });
  }, []);
  const closeJobDetails = useCallback(() => {
    setDetailsState((s) => ({ ...s, isOpen: false }));
  }, []);
  const switchToEditMode = useCallback(() => {
    setDetailsState((s) => ({ ...s, mode: 'edit' }));
  }, []);

  const saveJobChanges = useCallback(async (patch) => {
    const job = detailsState.job;
    if (!job?.id) return;
    setDetailsState((s) => ({ ...s, saving: true }));
    try {
      await updateJob(job.id, patch);
      await loadJobs(pagination.page);
      setDetailsState((s) => ({ ...s, saving: false, mode: 'view' }));
    } catch (e) {
      console.error('Save job failed:', e);
      setDetailsState((s) => ({ ...s, saving: false }));
      throw e;
    }
  }, [detailsState.job, loadJobs, pagination.page]);

  const deleteJob = useCallback(async (jobId) => {
    if (!jobId) return;
    try {
      await deleteJobById(jobId);
      await loadJobs(1);
      closeJobDetails();
    } catch (e) {
      console.error('Delete job failed:', e);
      throw e;
    }
  }, [closeJobDetails, loadJobs]);

  // Expanded rows state
  const [expandedJobs, setExpandedJobs] = useState(new Set());
  const toggleJobExpanded = useCallback((jobId) => {
    setExpandedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId); else next.add(jobId);
      return next;
    });
  }, []);

  // Convenience alias the page expects
  const reloadJobs = useCallback(() => loadJobs(pagination.page), [loadJobs, pagination.page]);

  return {
    // list + loading
    jobs,
    loading,
    error,
    pagination,
    setPage: (p) => loadJobs(p),
    refresh: () => loadJobs(pagination.page),

    // filters
    searchTerm, setSearchTerm,
    sortBy, setSortBy,
    sortOrder, setSortOrder,
    locationFilter, setLocationFilter,
    remoteTypeFilter, setRemoteTypeFilter,

    // page-expected extras
    openApply, openJobDetails,
    applyState,
    detailsState,
    submitApplyChoice, closeApply,
    closeJobDetails, switchToEditMode, saveJobChanges, deleteJob,
    expandedJobs, toggleJobExpanded,
    reloadJobs,
  };
}

export default useJobs;
 
