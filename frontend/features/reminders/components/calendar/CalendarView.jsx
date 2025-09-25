import MonthGrid from "./MonthGrid";
import WeekGrid from "./WeekGrid";
import DayGrid from "./DayGrid";

/**
 * Wrapper that renders the proper grid (Month/Week/Day) and the nav.
 * Props:
 *  - view: "month" | "week" | "day"
 *  - date: Date
 *  - onPrev, onNext, onToday: () => void
 *  - reminders: Reminder[]
 *  - googleEvents: Google event[]
 *  - onSelectItem: ({ type: "reminder"|"google", data }) => void
 */
export default function CalendarView({
  view = "month",
  date = new Date(),
  onPrev,
  onNext,
  onToday,
  reminders = [],
  googleEvents = [],
  onSelectItem,
}) {
  const title = date?.toLocaleDateString?.("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mt-4">
      {/* Nav + title */}
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium text-gray-200 sm:text-gray-700">
          {title}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onPrev}
            className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={onToday}
            className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
          >
            Today
          </button>
          <button
            type="button"
            onClick={onNext}
            className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
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
