import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '../../../lib/toast';
import { api, connectWS } from '../../../lib/api';
import { DEFAULT_STAGES } from '../utils/status';

/**
 * Centralized data layer for the Pipeline page:
 * - Initializes stages (reads used statuses + saved preference)
 * - Persists reordered stages (with debounce)
 * - Loads applications per stage and computes stats
 * - Exposes filtered views (search/filter/sort/quick status)
 * - Listens to WS events to auto-refresh
 * - Move/Delete actions with safe error handling
 */
export function usePipelineData() {
    const toast = useToast();
    const wsRef = useRef(null);

    /* ------------------------------- UI state ------------------------------- */
    const [currentStages, setCurrentStages] = useState(DEFAULT_STAGES);

    // Raw columns keyed by status (unfiltered)
    const [columns, setColumns] = useState({});
    const [filteredColumns, setFilteredColumns] = useState({});

    const [loading, setLoading] = useState(true);

    // Display stats
    const [stats, setStats] = useState({
        totalApps: 0,
        activeApps: 0,
        offers: 0,
        rejections: 0,
        successRate: 0,
        recentApps: 0,
        conversionRate: 0,
        topCompanies: [],
    });

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFilter, setSelectedFilter] = useState('all'); // 'all' | 'recent'
    const [sortBy, setSortBy] = useState('recent'); // 'recent' | 'company'
    const [quickStatusFilter, setQuickStatusFilter] = useState(null); // status name or null

    const hasAnyApplications = useMemo(
        () => Object.values(columns).flat().length > 0,
        [columns]
    );
    const hasFilteredResults = useMemo(
        () => Object.values(filteredColumns).flat().length > 0,
        [filteredColumns]
    );

    /* -------------------------- Initialize stage order ------------------------- */
    useEffect(() => {
        let cancelled = false;
        async function initializeStages() {
            try {
                const usedStatuses = await api.getUsedStatuses().catch(() => []);
                const savedPref = await api.getPreference('pipeline_stages').catch(() => null);
                const savedStages = savedPref?.preference_value?.stages;

                let initial;
                if (Array.isArray(savedStages) && savedStages.length > 0) {
                    // Ensure any newly used statuses get appended
                    const missing = (usedStatuses || []).filter((s) => !savedStages.includes(s));
                    initial = missing.length ? [...savedStages, ...missing] : savedStages;
                } else {
                    initial = [...new Set([...(DEFAULT_STAGES || []), ...(usedStatuses || [])])];
                }
                if (!cancelled) setCurrentStages(initial);
            } catch {
                if (!cancelled) setCurrentStages(DEFAULT_STAGES);
            }
        }
        initializeStages();
        return () => {
            cancelled = true;
        };
    }, []);

    /* ------------------------ Persist preference (debounced) ------------------- */
    useEffect(() => {
        if (!Array.isArray(currentStages) || currentStages.length === 0) return;

        const isDefault =
            currentStages.length === DEFAULT_STAGES.length &&
            currentStages.every((s, i) => s === DEFAULT_STAGES[i]);

        if (isDefault) return;

        const id = setTimeout(async () => {
            try {
                await api.savePreference('pipeline_stages', { stages: currentStages });
            } catch {
                // Silent fail; non-blocking UX
            }
        }, 800);

        return () => clearTimeout(id);
    }, [currentStages]);

    /* ---------------------------------- Load ---------------------------------- */
    // Cache for API responses to reduce redundant fetches
    const apiCache = useRef({});
    
    // Function to load a single stage
    const loadSingleStage = useCallback(async (status) => {
        try {
            const cacheKey = `status_${status}`;
            const cacheEntry = apiCache.current[cacheKey];
            
            // Check if we have a recent cache entry (within 30 seconds)
            const now = Date.now();
            if (cacheEntry && (now - cacheEntry.timestamp < 30000)) {
                console.info(`[cache] Using cached data for ${status}`);
                return cacheEntry.data;
            }
            
            // Fetch the data
            const data = await api.listCardsByStatus(status);
            const validData = Array.isArray(data) ? data : [];
            
            // Update cache
            apiCache.current[cacheKey] = {
                data: validData,
                timestamp: now
            };
            
            return validData;
        } catch {
            // In case of error, return empty array
            return [];
        }
    }, []);

    // Optimized load function that can selectively update only certain stages
    const load = useCallback(async (specificStages = null) => {
        // If no specific stages are provided, load all stages
        const stagesToLoad = specificStages || currentStages || [];
        
        setLoading(prev => {
            // Only set loading to true if we're loading all stages
            return !specificStages ? true : prev;
        });
        
        try {
            // Clone the current columns for partial updates
            const result = { ...columns };
            
            // Only fetch the stages we need
            await Promise.all(
                stagesToLoad.map(async (status) => {
                    result[status] = await loadSingleStage(status);
                })
            );
            
            // Update the columns with the new data
            setColumns(result);

            // Compute stats (only if this is a full load or we need to update stats)
            if (!specificStages || specificStages.length > 1) {
                const allApps = Object.values(result).flat();
                const totalApps = allApps.length;

                const activeApps =
                    (result['Applied']?.length || 0) +
                    (result['Phone Screen']?.length || 0) +
                    (result['Tech']?.length || 0) +
                    (result['On-site']?.length || 0);

                const offers = (result['Offer']?.length || 0) + (result['Accepted']?.length || 0);
                const rejections = result['Rejected']?.length || 0;

                const successRate = totalApps ? Math.round((offers / totalApps) * 100) : 0;

                const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
                const recentApps = allApps.filter(
                    (app) => new Date(app?.created_at || 0).getTime() > weekAgo
                ).length;

                const appliedCount = result['Applied']?.length || 0;
                const conversionRate = appliedCount
                    ? Math.round((activeApps / appliedCount) * 100)
                    : 0;

                const topCompaniesObj = allApps.reduce((acc, app) => {
                    const c = app?.job?.company_name;
                    if (c) acc[c] = (acc[c] || 0) + 1;
                    return acc;
                }, {});
                const topCompanies = Object.entries(topCompaniesObj)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5);

                setStats({
                    totalApps,
                    activeApps,
                    offers,
                    rejections,
                    successRate,
                    recentApps,
                    conversionRate,
                    topCompanies,
                });
            }
        } catch (err) {
            console.error('Failed to load pipeline data:', err);
            
            // Only show toast and reset data on full load failures
            if (!specificStages) {
                toast.error('Failed to load pipeline data');
                setColumns({});
                setStats({
                    totalApps: 0,
                    activeApps: 0,
                    offers: 0,
                    rejections: 0,
                    successRate: 0,
                    recentApps: 0,
                    conversionRate: 0,
                    topCompanies: [],
                });
            }
        } finally {
            // Only set loading to false if we set it to true
            if (!specificStages) {
                setLoading(false);
            }
        }
    }, [currentStages, columns, toast, loadSingleStage]);

    useEffect(() => {
        load();
    }, [load]);

    /* --------------------------------- Filter --------------------------------- */
    // Create a stable filter function that we can memoize
    const filterApp = useCallback((app, q, weekAgo, filterType, quickFilter) => {
        // search
        const title = app?.job?.title?.toLowerCase?.() || '';
        const company = app?.job?.company_name?.toLowerCase?.() || '';
        const location = app?.job?.location?.toLowerCase?.() || '';
        const matchesSearch = !q || title.includes(q) || company.includes(q) || location.includes(q);

        // filter (recent = 7 days)
        const created = new Date(app?.created_at || 0).getTime();
        const matchesFilter =
            filterType === 'all' ||
            (filterType === 'recent' && created > weekAgo);

        // quick status
        const matchesQuick = !quickFilter || app?.status === quickFilter;

        return matchesSearch && matchesFilter && matchesQuick;
    }, []);
    
    // Memoize the sort function to avoid recreating it on each render
    const sortApps = useCallback((a, b, sortType) => {
        if (sortType === 'company') {
            return (a?.job?.company_name || '').localeCompare(b?.job?.company_name || '');
        }
        // default: recent (desc)
        return new Date(b?.created_at || 0) - new Date(a?.created_at || 0);
    }, []);

    // Generate the filtered columns using memoization to avoid unnecessary recalculations
    useEffect(() => {
        const q = (searchTerm || '').toLowerCase();
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        
        // Track if anything changed
        let hasChanges = false;
        
        // Create a new filtered columns object only if we need to
        const filtered = {};
        
        (currentStages || []).forEach((status) => {
            const items = Array.isArray(columns?.[status]) ? columns[status] : [];
            
            // Filter and sort the items for this column
            const filteredItems = items
                .filter(app => filterApp(app, q, weekAgo, selectedFilter, quickStatusFilter))
                .sort((a, b) => sortApps(a, b, sortBy));
                
            filtered[status] = filteredItems;
            
            // Check if this column has changed
            const prevColumn = filteredColumns[status];
            if (!prevColumn || 
                prevColumn.length !== filteredItems.length || 
                JSON.stringify(prevColumn.map(a => a.id)) !== JSON.stringify(filteredItems.map(a => a.id))) {
                hasChanges = true;
            }
        });
        
        // Only update state if something actually changed
        if (hasChanges || Object.keys(filtered).length !== Object.keys(filteredColumns).length) {
            setFilteredColumns(filtered);
        }
    }, [columns, searchTerm, selectedFilter, sortBy, currentStages, quickStatusFilter, filterApp, sortApps, filteredColumns]);

    /* ----------------------------- WS auto-refresh ---------------------------- */
    const wsUpdateTimeoutRef = useRef(null);
    const lastUpdateRef = useRef(0);
    
    // Debounced update function to prevent multiple rapid reloads
    const handleWsUpdate = useCallback((evt) => {
        // Don't refresh if we just loaded data recently (within last 2 seconds)
        const now = Date.now();
        if (now - lastUpdateRef.current < 2000) {
            console.info('[ws] Ignoring rapid update, throttling');
            return;
        }

        // Clear any pending update
        if (wsUpdateTimeoutRef.current) {
            clearTimeout(wsUpdateTimeoutRef.current);
        }

        // Debounce updates to prevent multiple reloads
        wsUpdateTimeoutRef.current = setTimeout(() => {
            console.info(`[ws] Processing ${evt?.type} update`);
            
            // Only reload columns for the affected status instead of everything
            if (evt?.status && (evt?.type === 'stage_changed' || evt?.type === 'stage_added')) {
                // Use our optimized load function to only update affected stages
                load([evt.status]);
                toast.success('Column updated');
            } else {
                // Full reload for other events
                load();
                toast.success('Pipeline updated');
            }
            
            lastUpdateRef.current = now;
            wsUpdateTimeoutRef.current = null;
        }, 300);
    }, [load, toast]);

    useEffect(() => {
        try {
            wsRef.current = connectWS((evt) => {
                if (evt && (evt.type === 'stage_changed' || evt.type === 'stage_added')) {
                    handleWsUpdate(evt);
                }
            });
        } catch (err) {
            // Non-fatal; page still works without WS
            console.warn('WS connection failed; realtime off.', err);
        }
        
        return () => {
            try {
                if (wsUpdateTimeoutRef.current) {
                    clearTimeout(wsUpdateTimeoutRef.current);
                }
                wsRef.current?.close?.();
            } catch {
                /* noop */
            }
        };
    // Dependency array includes the debounced handler
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [handleWsUpdate]);

    /* --------------------------- Actions: move/delete -------------------------- */
    const move = useCallback(
        async (id, status, fromStatus = null) => {
            if (!id || !status) return false;
            try {
                const result = await api.moveApp(id, status);
                
                // We need to update both the source and destination columns
                const stagesToUpdate = [status];
                if (fromStatus && fromStatus !== status) {
                    stagesToUpdate.push(fromStatus);
                }
                
                // Selectively update only the affected columns
                await load(stagesToUpdate);
                
                toast.success(`Application moved to ${status}`);

                // 🎉 Celebrate wins here (client-only)
                if (
                    typeof window !== "undefined" &&
                    (status === "Offer" || status === "Accepted")
                ) {
                    try {
                        const { default: confetti } = await import("canvas-confetti");
                        confetti?.({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
                    } catch {
                        /* non-fatal */
                    }
                }

                return true;
            } catch (err) {
                if (err?.message === 'Auth expired') toast.error('Session expired, please refresh the page');
                else toast.error('Failed to move application');
                return false;
            }
        },
        [load, toast]
    );

    const deleteApplication = useCallback(
        async (id, status = null) => {
            if (!id) return false;
            try {
                await api.deleteApp(id);
                
                // If we know the status, only update that column
                if (status) {
                    await load([status]);
                } else {
                    // Otherwise do a full reload
                    await load();
                }
                
                toast.success('Application deleted successfully');
                return true;
            } catch {
                toast.error('Failed to delete application');
                return false;
            }
        },
        [load, toast]
    );

    /* --------------------------------- Return -------------------------------- */
    return {
        // data
        currentStages,
        setCurrentStages,
        columns,
        filteredColumns,
        loading,
        stats,

        // filter state
        searchTerm,
        setSearchTerm,
        selectedFilter,
        setSelectedFilter,
        sortBy,
        setSortBy,
        quickStatusFilter,
        setQuickStatusFilter,

        // derived
        hasAnyApplications,
        hasFilteredResults,

        // actions
        reload: load,
        move,
        deleteApplication,
    };
}

export default usePipelineData;