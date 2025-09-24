import { useMemo, useState } from "react";
import { Button } from "../../../components/ui";
import { STATUS_CONFIG, DEFAULT_STAGES } from "../utils/status";

/**
 * PipelineCustomizer
 * Props:
 *  - stages: string[]                     // current pipeline order
 *  - onStagesChange(next: string[]): void // called on Save
 *  - availableStages: string[]            // full set of possible stages
 *  - onClose?: () => void                 // optional close
 */
export default function PipelineCustomizer({
    stages,
    onStagesChange,
    availableStages = Object.keys(STATUS_CONFIG),
    onClose,
}) {
    const [tempStages, setTempStages] = useState(() => Array.isArray(stages) ? [...stages] : []);
    const [dragged, setDragged] = useState(null);          // { stage, index } | null
    const [dragOverIndex, setDragOverIndex] = useState(null);

    const remainingStages = useMemo(
        () => availableStages.filter((s) => !tempStages.includes(s)),
        [availableStages, tempStages]
    );

    // --- Mutators ---
    const addStage = (stageName) => {
        if (!stageName || tempStages.includes(stageName)) return;
        setTempStages((prev) => [...prev, stageName]);
    };
    const removeStage = (stageName) => {
        setTempStages((prev) => prev.filter((s) => s !== stageName));
    };
    const resetToDefaults = () => setTempStages([...DEFAULT_STAGES]);

    const saveChanges = () => {
        const clean = tempStages.filter(Boolean);
        if (clean.length === 0) return; // do not allow empty pipeline
        onStagesChange?.(clean);
        onClose?.();
    };
    const cancel = () => {
        setTempStages(Array.isArray(stages) ? [...stages] : []);
        onClose?.();
    };

    // --- DnD handlers ---
    const onDragStart = (e, stage, index) => {
        setDragged({ stage, index });
        try {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", stage);
        } catch { /* noop for Safari */ }
    };
    const onDragOver = (e, index) => {
        e.preventDefault();
        try { e.dataTransfer.dropEffect = "move"; } catch { }
        setDragOverIndex(index);
    };
    const onDragLeave = (e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setDragOverIndex(null);
    };
    const onDrop = (e, dropIndex) => {
        e.preventDefault();
        setDragOverIndex(null);
        if (!dragged || dragged.index === dropIndex) return;

        setTempStages((prev) => {
            const next = [...prev];
            const [moved] = next.splice(dragged.index, 1);
            next.splice(dropIndex, 0, moved);
            return next;
        });
        setDragged(null);
    };

    return (
        <div className="relative"> {/* establishes containing block for absolute footer */}
            {/* Scrollable body with bottom padding = footer height */}
            <div className="space-y-6 pb-28">
                {/* Current order */}
                <div>
                    <h4 className="text-xl font-bold text-white mb-2">Current Pipeline Order</h4>
                    <p className="text-indigo-300 mb-4">Drag and drop to reorder stages</p>

                    {tempStages.length === 0 ? (
                        <div className="text-sm text-slate-400">
                            No stages selected. Use “Available Stages” below to add some.
                        </div>
                    ) : (
                        <div className="space-y-3 mb-6">
                            {tempStages.map((stage, index) => {
                                const cfg = STATUS_CONFIG[stage] || {};
                                const active = dragOverIndex === index;
                                const dragging = dragged?.index === index;

                                return (
                                    <div
                                        key={stage}
                                        draggable
                                        onDragStart={(e) => onDragStart(e, stage, index)}
                                        onDragOver={(e) => onDragOver(e, index)}
                                        onDragLeave={onDragLeave}
                                        onDrop={(e) => onDrop(e, index)}
                                        className={[
                                            "flex items-center border rounded-xl p-4 cursor-move transition-all group",
                                            "bg-[#0c1020]/60", // subtle, but not glassy
                                            active
                                                ? "border-indigo-400/60 bg-indigo-500/15 shadow-lg shadow-indigo-500/20"
                                                : "border-white/15 hover:border-indigo-400/30",
                                            dragging ? "opacity-60" : "",
                                        ].join(" ")}
                                    >
                                        {/* 6-dot drag handle */}
                                        <div className="mr-4 text-indigo-400">
                                            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <circle cx="5" cy="5" r="1.5" /><circle cx="10" cy="5" r="1.5" />
                                                <circle cx="5" cy="10" r="1.5" /><circle cx="10" cy="10" r="1.5" />
                                                <circle cx="5" cy="15" r="1.5" /><circle cx="10" cy="15" r="1.5" />
                                            </svg>
                                        </div>

                                        {/* Position */}
                                        <span className="text-lg font-bold text-indigo-300 mr-4 min-w-[2rem]">
                                            {index + 1}.
                                        </span>

                                        {/* Icon */}
                                        <span className="text-lg mr-3" aria-hidden="true">{cfg.icon || "📋"}</span>

                                        {/* Name */}
                                        <span className="text-lg font-medium flex-1 text-white group-hover:text-indigo-300 transition-colors">
                                            {stage}
                                        </span>

                                        {/* Remove */}
                                        <button
                                            onClick={() => removeStage(stage)}
                                            className="ml-4 text-red-400 hover:text-red-300 p-2 hover:bg-red-500/15 rounded-lg transition"
                                            title={`Remove "${stage}"`}
                                            aria-label={`Remove ${stage}`}
                                        >
                                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Available stages */}
                <div>
                    <h4 className="text-xl font-bold text-white mb-2">Available Stages</h4>
                    {remainingStages.length === 0 ? (
                        <div className="text-sm text-slate-400">All stages are already in your pipeline.</div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                            {remainingStages.map((stage) => (
                                <button
                                    key={stage}
                                    onClick={() => addStage(stage)}
                                    className="flex items-center bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-200 rounded-xl p-4 hover:from-indigo-500/30 hover:to-purple-500/30 transition-all text-sm border border-indigo-400/30 hover:border-indigo-300/50 hover:scale-[1.02] group min-h-[60px]"
                                    title={`Add ${stage}`}
                                >
                                    <span className="mr-3 text-lg flex-shrink-0">{STATUS_CONFIG[stage]?.icon || "➕"}</span>
                                    <span className="font-medium group-hover:text-white transition-colors text-left flex-1">{stage}</span>
                                    <svg className="w-4 h-4 ml-2 flex-shrink-0 text-indigo-400 group-hover:text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12M6 12h12" />
                                    </svg>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Solid footer that sits on top of the content — no transparency, no gap */}
            <div
                className="
        absolute bottom-0 left-0 right-0 z-20
        pt-4 pb-4 px-4
        bg-[#0f1422]
        border-t border-indigo-400/20
        shadow-[0_-6px_16px_rgba(0,0,0,.35)]
        flex flex-col sm:flex-row justify-between items-center gap-4
      "
            >
                <Button
                    variant="outline"
                    onClick={resetToDefaults}
                    className="border-amber-400/50 text-amber-300 hover:bg-amber-500/20 hover:border-amber-400 transition-all"
                >
                    <span className="mr-2">🔄</span> Reset to Defaults
                </Button>

                <div className="flex gap-4">
                    <Button
                        variant="outline"
                        onClick={cancel}
                        className="border-gray-400/50 text-gray-300 hover:bg-gray-500/20 hover:border-gray-400 transition-all min-w-[120px]"
                    >
                        <span className="mr-2">❌</span> Cancel
                    </Button>
                    <Button
                        onClick={saveChanges}
                        className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl hover:shadow-purple-500/25 transition-all min-w-[140px]"
                    >
                        <span className="mr-2">💾</span> Save Pipeline
                    </Button>
                </div>
            </div>
        </div>
    );

}