export default function LoadingOverlay({ text = "Analyzing…" }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm grid place-items-center">
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-200">
        <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
        <span className="font-medium">{text}</span>
      </div>
    </div>
  );
}
