import { useCallback, useState } from "react";
import api from "../../../lib/api";
import { getDocName } from "../utils/helpers";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle } from "docx";
import { saveAs } from "file-saver";

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
        if (!currentAnalysis) return;

        const { document_name } = currentAnalysis;
        const ats = currentAnalysis.ats_score || {};
        const ai = currentAnalysis.ai_detailed_analysis || {};
        const overall = Number(ats.overall_score || 0).toFixed(1);

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const contentWidth = pageWidth - 2 * margin;
        let yPosition = 20;

        // Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text(`Resume Analysis: ${document_name || "Document"}`, margin, yPosition);
        yPosition += 15;

        // Overall score
        doc.setFontSize(14);
        doc.text(`Overall ATS Score: ${overall}%`, margin, yPosition);
        yPosition += 10;

        // Document info
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        doc.text(`Document: ${document_name || "Document"}`, margin, yPosition);
        yPosition += 8;
        doc.text(`Word Count: ${ats.word_count || "N/A"}`, margin, yPosition);
        yPosition += 15;

        // Section scores
        if (ats.section_scores) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            doc.text("Section Quality Analysis", margin, yPosition);
            yPosition += 10;

            const tableData = Object.entries(ats.section_scores).map(([section, score]) => {
                return [section, `${Math.round(score)}%`, score > 80 ? "Good" : score > 60 ? "Fair" : "Needs work"];
            });

            doc.autoTable({
                startY: yPosition,
                head: [["Section", "Score", "Assessment"]],
                body: tableData,
                theme: "striped",
                headStyles: { fillColor: [63, 81, 181] },
                margin: { left: margin, right: margin }
            });

            yPosition = doc.lastAutoTable.finalY + 15;
        }

        // Key recommendations
        if (ai.overall_suggestions && ai.overall_suggestions.length > 0) {
            // Add a new page if we're too far down
            if (yPosition > doc.internal.pageSize.getHeight() - 60) {
                doc.addPage();
                yPosition = 20;
            }

            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            doc.text("Key Recommendations", margin, yPosition);
            yPosition += 10;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);

            ai.overall_suggestions.forEach((suggestion, i) => {
                // Check if we need a new page
                if (yPosition > doc.internal.pageSize.getHeight() - 30) {
                    doc.addPage();
                    yPosition = 20;
                }

                const lines = doc.splitTextToSize(`${i + 1}. ${suggestion}`, contentWidth);
                doc.text(lines, margin, yPosition);
                yPosition += (lines.length * 7) + 5;
            });
        }

        // Save the PDF
        doc.save(`${(document_name || "analysis").replace(/[^a-z0-9_-]+/gi, "_")}_analysis.pdf`);
    }, [currentAnalysis]);

    // Add this new exportWord function
    const exportWord = useCallback(() => {
        if (!currentAnalysis) return;

        const { document_name } = currentAnalysis;
        const ats = currentAnalysis.ats_score || {};
        const ai = currentAnalysis.ai_detailed_analysis || {};
        const overall = Number(ats.overall_score || 0).toFixed(1);

        // Create document
        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    // Title
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `Resume Analysis: ${document_name || "Document"}`,
                                bold: true,
                                size: 32
                            })
                        ],
                        spacing: { after: 300 }
                    }),

                    // Overall score
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `Overall ATS Score: ${overall}%`,
                                bold: true,
                                size: 28
                            })
                        ],
                        spacing: { after: 300 }
                    }),

                    // Basic info
                    new Paragraph({
                        children: [
                            new TextRun({ text: `Document: ${document_name || "Document"}` })
                        ],
                        spacing: { after: 200 }
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: `Word Count: ${ats.word_count || "N/A"}` })
                        ],
                        spacing: { after: 400 }
                    }),
                ]
            }]
        });

        // Add section scores if available
        if (ats.section_scores) {
            doc.addSection({
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Section Quality Analysis", bold: true, size: 24 })
                        ],
                        spacing: { after: 200 }
                    })
                ]
            });

            // Create section scores table
            const tableRows = Object.entries(ats.section_scores).map(([section, score]) => {
                return new TableRow({
                    children: [
                        new TableCell({
                            children: [new Paragraph({ text: section })],
                        }),
                        new TableCell({
                            children: [new Paragraph({ text: `${Math.round(score)}%` })],
                        }),
                        new TableCell({
                            children: [new Paragraph({
                                text: score > 80 ? "Good" : score > 60 ? "Fair" : "Needs work"
                            })],
                        })
                    ]
                });
            });

            const table = new Table({
                rows: [
                    new TableRow({
                        children: [
                            new TableCell({
                                children: [new Paragraph({ text: "Section", bold: true })],
                                shading: { fill: "DDDDFF" }
                            }),
                            new TableCell({
                                children: [new Paragraph({ text: "Score", bold: true })],
                                shading: { fill: "DDDDFF" }
                            }),
                            new TableCell({
                                children: [new Paragraph({ text: "Assessment", bold: true })],
                                shading: { fill: "DDDDFF" }
                            })
                        ]
                    }),
                    ...tableRows
                ]
            });

            doc.addSection({
                children: [table, new Paragraph({ spacing: { after: 400 } })]
            });
        }

        // Add key recommendations
        if (ai.overall_suggestions && ai.overall_suggestions.length > 0) {
            doc.addSection({
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Key Recommendations", bold: true, size: 24 })
                        ],
                        spacing: { after: 200 }
                    }),
                    ...ai.overall_suggestions.map((suggestion, i) =>
                        new Paragraph({
                            children: [
                                new TextRun({ text: `${i + 1}. ${suggestion}` })
                            ],
                            spacing: { after: 200 }
                        })
                    )
                ]
            });
        }

        // Generate and save document
        Packer.toBlob(doc).then(blob => {
            saveAs(blob, `${(document_name || "analysis").replace(/[^a-z0-9_-]+/gi, "_")}_analysis.docx`);
        });
    }, [currentAnalysis]);

    // Update your return to include exportWord
    return {
        analyzing,
        analysisModalOpen,
        setAnalysisModalOpen,
        currentAnalysis,
        analyzeResume,
        analyzeResumeWithJob,
        exportMarkdown,
        exportPDF,
        exportWord  // Add this line
    };
}
