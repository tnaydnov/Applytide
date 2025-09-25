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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Create Reminder</h3>
          <button className="text-gray-500" onClick={onClose} type="button">✕</button>
        </div>

        <form className="mt-4 space-y-3" onSubmit={submit}>
          <div>
            <label className="block text-sm font-medium">Application</label>
            <select
              required
              value={form.application_id}
              onChange={(e) => setForm((f) => ({ ...f, application_id: e.target.value }))}
              className="mt-1 w-full rounded border px-2 py-1"
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
              <label className="block text-sm font-medium">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="mt-1 w-full rounded border px-2 py-1"
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
                <label className="block text-sm font-medium">Custom type</label>
                <input
                  value={form.customType}
                  onChange={(e) => setForm((f) => ({ ...f, customType: e.target.value }))}
                  className="mt-1 w-full rounded border px-2 py-1"
                  placeholder="e.g., Coffee chat"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium">Title</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="mt-1 w-full rounded border px-2 py-1"
              placeholder="e.g., ACME recruiter follow-up"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Date & time</label>
            <input
              type="datetime-local"
              required
              value={form.due_date}
              onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              className="mt-1 w-full rounded border px-2 py-1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Notes</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="mt-1 w-full rounded border px-2 py-1"
              rows={4}
              placeholder="Anything to remember…"
            />
          </div>

          <div className="flex items-center gap-6">
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
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
