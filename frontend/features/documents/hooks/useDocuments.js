import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sanitizeName } from "../utils/helpers";

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
      const res = await fetch("/api/documents", { signal: ctl.signal });
      const json = await res.json();
      setAll(Array.isArray(json) ? json : json?.data || []);
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
      const form = new FormData();
      form.append("file", file);
      form.append("type", type);
      form.append("name", sanitizeName(name || file?.name || "Untitled"));
      form.append("metadata", JSON.stringify(metadata || {}));
      const res = await fetch("/api/documents", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      await refresh();
    } finally {
      setUploading(false);
    }
  }, [refresh]);

  const changeStatus = useCallback(async (id, status) => {
    await fetch(`/api/documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setAll((arr) => arr.map((d) => (d.id === id ? { ...d, status } : d)));
  }, []);

  const removeDocument = useCallback(async (doc) => {
    await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
    setAll((arr) => arr.filter((d) => d.id !== doc.id));
  }, []);

  const previewDoc = useCallback((doc) => {
    // Open a viewer route or new tab
    window.open(`/documents/${doc.id}/preview`, "_blank", "noopener,noreferrer");
  }, []);

  const downloadDoc = useCallback((doc) => {
    window.open(`/api/documents/${doc.id}/download`, "_blank", "noopener,noreferrer");
  }, []);

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
