/** Sticky, subtle notice that DOCX inline preview isn’t supported */
export default function DocxPreviewNotice() {
  return (
    <div
      role="note"
      className="hidden md:flex items-center gap-2 w-fit ml-auto mt-2 px-3 py-2 rounded-lg bg-slate-800/70 border border-slate-700 text-slate-300 text-xs"
    >
      <span>ℹ️</span>
      DOCX inline preview isn’t available. Download to view formatting, or re-upload as PDF.
    </div>
  );
}

