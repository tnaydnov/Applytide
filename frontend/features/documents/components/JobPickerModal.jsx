import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Input } from "../../../components/ui";
import { getCompany } from "../utils/helpers";
import ModalSurface from "./ModalSurface";

export default function JobPickerModal({
  open,
  onClose,
  jobs = [],
  onSelect, // (job) => void
  title = "Choose a Job",
}) {
  const [mounted, setMounted] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => setMounted(true), []);
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

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return jobs;
    return jobs.filter(
      (j) =>
        j.title?.toLowerCase().includes(qq) ||
        getCompany(j).toLowerCase().includes(qq) ||
        j.location?.toLowerCase().includes(qq)
    );
  }, [jobs, q]);

  if (!open || !mounted) return null;

  return createPortal(
    <>
      <button
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
      />
      <div className="fixed inset-0 z-50 p-4 grid place-items-center">
        <ModalSurface
          role="dialog"
          aria-modal="true"
          className="w-full max-w-2xl rounded-2xl ring-1 ring-white/10 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-5 py-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/5"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="p-5 space-y-4">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search job title, company, or location…"
              className="w-full"
            />

            <div className="max-h-[50vh] overflow-y-auto divide-y divide-white/5 rounded-lg border border-white/10">
              {filtered.length ? (
                filtered.map((job) => (
                  <button
                    key={job.id}
                    className="w-full text-left px-4 py-3 hover:bg-white/5 transition"
                    onClick={() => onSelect?.(job)}
                  >
                    <div className="font-medium text-slate-100">{job.title}</div>
                    <div className="text-sm text-slate-400">
                      {getCompany(job)}{job.location ? ` — ${job.location}` : ""}
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-10 text-center text-slate-400">
                  No matching jobs.
                </div>
              )}
            </div>
          </div>

          <div className="px-5 py-3 border-t border-white/10 bg-white/5 flex justify-end">
            <button onClick={onClose} className="btn-ghost px-5 py-2 rounded-lg">
              Close
            </button>
          </div>
        </ModalSurface>
      </div>
    </>,
    document.body
  );
}
