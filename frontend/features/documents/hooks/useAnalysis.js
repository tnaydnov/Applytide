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

    // Update the exportPDF function with this fix:

    const exportPDF = useCallback(() => {
        if (!currentAnalysis) return;

        const doc = new jsPDF();
        const ats = currentAnalysis.ats_score || {};
        const ai = currentAnalysis.ai_detailed_analysis || {};
        const sections = currentAnalysis.section_quality || {}; // <-- LLM section scores here

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
            if (y + 6 > pageHeight - 20) { doc.addPage(); y = 20; }
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
        add(isJob
            ? "This analysis compares your resume against job skills/requirements and provides targeted feedback."
            : "This is a general analysis. Select a job for tailored matching."
        );
        if (currentAnalysis.job_match_summary) {
            const summary = typeof currentAnalysis.job_match_summary === "string"
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
            cat("Technical (Hard) Skills", ats.technical_skills_score,
                "Role-specific hard skills match",
                () => {
                const t = ai.technical_skills || {};
                if (t.strengths?.length) { add("Strengths:", 11, true); t.strengths.forEach(s => add(`• ${s}`)); }
                if (t.weaknesses?.length) { add("Areas to Improve:", 11, true); t.weaknesses.forEach(s => add(`• ${s}`)); }
                if (t.missing_elements?.length) { add("Missing Skills:", 11, true); t.missing_elements.forEach(s => add(`• ${s}`)); }
                });
        }

        if (ats.soft_skills_score != null) {
            cat("Soft Skills", ats.soft_skills_score,
                "Presence of important soft skills relevant to this role",
                () => {
                const s = ai.soft_skills || {};
                if (s.relevant_skills?.length) { add("Found:", 11, true); s.relevant_skills.forEach(x => add(`• ${x}`)); }
                if (s.missing_elements?.length) { add("Suggested:", 11, true); s.missing_elements.forEach(x => add(`• ${x}`)); }
                });
        }

        if (ats.keyword_score != null) {
            const keywordData = ai.keywords || currentAnalysis.keyword_analysis || {};
            cat("Keywords", ats.keyword_score,
                "Job-specific terminology and industry language match",
                () => {
                if (keywordData.keywords_found?.length) { add("Matched Keywords:", 11, true); keywordData.keywords_found.forEach(k => add(`• ${k}`)); }
                if (keywordData.keywords_missing?.length) { add("Missing Keywords:", 11, true); keywordData.keywords_missing.forEach(k => add(`• ${k}`)); }
                if (keywordData.weaknesses?.length) { add("Areas to Improve:", 11, true); keywordData.weaknesses.forEach(k => add(`• ${k}`)); }
                });
        }

        if (ats.formatting_score != null) {
            cat("Formatting", ats.formatting_score,
                "ATS-friendly structure and organization",
                () => {
                const f = ai.formatting || {};
                if (f.strengths?.length) { add("Strengths:", 11, true); f.strengths.forEach(x => add(`• ${x}`)); }
                if (f.weaknesses?.length) { add("Areas to Improve:", 11, true); f.weaknesses.forEach(x => add(`• ${x}`)); }
                });
        }

        // Section Quality from backend (no randomness)
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
        const readabilityScore = currentAnalysis.readability_score || ats.readability_score || 0;
        add(`Readability: ${Number(readabilityScore).toFixed(0)}%`);
        y += 2;

        // Key Recommendations
        if (ai.overall_suggestions?.length) {
            add("Key Recommendations", 13, true);
            ai.overall_suggestions.forEach((s, i) => add(`${i + 1}. ${s}`));
        }

        // Stats
        add("Document Statistics", 13, true);
        add(`Words: ${currentAnalysis.word_count || "N/A"}`);
        add(`Missing Sections: ${currentAnalysis.missing_sections?.length || 0}`);

        doc.save(`${(currentAnalysis.document_name || "analysis").replace(/[^a-z0-9_-]+/gi, "_")}_analysis.pdf`);
        }, [currentAnalysis]);


    const exportWord = useCallback(() => {
        if (!currentAnalysis) return;


        const ats = currentAnalysis.ats_score || {};
        const ai = currentAnalysis.ai_detailed_analysis || {};
        const overall = Number(ats.overall_score || 0).toFixed(1);
        const isJobSpecific = ats.technical_skills_score != null || Boolean(currentAnalysis.job_match_summary);
        const readabilityScore = currentAnalysis.readability_score || ats.readability_score || 0;

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
                            new TextRun({ text: `Word Count: ${currentAnalysis.word_count || "N/A"}` })
                        ],
                        spacing: { after: 400 }
                    }),
                ]
            }]
        });

        // Job-Specific Analysis
        const jobAnalysisChildren = [
            new Paragraph({
                children: [
                    new TextRun({ text: isJobSpecific ? "Job-Specific Analysis" : "General Resume Analysis", bold: true, size: 24 })
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
        ];

        // Tech skills match summary from job_match_summary
        if (currentAnalysis.job_match_summary) {
            let summaryText = "";
            if (typeof currentAnalysis.job_match_summary === "string") {
                summaryText = currentAnalysis.job_match_summary;
            } else if (currentAnalysis.job_match_summary.summary) {
                summaryText = currentAnalysis.job_match_summary.summary;
            }

            jobAnalysisChildren.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: summaryText })
                    ],
                    spacing: { after: 300 }
                })
            );
        }

        doc.addSection({ children: jobAnalysisChildren });

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

            // Technical skills details from ai.technical_skills
            if (ai.technical_skills) {
                // Strengths
                if (ai.technical_skills.strengths && ai.technical_skills.strengths.length) {
                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: "Strengths:", bold: true })],
                            spacing: { after: 100 }
                        })
                    );

                    ai.technical_skills.strengths.forEach(item => {
                        children.push(
                            new Paragraph({
                                children: [new TextRun({ text: `• ${item}` })],
                                spacing: { after: 100 },
                                indent: { left: 360 }
                            })
                        );
                    });
                }

                // Weaknesses
                if (ai.technical_skills.weaknesses && ai.technical_skills.weaknesses.length) {
                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: "Areas to Improve:", bold: true })],
                            spacing: { after: 100 }
                        })
                    );

                    ai.technical_skills.weaknesses.forEach(item => {
                        children.push(
                            new Paragraph({
                                children: [new TextRun({ text: `• ${item}` })],
                                spacing: { after: 100 },
                                indent: { left: 360 }
                            })
                        );
                    });
                }

                // Missing elements
                if (ai.technical_skills.missing_elements && ai.technical_skills.missing_elements.length) {
                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: "Missing Skills:", bold: true })],
                            spacing: { after: 100 }
                        })
                    );

                    ai.technical_skills.missing_elements.forEach(item => {
                        children.push(
                            new Paragraph({
                                children: [new TextRun({ text: `• ${item}` })],
                                spacing: { after: 100 },
                                indent: { left: 360 }
                            })
                        );
                    });
                }

                // Improvement examples
                if (ai.technical_skills.improvements && ai.technical_skills.improvements.length) {
                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: "Improvement Examples:", bold: true })],
                            spacing: { after: 200 }
                        })
                    );

                    ai.technical_skills.improvements.forEach((imp, i) => {
                        children.push(
                            new Paragraph({
                                children: [new TextRun({ text: `${i + 1}. ${imp.suggestion}`, bold: true })],
                                spacing: { after: 100 }
                            })
                        );

                        children.push(
                            new Paragraph({
                                children: [new TextRun({ text: `Before: ${imp.example_before}`, italics: true })],
                                spacing: { after: 100 },
                                indent: { left: 360 }
                            })
                        );

                        children.push(
                            new Paragraph({
                                children: [new TextRun({ text: `After: ${imp.example_after}`, italics: true })],
                                spacing: { after: 200 },
                                indent: { left: 360 }
                            })
                        );
                    });
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

            // Soft skills details from ai.soft_skills
            if (ai.soft_skills) {
                // Relevant skills
                if (ai.soft_skills.relevant_skills && ai.soft_skills.relevant_skills.length) {
                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: "Found Skills:", bold: true })],
                            spacing: { after: 100 }
                        })
                    );

                    ai.soft_skills.relevant_skills.forEach(item => {
                        children.push(
                            new Paragraph({
                                children: [new TextRun({ text: `• ${item}` })],
                                spacing: { after: 100 },
                                indent: { left: 360 }
                            })
                        );
                    });
                }

                // Missing elements
                if (ai.soft_skills.missing_elements && ai.soft_skills.missing_elements.length) {
                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: "Suggested Skills:", bold: true })],
                            spacing: { after: 100 }
                        })
                    );

                    ai.soft_skills.missing_elements.forEach(item => {
                        children.push(
                            new Paragraph({
                                children: [new TextRun({ text: `• ${item}` })],
                                spacing: { after: 100 },
                                indent: { left: 360 }
                            })
                        );
                    });
                }

                // Improvement examples
                if (ai.soft_skills.improvements && ai.soft_skills.improvements.length) {
                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: "Improvement Examples:", bold: true })],
                            spacing: { after: 200 }
                        })
                    );

                    ai.soft_skills.improvements.forEach((imp, i) => {
                        children.push(
                            new Paragraph({
                                children: [new TextRun({ text: `${i + 1}. ${imp.suggestion}`, bold: true })],
                                spacing: { after: 100 }
                            })
                        );

                        children.push(
                            new Paragraph({
                                children: [new TextRun({ text: `Before: ${imp.example_before}`, italics: true })],
                                spacing: { after: 100 },
                                indent: { left: 360 }
                            })
                        );

                        children.push(
                            new Paragraph({
                                children: [new TextRun({ text: `After: ${imp.example_after}`, italics: true })],
                                spacing: { after: 200 },
                                indent: { left: 360 }
                            })
                        );
                    });
                }
            }

            doc.addSection({ children });
        }

        // Keywords section
        if (ats.keyword_score != null) {
            const children = [
                new Paragraph({
                    children: [
                        new TextRun({ text: "Keywords", bold: true, size: 24 })
                    ],
                    spacing: { after: 200 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: `Score: ${Number(ats.keyword_score).toFixed(1)}%` })
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

            // Keywords details from ai.keywords or keyword_analysis
            const keywordData = ai.keywords || currentAnalysis.keyword_analysis || {};

            // Found keywords
            if (keywordData.keywords_found && keywordData.keywords_found.length) {
                children.push(
                    new Paragraph({
                        children: [new TextRun({ text: "Matched Keywords:", bold: true })],
                        spacing: { after: 100 }
                    })
                );

                keywordData.keywords_found.forEach(item => {
                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: `• ${item}` })],
                            spacing: { after: 100 },
                            indent: { left: 360 }
                        })
                    );
                });
            } else if (keywordData.strengths && keywordData.strengths.length) {
                children.push(
                    new Paragraph({
                        children: [new TextRun({ text: "Strengths:", bold: true })],
                        spacing: { after: 100 }
                    })
                );

                keywordData.strengths.forEach(item => {
                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: `• ${item}` })],
                            spacing: { after: 100 },
                            indent: { left: 360 }
                        })
                    );
                });
            }

            // Missing keywords
            if (keywordData.keywords_missing && keywordData.keywords_missing.length) {
                children.push(
                    new Paragraph({
                        children: [new TextRun({ text: "Missing Keywords:", bold: true })],
                        spacing: { after: 100 }
                    })
                );

                keywordData.keywords_missing.forEach(item => {
                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: `• ${item}` })],
                            spacing: { after: 100 },
                            indent: { left: 360 }
                        })
                    );
                });
            } else if (keywordData.missing_elements && keywordData.missing_elements.length) {
                children.push(
                    new Paragraph({
                        children: [new TextRun({ text: "Missing Keywords:", bold: true })],
                        spacing: { after: 100 }
                    })
                );

                keywordData.missing_elements.forEach(item => {
                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: `• ${item}` })],
                            spacing: { after: 100 },
                            indent: { left: 360 }
                        })
                    );
                });
            }

            // Weaknesses
            if (keywordData.weaknesses && keywordData.weaknesses.length) {
                children.push(
                    new Paragraph({
                        children: [new TextRun({ text: "Areas to Improve:", bold: true })],
                        spacing: { after: 100 }
                    })
                );

                keywordData.weaknesses.forEach(item => {
                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: `• ${item}` })],
                            spacing: { after: 100 },
                            indent: { left: 360 }
                        })
                    );
                });
            }

            // Improvement examples
            if (ai.keywords && ai.keywords.improvements && ai.keywords.improvements.length) {
                children.push(
                    new Paragraph({
                        children: [new TextRun({ text: "Improvement Examples:", bold: true })],
                        spacing: { after: 200 }
                    })
                );

                ai.keywords.improvements.forEach((imp, i) => {
                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: `${i + 1}. ${imp.suggestion}`, bold: true })],
                            spacing: { after: 100 }
                        })
                    );

                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: `Before: ${imp.example_before}`, italics: true })],
                            spacing: { after: 100 },
                            indent: { left: 360 }
                        })
                    );

                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: `After: ${imp.example_after}`, italics: true })],
                            spacing: { after: 200 },
                            indent: { left: 360 }
                        })
                    );
                });
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

            // Formatting details from ai.formatting
            if (ai.formatting) {
                // Strengths
                if (ai.formatting.strengths && ai.formatting.strengths.length) {
                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: "Strengths:", bold: true })],
                            spacing: { after: 100 }
                        })
                    );

                    ai.formatting.strengths.forEach(item => {
                        children.push(
                            new Paragraph({
                                children: [new TextRun({ text: `• ${item}` })],
                                spacing: { after: 100 },
                                indent: { left: 360 }
                            })
                        );
                    });
                }

                // Weaknesses
                if (ai.formatting.weaknesses && ai.formatting.weaknesses.length) {
                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: "Areas to Improve:", bold: true })],
                            spacing: { after: 100 }
                        })
                    );

                    ai.formatting.weaknesses.forEach(item => {
                        children.push(
                            new Paragraph({
                                children: [new TextRun({ text: `• ${item}` })],
                                spacing: { after: 100 },
                                indent: { left: 360 }
                            })
                        );
                    });
                }

                // Improvement examples
                if (ai.formatting.improvements && ai.formatting.improvements.length) {
                    children.push(
                        new Paragraph({
                            children: [new TextRun({ text: "Improvement Examples:", bold: true })],
                            spacing: { after: 200 }
                        })
                    );

                    ai.formatting.improvements.forEach((imp, i) => {
                        children.push(
                            new Paragraph({
                                children: [new TextRun({ text: `${i + 1}. ${imp.suggestion}`, bold: true })],
                                spacing: { after: 100 }
                            })
                        );

                        if (imp.example) {
                            children.push(
                                new Paragraph({
                                    children: [new TextRun({ text: `Example: ${imp.example}`, italics: true })],
                                    spacing: { after: 200 },
                                    indent: { left: 360 }
                                })
                            );
                        } else if (imp.example_before && imp.example_after) {
                            children.push(
                                new Paragraph({
                                    children: [new TextRun({ text: `Before: ${imp.example_before}`, italics: true })],
                                    spacing: { after: 100 },
                                    indent: { left: 360 }
                                })
                            );

                            children.push(
                                new Paragraph({
                                    children: [new TextRun({ text: `After: ${imp.example_after}`, italics: true })],
                                    spacing: { after: 200 },
                                    indent: { left: 360 }
                                })
                            );
                        }
                    });
                }
            }

            doc.addSection({ children });
        }

        // Language Analysis
        const languageChildren = [
            new Paragraph({
                children: [
                    new TextRun({ text: "Language Analysis", bold: true, size: 24 })
                ],
                spacing: { after: 200 }
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
                            : "Consider adding more impactful verbs",
                        italics: true
                    })
                ],
                spacing: { after: 200 }
            }),

            // Readability
            new Paragraph({
                children: [
                    new TextRun({ text: "Readability: ", bold: true }),
                    new TextRun({ text: `${Number(readabilityScore).toFixed(0)}%` })
                ],
                spacing: { after: 100 }
            }),
            new Paragraph({
                children: [
                    new TextRun({
                        text: Number(readabilityScore) >= 70
                            ? "Good content structure"
                            : "Content needs improvement",
                        italics: true
                    })
                ],
                spacing: { after: 300 }
            })
        ];

        doc.addSection({ children: languageChildren });

        // Key Recommendations
        if (ai.overall_suggestions && ai.overall_suggestions.length > 0) {
            const recommendationChildren = [
                new Paragraph({
                    children: [
                        new TextRun({ text: "Key Recommendations", bold: true, size: 24 })
                    ],
                    spacing: { after: 200 }
                })
            ];

            ai.overall_suggestions.forEach((suggestion, i) => {
                recommendationChildren.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: `${i + 1}. ${suggestion}` })
                        ],
                        spacing: { after: 200 }
                    })
                );
            });

            doc.addSection({ children: recommendationChildren });
        }

        // Document Statistics
        const statsChildren = [
            new Paragraph({
                children: [
                    new TextRun({ text: "Document Statistics", bold: true, size: 24 })
                ],
                spacing: { after: 200 }
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "Words: ", bold: true }),
                    new TextRun({ text: currentAnalysis.word_count || "N/A" })
                ],
                spacing: { after: 100 }
            }),
            new Paragraph({
                children: [
                    new TextRun({ text: "Readability: ", bold: true }),
                    new TextRun({ text: `${Number(readabilityScore).toFixed(1)}%` })
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
        ];

        doc.addSection({ children: statsChildren });

        // Missing Sections
        if (Array.isArray(currentAnalysis.missing_sections) && currentAnalysis.missing_sections.length > 0) {
            const missingSectionsChildren = [
                new Paragraph({
                    children: [
                        new TextRun({ text: "Missing Sections", bold: true, size: 24 })
                    ],
                    spacing: { after: 200 }
                })
            ];

            currentAnalysis.missing_sections.forEach(section => {
                missingSectionsChildren.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: `• ${section}` })
                        ],
                        spacing: { after: 100 }
                    })
                );
            });

            doc.addSection({ children: missingSectionsChildren });
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
