import { useCallback, useState } from "react";
import api from "../../../lib/api";
import { getDocName } from "../utils/helpers";

/**
 * Normalize API responses so the UI can always read:
 * - analysis.ats_score
 * - analysis.ai_detailed_analysis.{technical_skills,soft_skills,keywords,formatting,overall_suggestions}
 */
function normalize(resp = {}) {
  // Some responses return AI fields at the root; migrate them under ai_detailed_analysis
  if (resp && (resp.technical_skills || resp.keywords || resp.soft_skills || resp.formatting)) {
    resp.ai_detailed_analysis = {
      technical_skills: resp.technical_skills,
      keywords: resp.keywords,
      soft_skills: resp.soft_skills,
      formatting: resp.formatting,
      overall_suggestions: resp.overall_suggestions,
      ...(resp.ai_detailed_analysis || {}),
    };
  }
  return resp;
}

export default function useAnalysis() {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);

  const run = useCallback(async (doc, jobId) => {
    setAnalyzing(true);
    setCurrentAnalysis(null);
    try {
      const resp = await api.analyzeDocument(doc.id, { jobId });
      if (resp?.success === false) throw new Error(resp.error || "Analysis failed");

      const normalized = normalize(resp || {});
      // keep the raw shape; the modal will derive sections like the original page did
      setCurrentAnalysis({
        ...normalized,
        document_name: getDocName(doc),
      });
      setAnalysisModalOpen(true);
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const analyzeResume = useCallback((doc) => run(doc, undefined), [run]);
  const analyzeResumeWithJob = useCallback((doc, { jobId } = {}) => run(doc, jobId), [run]);

  // Markdown export derived from the raw analysis (no view-model dependency)
  const exportMarkdown = useCallback(() => {
    if (!currentAnalysis) return;

    const { document_name } = currentAnalysis;
    const ats = currentAnalysis.ats_score || {};
    const ai = currentAnalysis.ai_detailed_analysis || {};

    const sections = [
      { key: "technical_skills", title: "Technical Skills", score: ats.technical_skills_score, ai: ai.technical_skills },
      { key: "soft_skills", title: "Soft Skills", score: ats.soft_skills_score, ai: ai.soft_skills },
      { key: "keywords", title: "Keywords", score: ats.keyword_score, ai: ai.keywords },
      { key: "formatting", title: "Formatting", score: ats.formatting_score, ai: ai.formatting },
    ].filter(s => s.score != null || s.ai);

    const lines = [
      `# AI Analysis — ${document_name || "Document"}`,
      ``,
      `**Overall Score:** ${Number(ats.overall_score || 0).toFixed(1)}%`,
      ``,
    ];

    if (typeof currentAnalysis.job_match_summary === "string") {
      lines.push(`> ${currentAnalysis.job_match_summary}`, ``);
    } else if (currentAnalysis.job_match_summary?.summary) {
      lines.push(`> ${currentAnalysis.job_match_summary.summary}`, ``);
    }

    sections.forEach(({ title, score, ai }) => {
      lines.push(`## ${title} — ${Number(score || 0).toFixed(1)}%`);
      lines.push("");
      if (ai?.missing_elements?.length) {
        lines.push(`**Missing elements:** ${ai.missing_elements.join(", ")}`, ``);
      }
      if (ai?.strengths?.length) {
        lines.push(`**Strengths:**`, ...ai.strengths.map((s) => `- ${s}`), ``);
      }
      if (ai?.weaknesses?.length) {
        lines.push(`**Areas to improve:**`, ...ai.weaknesses.map((w) => `- ${w}`), ``);
      }
      if (ai?.improvements?.length) {
        lines.push(`**Suggestions:**`);
        ai.improvements.forEach((imp) => {
          if (imp?.suggestion) lines.push(`- ${imp.suggestion}`);
          if (imp?.example_before && imp?.example_after) {
            lines.push(`  - Before: ${imp.example_before}`, `  - After: ${imp.example_after}`);
          } else if (imp?.example) {
            lines.push(`  - Example: ${imp.example}`);
          }
        });
        lines.push("");
      }
    });

    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(document_name || "analysis").replace(/[^a-z0-9_-]+/gi, "_")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [currentAnalysis]);

  const exportPDF = useCallback(() => {
    // Same behavior as before; reuse markdown exporter for now
    exportMarkdown();
  }, [exportMarkdown]);

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
