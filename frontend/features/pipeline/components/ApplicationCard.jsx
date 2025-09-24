import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { Button, Card } from "../../../components/ui";
import { getStatusConfig } from "../utils/status";

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
                    className={`absolute ${viewMode === "board" ? "top-2 left-2" : "top-2 right-2"
                        } inline-flex items-center justify-center w-8 h-8 rounded-full text-red-400 hover:text-red-300 hover:bg-red-500/15 transition-all duration-200 z-10 backdrop-blur-sm border border-red-400/30 hover:border-red-300/50`}
                    title="Delete application"
                    aria-label="Delete application"
                    type="button"
                >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3,6 5,6 21,6"></polyline>
                        <path d="M19,6V20a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6M8,6V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
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
                                className="block text-gray-400 hover:text-gray-300 cursor-grab active:cursor-grabbing p-2 hover:bg-white/10 rounded-lg transition-all border border-white/10"
                                title="Drag to move"
                                draggable
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                                aria-label="Drag to move application"
                            >
                                {/* 6 dots icon */}
                                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                    <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
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
            {showMoveModal && (
                <div className="fixed inset-0 z-50">
                    {/* backdrop */}
                    <button
                        aria-label="Close"
                        onClick={() => setShowMoveModal(false)}
                        className="absolute inset-0 bg-black/50"
                    />
                    {/* bottom sheet */}
                    <div className="absolute inset-x-0 bottom-0">
                        <div className="mx-auto w-full max-w-md rounded-t-2xl bg-gray-900/95 backdrop-blur-xl
                       border border-white/15 shadow-2xl">
                            {/* grabber */}
                            <div className="flex justify-center pt-3">
                                <div className="h-1.5 w-12 rounded-full bg-white/20" />
                            </div>
                            <div className="p-5 max-h-[80vh] overflow-y-auto">
                                <h3 className="text-lg font-semibold text-white mb-1">Move Application</h3>
                                <p className="text-gray-300 text-sm mb-4">Move “{title}” to:</p>

                                {/* searchable list if you have many stages */}
                                <div className="mb-3">
                                    <input
                                        type="search"
                                        placeholder="Search stages…"
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full rounded-md bg-gray-800 border border-white/10 text-white px-3 py-2 text-sm"
                                    />
                                </div>

                                <div className="space-y-2">
                                    {availableStatuses
                                        .filter(s => !search || s.toLowerCase().includes(search.toLowerCase()))
                                        .map((statusOption) => {
                                            const cfg = getStatusConfig(statusOption);
                                            return (
                                                <button
                                                    key={statusOption}
                                                    onClick={() => handleMobileMove(statusOption)}
                                                    className={`w-full text-left px-4 py-3 rounded-lg border ${cfg.gradient}
                                 hover:border-opacity-70 transition`}
                                                    type="button"
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <span>{cfg.icon}</span>
                                                        <span className="font-medium">{statusOption}</span>
                                                    </span>
                                                </button>
                                            );
                                        })}
                                </div>

                                <button
                                    onClick={() => setShowMoveModal(false)}
                                    className="mt-5 w-full px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600"
                                    type="button"
                                >
                                    Cancel
                                </button>
                                {/* safe-area padding for iOS */}
                                <div className="pb-[env(safe-area-inset-bottom)]" />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}