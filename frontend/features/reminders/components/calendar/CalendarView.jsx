// frontend/features/reminders/components/calendar/CalendarView.jsx
import MonthGrid from "./MonthGrid";
import WeekGrid from "./WeekGrid";
import DayGrid from "./DayGrid";

export default function CalendarView({
  view = "month",
  date = new Date(),
  onPrev,
  onNext,
  onToday,
  reminders = [],
  googleEvents = [],
  onSelectItem,
  onGoToDate, // NEW
}) {
  const title = date?.toLocaleDateString?.("en-US", {
    month: "long",
    year: "numeric",
  });

  const valueMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  const valueDate  = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  return (
    <div className="mt-4">
      {/* Nav + title */}
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold text-slate-100">{title}</div>

          {/* Legend */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-violet-500/15 text-violet-200 ring-1 ring-violet-400/30">
              Applytide Reminder
            </span>
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-sky-500/15 text-sky-200 ring-1 ring-sky-400/30">
              Google Event
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Jump to */}
          {view === "month" ? (
            <input
              type="month"
              value={valueMonth}
              onChange={(e) => {
                if (!onGoToDate) return;
                const [y, m] = e.target.value.split("-").map(Number);
                onGoToDate(new Date(y, m - 1, 1));
              }}
              className="input-glass input-cyan text-sm"
            />
          ) : (
            <input
              type="date"
              value={valueDate}
              onChange={(e) => {
                if (!onGoToDate) return;
                const [y, m, d] = e.target.value.split("-").map(Number);
                onGoToDate(new Date(y, m - 1, d));
              }}
              className="input-glass input-cyan text-sm"
            />
          )}

          <button
            type="button"
            onClick={onPrev}
            className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-100 hover:bg-white/10"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={onToday}
            className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-100 hover:bg-white/10"
          >
            Today
          </button>
          <button
            type="button"
            onClick={onNext}
            className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-100 hover:bg-white/10"
          >
            Next
          </button>
        </div>
      </div>

      {/* View switch */}
      {view === "month" && (
        <MonthGrid
          date={date}
          reminders={reminders}
          events={googleEvents}
          onSelectItem={onSelectItem}
        />
      )}
      {view === "week" && (
        <WeekGrid
          date={date}
          reminders={reminders}
          events={googleEvents}
          onSelectItem={onSelectItem}
        />
      )}
      {view === "day" && (
        <DayGrid
          date={date}
          reminders={reminders}
          events={googleEvents}
          onSelectItem={onSelectItem}
        />
      )}
    </div>
  );
}
