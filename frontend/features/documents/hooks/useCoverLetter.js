import { useCallback, useMemo, useState } from "react";
import { api, apiFetch } from "../../../lib/api";

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

            // The API already extracts the text for us and returns it as a string
            // or returns the full response object if it couldn't extract the text
            if (typeof result === 'string') {
                setGenerated(result);
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
                : "Object response");
        } catch (error) {
            console.error("Error generating cover letter:", error);
            setGenerated("An error occurred while generating your cover letter. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    }, [canGenerate, clForm]);

    const saveAsDocument = useCallback(async () => {
        if (!generated) return;
        const res = await apiFetch("/documents", {
            method: "POST",
            body: JSON.stringify({
                type: "cover_letter",
                name: "Generated Cover Letter",
                content: generated,
                format: "txt",
                status: "draft",
            }),
        });
        if (res.ok) {
            onSaved?.();
            setClOpen(false);
        }
    }, [generated, onSaved]);

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
