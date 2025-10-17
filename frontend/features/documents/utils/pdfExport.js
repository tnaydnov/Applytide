import { jsPDF } from "jspdf";
import "jspdf-autotable";

/**
 * Export analysis data as PDF
 * Pure function - no React dependencies
 */
export function exportAnalysisToPDF(currentAnalysis) {
  if (!currentAnalysis) return;

  const doc = new jsPDF();
  const ats = currentAnalysis.ats_score || {};
  const ai = currentAnalysis.ai_detailed_analysis || {};
  const sections = currentAnalysis.section_quality || {};

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let y = 20;

  const add = (text, size = 11, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(String(text || ""), contentWidth);
    lines.forEach((ln) => {
      if (y + 6 > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(ln, margin, y);
      y += 6;
    });
  };

  // Title
  add(`Resume Analysis: ${currentAnalysis.document_name || "Document"}`, 16, true);
  y += 4;

  // Overall
  add(`Overall ATS Score: ${Number(ats.overall_score || 0).toFixed(1)}%`, 14, true);
  y += 2;
  add(`Document: ${currentAnalysis.document_name || "Document"}`);
  add(`Word Count: ${currentAnalysis.word_count || "N/A"}`);
  y += 4;

  // Analysis type
  const isJob = ats.technical_skills_score != null || Boolean(currentAnalysis.job_match_summary);
  add(isJob ? "Job-Specific Analysis" : "General Resume Analysis", 13, true);
  add(
    isJob
      ? "This analysis compares your resume against job skills/requirements and provides targeted feedback."
      : "This is a general analysis. Select a job for tailored matching."
  );
  if (currentAnalysis.job_match_summary) {
    const summary =
      typeof currentAnalysis.job_match_summary === "string"
        ? currentAnalysis.job_match_summary
        : currentAnalysis.job_match_summary.summary;
    if (summary) add(summary);
  }
  y += 2;

  // Category blocks
  const cat = (title, score, desc, block) => {
    add(title, 13, true);
    add(`Score: ${Number(score ?? 0).toFixed(1)}%`);
    add(desc);
    block?.();
    y += 2;
  };

  if (ats.technical_skills_score != null) {
    cat("Technical (Hard) Skills", ats.technical_skills_score, "Role-specific hard skills match", () => {
      const t = ai.technical_skills || {};
      if (t.strengths?.length) {
        add("Strengths:", 11, true);
        t.strengths.forEach((s) => add(`• ${s}`));
      }
      if (t.weaknesses?.length) {
        add("Areas to Improve:", 11, true);
        t.weaknesses.forEach((s) => add(`• ${s}`));
      }
      if (t.missing_elements?.length) {
        add("Missing Skills:", 11, true);
        t.missing_elements.forEach((s) => add(`• ${s}`));
      }

      // Improvement examples
      if (t.improvements?.length) {
        add("Improvement Examples:", 11, true);
        t.improvements.forEach((imp, i) => {
          add(`${i + 1}. ${imp.suggestion}`, 11, true);
          if (imp.example_before) add(`Before: ${imp.example_before}`, 10);
          if (imp.example_after) add(`After: ${imp.example_after}`, 10);
          if (imp.example && !imp.example_before) add(`Example: ${imp.example}`, 10);
        });
      }
    });
  }

  if (ats.soft_skills_score != null) {
    cat("Soft Skills", ats.soft_skills_score, "Presence of important soft skills relevant to this role", () => {
      const s = ai.soft_skills || {};
      if (s.relevant_skills?.length) {
        add("Found:", 11, true);
        s.relevant_skills.forEach((x) => add(`• ${x}`));
      }
      if (s.missing_elements?.length) {
        add("Suggested:", 11, true);
        s.missing_elements.forEach((x) => add(`• ${x}`));
      }

      // Improvement examples
      if (s.improvements?.length) {
        add("Improvement Examples:", 11, true);
        s.improvements.forEach((imp, i) => {
          add(`${i + 1}. ${imp.suggestion}`, 11, true);
          if (imp.example_before) add(`Before: ${imp.example_before}`, 10);
          if (imp.example_after) add(`After: ${imp.example_after}`, 10);
          if (imp.example && !imp.example_before) add(`Example: ${imp.example}`, 10);
        });
      }
    });
  }

  if (ats.keyword_score != null) {
    const keywordData = ai.keywords || currentAnalysis.keyword_analysis || {};
    cat("Keywords", ats.keyword_score, "Job-specific terminology and industry language match", () => {
      if (keywordData.keywords_found?.length) {
        add("Matched Keywords:", 11, true);
        keywordData.keywords_found.forEach((k) => add(`• ${k}`));
      } else if (keywordData.strengths?.length) {
        add("Strengths:", 11, true);
        keywordData.strengths.forEach((k) => add(`• ${k}`));
      }

      if (keywordData.keywords_missing?.length) {
        add("Missing Keywords:", 11, true);
        keywordData.keywords_missing.forEach((k) => add(`• ${k}`));
      } else if (keywordData.missing_elements?.length) {
        add("Missing Keywords:", 11, true);
        keywordData.missing_elements.forEach((k) => add(`• ${k}`));
      }

      if (keywordData.weaknesses?.length) {
        add("Areas to Improve:", 11, true);
        keywordData.weaknesses.forEach((k) => add(`• ${k}`));
      }

      // Improvement examples
      if (keywordData.improvements?.length) {
        add("Improvement Examples:", 11, true);
        keywordData.improvements.forEach((imp, i) => {
          add(`${i + 1}. ${imp.suggestion}`, 11, true);
          if (imp.example_before) add(`Before: ${imp.example_before}`, 10);
          if (imp.example_after) add(`After: ${imp.example_after}`, 10);
          if (imp.example && !imp.example_before) add(`Example: ${imp.example}`, 10);
        });
      }
    });
  }

  if (ats.formatting_score != null) {
    cat("Formatting", ats.formatting_score, "ATS-friendly structure and organization", () => {
      const f = ai.formatting || {};
      if (f.strengths?.length) {
        add("Strengths:", 11, true);
        f.strengths.forEach((x) => add(`• ${x}`));
      }
      if (f.weaknesses?.length) {
        add("Areas to Improve:", 11, true);
        f.weaknesses.forEach((x) => add(`• ${x}`));
      }

      // Improvement examples
      if (f.improvements?.length) {
        add("Improvement Examples:", 11, true);
        f.improvements.forEach((imp, i) => {
          add(`${i + 1}. ${imp.suggestion}`, 11, true);
          if (imp.example) add(`Example: ${imp.example}`, 10);
          else if (imp.example_before && imp.example_after) {
            add(`Before: ${imp.example_before}`, 10);
            add(`After: ${imp.example_after}`, 10);
          }
        });
      }
    });
  }

  // Section Quality from backend
  if (sections && Object.keys(sections).length) {
    add("Section Quality", 13, true);
    Object.entries(sections).forEach(([name, data]) => {
      const sc = Number(data?.score ?? 0).toFixed(0);
      const flag = data?.improvement_needed ? " (needs work)" : "";
      add(`${name}: ${sc}%${flag}`);
      if (data?.notes) add(`  • ${data.notes}`);
    });
  }

  // Language / readability
  add("Language Analysis", 13, true);
  add(`Action Verbs: ${currentAnalysis.action_verb_count ?? "N/A"}`);
  if (currentAnalysis.action_verb_count != null) {
    const verbCount = Number(currentAnalysis.action_verb_count);
    if (verbCount >= 10) {
      add("Strong use of action verbs");
    } else {
      add("Consider adding more impactful verbs");
    }
  }
  const readabilityScore = currentAnalysis.readability_score || ats.readability_score || 0;
  add(`Readability: ${Number(readabilityScore).toFixed(0)}%`);
  if (readabilityScore >= 70) {
    add("Good content structure");
  } else {
    add("Content needs improvement");
  }
  y += 2;

  // Key Recommendations
  if (ai.overall_suggestions?.length) {
    add("Key Recommendations", 13, true);
    ai.overall_suggestions.forEach((s, i) => add(`${i + 1}. ${s}`));
  }

  // Stats
  add("Document Statistics", 13, true);
  add(`Words: ${currentAnalysis.word_count || "N/A"}`);
  add(`Readability: ${Number(readabilityScore).toFixed(1)}%`);
  add(`Missing Sections: ${currentAnalysis.missing_sections?.length || 0}`);
  y += 2;

  // Missing Sections detail
  if (Array.isArray(currentAnalysis.missing_sections) && currentAnalysis.missing_sections.length > 0) {
    add("Missing Sections", 13, true);
    currentAnalysis.missing_sections.forEach((section) => add(`• ${section}`));
    y += 2;
  }

  doc.save(`${(currentAnalysis.document_name || "analysis").replace(/[^a-z0-9_-]+/gi, "_")}_analysis.pdf`);
}
