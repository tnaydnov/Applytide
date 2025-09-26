import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../lib/toast";
import {
  fetchAnalytics,
  normalizeAnalytics,
  exportAnalyticsCSV,
  exportAnalyticsPDF,
} from "../../../services/analytics";

/**
 * Centralized hook for the Analytics page.
 * Handles:
 *  - fetching analytics for a selected time range
 *  - exporting CSV/PDF
 *  - UI state for selected tab/metric
 */
export default function useAnalytics(initialRange = "6m") {
  const { isAuthenticated } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState(initialRange); // "1m" | "3m" | "6m" | "1y" | "all"
  const [selectedMetric, setSelectedMetric] = useState("overview");
  const [analytics, setAnalytics] = useState(null);

  // Keeps track of latest request to avoid race conditions on quick switches
  const reqIdRef = useRef(0);

  // ---- Fetch Analytics when authenticated and timeRange changes ------------

  useEffect(() => {
    if (!isAuthenticated) return;

    const myReqId = ++reqIdRef.current;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const raw = await fetchAnalytics(timeRange);
        const normalized = normalizeAnalytics(raw);
        // ignore outdated responses
        if (!cancelled && myReqId === reqIdRef.current) {
          setAnalytics(normalized);
        }
      } catch (err) {
        console.error("Failed to load analytics:", err);
        toast.error("Failed to load analytics data");
      } finally {
        if (!cancelled && myReqId === reqIdRef.current) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [timeRange, toast, isAuthenticated]);

  // ---- Export helpers ------------------------------------------------------

  const exportReport = async (format = "csv") => {
    try {
      if (format === "pdf") {
        await exportAnalyticsPDF(timeRange);
        toast.success("PDF report downloaded successfully");
      } else {
        await exportAnalyticsCSV(timeRange);
        toast.success("CSV data exported successfully");
      }
    } catch (err) {
      console.error("Export failed:", err);
      toast.error(`Failed to export ${format.toUpperCase()} report`);
    }
  };

  return {
    // data
    analytics,
    loading,

    // range & tabs
    timeRange,
    setTimeRange,
    selectedMetric,
    setSelectedMetric,

    // actions
    exportReport,
  };
}
