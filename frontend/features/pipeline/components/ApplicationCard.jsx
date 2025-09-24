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
                className={`glass-card group hover:border-white/20 transition-all duration-300 animate-slideIn overflow-hidden relative ${viewMode === "board" ? "text-sm" : ""
                    }`}
                style={{
                    animationDelay: `${Math.random() * 200}ms`,
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    MozUserSelect: "none",
                    msUserSelect: "none",
                }}
                padding={false}
            >
                {/* Delete */}
                <button
                    onClick={handleDelete}
                    className={`absolute ${viewMode === "board" ? "top-2 left-2" : "top-2 right-2"}
                    inline-flex items-center justify-center
                    w-10 h-10 rounded-full
                    text-red-400 hover:text-red-300
                    bg-black/20 hover:bg-red-500/15
                    border-2 border-red-400/40 hover:border-red-300/60
                    shadow-sm backdrop-blur-sm z-10 transition`}
                    title="Delete application"
                    aria-label="Delete application"
                    type="button"
                >
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                        <path d="M3 6h18" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <path d="M19 6v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        <path d="M10 11v6M14 11v6" />
                    </svg>
                </button>


                <div className={viewMode === "board" ? "p-3 pt-8" : "p-6"}>
                    {/* Header */}
                    <div className="mb-4">
                        <div className={`${viewMode === "board" ? "mb-3 text-center" : "mb-3"}`}>
                            <h3
                                className={`font-bold text-slate-100 group-hover:text-indigo-400 transition-colors leading-tight ${viewMode === "board" ? "text-base line-clamp-2 px-2 max-w-[85%]" : "text-xl"
                                    }`}
                                title={title}
                            >
                                {title}
                            </h3>
                        </div>

                        {company && (
                            <div className={`${viewMode === "board" ? "mb-3 text-center" : "mb-3"}`}>
                                <div className={`flex items-center space-x-1 ${viewMode === "board" ? "justify-center px-2" : ""}`}>
                                    <span className={viewMode === "board" ? "text-sm" : ""}>🏢</span>
                                    <span
                                        className={`font-medium text-indigo-400 ${viewMode === "board" ? "text-sm truncate max-w-[120px]" : "text-sm truncate"
                                            }`}
                                        title={company}
                                    >
                                        {company}
                                    </span>
                                </div>
                            </div>
                        )}

                        {viewMode !== "board" && location && (
                            <div className="flex items-center flex-wrap gap-2 text-sm text-slate-300">
                                <div className="flex items-center space-x-1">
                                    <span>📍</span>
                                    <span>{location}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Drag handle & mobile move */}
                    {viewMode === "board" && (
                        <div className="flex items-center justify-center mb-3 gap-2">
                            {/* Desktop drag handle */}
                            <div
                                className="hidden md:inline-flex items-center justify-center
                                w-10 h-10 rounded-lg border border-white/15
                                text-slate-300 hover:text-white hover:bg-white/10
                                cursor-grab active:cursor-grabbing transition"
                                title="Drag to move"
                                draggable
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                                aria-label="Drag to move application"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <circle cx="6" cy="5" r="1.3" /><circle cx="10" cy="5" r="1.3" />
                                    <circle cx="6" cy="9" r="1.3" /><circle cx="10" cy="9" r="1.3" />
                                    <circle cx="6" cy="13" r="1.3" /><circle cx="10" cy="13" r="1.3" />
                                </svg>
                            </div>


                            {/* Mobile move button */}
                            <button
                                className="md:hidden tap-target text-gray-400 hover:text-gray-300 p-2 hover:bg-white/10 rounded-lg transition-all border border-white/10"
                                title="Move to different stage"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMoveModal(true);
                                }}
                                type="button"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                    <path
                                        fillRule="evenodd"
                                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </button>
                        </div>
                    )}

                    {/* Actions */}
                    <div className={`${viewMode === "board" ? "pt-2 border-t border-white/10" : "pt-4 border-t border-white/10"}`}>
                        {viewMode === "board" ? (
                            <div className="space-y-2">
                                <div className="text-xs text-slate-300 text-center">{getDaysAgo(application.created_at)}</div>
                                <div className="flex flex-col space-y-1.5">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-cyan-400 border-cyan-400/50 bg-cyan-500/10 hover:bg-cyan-500/20 hover:border-cyan-400 transition text-[11px] py-1 w-full"
                                        onClick={handleView}
                                    >
                                        👁️ View
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="bg-gradient-to-r from-purple-500/80 to-pink-500/80 border border-purple-400/50 text-white hover:from-purple-500 hover:to-pink-500 transition text-[11px] py-1 w-full"
                                        onClick={(e) => {
                                            e.stopPropagation?.();
                                            setShowNoteModal(true);
                                        }}
                                    >
                                        📝 Note
                                    </Button>

                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-slate-300 flex-shrink-0">{getDaysAgo(application.created_at)}</div>

                                <div className="flex items-center space-x-2 ml-4">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-cyan-400 border-cyan-400/50 bg-cyan-500/10 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all duration-300 flex-shrink-0"
                                        onClick={handleView}
                                    >
                                        <span className="mr-1">👁️</span>
                                        View
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="bg-gradient-to-r from-purple-500/80 to-pink-500/80 border border-purple-400/50 text-white hover:from-purple-500 hover:to-pink-500 hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 flex-shrink-0"
                                        onClick={(e) => {
                                            e.stopPropagation?.();
                                            setShowNoteModal(true);
                                        }}
                                    >
                                        <span className="mr-1">📝</span>
                                        Note
                                    </Button>
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
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Bottom sheet */}
                    <div className="absolute inset-x-0 bottom-0 animate-[slideUp_.22s_ease-out]">
                        <div className="mx-auto w-full max-w-md rounded-t-2xl
                      bg-gradient-to-b from-[#11182c] to-[#0b1120]
                      text-white shadow-2xl ring-1 ring-white/10">

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