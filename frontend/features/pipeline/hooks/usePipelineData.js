import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/lib/toast';
import { api, connectWS } from '@/lib/api';
import { DEFAULT_STAGES } from '@/utils/status';

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
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const result = {};
            await Promise.all(
                (currentStages || []).map(async (status) => {
                    try {
                        const data = await api.listCardsByStatus(status);
                        result[status] = Array.isArray(data) ? data : [];
                    } catch {
                        result[status] = [];
                    }
                })
            );
            setColumns(result);

            // Compute stats
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
        } catch {
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
        } finally {
            setLoading(false);
        }
    }, [currentStages, toast]);

    useEffect(() => {
        load();
    }, [load]);

    /* --------------------------------- Filter --------------------------------- */
    useEffect(() => {
        const filtered = {};
        const q = (searchTerm || '').toLowerCase();
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

        (currentStages || []).forEach((status) => {
            const items = Array.isArray(columns?.[status]) ? columns[status] : [];

            const filteredItems = items
                .filter((app) => {
                    // search
                    const title = app?.job?.title?.toLowerCase?.() || '';
                    const company = app?.job?.company_name?.toLowerCase?.() || '';
                    const location = app?.job?.location?.toLowerCase?.() || '';
                    const matchesSearch = !q || title.includes(q) || company.includes(q) || location.includes(q);

                    // filter (recent = 7 days)
                    const created = new Date(app?.created_at || 0).getTime();
                    const matchesFilter =
                        selectedFilter === 'all' ||
                        (selectedFilter === 'recent' && created > weekAgo);

                    // quick status
                    const matchesQuick = !quickStatusFilter || app?.status === quickStatusFilter;

                    return matchesSearch && matchesFilter && matchesQuick;
                })
                .sort((a, b) => {
                    if (sortBy === 'company') {
                        return (a?.job?.company_name || '').localeCompare(b?.job?.company_name || '');
                    }
                    // default: recent (desc)
                    return new Date(b?.created_at || 0) - new Date(a?.created_at || 0);
                });

            filtered[status] = filteredItems;
        });

        setFilteredColumns(filtered);
    }, [columns, searchTerm, selectedFilter, sortBy, currentStages, quickStatusFilter]);

    /* ----------------------------- WS auto-refresh ---------------------------- */
    useEffect(() => {
        try {
            wsRef.current = connectWS((evt) => {
                // Avoid tight reload bursts: simple micro-debounce
                if (evt && (evt.type === 'stage_changed' || evt.type === 'stage_added')) {
                    load();
                    toast.success('Pipeline updated!');
                }
            });
        } catch (err) {
            // Non-fatal; page still works without WS
            console.warn('WS connection failed; realtime off.', err);
        }
        return () => {
            try {
                wsRef.current?.close?.();
            } catch {
                /* noop */
            }
        };
        // Intentionally []: open once
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* --------------------------- Actions: move/delete -------------------------- */
    const move = useCallback(
        async (id, status) => {
            if (!id || !status) return false;
            try {
                await api.moveApp(id, status);
                await load();
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
        async (id) => {
            if (!id) return false;
            try {
                await api.deleteApp(id);
                await load();
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
