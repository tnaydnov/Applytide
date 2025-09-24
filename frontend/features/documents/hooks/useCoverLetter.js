import { useCallback, useMemo, useState } from "react";

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
      const res = await fetch("/api/cover-letter/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clForm),
      });
      const json = await res.json();
      setGenerated(json?.text || "");
    } finally {
      setIsGenerating(false);
    }
  }, [canGenerate, clForm]);

  const saveAsDocument = useCallback(async () => {
    if (!generated) return;
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
