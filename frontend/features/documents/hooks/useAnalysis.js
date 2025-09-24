import { useCallback, useState } from "react";
import api from "../../../lib/api";
import { getDocName } from "../utils/helpers";

/**
 * Convert backend analysis to the view-model expected by AnalysisModal
 */
function toViewModel(resp = {}) {
  const ats = resp.ats_score || {};
  const ai = resp.ai_detailed_analysis || {};
  const overall = Number(ats.overall_score ?? 0);

  const categories = [];

  if (ats.technical_skills_score != null) {
    categories.push({
      key: "technical_skills",
      title: "Technical Skills",
      score: Number(ats.technical_skills_score || 0),
      description: "How well your technical skills align with the job requirements.",
      ai: ai.technical_skills || {},
    });
  }
  if (ats.soft_skills_score != null) {
    categories.push({
      key: "soft_skills",
      title: "Soft Skills",
      score: Number(ats.soft_skills_score || 0),
      description: "Presence and strength of role-relevant soft skills.",
      ai: ai.soft_skills || {},
    });
  }
  // Show if either the score exists OR AI keyword data exists
  if (ats.keyword_score != null || ai.keywords) {
    categories.push({
      key: "keywords",
      title: "Keywords",
      score: Number(ats.keyword_score || 0),
      description: "Match with job-specific and industry keywords.",
      ai: ai.keywords || {},
    });
  }
  if (ats.formatting_score != null) {
    categories.push({
      key: "formatting",
      title: "Formatting",
      score: Number(ats.formatting_score || 0),
      description: "ATS-friendliness and overall structure.",
      ai: ai.formatting || {},
    });
  }

  const summary =
    typeof resp.job_match_summary === "string"
      ? resp.job_match_summary
      : resp.job_match_summary?.summary || resp.summary || "";

  return {
    overall_score: overall,
    summary,
    categories,
    // keep raw around in case you need it for exports
    _raw: resp,
  };
}

export default function useAnalysis() {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [currentDocName, setCurrentDocName] = useState("Document");

  const run = useCallback(
    async (doc, jobId) => {
      setAnalyzing(true);
      setCurrentAnalysis(null);
      setCurrentDocName(getDocName(doc));
      try {
        const resp = await api.analyzeDocument(doc.id, { jobId }); // POST /api/documents/:id/analyze?job_id=...&use_ai=true
        // Some backends return AI fields at root; migrate if needed.
        if (resp && (resp.technical_skills || resp.keywords || resp.soft_skills || resp.formatting)) {
          resp.ai_detailed_analysis = {
            technical_skills: resp.technical_skills,
            keywords: resp.keywords,
            soft_skills: resp.soft_skills,
            formatting: resp.formatting,
            overall_suggestions: resp.overall_suggestions,
          };
        }
        const vm = toViewModel(resp || {});
        setCurrentAnalysis({ ...vm, document_name: getDocName(doc) });
        setAnalysisModalOpen(true);
      } catch (e) {
        console.error("[useAnalysis] analyze failed:", e);
        throw e;
      } finally {
        setAnalyzing(false);
      }
    },
    []
  );

  const analyzeResume = useCallback((doc) => run(doc, undefined), [run]);
  const analyzeResumeWithJob = useCallback((doc, { jobId } = {}) => run(doc, jobId), [run]);

  // Optional: quick client-side Markdown export of current analysis
  const exportMarkdown = useCallback(() => {
    if (!currentAnalysis) return;
    const { document_name, overall_score, summary, categories } = currentAnalysis;
    const lines = [
      `# AI Analysis — ${document_name || "Document"}`,
      ``,
      `**Overall Score:** ${Number(overall_score || 0).toFixed(1)}%`,
      ``,
    ];
    if (summary) lines.push(`> ${summary}`, ``);
    categories?.forEach((c) => {
      lines.push(`## ${c.title} — ${Number(c.score || 0).toFixed(1)}%`);
      if (c.description) lines.push(`${c.description}`, ``);
      const ai = c.ai || {};
      if (Array.isArray(ai.missing_elements) && ai.missing_elements.length) {
        lines.push(`**Missing elements:** ${ai.missing_elements.join(", ")}`, ``);
      }
      if (Array.isArray(ai.strengths) && ai.strengths.length) {
        lines.push(`**Strengths:**`, ...ai.strengths.map((s) => `- ${s}`), ``);
      }
      if (Array.isArray(ai.weaknesses) && ai.weaknesses.length) {
        lines.push(`**Areas to improve:**`, ...ai.weaknesses.map((w) => `- ${w}`), ``);
      }
      if (Array.isArray(ai.improvements) && ai.improvements.length) {
        lines.push(`**Suggestions:**`);
        ai.improvements.forEach((imp) => {
          lines.push(`- ${imp.suggestion}`);
          if (imp.example_before && imp.example_after) {
            lines.push(`  - Before: ${imp.example_before}`, `  - After: ${imp.example_after}`);
          } else if (imp.example) {
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
    a.download = `${(currentAnalysis.document_name || "analysis").replace(/[^a-z0-9_-]+/gi, "_")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [currentAnalysis]);

  // Stub: you can wire this to a real server export later if you like
  const exportPDF = useCallback(() => {
    // For now, reuse markdown exporter; a server endpoint would be better.
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
