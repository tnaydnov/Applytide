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
              Email me reminders
            </label>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-ghost rounded-md px-3 py-2">Cancel</button>
            <button type="submit" className="btn-primary-gradient rounded-md px-3 py-2">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
}
