// File: frontend/features/documents/components/DocumentsToolbar.jsx
import React from "react";
import { Button, Input, Select } from "../../../components/ui";
import { DOCUMENT_TYPES, DOCUMENT_STATUS } from "../utils/constants";

/**
 * DocumentsToolbar
 * Search, filter, sort, and quick actions for documents.
 *
 * Props:
 * - query: string
 * - onQueryChange: (q: string) => void
 * - typeFilter: string ('all' | DOCUMENT_TYPES[].value)
 * - onTypeFilterChange: (v: string) => void
 * - statusFilter: string ('all' | DOCUMENT_STATUS[].value)
 * - onStatusFilterChange: (v: string) => void
 * - sortBy: 'created_desc'|'created_asc'|'name_asc'|'name_desc'|'score_desc'|'score_asc'
 * - onSortByChange: (v: string) => void
 * - onOpenUpload: () => void
 * - onOpenCoverLetter?: () => void
 */
export default function DocumentsToolbar({
    query = "",
    onQueryChange,
    typeFilter = "all",
    onTypeFilterChange,
    statusFilter = "all",
    onStatusFilterChange,
    sortBy = "created_desc",
    onSortByChange,
    onOpenUpload,
    onOpenCoverLetter,
}) {
    return (
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            {/* Left: search & filters */}
            <div className="flex flex-col md:flex-row gap-2 md:items-center">
                <div className="relative w-[280px] md:w-[360px]">
                    <Input
                        placeholder="Search documents…"
                        value={query}
                        onChange={(e) => onQueryChange?.(e.target.value)}
                        /* if your Input supports an icon prop, uncomment the next line */
                        icon={<span>🔍</span>}
                        className="w-full"
                    />
                </div>

                <Select
                    value={typeFilter}
                    onChange={(e) => onTypeFilterChange?.(e.target.value)}
                    className="min-w-[150px]"
                >
                    <option value="all">All Types</option>
                    {DOCUMENT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                            {t.label}
                        </option>
                    ))}
                </Select>

                <Select
                    value={statusFilter}
                    onChange={(e) => onStatusFilterChange?.(e.target.value)}
                    className="min-w-[150px]"
                >
                    <option value="all">All Statuses</option>
                    {DOCUMENT_STATUS.map((s) => (
                        <option key={s.value} value={s.value}>
                            {s.label}
                        </option>
                    ))}
                </Select>

                <Select
                    value={sortBy}
                    onChange={(e) => onSortByChange?.(e.target.value)}
                    className="min-w-[170px]"
                >
                    <option value="created_desc">Newest</option>
                    <option value="created_asc">Oldest</option>
                    <option value="name_asc">Name A–Z</option>
                    <option value="name_desc">Name Z–A</option>
                    <option value="score_desc">ATS Score ↓</option>
                    <option value="score_asc">ATS Score ↑</option>
                </Select>
            </div>

            {/* Right: actions */}
            <div className="flex gap-2 justify-end flex-none">
                {onOpenCoverLetter && (
                    <Button
                        variant="outline"
                        onClick={onOpenCoverLetter}
                        className="border-slate-600 text-slate-200 hover:bg-slate-700/40"
                    >
                        ✨ Generate Cover Letter
                    </Button>
                )}
                <Button onClick={onOpenUpload} className="bg-blue-600 hover:bg-blue-700 text-white">
                    ⬆️ Upload
                </Button>
            </div>
        </div>
    );
}
