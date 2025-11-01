import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sanitizeName } from "../utils/helpers";
import { api, apiFetch } from "../../../lib/api";
import { useToast } from "../../../lib/toast";

export default function useDocuments() {
    const toast = useToast();
    const [all, setAll] = useState([]);
    const [querying, setQuerying] = useState(false);
    const [query, setQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState("created_desc");

    const [openUpload, setOpenUpload] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Track initial mount to prevent loading flicker
    const mountedRef = useRef(false);
    const abortRef = useRef();

    const refresh = useCallback(async () => {
        abortRef.current?.abort();
        const ctl = new AbortController();
        abortRef.current = ctl;
        // Only show loading state after initial mount to prevent flickering
        if (mountedRef.current) {
            setQuerying(true);
        }
        try {
            const json = await api.getDocuments();
            // accept several possible shapes
            const docs = Array.isArray(json?.documents)
                ? json.documents
                : Array.isArray(json?.items)
                    ? json.items
                    : Array.isArray(json)
                        ? json
                        : [];
            setAll(docs);
        } catch (e) {
            if (e.name !== "AbortError") console.error(e);
        } finally {
            setQuerying(false);
            // Mark as mounted after first successful load
            mountedRef.current = true;
        }
    }, []);

    // Load documents only once on mount
    useEffect(() => {
        refresh();
        return () => abortRef.current?.abort();
    }, []); // Empty dependency - only run once on mount

    const docs = useMemo(() => {
        let out = [...all];
        if (query.trim()) {
            const q = query.trim().toLowerCase();
            out = out.filter(
                (d) =>
                    d.name?.toLowerCase().includes(q) ||
                    d.file_name?.toLowerCase().includes(q) ||
                    d.type?.toLowerCase().includes(q)
            );
        }
        if (typeFilter !== "all") {
            out = out.filter((d) => d.type === typeFilter);
        }
        if (statusFilter !== "all") {
            out = out.filter((d) => d.status === statusFilter);
        }
        const by = {
            created_desc: (a, b) => new Date(b.created_at) - new Date(a.created_at),
            created_asc: (a, b) => new Date(a.created_at) - new Date(b.created_at),
            name_asc: (a, b) => String(a.name).localeCompare(String(b.name)),
            name_desc: (a, b) => String(b.name).localeCompare(String(a.name)),
            score_desc: (a, b) => (b.ats_score ?? -1) - (a.ats_score ?? -1),
            score_asc: (a, b) => (a.ats_score ?? 1e9) - (b.ats_score ?? 1e9),
        }[sortBy];
        return by ? out.sort(by) : out;
    }, [all, query, typeFilter, statusFilter, sortBy]);

    const uploadDocument = useCallback(async ({ file, type, name, metadata }) => {
        setUploading(true);
        try {
            await api.uploadDocument({
                file,
                document_type: type,
                name: sanitizeName(name || file?.name || "Untitled"),
                metadata: metadata || {},
            });
            await refresh();
        } finally {
            setUploading(false);
        }
    }, [refresh]);

    const changeStatus = useCallback(async (id, value) => {
        await api.setDocumentStatus(id, value); // PUT /documents/{id}/status
        setAll((arr) => arr.map((d) => (d.id === id ? { ...d, status: value } : d)));
    }, []);

    const removeDocument = useCallback(async (doc) => {
        await api.deleteDocument(doc.id);
        setAll((arr) => arr.filter((d) => d.id !== doc.id));
    }, []);

    const previewDoc = useCallback(async (doc) => {
        try {
            return await api.previewDocument(doc.id);
        } catch (e) {
            console.error('previewDocument error:', e);
            // Extract meaningful error message
            const errorMsg = e?.message || String(e) || 'Failed to preview document';
            toast.error(errorMsg);
            // Don't re-throw - we've already shown the error to the user
        }
    }, [toast]);

    const downloadDoc = useCallback(async (doc) => {
        try {
            return await api.downloadDocument(doc.id);
        } catch (e) {
            console.error('downloadDocument error:', e);
            // Extract meaningful error message
            const errorMsg = e?.message || String(e) || 'Failed to download document';
            toast.error(errorMsg);
            // Don't re-throw - we've already shown the error to the user
        }
    }, [toast]);

    return {
        docs,
        querying,
        query,
        setQuery,
        typeFilter,
        setTypeFilter,
        statusFilter,
        setStatusFilter,
        sortBy,
        setSortBy,
        refresh,
        openUpload,
        setOpenUpload,
        uploading,
        uploadDocument,
        changeStatus,
        removeDocument,
        previewDoc,
        downloadDoc,
    };
}
