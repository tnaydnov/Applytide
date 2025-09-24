import { useCallback, useState } from "react";
import { api } from "../../../lib/api";

/**
 * Handles running AI analysis on a resume and exposing modal state.
 */
export default function useAnalysis() {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);

  const analyzeResume = useCallback(async (doc) => {
    setAnalyzing(true);
    try {
      const json = await api.analyzeDocument(doc.id);
      setCurrentAnalysis(json);
      setAnalysisModalOpen(true);
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const analyzeResumeWithJob = useCallback(async (doc, { jobId, jobs }) => {
    // If jobId not passed, show a native prompt as a simple fallback
    let useJobId = jobId;
    if (!useJobId && Array.isArray(jobs) && jobs.length) {
      // pick first as a sane default; in your app you can pop JobPickerModal instead
      useJobId = jobs[0].id;
    }
    setAnalyzing(true);
    try {
      const json = await api.analyzeDocument(doc.id, { jobId: useJobId });
      setCurrentAnalysis(json);
      setAnalysisModalOpen(true);
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const exportMarkdown = useCallback(async () => {
    if (!currentAnalysis) return;
    const blob = new Blob([`# Analysis\n\n${JSON.stringify(currentAnalysis, null, 2)}`], {
      type: "text/markdown",
    });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: "analysis.md" });
    a.click();
    URL.revokeObjectURL(url);
  }, [currentAnalysis]);

  const exportPDF = useCallback(async () => {
    // delegate to API or client-side lib later; for now export JSON as .pdf placeholder
    const blob = new Blob([JSON.stringify(currentAnalysis ?? {}, null, 2)], {
      type: "application/pdf",
    });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: "analysis.pdf" });
    a.click();
    URL.revokeObjectURL(url);
  }, [currentAnalysis]);

  return {
    analyzing,
    analysisModalOpen,
    setAnalysisModalOpen,
    currentAnalysis,
    analyzeResume,
    analyzeResumeWithJob,
    exportMarkdown,
    exportPDF,
  };
}
