import { useCallback, useMemo, useState } from "react";
import { api, apiFetch } from "../../../lib/api";
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';

export default function useCoverLetter({ jobs = [], resumes = [], onSaved } = {}) {
    const [clOpen, setClOpen] = useState(false);
    const [clForm, setClForm] = useState({
        job_id: "",
        resume_id: "",
        tone: "professional",
        length: "medium",
    });
    const [isGenerating, setIsGenerating] = useState(false);
    const [generated, setGenerated] = useState("");



    const canGenerate = useMemo(
        () => clForm.job_id && clForm.resume_id && !isGenerating,
        [clForm, isGenerating]
    );



    const generate = useCallback(async () => {
        if (!canGenerate) return;
        setIsGenerating(true);
        try {
            const result = await api.generateCoverLetter(clForm);

            console.log("Cover letter API response:", result);

            // The API returns a different structure than expected
            if (typeof result === 'string') {
                setGenerated(result);
            } else if (result?.cover_letter) { // Add this check for the cover_letter property
                setGenerated(result.cover_letter);
            } else if (result?.assistant) {
                setGenerated(result.assistant);
            } else if (result?.text) {
                setGenerated(result.text);
            } else if (result?.content) {
                setGenerated(result.content);
            } else if (result?.output) {
                setGenerated(result.output);
            } else {
                console.error("Unexpected response format:", result);
                setGenerated("Error: Could not parse the generated cover letter.");
            }

            // Log the extracted content
            console.log("Cover letter content set:", typeof result === 'string'
                ? result.substring(0, 50) + "..."
                : result?.cover_letter
                    ? result.cover_letter.substring(0, 50) + "..."
                    : "Object response");
        } catch (error) {
            console.error("Error generating cover letter:", error);
            setGenerated("An error occurred while generating your cover letter. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    }, [canGenerate, clForm]);

    const saveAsDocument = useCallback(() => {
        console.log("Save as Document clicked! Content length:", generated?.length || 0);

        if (!generated) {
            console.error("No content to save!");
            return;
        }

        try {
            console.log("Creating document structure...");
            // Create Word document directly without server API
            const doc = new Document({
                sections: [{
                    properties: {},
                    children: [
                        // Split the generated text into paragraphs
                        ...generated.split('\n').map((line, i) => {
                            console.log(`Processing line ${i + 1}/${generated.split('\n').length}`);
                            return new Paragraph({
                                children: [
                                    new TextRun({
                                        text: line || " ", // Handle empty lines
                                        size: 24 // 12pt font
                                    })
                                ],
                                spacing: {
                                    after: 200 // Add space between paragraphs
                                }
                            });
                        })
                    ]
                }]
            });

            // Generate and save document directly without server
            console.log("Generating blob...");
            Packer.toBlob(doc).then(blob => {
                console.log("Blob generated, size:", blob.size, "bytes");
                console.log("Saving file...");
                saveAs(blob, "Cover_Letter.docx");
                console.log("Word document saved successfully!");
            }).catch(err => {
                console.error("Error in Packer.toBlob:", err);
            });
        } catch (err) {
            console.error("Error creating document:", err);
        }
    }, [generated]);

    return {
        clOpen,
        setClOpen,
        clForm,
        setClForm: (partial) =>
            setClForm((f) => ({ ...f, ...(typeof partial === "function" ? partial(f) : partial) })),
        isGenerating,
        generated,
        setGenerated,
        generate,
        saveAsDocument,
    };
}
