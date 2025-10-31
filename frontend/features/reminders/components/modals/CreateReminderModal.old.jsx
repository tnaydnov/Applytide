import { useState } from "react";
import { Button } from "../../../../components/ui";

export default function CreateReminderModal({
  open,
  onClose,
  onCreate,           // (form) => Promise<boolean>
  applications = [],
}) {
  const [form, setForm] = useState({
    application_id: "",
    type: "Follow-up",
    customType: "",
    title: "",
    description: "",
    due_date: "",
    add_meet_link: false,
    email_notify: true,
  });

  // New notification mode: 'presets', 'custom-time', 'custom-relative', 'recurring'
  const [notificationMode, setNotificationMode] = useState("presets");
  
  // Quick presets (selected presets)
  const [selectedPresets, setSelectedPresets] = useState(["1_hour"]);
  
  // Custom specific time notification
  const [customDateTime, setCustomDateTime] = useState("");
  
  // Custom relative time (X hours/days/weeks before)
  const [relativeValue, setRelativeValue] = useState(1);
  const [relativeUnit, setRelativeUnit] = useState("hours");
  
  // Recurring reminder
  const [recurringTime, setRecurringTime] = useState("09:00");
  const [recurringStartDays, setRecurringStartDays] = useState(7);

  if (!open) return null;

  const presetOptions = [
    { id: "1_hour", label: "1 hour before", value: 1, unit: "hour" },
    { id: "1_day", label: "1 day before", value: 1, unit: "day" },
    { id: "1_week", label: "1 week before", value: 1, unit: "week" },
  ];

  const togglePreset = (presetId) => {
    if (selectedPresets.includes(presetId)) {
      setSelectedPresets(selectedPresets.filter(id => id !== presetId));
    } else {
      setSelectedPresets([...selectedPresets, presetId]);
    }
  };

  // Map frontend type to backend event_type
  const getEventType = (type) => {
    const mapping = {
      'Interview': 'interview',
      'Deadline': 'deadline',
      'Follow-up': 'follow-up',
      'Call': 'follow-up',
      'Custom': 'general'
    };
    return mapping[type] || 'general';
  };

  const submit = async (e) => {
    e?.preventDefault?.();
    
    // Build notification schedule based on mode
    let notificationSchedule = null;
    
    if (form.email_notify) {
      const times = [];
      
      if (notificationMode === "presets" && selectedPresets.length > 0) {
        // Convert selected presets to notification times
        selectedPresets.forEach(presetId => {
          const preset = presetOptions.find(p => p.id === presetId);
          if (preset) {
            times.push({
              value: preset.value,
              unit: preset.unit,
              sent: false
            });
          }
        });
        notificationSchedule = { type: "multiple", times };
        
      } else if (notificationMode === "custom-time" && customDateTime) {
        // Specific date/time notification
        // Convert to "send at this specific time" format
        times.push({
          type: "specific",
          datetime: new Date(customDateTime).toISOString(),
          sent: false
        });
        notificationSchedule = { type: "multiple", times };
        
      } else if (notificationMode === "custom-relative") {
        // X hours/days/weeks before
        times.push({
          value: parseInt(relativeValue),
          unit: relativeUnit === "hours" ? "hour" : relativeUnit === "days" ? "day" : "week",
          sent: false
        });
        notificationSchedule = { type: "multiple", times };
        
      } else if (notificationMode === "recurring") {
        // Daily reminder at specific time
        times.push({
          type: "recurring",
          frequency: "daily",
          time: recurringTime,
          start_days_before: parseInt(recurringStartDays),
          last_sent: null
        });
        notificationSchedule = { type: "multiple", times };
      }
    }

    const payload = {
      ...form,
      email_notifications_enabled: form.email_notify,
      notification_schedule: notificationSchedule,
      event_type: getEventType(form.type),
    };

    const ok = await onCreate?.(payload);
    if (ok) onClose?.();
  };

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="modal-glass w-full max-w-lg rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="modal-title text-lg">Create Reminder</h3>
          <button className="modal-close rounded-md px-2 py-1 text-slate-300" onClick={onClose} type="button">✕</button>
        </div>

        <form className="mt-4 space-y-3" onSubmit={submit}>
          <div>
            <label className="field-label">Application</label>
            <select
              required
              value={form.application_id}
              onChange={(e) => setForm((f) => ({ ...f, application_id: e.target.value }))}
              className="input-glass w-full"
            >
              <option value="">Select application…</option>
              {applications.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.job?.company_name} — {a.job?.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="input-glass w-full"
              >
                <option>Follow-up</option>
                <option>Interview</option>
                <option>Deadline</option>
                <option>Call</option>
                <option>Custom</option>
              </select>
            </div>
            {form.type === "Custom" && (
              <div>
                <label className="field-label">Custom type</label>
                <input
                  value={form.customType}
                  onChange={(e) => setForm((f) => ({ ...f, customType: e.target.value }))}
                  className="input-glass w-full"
                  placeholder="e.g., Coffee chat"
                />
              </div>
            )}
          </div>

          <div>
            <label className="field-label">Title</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="input-glass w-full"
              placeholder="e.g., ACME recruiter follow-up"
            />
          </div>

          <div>
            <label className="field-label">Date & time</label>
            <input
              type="datetime-local"
              required
              value={form.due_date}
              onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              className="input-glass w-full"
            />
          </div>

          <div>
            <label className="field-label">Notes</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="input-glass w-full"
              rows={4}
              placeholder="Anything to remember…"
            />
          </div>

          <div className="flex items-center gap-6 text-slate-200">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.add_meet_link}
                onChange={(e) => setForm((f) => ({ ...f, add_meet_link: e.target.checked }))}
              />
              Add Meet link
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.email_notify}
                onChange={(e) => setForm((f) => ({ ...f, email_notify: e.target.checked }))}
              />
              📧 Email me reminders
            </label>
          </div>

          {/* Notification Schedule - NEW UX */}
          {form.email_notify && (
            <div className="rounded-lg bg-slate-800/50 p-4 space-y-4">
              <label className="field-label text-sm font-semibold">📬 When to send email reminders:</label>
              
              {/* Mode Selection */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setNotificationMode("presets")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    notificationMode === "presets"
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/50"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  ⚡ Quick Presets
                </button>
                <button
                  type="button"
                  onClick={() => setNotificationMode("custom-time")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    notificationMode === "custom-time"
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/50"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  🕐 Specific Time
                </button>
                <button
                  type="button"
                  onClick={() => setNotificationMode("custom-relative")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    notificationMode === "custom-relative"
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/50"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  ⏱️ Before Event
                </button>
                <button
                  type="button"
                  onClick={() => setNotificationMode("recurring")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    notificationMode === "recurring"
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/50"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  🔄 Daily Reminder
                </button>
              </div>

              {/* Quick Presets Mode */}
              {notificationMode === "presets" && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">Select one or more quick reminders:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {presetOptions.map(preset => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => togglePreset(preset.id)}
                        className={`px-4 py-3 rounded-lg text-sm font-medium transition-all border-2 ${
                          selectedPresets.includes(preset.id)
                            ? "bg-indigo-500/20 border-indigo-500 text-indigo-300"
                            : "bg-slate-700/50 border-slate-600 text-slate-300 hover:border-slate-500"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  {selectedPresets.length === 0 && (
                    <p className="text-xs text-amber-400">⚠️ Select at least one reminder time</p>
                  )}
                </div>
              )}

              {/* Custom Specific Time Mode */}
              {notificationMode === "custom-time" && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">Send reminder at a specific date & time:</p>
                  <input
                    type="datetime-local"
                    value={customDateTime}
                    onChange={(e) => setCustomDateTime(e.target.value)}
                    className="input-glass w-full"
                    placeholder="Pick date & time"
                  />
                  <p className="text-xs text-slate-400">
                    💡 Example: Send at 9:00 AM on the day of the interview
                  </p>
                </div>
              )}

              {/* Custom Relative Time Mode */}
              {notificationMode === "custom-relative" && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">Send reminder before the event:</p>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      value={relativeValue}
                      onChange={(e) => setRelativeValue(e.target.value)}
                      className="input-glass w-24"
                    />
                    <select
                      value={relativeUnit}
                      onChange={(e) => setRelativeUnit(e.target.value)}
                      className="input-glass flex-1"
                    >
                      <option value="hours">hours before</option>
                      <option value="days">days before</option>
                      <option value="weeks">weeks before</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Recurring Daily Reminder Mode */}
              {notificationMode === "recurring" && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">Send daily reminder at the same time:</p>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Time of day:</label>
                      <input
                        type="time"
                        value={recurringTime}
                        onChange={(e) => setRecurringTime(e.target.value)}
                        className="input-glass w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Start reminding:</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          min="1"
                          value={recurringStartDays}
                          onChange={(e) => setRecurringStartDays(e.target.value)}
                          className="input-glass w-24"
                        />
                        <span className="text-sm text-slate-300">days before event</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">
                    💡 Example: Remind me at 9:00 AM every day starting 7 days before
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-ghost rounded-md px-3 py-2">Cancel</button>
            <button type="submit" className="btn-primary-gradient rounded-md px-3 py-2">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
}
