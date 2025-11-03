import { useState } from "react";
import { Button } from "../../../../components/ui";
import { useAuth } from "../../../../contexts/AuthContext";

export default function CreateReminderModal({
  open,
  onClose,
  onCreate,           // (form) => Promise<boolean>
  applications = [],
}) {
  const { user } = useAuth();
  
  const [form, setForm] = useState({
    application_id: "",
    type: "technical_interview",
    customType: "",
    title: "",
    description: "",
    due_date: "",
    add_meet_link: false,
    email_notify: true,
    ai_prep_tips_enabled: false,
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

  // Check if user has Pro/Premium access
  const hasProAccess = user && 
    user.subscription_plan !== 'starter' && 
    user.subscription_status === 'active';

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

  // Map frontend type to backend event_type (no mapping needed anymore, using exact names)
  const getEventType = (type) => {
    // Return type as-is since we're now using the exact backend names
    return type.toLowerCase().replace(/\s+/g, '_');
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
      ai_prep_tips_enabled: hasProAccess && form.ai_prep_tips_enabled,
    };

    const ok = await onCreate?.(payload);
    if (ok) onClose?.();
  };

  const selectedApp = applications.find(a => String(a.id) === String(form.application_id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-3xl bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-6 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Create Reminder</h2>
              <p className="text-slate-400 text-sm">Set up a calendar event with optional email notifications</p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              type="button"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={submit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* STEP 1: Application Selection */}
            <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-5 border border-slate-700/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <span className="text-blue-400 font-bold text-sm">1</span>
                </div>
                <h3 className="text-lg font-semibold text-white">Select Application</h3>
              </div>

              <select
                required
                value={form.application_id}
                onChange={(e) => setForm((f) => ({ ...f, application_id: e.target.value }))}
                className="w-full rounded-lg bg-slate-900/50 border border-slate-700 text-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose an application...</option>
                {applications.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.job?.company_name || 'Unknown'} — {a.job?.title || 'Unknown Position'}
                  </option>
                ))}
              </select>

              {/* Selected Application Card */}
              {selectedApp && (
                <div className="mt-4 p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-semibold">{selectedApp.job?.title || 'Unknown Position'}</div>
                      <div className="text-slate-300 text-sm">{selectedApp.job?.company_name || 'Unknown Company'}</div>
                      <div className="text-slate-400 text-xs mt-1">Status: {selectedApp.status || 'Unknown'}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* STEP 2: Event Details */}
            <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-5 border border-slate-700/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <span className="text-blue-400 font-bold text-sm">2</span>
                </div>
                <h3 className="text-lg font-semibold text-white">Event Details</h3>
              </div>

              <div className="space-y-4">
                {/* Type and Title Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Event Type</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                      className="w-full rounded-lg bg-slate-900/50 border border-slate-700 text-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <optgroup label="Interview Types">
                        <option value="technical_interview">Technical Interview</option>
                        <option value="behavioral_interview">Behavioral Interview</option>
                        <option value="hr_screen">HR Screen</option>
                        <option value="phone_screen">Phone Screen</option>
                        <option value="final_round">Final Round</option>
                      </optgroup>
                      <optgroup label="Other Events">
                        <option value="follow_up">Follow-up</option>
                        <option value="deadline">Deadline</option>
                        <option value="onboarding">Onboarding</option>
                        <option value="custom">Custom</option>
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      {form.type === "custom" ? "Custom Type" : "Title"}
                    </label>
                    <input
                      required={form.type !== "custom"}
                      value={form.type === "custom" ? form.customType : form.title}
                      onChange={(e) => setForm((f) => 
                        form.type === "custom"
                          ? { ...f, customType: e.target.value }
                          : { ...f, title: e.target.value }
                      )}
                      className="w-full rounded-lg bg-slate-900/50 border border-slate-700 text-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={form.type === "custom" ? "e.g., Coffee chat" : "e.g., Round 2 with Engineering Team"}
                    />
                  </div>
                </div>

                {/* Date & Time */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={form.due_date}
                    onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                    className="w-full rounded-lg bg-slate-900/50 border border-slate-700 text-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Notes (Optional)</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full rounded-lg bg-slate-900/50 border border-slate-700 text-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Add any details, talking points, or preparation notes..."
                  />
                </div>

                {/* Options */}
                <div className="space-y-3 pt-2">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.add_meet_link}
                      onChange={(e) => setForm((f) => ({ ...f, add_meet_link: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-600 text-blue-600"
                    />
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Add Google Meet link
                    </span>
                  </label>

                  {/* AI Preparation Tips - Pro/Premium Feature */}
                  {hasProAccess ? (
                    <label className="inline-flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 cursor-pointer hover:border-blue-500/40 transition-colors">
                      <input
                        type="checkbox"
                        checked={form.ai_prep_tips_enabled}
                        onChange={(e) => setForm((f) => ({ ...f, ai_prep_tips_enabled: e.target.checked }))}
                        className="w-4 h-4 rounded border-slate-600 text-blue-600"
                      />
                      <span className="flex items-center gap-2 text-sm">
                        <span className="flex items-center gap-1 text-slate-200 font-medium">
                          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          Receive AI-powered preparation tips
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold">
                          💎 PRO
                        </span>
                      </span>
                    </label>
                  ) : (
                    <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 opacity-60">
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span>AI preparation tips available for Pro/Premium users</span>
                        <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold ml-auto">
                          💎 PRO
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {form.ai_prep_tips_enabled && hasProAccess && (
                    <div className="mt-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                      <div className="flex items-start gap-2 text-xs text-slate-300">
                        <svg className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p>
                          You'll receive an email with personalized interview preparation tips based on the job description, 
                          company research, and your resume. Tips are generated immediately when you create this reminder.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* STEP 3: Email Notifications */}
            <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl p-5 border border-slate-700/50">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <span className="text-blue-400 font-bold text-sm">3</span>
                </div>
                <h3 className="text-lg font-semibold text-white">Email Notifications</h3>
              </div>

              <label className="inline-flex items-center gap-3 p-4 rounded-lg bg-slate-900/50 border border-slate-700 hover:border-slate-600 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={form.email_notify}
                  onChange={(e) => setForm((f) => ({ ...f, email_notify: e.target.checked }))}
                  className="w-5 h-5 rounded border-slate-600 text-blue-600"
                />
                <div className="flex-1">
                  <div className="text-white font-medium">Send me email reminders</div>
                  <div className="text-slate-400 text-sm">Get notified before your event</div>
                </div>
              </label>

              {/* Notification Schedule Options */}
              {form.email_notify && (
                <div className="mt-5 space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-slate-200 font-medium">When to notify me:</span>
                  </div>

                  {/* Mode Selection Tabs */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNotificationMode("presets")}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        notificationMode === "presets"
                          ? "bg-blue-500/10 border-blue-500 shadow-lg shadow-blue-500/20"
                          : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">⚡</span>
                        <span className={`font-semibold ${notificationMode === "presets" ? "text-blue-300" : "text-slate-300"}`}>
                          Quick Presets
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">1 hour, 1 day, or 1 week before</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNotificationMode("custom-time")}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        notificationMode === "custom-time"
                          ? "bg-blue-500/10 border-blue-500 shadow-lg shadow-blue-500/20"
                          : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">🕐</span>
                        <span className={`font-semibold ${notificationMode === "custom-time" ? "text-blue-300" : "text-slate-300"}`}>
                          Specific Time
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">Pick exact date & time</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNotificationMode("custom-relative")}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        notificationMode === "custom-relative"
                          ? "bg-blue-500/10 border-blue-500 shadow-lg shadow-blue-500/20"
                          : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">⏱️</span>
                        <span className={`font-semibold ${notificationMode === "custom-relative" ? "text-blue-300" : "text-slate-300"}`}>
                          Before Event
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">X hours/days/weeks before</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNotificationMode("recurring")}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        notificationMode === "recurring"
                          ? "bg-blue-500/10 border-blue-500 shadow-lg shadow-blue-500/20"
                          : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">🔄</span>
                        <span className={`font-semibold ${notificationMode === "recurring" ? "text-blue-300" : "text-slate-300"}`}>
                          Daily Reminder
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">Recurring daily notifications</p>
                    </button>
                  </div>

                  {/* Mode Content */}
                  <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-700">
                    {/* Quick Presets Mode */}
                    {notificationMode === "presets" && (
                      <div className="space-y-3">
                        <p className="text-sm text-slate-300 font-medium mb-3">Select one or more times:</p>
                        <div className="grid grid-cols-3 gap-3">
                          {presetOptions.map((preset) => (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => togglePreset(preset.id)}
                              className={`px-4 py-3 rounded-lg text-sm font-medium transition-all border-2 ${
                                selectedPresets.includes(preset.id)
                                  ? "bg-blue-500/20 border-blue-500 text-blue-300 shadow-lg shadow-blue-500/20"
                                  : "bg-slate-800/50 border-slate-600 text-slate-300 hover:border-slate-500"
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                        {selectedPresets.length === 0 && (
                          <div className="flex items-center gap-2 text-amber-400 text-sm mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span>Select at least one reminder time</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Custom Specific Time Mode */}
                    {notificationMode === "custom-time" && (
                      <div className="space-y-3">
                        <p className="text-sm text-slate-300 font-medium">Send notification at:</p>
                        <input
                          type="datetime-local"
                          value={customDateTime}
                          onChange={(e) => setCustomDateTime(e.target.value)}
                          className="w-full rounded-lg bg-slate-900/50 border border-slate-700 text-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex items-start gap-2 text-slate-400 text-sm p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                          <svg className="w-5 h-5 flex-shrink-0 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Example: Send at 9:00 AM on the day of the interview</span>
                        </div>
                      </div>
                    )}

                    {/* Custom Relative Time Mode */}
                    {notificationMode === "custom-relative" && (
                      <div className="space-y-3">
                        <p className="text-sm text-slate-300 font-medium">Send notification:</p>
                        <div className="flex gap-3">
                          <input
                            type="number"
                            min="1"
                            value={relativeValue}
                            onChange={(e) => setRelativeValue(e.target.value)}
                            className="w-24 rounded-lg bg-slate-900/50 border border-slate-700 text-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <select
                            value={relativeUnit}
                            onChange={(e) => setRelativeUnit(e.target.value)}
                            className="flex-1 rounded-lg bg-slate-900/50 border border-slate-700 text-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm text-slate-300 font-medium mb-2">Time of day:</label>
                          <input
                            type="time"
                            value={recurringTime}
                            onChange={(e) => setRecurringTime(e.target.value)}
                            className="w-full rounded-lg bg-slate-900/50 border border-slate-700 text-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-300 font-medium mb-2">Start reminding:</label>
                          <div className="flex gap-3 items-center">
                            <input
                              type="number"
                              min="1"
                              value={recurringStartDays}
                              onChange={(e) => setRecurringStartDays(e.target.value)}
                              className="w-24 rounded-lg bg-slate-900/50 border border-slate-700 text-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-slate-300">days before event</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 text-slate-400 text-sm p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                          <svg className="w-5 h-5 flex-shrink-0 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Example: Remind me at 9:00 AM every day starting 7 days before</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="border-t border-slate-700 p-6 bg-slate-800/50">
          <div className="flex justify-end gap-3">
            <Button 
              type="button" 
              onClick={onClose} 
              variant="outline"
              className="px-6 py-2.5"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              onClick={submit}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium shadow-lg shadow-blue-500/30"
            >
              Create Reminder
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
