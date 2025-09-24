import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button, Select, Input } from "../../../components/ui";
import { sanitizeName } from "../utils/helpers";
import ModalSurface from "./ModalSurface";

/**
 * UploadModal
 * Self-contained modal for uploading a document.
 *
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - onSubmit: (form: { file: File|null, type: string, name: string, metadata: any }) => Promise<void> | void
 * - uploading?: boolean  (disables submit + shows loading label)
 * - documentTypes?: Array<{ value: string, label: string }>
 * - defaultType?: string   (fallback "resume")
 * - defaultName?: string   (optional)
 */
export default function UploadModal({
  open,
  onClose,
  onSubmit,
  uploading = false,
  documentTypes = [],
  defaultType = "resume",
  defaultName = "",
}) {
  const [mounted, setMounted] = useState(false);
  const [file, setFile] = useState(null);
  const [type, setType] = useState(defaultType);
  const [name, setName] = useState(defaultName);
  const [metadata] = useState({}); // reserved for future use
  const surfaceRef = useRef(null);

  useEffect(() => setMounted(true), []);

  // lock scroll + ESC to close
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // Outside click to close (backdrop handled via button)
  const stop = (e) => e.stopPropagation();

  const handleSubmit = async () => {
    if (uploading) return;
    if (!file) {
      // lightweight inline nudge; parent can still show a toast
      surfaceRef.current?.querySelector("input[type=file]")?.focus();
      return;
    }
    const cleaned = sanitizeName(name);
    await onSubmit?.({
      file,
      type,
      name: cleaned,
      metadata,
    });
  };

  if (!open || !mounted) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
      />
      {/* Surface */}
      <div className="fixed z-50 inset-0 flex items-center justify-center p-4">
        <ModalSurface
          ref={surfaceRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-title"
          className="w-full max-w-md rounded-2xl ring-1 p-6"
          onClick={stop}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 id="upload-title" className="text-lg font-bold text-slate-100">
              Upload Document
            </h3>
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
          <div className="space-y-6">
            {/* Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 tracking-wide uppercase mb-2">
                Document Type
              </label>
              <Select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full text-sm font-medium text-slate-100"
              >
                {(documentTypes.length ? documentTypes : [{ value: "resume", label: "Resume" }]).map(
                  (t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  )
                )}
              </Select>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Document Name (optional)
              </label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., John Doe – Resume"
                className="w-full input-glass"
              />
              <p className="text-xs text-slate-400 mt-1">
                We’ll keep your file extension and use this as the display name.
              </p>
            </div>

            {/* File */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                File
              </label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full input-glass"
              />
              <p className="text-xs text-slate-400 mt-1">
                Supported formats: PDF, DOC, DOCX, TXT
              </p>
            </div>

            {/* Footer */}
            <div className="flex gap-3 justify-end pt-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="border-slate-600 text-slate-300 hover:bg-slate-700/50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={uploading || !file}
                className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-700 disabled:cursor-not-allowed"
              >
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </div>
        </ModalSurface>
      </div>
    </>,
    document.body
  );
}
