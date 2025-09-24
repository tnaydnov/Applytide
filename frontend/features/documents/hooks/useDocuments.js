import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sanitizeName } from "../utils/helpers";
import { api, apiFetch } from "../../../lib/api";

export default function useDocuments() {
    const [all, setAll] = useState([]);
    const [querying, setQuerying] = useState(false);
    const [query, setQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState("created_desc");

    const [openUpload, setOpenUpload] = useState(false);
    const [uploading, setUploading] = useState(false);

    const abortRef = useRef();

    const refresh = useCallback(async () => {
        abortRef.current?.abort();
        const ctl = new AbortController();
        abortRef.current = ctl;
        setQuerying(true);
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
        }
    }, []);

    useEffect(() => {
        refresh();
        return () => abortRef.current?.abort();
    }, [refresh]);

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

    const previewDoc = useCallback((doc) => {
        // Use the API helper that returns a Blob tab
        return api.previewDocument(doc.id);
    }, []);

    const downloadDoc = useCallback((doc) => api.downloadDocument(doc.id), []);

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
