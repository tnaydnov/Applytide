import { useEffect, useMemo, useRef, useState } from "react";
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
 *  - premium gate check
 *  - fetching analytics for a selected time range
 *  - exporting CSV/PDF
 *  - UI state for selected tab/metric
 */
export default function useAnalytics(initialRange = "6m") {
  const { isAuthenticated } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(initialRange); // "1m" | "3m" | "6m" | "1y" | "all"
  const [selectedMetric, setSelectedMetric] = useState("overview");
  const [analytics, setAnalytics] = useState(null);

  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // Keeps track of latest request to avoid race conditions on quick switches
  const reqIdRef = useRef(0);

  // ---- Premium Status ------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function checkPremiumStatus() {
      setLoading(true);
      try {
        if (!isAuthenticated) {
          setIsPremium(false);
          return;
        }
        const res = await fetch("/api/user/premium-status", {
          credentials: "include",
        });
        if (res.ok) {
          const { isPremium: premiumFlag } = await res.json();
          if (!cancelled) setIsPremium(!!premiumFlag);
        } else {
          if (!cancelled) setIsPremium(false);
        }
      } catch (err) {
        console.error("Premium status check failed:", err);
        if (!cancelled) setIsPremium(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    checkPremiumStatus();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // ---- Fetch Analytics when premium + timeRange changes --------------------

  useEffect(() => {
    if (!isPremium) return;

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
  }, [isPremium, timeRange, toast]);

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

  // ---- Derived state -------------------------------------------------------

  const premiumGate = useMemo(
    () => ({
      isPremium,
      showPremiumModal,
      openPremiumModal: () => setShowPremiumModal(true),
      closePremiumModal: () => setShowPremiumModal(false),
    }),
    [isPremium, showPremiumModal]
  );

  return {
    // data
    analytics,
    loading,

    // range & tabs
    timeRange,
    setTimeRange,
    selectedMetric,
    setSelectedMetric,

    // premium
    ...premiumGate,

    // actions
    exportReport,
  };
}
