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

  if (!open) return null;

  const submit = async (e) => {
    e?.preventDefault?.();
    const ok = await onCreate?.(form);
    if (ok) onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 modal-backdrop p-4">
      <div className="modal-glass w-full max-w-lg p-5">
        <div className="flex items-center justify-between">
          <h3 className="modal-title text-lg">Create Reminder</h3>
          <button
            className="modal-close rounded-md px-2 py-1 text-slate-200"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form className="mt-4 space-y-3" onSubmit={submit}>
          <div>
            <label className="block text-sm font-medium text-slate-300">Application</label>
            <select
              required
              value={form.application_id}
              onChange={(e) => setForm((f) => ({ ...f, application_id: e.target.value }))}
              className="input-glass input-cyan mt-1 w-full text-sm"
            >
              <option value="">Select application…</option>
              {applications.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.job?.company_name} — {a.job?.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-300">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="input-glass input-cyan mt-1 w-full text-sm"
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
                <label className="block text-sm font-medium text-slate-300">Custom type</label>
                <input
                  value={form.customType}
                  onChange={(e) => setForm((f) => ({ ...f, customType: e.target.value }))}
                  className="input-glass input-cyan mt-1 w-full text-sm"
                  placeholder="e.g., Coffee chat"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Title</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="input-glass input-cyan mt-1 w-full text-sm"
              placeholder="e.g., ACME recruiter follow-up"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Date & time</label>
            <input
              type="datetime-local"
              required
              value={form.due_date}
              onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              className="input-glass input-cyan mt-1 w-full text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Notes</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="input-glass input-cyan mt-1 w-full text-sm"
              rows={4}
              placeholder="Anything to remember…"
            />
          </div>

          <div className="flex items-center gap-6">
            <label className="inline-flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                className="accent-violet-500"
                checked={form.add_meet_link}
                onChange={(e) => setForm((f) => ({ ...f, add_meet_link: e.target.checked }))}
              />
              Add Meet link
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                className="accent-violet-500"
                checked={form.email_notify}
                onChange={(e) => setForm((f) => ({ ...f, email_notify: e.target.checked }))}
              />
              Email me reminders
            </label>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
