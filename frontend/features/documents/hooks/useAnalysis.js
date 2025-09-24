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

    const exportPDF = useCallback(() => {
        if (!currentAnalysis) return;

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const contentWidth = pageWidth - 2 * margin;
        let yPosition = 20;

        // Helper function to add new page if needed
        const checkPage = (neededSpace = 40) => {
            if (yPosition + neededSpace > doc.internal.pageSize.getHeight() - 20) {
                doc.addPage();
                yPosition = 20;
                return true;
            }
            return false;
        };

        // Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text(`Resume Analysis: ${currentAnalysis.document_name || "Document"}`, margin, yPosition);
        yPosition += 12;

        // Overall score
        const ats = currentAnalysis.ats_score || {};
        const ai = currentAnalysis.ai_detailed_analysis || {};
        const overall = Number(ats.overall_score || 0).toFixed(1);

        doc.setFontSize(14);
        doc.text(`Overall ATS Score: ${overall}%`, margin, yPosition);
        yPosition += 10;

        // Document info
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.text(`Document: ${currentAnalysis.document_name || "Document"}`, margin, yPosition);
        yPosition += 6;
        doc.text(`Word Count: ${ats.word_count || "N/A"}`, margin, yPosition);
        yPosition += 12;

        // Analysis type
        const isJobSpecific = ats.technical_skills_score != null || Boolean(currentAnalysis.job_match_summary);
        checkPage();
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text(isJobSpecific ? "Job-Specific Analysis" : "General Resume Analysis", margin, yPosition);
        yPosition += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const analysisTypeText = isJobSpecific
            ? "This analysis compares your resume against job skills/requirements and provides targeted feedback."
            : "This is a general analysis. Select a job for tailored matching.";
        const analysisTypeLines = doc.splitTextToSize(analysisTypeText, contentWidth);
        doc.text(analysisTypeLines, margin, yPosition);
        yPosition += (analysisTypeLines.length * 5) + 8;

        // Job summary if available
        if (currentAnalysis.job_match_summary) {
            checkPage();
            doc.setFont("helvetica", "italic");
            const jobSummary = typeof currentAnalysis.job_match_summary === "string"
                ? currentAnalysis.job_match_summary
                : currentAnalysis.job_match_summary?.summary;
            const summaryLines = doc.splitTextToSize(jobSummary, contentWidth);
            doc.text(summaryLines, margin, yPosition);
            yPosition += (summaryLines.length * 5) + 10;
        }

        // Technical Skills section
        if (ats.technical_skills_score != null) {
            checkPage();
            doc.setFont("helvetica", "bold");
            doc.setFontSize(13);
            doc.text("Technical Skills", margin, yPosition);
            yPosition += 6;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);
            doc.text(`Score: ${Number(ats.technical_skills_score).toFixed(1)}%`, margin, yPosition);
            yPosition += 5;
            doc.setFontSize(10);
            doc.text("How well your technical skills align with job requirements", margin, yPosition);
            yPosition += 8;

            // Add technical skills data if available
            if (ai.technical_skills) {
                // Matched skills
                if (ai.technical_skills.matched_skills && ai.technical_skills.matched_skills.length) {
                    doc.setFontSize(10);
                    doc.setFont("helvetica", "bold");
                    doc.text("Matched Skills:", margin, yPosition);
                    yPosition += 5;
                    doc.setFont("helvetica", "normal");
                    ai.technical_skills.matched_skills.forEach(skill => {
                        checkPage(6);
                        doc.text(`• ${skill}`, margin + 5, yPosition);
                        yPosition += 5;
                    });
                    yPosition += 3;
                }

                // Missing skills
                if (ai.technical_skills.missing_skills && ai.technical_skills.missing_skills.length) {
                    checkPage();
                    doc.setFontSize(10);
                    doc.setFont("helvetica", "bold");
                    doc.text("Missing Skills:", margin, yPosition);
                    yPosition += 5;
                    doc.setFont("helvetica", "normal");
                    ai.technical_skills.missing_skills.forEach(skill => {
                        checkPage(6);
                        doc.text(`• ${skill}`, margin + 5, yPosition);
                        yPosition += 5;
                    });
                    yPosition += 3;
                }

                // Analysis
                if (ai.technical_skills.analysis) {
                    checkPage();
                    doc.setFontSize(10);
                    doc.setFont("helvetica", "bold");
                    doc.text("Analysis:", margin, yPosition);
                    yPosition += 5;
                    doc.setFont("helvetica", "normal");
                    const analysisLines = doc.splitTextToSize(ai.technical_skills.analysis, contentWidth - 10);
                    doc.text(analysisLines, margin, yPosition);
                    yPosition += (analysisLines.length * 5) + 5;
                }
            }
        }

        // Soft Skills section
        if (ats.soft_skills_score != null) {
            checkPage();
            doc.setFont("helvetica", "bold");
            doc.setFontSize(13);
            doc.text("Soft Skills", margin, yPosition);
            yPosition += 6;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);
            doc.text(`Score: ${Number(ats.soft_skills_score).toFixed(1)}%`, margin, yPosition);
            yPosition += 5;
            doc.setFontSize(10);
            doc.text("Presence of important soft skills relevant to this role", margin, yPosition);
            yPosition += 8;

            // Add soft skills data if available
            if (ai.soft_skills) {
                // Found skills
                if (ai.soft_skills.found_skills && ai.soft_skills.found_skills.length) {
                    doc.setFontSize(10);
                    doc.setFont("helvetica", "bold");
                    doc.text("Found Skills:", margin, yPosition);
                    yPosition += 5;
                    doc.setFont("helvetica", "normal");
                    ai.soft_skills.found_skills.forEach(skill => {
                        checkPage(6);
                        doc.text(`• ${skill}`, margin + 5, yPosition);
                        yPosition += 5;
                    });
                    yPosition += 3;
                }

                // Suggested skills
                if (ai.soft_skills.suggested_skills && ai.soft_skills.suggested_skills.length) {
                    checkPage();
                    doc.setFontSize(10);
                    doc.setFont("helvetica", "bold");
                    doc.text("Suggested Skills:", margin, yPosition);
                    yPosition += 5;
                    doc.setFont("helvetica", "normal");
                    ai.soft_skills.suggested_skills.forEach(skill => {
                        checkPage(6);
                        doc.text(`• ${skill}`, margin + 5, yPosition);
                        yPosition += 5;
                    });
                    yPosition += 3;
                }

                // Analysis
                if (ai.soft_skills.analysis) {
                    checkPage();
                    doc.setFontSize(10);
                    doc.setFont("helvetica", "bold");
                    doc.text("Analysis:", margin, yPosition);
                    yPosition += 5;
                    doc.setFont("helvetica", "normal");
                    const analysisLines = doc.splitTextToSize(ai.soft_skills.analysis, contentWidth - 10);
                    doc.text(analysisLines, margin, yPosition);
                    yPosition += (analysisLines.length * 5) + 5;
                }
            }
        }

        // Keywords section
        if (ats.keyword_score != null || ai.keywords) {
            checkPage();
            doc.setFont("helvetica", "bold");
            doc.setFontSize(13);
            doc.text("Keywords", margin, yPosition);
            yPosition += 6;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);
            doc.text(`Score: ${Number(ats.keyword_score || 0).toFixed(1)}%`, margin, yPosition);
            yPosition += 5;
            doc.setFontSize(10);
            doc.text("Job-specific terminology and industry language match", margin, yPosition);
            yPosition += 8;

            // Add keywords data if available
            if (ai.keywords) {
                // Matched keywords
                if (ai.keywords.matched_keywords && ai.keywords.matched_keywords.length) {
                    doc.setFontSize(10);
                    doc.setFont("helvetica", "bold");
                    doc.text("Matched Keywords:", margin, yPosition);
                    yPosition += 5;
                    doc.setFont("helvetica", "normal");
                    ai.keywords.matched_keywords.forEach(keyword => {
                        checkPage(6);
                        doc.text(`• ${keyword}`, margin + 5, yPosition);
                        yPosition += 5;
                    });
                    yPosition += 3;
                }

                // Missing keywords
                if (ai.keywords.missing_keywords && ai.keywords.missing_keywords.length) {
                    checkPage();
                    doc.setFontSize(10);
                    doc.setFont("helvetica", "bold");
                    doc.text("Missing Keywords:", margin, yPosition);
                    yPosition += 5;
                    doc.setFont("helvetica", "normal");
                    ai.keywords.missing_keywords.forEach(keyword => {
                        checkPage(6);
                        doc.text(`• ${keyword}`, margin + 5, yPosition);
                        yPosition += 5;
                    });
                    yPosition += 3;
                }

                // Analysis
                if (ai.keywords.analysis) {
                    checkPage();
                    doc.setFontSize(10);
                    doc.setFont("helvetica", "bold");
                    doc.text("Analysis:", margin, yPosition);
                    yPosition += 5;
                    doc.setFont("helvetica", "normal");
                    const analysisLines = doc.splitTextToSize(ai.keywords.analysis, contentWidth - 10);
                    doc.text(analysisLines, margin, yPosition);
                    yPosition += (analysisLines.length * 5) + 5;
                }
            }
        }

        // Formatting section
        if (ats.formatting_score != null) {
            checkPage();
            doc.setFont("helvetica", "bold");
            doc.setFontSize(13);
            doc.text("Formatting", margin, yPosition);
            yPosition += 6;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);
            doc.text(`Score: ${Number(ats.formatting_score).toFixed(1)}%`, margin, yPosition);
            yPosition += 5;
            doc.setFontSize(10);
            doc.text("ATS-friendly structure and organization", margin, yPosition);
            yPosition += 8;

            // Add formatting data if available
            if (ai.formatting) {
                // Issues
                if (ai.formatting.issues && ai.formatting.issues.length) {
                    doc.setFontSize(10);
                    doc.setFont("helvetica", "bold");
                    doc.text("Issues:", margin, yPosition);
                    yPosition += 5;
                    doc.setFont("helvetica", "normal");
                    ai.formatting.issues.forEach(issue => {
                        checkPage(6);
                        doc.text(`• ${issue}`, margin + 5, yPosition);
                        yPosition += 5;
                    });
                    yPosition += 3;
                }

                // Analysis
                if (ai.formatting.analysis) {
                    checkPage();
                    doc.setFontSize(10);
                    doc.setFont("helvetica", "bold");
                    doc.text("Analysis:", margin, yPosition);
                    yPosition += 5;
                    doc.setFont("helvetica", "normal");
                    const analysisLines = doc.splitTextToSize(ai.formatting.analysis, contentWidth - 10);
                    doc.text(analysisLines, margin, yPosition);
                    yPosition += (analysisLines.length * 5) + 5;
                }
            }
        }

        // Section Quality Analysis
        if (currentAnalysis.section_quality && Object.keys(currentAnalysis.section_quality).length > 0) {
            checkPage();
            doc.setFont("helvetica", "bold");
            doc.setFontSize(13);
            doc.text("Section Quality Analysis", margin, yPosition);
            yPosition += 10;

            const tableData = Object.entries(currentAnalysis.section_quality).map(([section, data]) => {
                return [section, `${Number(data.score || 0).toFixed(0)}%`, data.improvement_needed ? "Needs work" : "Good"];
            });

            doc.autoTable({
                startY: yPosition,
                head: [["Section", "Score", "Status"]],
                body: tableData,
                theme: "striped",
                headStyles: { fillColor: [63, 81, 181] },
                margin: { left: margin, right: margin }
            });

            yPosition = doc.lastAutoTable.finalY + 10;
        }

        // Language Analysis
        if (currentAnalysis.action_verb_count !== undefined || currentAnalysis.readability_score !== undefined) {
            checkPage();
            doc.setFont("helvetica", "bold");
            doc.setFontSize(13);
            doc.text("Language Analysis", margin, yPosition);
            yPosition += 10;

            const languageData = [
                ["Action Verbs",
                    currentAnalysis.action_verb_count || "N/A",
                    Number(currentAnalysis.action_verb_count) >= 10 ? "Strong use of action verbs" : "Consider adding more impactful verbs"],
                ["Readability",
                    `${Number(currentAnalysis.readability_score || 0).toFixed(0)}%`,
                    Number(currentAnalysis.readability_score || 0) >= 70 ? "Good content structure" : "Content needs improvement"]
            ];

            doc.autoTable({
                startY: yPosition,
                head: [["Metric", "Score", "Assessment"]],
                body: languageData,
                theme: "striped",
                headStyles: { fillColor: [63, 81, 181] },
                margin: { left: margin, right: margin }
            });

            yPosition = doc.lastAutoTable.finalY + 10;
        }

        // Key Recommendations
        if (ai.overall_suggestions && ai.overall_suggestions.length > 0) {
            checkPage();
            doc.setFont("helvetica", "bold");
            doc.setFontSize(13);
            doc.text("Key Recommendations", margin, yPosition);
            yPosition += 8;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);

            ai.overall_suggestions.forEach((suggestion, i) => {
                checkPage(15);
                const lines = doc.splitTextToSize(`${i + 1}. ${suggestion}`, contentWidth - 5);
                doc.text(lines, margin, yPosition);
                yPosition += (lines.length * 5) + 5;
            });
        }

        // Document Statistics
        checkPage();
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text("Document Statistics", margin, yPosition);
        yPosition += 10;

        const statsData = [
            ["Words", currentAnalysis.word_count || "0"],
            ["Readability", `${Number(currentAnalysis.readability_score || 0).toFixed(1)}%`],
            ["Missing Sections", currentAnalysis.missing_sections?.length || "0"]
        ];

        doc.autoTable({
            startY: yPosition,
            body: statsData,
            theme: "plain",
            margin: { left: margin, right: margin }
        });

        yPosition = doc.lastAutoTable.finalY + 10;

        // Missing Sections
        if (Array.isArray(currentAnalysis.missing_sections) && currentAnalysis.missing_sections.length > 0) {
            checkPage();
            doc.setFont("helvetica", "bold");
            doc.setFontSize(13);
            doc.text("Missing Sections", margin, yPosition);
            yPosition += 8;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);

            currentAnalysis.missing_sections.forEach((section, i) => {
                checkPage(6);
                doc.text(`• ${section}`, margin, yPosition);
                yPosition += 5;
            });
        }

        // Save the PDF
        doc.save(`${(currentAnalysis.document_name || "analysis").replace(/[^a-z0-9_-]+/gi, "_")}_analysis.pdf`);
    }, [currentAnalysis]);

    const exportWord = useCallback(() => {
        if (!currentAnalysis) return;

        const ats = currentAnalysis.ats_score || {};
        const ai = currentAnalysis.ai_detailed_analysis || {};
        const overall = Number(ats.overall_score || 0).toFixed(1);
        const isJobSpecific = ats.technical_skills_score != null || Boolean(currentAnalysis.job_match_summary);

        // Create document
        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    // Title
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `Resume Analysis: ${currentAnalysis.document_name || "Document"}`,
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
                            new TextRun({ text: `Document: ${currentAnalysis.document_name || "Document"}` })
                        ],
                        spacing: { after: 200 }
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: `Word Count: ${ats.word_count || "N/A"}` })
                        ],
                        spacing: { after: 400 }
                    }),

                    // Analysis Type
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: isJobSpecific ? "Job-Specific Analysis" : "General Resume Analysis",
                                bold: true,
                                size: 24
                            })
                        ],
                        spacing: { after: 200 }
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: isJobSpecific
                                    ? "This analysis compares your resume against job skills/requirements and provides targeted feedback."
                                    : "This is a general analysis. Select a job for tailored matching."
                            })
                        ],
                        spacing: { after: 300 }
                    })
                ]
            }]
        });

        // Job summary if available
        if (currentAnalysis.job_match_summary) {
            const jobSummary = typeof currentAnalysis.job_match_summary === "string"
                ? currentAnalysis.job_match_summary
                : currentAnalysis.job_match_summary?.summary;

            doc.addSection({
                children: [
                    new Paragraph({
                        children: [new TextRun({ text: jobSummary, italics: true })],
                        spacing: { after: 400 }
                    })
                ]
            });
        }

        // Technical Skills section
        if (ats.technical_skills_score != null) {
            const children = [
                new Paragraph({
                    children: [
                        new TextRun({ text: "Technical Skills", bold: true, size: 24 })
                    ],
                    spacing: { after: 200 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: `Score: ${Number(ats.technical_skills_score).toFixed(1)}%` })
                    ],
                    spacing: { after: 100 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "How well your technical skills align with job requirements", italics: true })
                    ],
                    spacing: { after: 200 }
                })
            ];

            // Add technical skills data if available
            if (ai.technical_skills) {
                // Matched skills
                if (ai.technical_skills.matched_skills && ai.technical_skills.matched_skills.length) {
                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: "Matched Skills:", bold: true })],
                            spacing: { after: 100 }
                        })
                    );

                    ai.technical_skills.matched_skills.forEach(skill => {
                        children.push(
                            new Paragraph({
                                children: [new TextRun({ text: `• ${skill}` })],
                                spacing: { after: 100 },
                                indent: { left: 360 }
                            })
                        );
                    });
                }

                // Missing skills
                if (ai.technical_skills.missing_skills && ai.technical_skills.missing_skills.length) {
                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: "Missing Skills:", bold: true })],
                            spacing: { after: 100 }
                        })
                    );

                    ai.technical_skills.missing_skills.forEach(skill => {
                        children.push(
                            new Paragraph({
                                children: [new TextRun({ text: `• ${skill}` })],
                                spacing: { after: 100 },
                                indent: { left: 360 }
                            })
                        );
                    });
                }

                // Analysis
                if (ai.technical_skills.analysis) {
                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: "Analysis:", bold: true })],
                            spacing: { after: 100 }
                        })
                    );

                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: ai.technical_skills.analysis })],
                            spacing: { after: 200 }
                        })
                    );
                }
            }

            doc.addSection({ children });
        }

        // Soft Skills section
        if (ats.soft_skills_score != null) {
            const children = [
                new Paragraph({
                    children: [
                        new TextRun({ text: "Soft Skills", bold: true, size: 24 })
                    ],
                    spacing: { after: 200 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: `Score: ${Number(ats.soft_skills_score).toFixed(1)}%` })
                    ],
                    spacing: { after: 100 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Presence of important soft skills relevant to this role", italics: true })
                    ],
                    spacing: { after: 200 }
                })
            ];

            // Add soft skills data if available
            if (ai.soft_skills) {
                // Found skills
                if (ai.soft_skills.found_skills && ai.soft_skills.found_skills.length) {
                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: "Found Skills:", bold: true })],
                            spacing: { after: 100 }
                        })
                    );

                    ai.soft_skills.found_skills.forEach(skill => {
                        children.push(
                            new Paragraph({
                                children: [new TextRun({ text: `• ${skill}` })],
                                spacing: { after: 100 },
                                indent: { left: 360 }
                            })
                        );
                    });
                }

                // Suggested skills
                if (ai.soft_skills.suggested_skills && ai.soft_skills.suggested_skills.length) {
                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: "Suggested Skills:", bold: true })],
                            spacing: { after: 100 }
                        })
                    );

                    ai.soft_skills.suggested_skills.forEach(skill => {
                        children.push(
                            new Paragraph({
                                children: [new TextRun({ text: `• ${skill}` })],
                                spacing: { after: 100 },
                                indent: { left: 360 }
                            })
                        );
                    });
                }

                // Analysis
                if (ai.soft_skills.analysis) {
                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: "Analysis:", bold: true })],
                            spacing: { after: 100 }
                        })
                    );

                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: ai.soft_skills.analysis })],
                            spacing: { after: 200 }
                        })
                    );
                }
            }

            doc.addSection({ children });
        }

        // Keywords section
        if (ats.keyword_score != null || ai.keywords) {
            const children = [
                new Paragraph({
                    children: [
                        new TextRun({ text: "Keywords", bold: true, size: 24 })
                    ],
                    spacing: { after: 200 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: `Score: ${Number(ats.keyword_score || 0).toFixed(1)}%` })
                    ],
                    spacing: { after: 100 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Job-specific terminology and industry language match", italics: true })
                    ],
                    spacing: { after: 200 }
                })
            ];

            // Add keywords data if available
            if (ai.keywords) {
                // Matched keywords
                if (ai.keywords.matched_keywords && ai.keywords.matched_keywords.length) {
                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: "Matched Keywords:", bold: true })],
                            spacing: { after: 100 }
                        })
                    );

                    ai.keywords.matched_keywords.forEach(keyword => {
                        children.push(
                            new Paragraph({
                                children: [new TextRun({ text: `• ${keyword}` })],
                                spacing: { after: 100 },
                                indent: { left: 360 }
                            })
                        );
                    });
                }

                // Missing keywords
                if (ai.keywords.missing_keywords && ai.keywords.missing_keywords.length) {
                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: "Missing Keywords:", bold: true })],
                            spacing: { after: 100 }
                        })
                    );

                    ai.keywords.missing_keywords.forEach(keyword => {
                        children.push(
                            new Paragraph({
                                children: [new TextRun({ text: `• ${keyword}` })],
                                spacing: { after: 100 },
                                indent: { left: 360 }
                            })
                        );
                    });
                }

                // Analysis
                if (ai.keywords.analysis) {
                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: "Analysis:", bold: true })],
                            spacing: { after: 100 }
                        })
                    );

                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: ai.keywords.analysis })],
                            spacing: { after: 200 }
                        })
                    );
                }
            }

            doc.addSection({ children });
        }

        // Formatting section
        if (ats.formatting_score != null) {
            const children = [
                new Paragraph({
                    children: [
                        new TextRun({ text: "Formatting", bold: true, size: 24 })
                    ],
                    spacing: { after: 200 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: `Score: ${Number(ats.formatting_score).toFixed(1)}%` })
                    ],
                    spacing: { after: 100 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "ATS-friendly structure and organization", italics: true })
                    ],
                    spacing: { after: 200 }
                })
            ];

            // Add formatting data if available
            if (ai.formatting) {
                // Issues
                if (ai.formatting.issues && ai.formatting.issues.length) {
                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: "Issues:", bold: true })],
                            spacing: { after: 100 }
                        })
                    );

                    ai.formatting.issues.forEach(issue => {
                        children.push(
                            new Paragraph({
                                children: [new TextRun({ text: `• ${issue}` })],
                                spacing: { after: 100 },
                                indent: { left: 360 }
                            })
                        );
                    });
                }

                // Analysis
                if (ai.formatting.analysis) {
                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: "Analysis:", bold: true })],
                            spacing: { after: 100 }
                        })
                    );

                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: ai.formatting.analysis })],
                            spacing: { after: 200 }
                        })
                    );
                }
            }

            doc.addSection({ children });
        }

        // Section Quality Analysis
        if (currentAnalysis.section_quality && Object.keys(currentAnalysis.section_quality).length > 0) {
            const children = [
                new Paragraph({
                    children: [
                        new TextRun({ text: "Section Quality Analysis", bold: true, size: 24 })
                    ],
                    spacing: { after: 300 }
                })
            ];

            // Create table rows
            const tableRows = Object.entries(currentAnalysis.section_quality).map(([section, data]) => {
                return new TableRow({
                    children: [
                        new TableCell({
                            children: [new Paragraph({ text: section })],
                        }),
                        new TableCell({
                            children: [new Paragraph({ text: `${Number(data.score || 0).toFixed(0)}%` })],
                        }),
                        new TableCell({
                            children: [new Paragraph({
                                text: data.improvement_needed ? "Needs work" : "Good"
                            })],
                        })
                    ]
                });
            });

            // Create table
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
                                children: [new Paragraph({ text: "Status", bold: true })],
                                shading: { fill: "DDDDFF" }
                            })
                        ]
                    }),
                    ...tableRows
                ]
            });

            children.push(table);

            doc.addSection({
                children
            });
        }

        // Language Analysis
        if (currentAnalysis.action_verb_count !== undefined || currentAnalysis.readability_score !== undefined) {
            const children = [
                new Paragraph({
                    children: [
                        new TextRun({ text: "Language Analysis", bold: true, size: 24 })
                    ],
                    spacing: { after: 300 }
                }),

                // Action verbs
                new Paragraph({
                    children: [
                        new TextRun({ text: "Action Verbs: ", bold: true }),
                        new TextRun({ text: currentAnalysis.action_verb_count || "N/A" })
                    ],
                    spacing: { after: 100 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: Number(currentAnalysis.action_verb_count) >= 10
                                ? "Strong use of action verbs"
                                : "Consider adding more impactful verbs"
                        })
                    ],
                    spacing: { after: 200 }
                }),

                // Readability
                new Paragraph({
                    children: [
                        new TextRun({ text: "Readability: ", bold: true }),
                        new TextRun({ text: `${Number(currentAnalysis.readability_score || 0).toFixed(0)}%` })
                    ],
                    spacing: { after: 100 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: Number(currentAnalysis.readability_score || 0) >= 70
                                ? "Good content structure"
                                : "Content needs improvement"
                        })
                    ],
                    spacing: { after: 300 }
                })
            ];

            doc.addSection({ children });
        }

        // Key Recommendations
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

        // Document Statistics
        doc.addSection({
            children: [
                new Paragraph({
                    children: [
                        new TextRun({ text: "Document Statistics", bold: true, size: 24 })
                    ],
                    spacing: { after: 200 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Words: ", bold: true }),
                        new TextRun({ text: currentAnalysis.word_count || "0" })
                    ],
                    spacing: { after: 100 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Readability: ", bold: true }),
                        new TextRun({ text: `${Number(currentAnalysis.readability_score || 0).toFixed(1)}%` })
                    ],
                    spacing: { after: 100 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Missing Sections: ", bold: true }),
                        new TextRun({ text: currentAnalysis.missing_sections?.length || "0" })
                    ],
                    spacing: { after: 200 }
                }),
            ]
        });

        // Missing Sections
        if (Array.isArray(currentAnalysis.missing_sections) && currentAnalysis.missing_sections.length > 0) {
            doc.addSection({
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({ text: "Missing Sections", bold: true, size: 24 })
                        ],
                        spacing: { after: 200 }
                    }),
                    ...currentAnalysis.missing_sections.map(section =>
                        new Paragraph({
                            children: [
                                new TextRun({ text: `• ${section}` })
                            ],
                            spacing: { after: 100 }
                        })
                    )
                ]
            });
        }

        // Generate and save document
        Packer.toBlob(doc).then(blob => {
            saveAs(blob, `${(currentAnalysis.document_name || "analysis").replace(/[^a-z0-9_-]+/gi, "_")}_analysis.docx`);
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
        exportPDF,
        exportWord
    };
}
