import { useCallback, useState } from "react";
import api from "../../../lib/api";
import { getDocName } from "../utils/helpers";
import { normalizeAnalysisResponse } from "../utils/analysisExport";
import { exportAnalysisToPDF } from "../utils/pdfExport";
import { exportAnalysisToWord } from "../utils/wordExport";
import { isLLMServiceDown, getLLMErrorMessage } from "../../../lib/llmError";

/**
 * Hook for managing resume/document analysis
 * Clean, focused on React state logic - exports delegated to utils
 */
export default function useAnalysis() {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [llmError, setLlmError] = useState(false);

  const run = useCallback(async (doc, jobId) => {
    setAnalyzing(true);
    setCurrentAnalysis(null);
    setLlmError(false);
    try {
      const resp = await api.analyzeDocument(doc.id, { jobId });
      if (resp?.success === false) throw new Error(resp.error || "Analysis failed");

      const normalized = normalizeAnalysisResponse(resp || {});
      setCurrentAnalysis({
        ...normalized,
        document_name: getDocName(doc),
      });
      setAnalysisModalOpen(true);
    } catch (error) {
      if (isLLMServiceDown(error)) {
        setLlmError(true);
        setAnalysisModalOpen(true); // Open modal to show error
      } else {
        throw error; // Let caller handle other errors
      }
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const analyzeResume = useCallback((doc) => run(doc, undefined), [run]);
  const analyzeResumeWithJob = useCallback((doc, { jobId } = {}) => run(doc, jobId), [run]);

  const exportPDF = useCallback(() => {
    exportAnalysisToPDF(currentAnalysis);
  }, [currentAnalysis]);

  const exportWord = useCallback(() => {
    exportAnalysisToWord(currentAnalysis);
  }, [currentAnalysis]);

  return {
    analyzing,
    analysisModalOpen,
    setAnalysisModalOpen,
    currentAnalysis,
    llmError,
    analyzeResume,
    analyzeResumeWithJob,
    exportPDF,
    exportWord,
  };
}
