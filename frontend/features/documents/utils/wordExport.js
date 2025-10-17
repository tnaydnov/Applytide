import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";

/**
 * Export analysis data as Word document (.docx)
 * Pure function - no React dependencies
 */
export function exportAnalysisToWord(currentAnalysis) {
  if (!currentAnalysis) return;

  const ats = currentAnalysis.ats_score || {};
  const ai = currentAnalysis.ai_detailed_analysis || {};
  const overall = Number(ats.overall_score || 0).toFixed(1);
  const isJobSpecific = ats.technical_skills_score != null || Boolean(currentAnalysis.job_match_summary);
  const readabilityScore = currentAnalysis.readability_score || ats.readability_score || 0;

  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Title
          new Paragraph({
            children: [
              new TextRun({
                text: `Resume Analysis: ${currentAnalysis.document_name || "Document"}`,
                bold: true,
                size: 32,
              }),
            ],
            spacing: { after: 300 },
          }),

          // Overall score
          new Paragraph({
            children: [
              new TextRun({
                text: `Overall ATS Score: ${overall}%`,
                bold: true,
                size: 28,
              }),
            ],
            spacing: { after: 300 },
          }),

          // Basic info
          new Paragraph({
            children: [new TextRun({ text: `Document: ${currentAnalysis.document_name || "Document"}` })],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `Word Count: ${currentAnalysis.word_count || "N/A"}` })],
            spacing: { after: 400 },
          }),
        ],
      },
    ],
  });

  // Job-Specific Analysis
  const jobAnalysisChildren = [
    new Paragraph({
      children: [new TextRun({ text: isJobSpecific ? "Job-Specific Analysis" : "General Resume Analysis", bold: true, size: 24 })],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: isJobSpecific ? "This analysis compares your resume against job skills/requirements and provides targeted feedback." : "This is a general analysis. Select a job for tailored matching.",
        }),
      ],
      spacing: { after: 300 },
    }),
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
        children: [new TextRun({ text: summaryText })],
        spacing: { after: 300 },
      })
    );
  }

  doc.addSection({ children: jobAnalysisChildren });

  // Technical Skills section
  if (ats.technical_skills_score != null) {
    const children = [
      new Paragraph({
        children: [new TextRun({ text: "Technical Skills", bold: true, size: 24 })],
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [new TextRun({ text: `Score: ${Number(ats.technical_skills_score).toFixed(1)}%` })],
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "How well your technical skills align with job requirements", italics: true })],
        spacing: { after: 200 },
      }),
    ];

    // Technical skills details from ai.technical_skills
    if (ai.technical_skills) {
      // Strengths
      if (ai.technical_skills.strengths && ai.technical_skills.strengths.length) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: "Strengths:", bold: true })],
            spacing: { after: 100 },
          })
        );

        ai.technical_skills.strengths.forEach((item) => {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: `• ${item}` })],
              spacing: { after: 100 },
              indent: { left: 360 },
            })
          );
        });
      }

      // Weaknesses
      if (ai.technical_skills.weaknesses && ai.technical_skills.weaknesses.length) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: "Areas to Improve:", bold: true })],
            spacing: { after: 100 },
          })
        );

        ai.technical_skills.weaknesses.forEach((item) => {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: `• ${item}` })],
              spacing: { after: 100 },
              indent: { left: 360 },
            })
          );
        });
      }

      // Missing elements
      if (ai.technical_skills.missing_elements && ai.technical_skills.missing_elements.length) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: "Missing Skills:", bold: true })],
            spacing: { after: 100 },
          })
        );

        ai.technical_skills.missing_elements.forEach((item) => {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: `• ${item}` })],
              spacing: { after: 100 },
              indent: { left: 360 },
            })
          );
        });
      }

      // Improvement examples
      if (ai.technical_skills.improvements && ai.technical_skills.improvements.length) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: "Improvement Examples:", bold: true })],
            spacing: { after: 200 },
          })
        );

        ai.technical_skills.improvements.forEach((imp, i) => {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: `${i + 1}. ${imp.suggestion}`, bold: true })],
              spacing: { after: 100 },
            })
          );

          children.push(
            new Paragraph({
              children: [new TextRun({ text: `Before: ${imp.example_before}`, italics: true })],
              spacing: { after: 100 },
              indent: { left: 360 },
            })
          );

          children.push(
            new Paragraph({
              children: [new TextRun({ text: `After: ${imp.example_after}`, italics: true })],
              spacing: { after: 200 },
              indent: { left: 360 },
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
        children: [new TextRun({ text: "Soft Skills", bold: true, size: 24 })],
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [new TextRun({ text: `Score: ${Number(ats.soft_skills_score).toFixed(1)}%` })],
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "Presence of important soft skills relevant to this role", italics: true })],
        spacing: { after: 200 },
      }),
    ];

    // Soft skills details from ai.soft_skills
    if (ai.soft_skills) {
      // Relevant skills
      if (ai.soft_skills.relevant_skills && ai.soft_skills.relevant_skills.length) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: "Found Skills:", bold: true })],
            spacing: { after: 100 },
          })
        );

        ai.soft_skills.relevant_skills.forEach((item) => {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: `• ${item}` })],
              spacing: { after: 100 },
              indent: { left: 360 },
            })
          );
        });
      }

      // Missing elements
      if (ai.soft_skills.missing_elements && ai.soft_skills.missing_elements.length) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: "Suggested Skills:", bold: true })],
            spacing: { after: 100 },
          })
        );

        ai.soft_skills.missing_elements.forEach((item) => {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: `• ${item}` })],
              spacing: { after: 100 },
              indent: { left: 360 },
            })
          );
        });
      }

      // Improvement examples
      if (ai.soft_skills.improvements && ai.soft_skills.improvements.length) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: "Improvement Examples:", bold: true })],
            spacing: { after: 200 },
          })
        );

        ai.soft_skills.improvements.forEach((imp, i) => {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: `${i + 1}. ${imp.suggestion}`, bold: true })],
              spacing: { after: 100 },
            })
          );

          children.push(
            new Paragraph({
              children: [new TextRun({ text: `Before: ${imp.example_before}`, italics: true })],
              spacing: { after: 100 },
              indent: { left: 360 },
            })
          );

          children.push(
            new Paragraph({
              children: [new TextRun({ text: `After: ${imp.example_after}`, italics: true })],
              spacing: { after: 200 },
              indent: { left: 360 },
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
        children: [new TextRun({ text: "Keywords", bold: true, size: 24 })],
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [new TextRun({ text: `Score: ${Number(ats.keyword_score).toFixed(1)}%` })],
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "Job-specific terminology and industry language match", italics: true })],
        spacing: { after: 200 },
      }),
    ];

    // Keywords details from ai.keywords or keyword_analysis
    const keywordData = ai.keywords || currentAnalysis.keyword_analysis || {};

    // Found keywords
    if (keywordData.keywords_found && keywordData.keywords_found.length) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: "Matched Keywords:", bold: true })],
          spacing: { after: 100 },
        })
      );

      keywordData.keywords_found.forEach((item) => {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `• ${item}` })],
            spacing: { after: 100 },
            indent: { left: 360 },
          })
        );
      });
    } else if (keywordData.strengths && keywordData.strengths.length) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: "Strengths:", bold: true })],
          spacing: { after: 100 },
        })
      );

      keywordData.strengths.forEach((item) => {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `• ${item}` })],
            spacing: { after: 100 },
            indent: { left: 360 },
          })
        );
      });
    }

    // Missing keywords
    if (keywordData.keywords_missing && keywordData.keywords_missing.length) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: "Missing Keywords:", bold: true })],
          spacing: { after: 100 },
        })
      );

      keywordData.keywords_missing.forEach((item) => {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `• ${item}` })],
            spacing: { after: 100 },
            indent: { left: 360 },
          })
        );
      });
    } else if (keywordData.missing_elements && keywordData.missing_elements.length) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: "Missing Keywords:", bold: true })],
          spacing: { after: 100 },
        })
      );

      keywordData.missing_elements.forEach((item) => {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `• ${item}` })],
            spacing: { after: 100 },
            indent: { left: 360 },
          })
        );
      });
    }

    // Weaknesses
    if (keywordData.weaknesses && keywordData.weaknesses.length) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: "Areas to Improve:", bold: true })],
          spacing: { after: 100 },
        })
      );

      keywordData.weaknesses.forEach((item) => {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `• ${item}` })],
            spacing: { after: 100 },
            indent: { left: 360 },
          })
        );
      });
    }

    // Improvement examples
    if (ai.keywords && ai.keywords.improvements && ai.keywords.improvements.length) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: "Improvement Examples:", bold: true })],
          spacing: { after: 200 },
        })
      );

      ai.keywords.improvements.forEach((imp, i) => {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `${i + 1}. ${imp.suggestion}`, bold: true })],
            spacing: { after: 100 },
          })
        );

        children.push(
          new Paragraph({
            children: [new TextRun({ text: `Before: ${imp.example_before}`, italics: true })],
            spacing: { after: 100 },
            indent: { left: 360 },
          })
        );

        children.push(
          new Paragraph({
            children: [new TextRun({ text: `After: ${imp.example_after}`, italics: true })],
            spacing: { after: 200 },
            indent: { left: 360 },
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
        children: [new TextRun({ text: "Formatting", bold: true, size: 24 })],
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [new TextRun({ text: `Score: ${Number(ats.formatting_score).toFixed(1)}%` })],
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "ATS-friendly structure and organization", italics: true })],
        spacing: { after: 200 },
      }),
    ];

    // Formatting details from ai.formatting
    if (ai.formatting) {
      // Strengths
      if (ai.formatting.strengths && ai.formatting.strengths.length) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: "Strengths:", bold: true })],
            spacing: { after: 100 },
          })
        );

        ai.formatting.strengths.forEach((item) => {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: `• ${item}` })],
              spacing: { after: 100 },
              indent: { left: 360 },
            })
          );
        });
      }

      // Weaknesses
      if (ai.formatting.weaknesses && ai.formatting.weaknesses.length) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: "Areas to Improve:", bold: true })],
            spacing: { after: 100 },
          })
        );

        ai.formatting.weaknesses.forEach((item) => {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: `• ${item}` })],
              spacing: { after: 100 },
              indent: { left: 360 },
            })
          );
        });
      }

      // Improvement examples
      if (ai.formatting.improvements && ai.formatting.improvements.length) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: "Improvement Examples:", bold: true })],
            spacing: { after: 200 },
          })
        );

        ai.formatting.improvements.forEach((imp, i) => {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: `${i + 1}. ${imp.suggestion}`, bold: true })],
              spacing: { after: 100 },
            })
          );

          if (imp.example) {
            children.push(
              new Paragraph({
                children: [new TextRun({ text: `Example: ${imp.example}`, italics: true })],
                spacing: { after: 200 },
                indent: { left: 360 },
              })
            );
          } else if (imp.example_before && imp.example_after) {
            children.push(
              new Paragraph({
                children: [new TextRun({ text: `Before: ${imp.example_before}`, italics: true })],
                spacing: { after: 100 },
                indent: { left: 360 },
              })
            );

            children.push(
              new Paragraph({
                children: [new TextRun({ text: `After: ${imp.example_after}`, italics: true })],
                spacing: { after: 200 },
                indent: { left: 360 },
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
      children: [new TextRun({ text: "Language Analysis", bold: true, size: 24 })],
      spacing: { after: 200 },
    }),

    // Action verbs
    new Paragraph({
      children: [new TextRun({ text: "Action Verbs: ", bold: true }), new TextRun({ text: currentAnalysis.action_verb_count || "N/A" })],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: Number(currentAnalysis.action_verb_count) >= 10 ? "Strong use of action verbs" : "Consider adding more impactful verbs",
          italics: true,
        }),
      ],
      spacing: { after: 200 },
    }),

    // Readability
    new Paragraph({
      children: [new TextRun({ text: "Readability: ", bold: true }), new TextRun({ text: `${Number(readabilityScore).toFixed(0)}%` })],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: Number(readabilityScore) >= 70 ? "Good content structure" : "Content needs improvement",
          italics: true,
        }),
      ],
      spacing: { after: 300 },
    }),
  ];

  doc.addSection({ children: languageChildren });

  // Key Recommendations
  if (ai.overall_suggestions && ai.overall_suggestions.length > 0) {
    const recommendationChildren = [
      new Paragraph({
        children: [new TextRun({ text: "Key Recommendations", bold: true, size: 24 })],
        spacing: { after: 200 },
      }),
    ];

    ai.overall_suggestions.forEach((suggestion, i) => {
      recommendationChildren.push(
        new Paragraph({
          children: [new TextRun({ text: `${i + 1}. ${suggestion}` })],
          spacing: { after: 200 },
        })
      );
    });

    doc.addSection({ children: recommendationChildren });
  }

  // Document Statistics
  const statsChildren = [
    new Paragraph({
      children: [new TextRun({ text: "Document Statistics", bold: true, size: 24 })],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "Words: ", bold: true }), new TextRun({ text: currentAnalysis.word_count || "N/A" })],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "Readability: ", bold: true }), new TextRun({ text: `${Number(readabilityScore).toFixed(1)}%` })],
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "Missing Sections: ", bold: true }), new TextRun({ text: currentAnalysis.missing_sections?.length || "0" })],
      spacing: { after: 200 },
    }),
  ];

  doc.addSection({ children: statsChildren });

  // Missing Sections
  if (Array.isArray(currentAnalysis.missing_sections) && currentAnalysis.missing_sections.length > 0) {
    const missingSectionsChildren = [
      new Paragraph({
        children: [new TextRun({ text: "Missing Sections", bold: true, size: 24 })],
        spacing: { after: 200 },
      }),
    ];

    currentAnalysis.missing_sections.forEach((section) => {
      missingSectionsChildren.push(
        new Paragraph({
          children: [new TextRun({ text: `• ${section}` })],
          spacing: { after: 100 },
        })
      );
    });

    doc.addSection({ children: missingSectionsChildren });
  }

  // Generate and save document
  Packer.toBlob(doc).then((blob) => {
    saveAs(blob, `${(currentAnalysis.document_name || "analysis").replace(/[^a-z0-9_-]+/gi, "_")}_analysis.docx`);
  });
}
