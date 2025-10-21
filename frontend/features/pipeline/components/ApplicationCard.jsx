import { useCallback, useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { Button, Card } from "../../../components/ui";
import { getStatusConfig } from "../utils/status";
import { createPortal } from "react-dom";

// Lazy-load to avoid SSR issues; we’ll add this file next.
const NoteModal = dynamic(() => import("./NoteModal").then(m => m.default || m), { ssr: false });

/**
 * ApplicationCard
 * Props:
 *  - application: { id, status, created_at, job: { title, company_name, company?, location? } }
 *  - onMove(id, newStatus)
 *  - onDelete(id)
 *  - onUpdate()            (optional, not used inside but kept for parity)
 *  - statuses: string[]    (full list of pipeline statuses)
 *  - onDragStart(app) / onDragEnd()
 *  - viewMode: "board" | "cards" (default "board")
 */
export default function ApplicationCard({
    application,
    onMove,
    onDelete,
    onUpdate,
    onArchive,
    statuses = [],
    onDragStart,
    onDragEnd,
    viewMode = "board",
}) {
    const router = useRouter();
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [search, setSearch] = useState("");
    const [mounted, setMounted] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        if (!mounted) return;
        if (showMoveModal) {
            const prev = document.body.style.overflow;
            document.body.style.overflow = "hidden";   // prevent background scroll
            return () => { document.body.style.overflow = prev; };
        }
    }, [mounted, showMoveModal]);

    useEffect(() => {
        if (!showMoveModal) return;
        const onKey = (e) => e.key === 'Escape' && setShowMoveModal(false);
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [showMoveModal]);

    // Guard against missing application to prevent runtime errors.
    if (!application || !application.id) {
        return null;
    }

    const config = getStatusConfig(application.status);

    const availableStatuses = useMemo(() => {
        const list = Array.isArray(statuses) ? statuses : [];
        return list.filter((s) => s && s !== application.status);
    }, [statuses, application.status]);

    const handleDragStart = useCallback(
        (e) => {
            try {
                e.dataTransfer.setData(
                    "text/plain",
                    JSON.stringify({ id: application.id, currentStatus: application.status })
                );
                e.dataTransfer.effectAllowed = "move";
            } catch {
                /* ignore - not all browsers let us set this in all contexts */
            }
            onDragStart && onDragStart(application);
        },
        [application, onDragStart]
    );

    const handleDragEnd = useCallback(() => {
        onDragEnd && onDragEnd();
    }, [onDragEnd]);

    const handleDelete = useCallback(
        (e) => {
            e?.stopPropagation?.();
            if (typeof window !== "undefined" && window.confirm("Are you sure you want to delete this application?")) {
                onDelete && onDelete(application.id);
            }
        },
        [application.id, onDelete]
    );

    const handleArchive = useCallback(
        async (e) => {
            e?.stopPropagation?.();
            if (isArchiving) return;
            setIsArchiving(true);
            try {
                if (onArchive) {
                    await onArchive(application.id);
                }
            } finally {
                setIsArchiving(false);
            }
        },
        [application.id, onArchive, isArchiving]
    );

    const handleView = useCallback(
        (e) => {
            e?.stopPropagation?.();
            router.push({ pathname: "/pipeline", query: { app: application.id } }, undefined, { shallow: true });
        },
        [router, application?.id]
    );

    const getDaysAgo = (dateString) => {
        if (!dateString) return "N/A";
        const dt = new Date(dateString);
        if (Number.isNaN(dt.getTime())) return "N/A";
        const diffDays = Math.ceil((Date.now() - dt.getTime()) / 86400000);
        return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
        // using ceil to count partial days as a full day, matching your previous UX
    };

    const handleMobileMove = (newStatus) => {
        if (!newStatus || newStatus === application.status) {
            setShowMoveModal(false);
            return;
        }
        onMove && onMove(application.id, newStatus);
        setShowMoveModal(false);
    };

    const title = application.job?.title || "Unknown Position";
    const company = application.job?.company?.name || application.job?.company_name;
    const location = application.job?.location;

    return (
        <>
            <Card
                className={`group relative overflow-hidden transition-all duration-300 animate-slideIn
                    ${viewMode === "board" 
                        ? "hover:shadow-lg hover:shadow-indigo-500/10 hover:-translate-y-1" 
                        : "hover:shadow-xl hover:shadow-indigo-500/20 hover:border-indigo-400/40"
                    }
                    border border-white/10 bg-gradient-to-br from-slate-800/90 via-slate-900/90 to-slate-800/90
                    backdrop-blur-sm hover:border-white/20`}
                style={{
                    animationDelay: `${Math.random() * 200}ms`,
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    MozUserSelect: "none",
                    msUserSelect: "none",
                }}
                padding={false}
            >
                {/* Subtle gradient overlay for depth */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 pointer-events-none" />

                {/* Action buttons - cleaner positioning */}
                <div className={`absolute ${viewMode === "board" ? "top-3 right-3" : "top-4 right-4"} flex gap-2 z-10`}>
                    {/* Archive button */}
                    <button
                        onClick={handleArchive}
                        disabled={isArchiving}
                        className="group/btn inline-flex items-center justify-center
                            w-7 h-7 rounded-lg
                            text-slate-400 hover:text-amber-400
                            bg-slate-800/60 hover:bg-amber-500/20
                            border border-slate-700/50 hover:border-amber-500/50
                            backdrop-blur-sm transition-all duration-200
                            disabled:opacity-50 disabled:cursor-not-allowed
                            hover:scale-110 active:scale-95"
                        title={application.is_archived ? "Unarchive application" : "Archive application"}
                        aria-label={application.is_archived ? "Unarchive" : "Archive"}
                        type="button"
                    >
                        {isArchiving ? (
                            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                            </svg>
                        ) : (
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 8v13H3V8"/>
                                <path d="M1 3h22v5H1z"/>
                                <path d="M10 12h4"/>
                            </svg>
                        )}
                    </button>
                    
                    {/* Delete button */}
                    <button
                        onClick={handleDelete}
                        className="group/btn inline-flex items-center justify-center
                            w-7 h-7 rounded-lg
                            text-slate-400 hover:text-red-400
                            bg-slate-800/60 hover:bg-red-500/20
                            border border-slate-700/50 hover:border-red-500/50
                            backdrop-blur-sm transition-all duration-200
                            hover:scale-110 active:scale-95"
                        title="Delete application"
                        aria-label="Delete application"
                        type="button"
                    >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18" />
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <path d="M19 6v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                            <path d="M10 11v6M14 11v6" />
                        </svg>
                    </button>
                </div>

                <div className={viewMode === "board" ? "p-4" : "p-5"}>
                    {/* Header - Clean and professional */}
                    <div className="space-y-3 mb-4">
                        {/* Job Title */}
                        <div>
                            <h3
                                className={`font-semibold text-white group-hover:text-indigo-300 transition-colors duration-200 leading-snug
                                    ${viewMode === "board" ? "text-[15px] line-clamp-2 pr-16" : "text-lg pr-20"}`}
                                title={title}
                            >
                                {title}
                            </h3>
                        </div>

                        {/* Company and metadata */}
                        <div className="flex items-start gap-3 text-sm">
                            {company && (
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                    <div className="flex-shrink-0 w-5 h-5 rounded bg-indigo-500/20 flex items-center justify-center">
                                        <svg className="w-3 h-3 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <span className="font-medium text-slate-300 truncate" title={company}>
                                        {company}
                                    </span>
                                </div>
                            )}

                            {viewMode !== "board" && location && (
                                <div className="flex items-center gap-1.5 text-slate-400 flex-shrink-0">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span className="text-xs truncate">{location}</span>
                                </div>
                            )}
                        </div>

                        {/* Source badge - more subtle */}
                        {application.source && (
                            <div>
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium 
                                    bg-slate-700/40 text-slate-400 border border-slate-600/30">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    {application.source}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Drag handle & mobile move - sleeker design */}
                    {viewMode === "board" && (
                        <div className="flex items-center justify-center mb-3">
                            {/* Desktop drag handle - modern minimal */}
                            <div
                                className="drag-handle-btn hidden md:inline-flex items-center justify-center
                                text-slate-400 hover:text-slate-300 cursor-grab active:cursor-grabbing
                                w-full py-1.5 rounded-lg border border-slate-700/50 hover:border-slate-600/50 
                                bg-slate-800/30 hover:bg-slate-700/30 transition-all duration-200"
                                title="Drag to move"
                                draggable
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                                aria-label="Drag to move application"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <circle cx="6" cy="6" r="1.5" /><circle cx="14" cy="6" r="1.5" />
                                    <circle cx="6" cy="10" r="1.5" /><circle cx="14" cy="10" r="1.5" />
                                    <circle cx="6" cy="14" r="1.5" /><circle cx="14" cy="14" r="1.5" />
                                </svg>
                            </div>

                            {/* Mobile move button - cleaner */}
                            <button
                                className="drag-handle-btn md:hidden w-full py-2 flex items-center justify-center gap-2
                                text-slate-400 hover:text-slate-300 hover:bg-slate-700/40 
                                rounded-lg transition-all border border-slate-700/50 hover:border-slate-600/50
                                bg-slate-800/30 text-sm font-medium"
                                title="Move to different stage"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMoveModal(true);
                                }}
                                type="button"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                                Move Stage
                            </button>
                        </div>
                    )}

                    {/* Actions - Modern, professional buttons */}
                    <div className={`${viewMode === "board" ? "pt-3 mt-3 border-t border-slate-700/50" : "pt-4 mt-4 border-t border-slate-700/50"}`}>
                        {viewMode === "board" ? (
                            <div className="space-y-2.5">
                                {/* Date info - subtle */}
                                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {getDaysAgo(application.created_at)}
                                </div>

                                {/* Action buttons - refined */}
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={handleView}
                                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                                            text-sm font-medium text-slate-200
                                            bg-slate-700/50 hover:bg-slate-700/70
                                            border border-slate-600/50 hover:border-slate-500/50
                                            transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        View
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation?.();
                                            setShowNoteModal(true);
                                        }}
                                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                                            text-sm font-medium text-white
                                            bg-gradient-to-br from-indigo-500/90 to-purple-500/90 hover:from-indigo-500 hover:to-purple-500
                                            border border-indigo-400/30 hover:border-indigo-400/50
                                            shadow-sm hover:shadow-md hover:shadow-indigo-500/25
                                            transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        Note
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between gap-4">
                                {/* Date info */}
                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {getDaysAgo(application.created_at)}
                                </div>

                                {/* Action buttons */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleView}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg
                                            text-sm font-medium text-slate-200
                                            bg-slate-700/50 hover:bg-slate-700/70
                                            border border-slate-600/50 hover:border-slate-500/50
                                            transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        View Details
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation?.();
                                            setShowNoteModal(true);
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg
                                            text-sm font-medium text-white
                                            bg-gradient-to-br from-indigo-500/90 to-purple-500/90 hover:from-indigo-500 hover:to-purple-500
                                            border border-indigo-400/30 hover:border-indigo-400/50
                                            shadow-sm hover:shadow-lg hover:shadow-indigo-500/25
                                            transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        Add Note
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* Notes modal */}
            {showNoteModal && (
                <NoteModal application={application} onClose={() => setShowNoteModal(false)} />
            )}

            {/* Mobile Move Modal */}
            {mounted && showMoveModal && createPortal(
                <div className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true">
                    {/* Backdrop */}
                    <button
                        aria-label="Close"
                        onClick={() => setShowMoveModal(false)}
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                    />

                    {/* Bottom sheet */}
                    <div className="absolute inset-x-0 bottom-0 animate-[slideUp_.22s_ease-out] flex justify-center">
                        <div className="mx-auto w-full max-w-[90%] sm:max-w-md rounded-t-2xl
                      bg-[#0e1424] 
                      text-white shadow-2xl border border-white/15">

                            {/* Sticky header */}
                            <div className="sticky top-0 z-10 bg-transparent pt-3 pb-3 px-5 border-b border-white/10">
                                <div className="flex justify-center mb-2">
                                    <div className="h-1.5 w-12 rounded-full bg-white/25" />
                                </div>
                                <h3 className="text-base font-semibold leading-none">Move Application</h3>
                                <p className="text-xs text-white/60 mt-1">Move “{title}” to:</p>

                                <div className="mt-3">
                                    <input
                                        type="search"
                                        placeholder="Search stages…"
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full h-10 rounded-md bg-white/[0.06]
                         ring-1 ring-white/15 focus:outline-none
                         focus:ring-2 focus:ring-indigo-400/60
                         placeholder-white/40 px-3 text-sm"
                                    />
                                </div>
                            </div>

                            {/* Scrollable list */}
                            <div className="max-h-[60vh] overflow-y-auto px-5 py-4 space-y-2">
                                {availableStatuses
                                    .filter(s => !search || s.toLowerCase().includes(search.toLowerCase()))
                                    .map((statusOption) => {
                                        const cfg = getStatusConfig(statusOption);
                                        return (
                                            <button
                                                key={statusOption}
                                                onClick={() => handleMobileMove(statusOption)}
                                                type="button"
                                                className="w-full text-left px-4 py-3 rounded-lg
                             bg-white/[0.04] ring-1 ring-white/10
                             hover:bg-white/[0.07] hover:ring-white/25
                             transition"
                                            >
                                                <span className="flex items-center gap-2">
                                                    <span>{cfg.icon}</span>
                                                    <span className="font-medium">{statusOption}</span>
                                                </span>
                                            </button>
                                        );
                                    })}
                            </div>

                            {/* Sticky footer */}
                            <div className="sticky bottom-0 bg-transparent px-5
                        pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3
                        border-t border-white/10">
                                <button
                                    onClick={() => setShowMoveModal(false)}
                                    className="w-full h-10 rounded-lg bg-white/10 text-white/85
                       hover:bg-white/15 transition"
                                    type="button"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}


        </>
    );
}
