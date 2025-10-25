import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "../../../components/ui";
import { getCompany } from "../utils/helpers";
import ModalSurface from "./ModalSurface";
import LLMDownError from "../../../components/LLMDownError";

/**
 * CoverLetterModal
 * Generates a tailored cover letter from a selected job + resume.
 *
 * Controlled by parent — no API calls here.
 *
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - jobs: Array<Job>
 * - resumes: Array<{ id: string|number, label: string }>
 * - form: {
 *     job_id: string|number,
 *     resume_id: string|number,
 *     tone: 'professional'|'enthusiastic'|'confident'|'creative',
 *     length: 'short'|'medium'|'long'
 *   }
 * - onChangeForm: (partial: Partial<form>) => void
 * - onGenerate: () => void                 // parent triggers API & sets isGenerating + generatedCoverLetter
 * - isGenerating: boolean
 * - generatedCoverLetter: string
 * - onChangeGenerated: (text: string) => void
 * - onSave: () => void                     // parent saves as document
 */
export default function CoverLetterModal({
    open,
    onClose,
    jobs = [],
    resumes = [],
    form,
    onChangeForm,
    onGenerate,
    isGenerating = false,
    generatedCoverLetter = "",
    onChangeGenerated,
    onSave,
    llmError = false,
}) {
    const [mounted, setMounted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    useEffect(() => setMounted(true), []);

    // lock scroll + ESC to close
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e) => e.key === "Escape" && onClose?.();
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener("keydown", onKey);
        };
    }, [open, onClose]);

    const canGenerate =
        !!form?.job_id && !!form?.resume_id && !isGenerating;

    const selectedJob = useMemo(
        () => jobs.find((j) => String(j.id) === String(form?.job_id)),
        [jobs, form?.job_id]
    );

    if (!open || !mounted) return null;

    return createPortal(
        <>
            {/* Backdrop */}
            <button
                aria-label="Close"
                onClick={onClose}
                className="fixed inset-0 bg-black/80 backdrop-blur-md z-50"
            />
            {/* Surface */}
            <div className="fixed z-50 inset-0 flex items-center justify-center p-4">
                <ModalSurface
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="cl-title"
                    className="w-full max-w-4xl h-[85vh] rounded-2xl ring-1 overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-lg">✨</span>
                            </div>
                            <div>
                                <h2 id="cl-title" className="text-xl font-bold text-slate-200">
                                    Generate AI Cover Letter
                                </h2>
                                <p className="text-sm text-slate-400 mt-1">
                                    Create a tailored cover letter for your job application
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/5 transition"
                            aria-label="Close"
                            type="button"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Body */}
                    <div className="h-[calc(85vh-64px)] overflow-y-auto px-6 py-5">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            {/* Left column — controls */}
                            <div className="space-y-4">
                                {/* Job */}
                                <div>
                                    <label className="field-label">Target Job *</label>
                                    <select
                                        value={form?.job_id || ""}
                                        onChange={(e) => onChangeForm?.({ job_id: e.target.value })}
                                        className="w-full input-glass"
                                    >
                                        <option value="">Select a job...</option>
                                        {jobs.map((job) => (
                                            <option key={job.id} value={job.id}>
                                                {job.title} at {getCompany(job)}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Resume */}
                                <div>
                                    <label className="field-label">Resume *</label>
                                    <select
                                        value={form?.resume_id || ""}
                                        onChange={(e) => onChangeForm?.({ resume_id: e.target.value })}
                                        className="w-full input-glass"
                                    >
                                        <option value="">Select your resume...</option>
                                        {resumes.map((r) => (
                                            <option key={r.id} value={r.id}>
                                                {r.label || `Resume ${r.id}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Tone */}
                                <div>
                                    <label className="field-label">Tone</label>
                                    <select
                                        value={form?.tone || "professional"}
                                        onChange={(e) => onChangeForm?.({ tone: e.target.value })}
                                        className="w-full input-glass"
                                    >
                                        <option value="professional">Professional</option>
                                        <option value="enthusiastic">Enthusiastic</option>
                                        <option value="confident">Confident</option>
                                        <option value="creative">Creative</option>
                                    </select>
                                </div>

                                {/* Length */}
                                <div>
                                    <label className="field-label">Length</label>
                                    <select
                                        value={form?.length || "medium"}
                                        onChange={(e) => onChangeForm?.({ length: e.target.value })}
                                        className="w-full input-glass"
                                    >
                                        <option value="short">Short (200-300 words)</option>
                                        <option value="medium">Medium (300-400 words)</option>
                                        <option value="long">Long (400-500 words)</option>
                                    </select>
                                </div>

                                <Button
                                    onClick={onGenerate}
                                    disabled={!canGenerate}
                                    className={`w-full px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${!canGenerate
                                        ? "bg-slate-600 text-slate-400 cursor-not-allowed"
                                        : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl"
                                        }`}
                                >
                                    {isGenerating ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                                            Creating...
                                        </>
                                    ) : (
                                        <>✨ Generate Cover Letter</>
                                    )}
                                </Button>

                                {/* Context summary (optional, helpful cue) */}
                                {selectedJob && (
                                    <div className="text-xs text-slate-400 pt-1">
                                        Targeting: <span className="text-slate-300">{selectedJob.title}</span>{" "}
                                        at <span className="text-slate-300">{getCompany(selectedJob)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Right column — output */}
                            <div className="space-y-4">
                                <div>
                                    <label className="field-label">Generated Cover Letter</label>
                                    <div className="flex justify-end gap-2 mb-2">
                                        <button
                                            onClick={() => setIsFullscreen(!isFullscreen)}
                                            className="text-sm flex items-center gap-1 px-3 py-1.5 rounded bg-slate-700/50 hover:bg-slate-700 text-slate-200"
                                            title={isFullscreen ? "Exit fullscreen" : "View in fullscreen"}
                                        >
                                            {isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
                                        </button>
                                    </div>
                                    {isGenerating ? (
                                        <div className="w-full h-80 p-3 bg-slate-800/50 border border-slate-600/30 rounded-lg text-slate-200 flex flex-col items-center justify-center space-y-4">
                                            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                                            <div className="text-center">
                                                <p className="text-lg font-medium text-slate-200">
                                                    Creating your cover letter...
                                                </p>
                                                <p className="text-sm text-slate-400 mt-2">
                                                    Analyzing your resume and matching it to the job requirements
                                                </p>
                                            </div>
                                        </div>
                                    ) : llmError ? (
                                        /* Show LLM error if present */
                                        <LLMDownError
                                            context="cover letter generation"
                                            onRetry={onGenerate}
                                        />
                                    ) : (
                                        /* Replace this textarea with the conditional rendering */
                                        isFullscreen ? (
                                            <div className="fixed inset-0 z-50 bg-slate-900 p-8 flex flex-col">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h3 className="text-xl font-bold text-slate-100">Cover Letter Editor</h3>
                                                    <button
                                                        onClick={() => setIsFullscreen(false)}
                                                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white"
                                                    >
                                                        Close
                                                    </button>
                                                </div>
                                                <textarea
                                                    value={generatedCoverLetter}
                                                    onChange={(e) => onChangeGenerated?.(e.target.value)}
                                                    className="flex-1 w-full p-6 bg-slate-800/70 border border-slate-600/30 rounded-lg text-slate-200 font-medium text-base leading-relaxed resize-none focus:outline-none"
                                                    spellCheck="true"
                                                />
                                            </div>
                                        ) : (
                                            <textarea
                                                value={generatedCoverLetter}
                                                onChange={(e) => onChangeGenerated?.(e.target.value)}
                                                placeholder="Generated cover letter will appear here..."
                                                className="w-full h-[500px] p-4 bg-slate-800/50 border border-slate-600/30 rounded-lg text-slate-200 font-medium text-base leading-relaxed resize-vertical focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200"
                                                spellCheck="true"
                                            />
                                        )
                                    )}

                                    {generatedCoverLetter && (
                                        <div className="flex gap-2 mt-3 justify-end">
                                            <button
                                                onClick={() =>
                                                    navigator.clipboard.writeText(generatedCoverLetter)
                                                }
                                                className="btn-ghost px-3 py-1.5 rounded-lg text-sm"
                                                type="button"
                                            >
                                                📋 Copy
                                            </button>
                                            <button
                                                onClick={onSave}
                                                className="btn-ghost px-3 py-1.5 rounded-lg text-sm"
                                                type="button"
                                            >
                                                💾 Save as Document
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </ModalSurface>
            </div>
        </>,
        document.body
    );
}
