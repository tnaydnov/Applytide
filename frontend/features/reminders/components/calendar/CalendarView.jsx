import MonthGrid from "./MonthGrid";
import WeekGrid from "./WeekGrid";
import DayGrid from "./DayGrid";

export default function CalendarView({
  view = "month",
  date = new Date(),
  reminders = [],
  googleEvents = [],
  onPrev,
  onNext,
  onToday,
  onSelectItem, // { type: "reminder"|"google", data }
}) {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">
          {date.toLocaleDateString("en-US", {
            year: "numeric",
            month: view === "month" ? "long" : "short",
            day: view === "day" ? "numeric" : undefined,
          })}
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1 rounded border" onClick={onPrev} type="button">Prev</button>
          <button className="px-3 py-1 rounded border" onClick={onToday} type="button">Today</button>
          <button className="px-3 py-1 rounded border" onClick={onNext} type="button">Next</button>
        </div>
      </div>

      {view === "month" && (
        <MonthGrid date={date} reminders={reminders} events={googleEvents} onSelectItem={onSelectItem} />
      )}
      {view === "week" && (
        <WeekGrid date={date} reminders={reminders} events={googleEvents} onSelectItem={onSelectItem} />
      )}
      {view === "day" && (
        <DayGrid date={date} reminders={reminders} events={googleEvents} onSelectItem={onSelectItem} />
      )}
    </div>
  );
}
