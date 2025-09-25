import { useMemo, useState } from "react";
import useRemindersData from "../features/reminders/hooks/useRemindersData";
import useCalendarView from "../features/reminders/hooks/useCalendarView";

import RemindersHeader from "../features/reminders/components/RemindersHeader";
import StatsDashboard from "../features/reminders/components/StatsDashboard";
import ViewTabs from "../features/reminders/components/ViewTabs";
import EventsList from "../features/reminders/components/EventsList";

import CalendarView from "../features/reminders/components/calendar/CalendarView";
import CreateReminderModal from "../features/reminders/components/modals/CreateReminderModal";
import ReminderDetailsModal from "../features/reminders/components/modals/ReminderDetailsModal";
import { Button } from "../components/ui";
import CalendarLegend from "../features/reminders/components/calendar/CalendarLegend";

export default function RemindersPage() {
  const [activeTab, setActiveTab] = useState("my"); // "my" | "calendar" | "import"
  const [details, setDetails] = useState(null);     // { type, data }
  const [createOpen, setCreateOpen] = useState(false);

  const {
    loading,
    isGoogleConnected,
    reminders,
    applications,
    googleEventIds,
    filter,
    setFilter,
    sortBy,
    setSortBy,
    filteredReminders,
    stats,
    refresh,
    createReminder,
    deleteReminder,
  } = useRemindersData();

  const calendar = useCalendarView({
    isGoogleConnected,
    googleEventIds,
    reminders,
    shouldFetch: activeTab !== "my",
  });

  const calendarView = calendar.calendarView;
  const setCalendarView = calendar.setCalendarView;

  const onSelectItem = (payload) => setDetails(payload);

  const onImportDone = async () => {
    await refresh();
    calendar.refreshGoogleEvents();
  };

  const googleImportList = useMemo(() => calendar.googleEvents, [calendar.googleEvents]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <RemindersHeader
        onCreate={() => setCreateOpen(true)}
        reminders={reminders}
        applications={applications}
      />
      <StatsDashboard stats={stats} />
      <ViewTabs active={activeTab} onChange={setActiveTab} />
      <div className="mt-3 rounded-lg bg-white/[0.03] ring-1 ring-white/10 p-3 text-[13px] text-slate-300 flex flex-wrap gap-x-4 gap-y-2">
        <div>• <span className="text-slate-100 font-medium">Colors:</span> Follow-up (violet), Interview (pink), Deadline (rose), Call (amber), Google (cyan).</div>
        <div>• <span className="text-slate-100 font-medium">Jump quickly:</span> use the date picker in the calendar toolbar to jump months/weeks/days.</div>
        <div>• <span className="text-slate-100 font-medium">Click items:</span> open details, add notes, or import Google events into an application.</div>
      </div>

      {/* Content areas */}
      {activeTab === "my" && (
        <EventsList
          reminders={filteredReminders}
          applications={applications}
          filter={filter}
          setFilter={setFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
          onSelect={(r) => setDetails({ type: "reminder", data: r })}
          onDelete={async (id) => {
            await deleteReminder(id);
            await refresh();
          }}
        />
      )}

      {activeTab === "calendar" && (
        <div className="mt-4">
          <div className="flex items-center gap-2">
            {["month", "week", "day"].map((v) => (
              <button
                key={v}
                className={`px-3 py-1 rounded border text-sm ${calendarView === v ? "bg-blue-50 border-blue-300 text-blue-700" : ""
                  }`}
                onClick={() => setCalendarView(v)}
                type="button"
              >
                {v[0].toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <CalendarLegend />
          <CalendarView
            view={calendarView}
            date={calendar.selectedDate}
            onPrev={calendar.goPrev}
            onNext={calendar.goNext}
            onToday={calendar.goToday}
            reminders={reminders}
            googleEvents={calendar.googleEvents}
            onSelectItem={onSelectItem}
            onGoToDate={calendar.setSelectedDate}
          />
        </div>
      )}

      {activeTab === "import" && (
        <div className="mt-6">
          {!isGoogleConnected && (
            <div className="mb-4 rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
              Connect Google Calendar from your account settings to import events.
            </div>
          )}

          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing Google events in view window ({googleImportList.length})
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={calendar.refreshGoogleEvents}>
                Refresh
              </Button>
            </div>
          </div>

          <ul className="divide-y divide-white/10 rounded-xl ring-1 ring-white/10 bg-white/[0.03]">
            {googleImportList.length === 0 && (
              <li className="p-6 text-center text-gray-500">No importable events in this window.</li>
            )}
            {googleImportList.map((e) => (
              <li key={e.id} className="p-4 flex items-start justify-between gap-4 text-slate-200">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-100">
                    {e.summary || e.title || "Event"}
                  </div>
                  <div className="text-sm text-slate-300">
                    {new Date(e?.start?.dateTime ?? e?.start?.date).toLocaleString()}
                  </div>
                  {e.location && <div className="text-xs text-slate-400 mt-1">{e.location}</div>}
                </div>
                <div className="flex-shrink-0">
                  <Button
                    variant="outline"
                    onClick={() => setDetails({ type: "google", data: e })}
                  >
                    Import…
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Modals */}
      <CreateReminderModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={createReminder}
        applications={applications}
      />

      <ReminderDetailsModal
        open={!!details}
        onClose={() => setDetails(null)}
        item={details}
        onDelete={async (id) => {
          await deleteReminder(id);
          await refresh();
          setDetails(null);
        }}
        onImported={onImportDone}
        applications={applications}
      />
    </div>
  );
}
