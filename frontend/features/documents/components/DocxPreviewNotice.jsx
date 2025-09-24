/** Sticky, subtle notice that DOCX inline preview isn’t supported */
export default function DocxPreviewNotice() {
  return (
    <div className="hidden md:flex fixed bottom-4 right-4 max-w-sm p-3 rounded-xl bg-slate-900/70 border border-slate-700/70 text-slate-300 text-xs shadow-lg backdrop-blur">
      <span className="mr-2">ℹ️</span>
      DOCX inline preview isn’t available. Download to view formatting, or re-upload as PDF.
    </div>
  );
}
