import { useMemo, useState } from "react";
import useReminderNotes from "../../hooks/useReminderNotes";
import { Button, Badge } from "../../../../components/ui";
import { formatTime, getTimeUntil, safeDate } from "../../utils/date";
import { getReminderTypeColor, findAppById } from "../../utils/reminders";
import { importGoogleEventAsReminder } from "../../../../services/googleCalendar";

/**
 * Details pane for either:
 *  - a reminder: { type: "reminder", data: reminder }
 *  - a Google event: { type: "google", data: event }
 */
export default function ReminderDetailsModal({
  open,
  onClose,
  item,                 // { type, data }
  applications = [],
  onDelete,             // (id) => Promise<boolean>
  onImported,           // callback after importing google event
}) {
  const isReminder = item?.type === "reminder";
  const isGoogle = item?.type === "google";

  const reminder = isReminder ? item.data : null;
  const event = isGoogle ? item.data : null;

  const appForReminder = useMemo(
    () => (isReminder ? findAppById(applications, reminder?.application_id) : null),
    [applications, isReminder, reminder]
  );

  const { notes, loading: notesLoading, addNote, saveNote, removeNote } =
    useReminderNotes(isReminder ? reminder?.id : null);

  const [importAppId, setImportAppId] = useState("");

  if (!open) return null;

  const importEvent = async () => {
    if (!event?.id || !importAppId) return;
    try {
      await importGoogleEventAsReminder({
        google_event_id: event.id,
        application_id: importAppId,
      });
      onImported?.();
      onClose?.();
    } catch (e) {
      console.error("importGoogleEventAsReminder failed:", e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 modal-backdrop p-4">
      <div className="modal-glass w-full max-w-2xl p-5">
        <div className="flex items-center justify-between">
          <h3 className="modal-title text-lg">
            {isReminder ? "Reminder details" : "Google Calendar event"}
          </h3>
          <button className="modal-close rounded-md px-2 py-1 text-slate-200" onClick={onClose} type="button">✕</button>
        </div>

        {isReminder && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Badge className={getReminderTypeColor(reminder?.name)}>{reminder?.name}</Badge>
              <div className="text-sm text-slate-300">{getTimeUntil(reminder?.scheduled_at)}</div>
            </div>

            <div className="rounded ring-1 ring-white/10 bg-white/[0.03] p-3">
              <div className="text-sm text-slate-200">
                {new Date(reminder?.scheduled_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}{" "}
                • {formatTime(reminder?.scheduled_at)}
              </div>
              <div className="mt-1 text-sm text-slate-300">
                {appForReminder?.job?.company_name} — {appForReminder?.job?.title}
              </div>
              {reminder?.description && (
                <p className="mt-2 whitespace-pre-wrap text-slate-200">{reminder.description}</p>
              )}
            </div>

            <section className="mt-4">
              <h4 className="font-medium text-slate-100">Notes</h4>
              <div className="mt-2 space-y-2">
                {notesLoading && <div className="text-sm text-slate-400">Loading notes…</div>}
                {!notesLoading && notes.length === 0 && (
                  <div className="text-sm text-slate-400">No notes yet.</div>
                )}
                {notes.map((n) => (
                  <NoteRow key={n.id} note={n} onSave={saveNote} onDelete={removeNote} />
                ))}
              </div>
              <AddNote onAdd={addNote} />
            </section>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="destructive" onClick={() => onDelete?.(reminder?.id)}>
                Delete
              </Button>
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          </div>
        )}

        {isGoogle && (
          <div className="mt-4 space-y-3">
            <div className="rounded ring-1 ring-white/10 bg-white/[0.03] p-3">
              <div className="text-sm font-medium text-slate-100">{event.summary || "Event"}</div>
              <div className="text-sm text-slate-300">
                {safeDate(event?.start?.dateTime ?? event?.start?.date)?.toLocaleString?.() || "—"}
              </div>
              {event?.location && (
                <div className="mt-1 text-sm text-slate-400">{event.location}</div>
              )}
              {event?.description && (
                <p className="mt-2 whitespace-pre-wrap text-slate-200">{event.description}</p>
              )}
            </div>

            <div className="rounded ring-1 ring-white/10 bg-white/[0.03] p-3">
              <label className="block text-sm font-medium text-slate-300">Import into application</label>
              <select
                className="input-glass input-cyan mt-1 w-full text-sm"
                value={importAppId}
                onChange={(e) => setImportAppId(e.target.value)}
              >
                <option value="">Select application…</option>
                {applications.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.job?.company_name} — {a.job?.title}
                  </option>
                ))}
              </select>
              <div className="mt-3 flex justify-end">
                <Button onClick={importEvent} disabled={!importAppId}>Import</Button>
              </div>
            </div>

            <div className="mt-2 flex justify-end">
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AddNote({ onAdd }) {
  const [body, setBody] = useState("");
  const submit = async (e) => {
    e?.preventDefault?.();
    const ok = await onAdd?.(body);
    if (ok) setBody("");
  };
  return (
    <form className="mt-3 flex gap-2" onSubmit={submit}>
      <input
        className="input-glass input-cyan flex-1 text-sm"
        placeholder="Add a note…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <Button type="submit">Add</Button>
    </form>
  );
}

function NoteRow({ note, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note.body || "");
  const save = async () => {
    const ok = await onSave?.(note.id, text);
    if (ok) setEditing(false);
  };
  return (
    <div className="rounded ring-1 ring-white/10 bg-white/[0.03] p-2">
      {editing ? (
        <div className="flex gap-2">
          <input
            className="input-glass input-cyan flex-1 text-sm"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Button size="sm" onClick={save}>Save</Button>
          <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="whitespace-pre-wrap text-sm text-slate-200">{note.body}</div>
            <div className="mt-1 text-xs text-slate-400">
              {new Date(note.created_at || note.updated_at || Date.now()).toLocaleString()}
            </div>
          </div>
          <div className="flex flex-shrink-0 gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
            <Button size="sm" variant="destructive" onClick={() => onDelete?.(note.id)}>Delete</Button>
          </div>
        </div>
      )}
    </div>
  );
}
