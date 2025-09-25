export default function CalendarLegend() {
  const Chip = ({ label, cls }) => (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${cls}`}>
      {label}
    </span>
  );

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {/* Must mirror getReminderTypeColor mapping */}
      <Chip label="Follow-up" cls="neon-violet" />
      <Chip label="Interview" cls="neon-pink" />
      <Chip label="Deadline" cls="neon-rose" />
      <Chip label="Call" cls="neon-amber" />
      <Chip label="Google event" cls="bg-sky-500/15 text-sky-100 ring-1 ring-sky-400/30" />
    </div>
  );
}