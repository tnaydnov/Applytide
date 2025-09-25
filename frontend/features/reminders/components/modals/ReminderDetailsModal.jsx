import { useMemo, useState } from "react";
import useReminderNotes from "../hooks/useReminderNotes";
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
      // surface errors in your toast system if you wire one here
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {isReminder ? "Reminder details" : "Google Calendar event"}
          </h3>
          <button className="text-gray-500" onClick={onClose} type="button">✕</button>
        </div>

        {isReminder && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-2">
              <Badge className={getReminderTypeColor(reminder?.name)}>{reminder?.name}</Badge>
              <div className="text-sm text-gray-600">{getTimeUntil(reminder?.scheduled_at)}</div>
            </div>

            <div className="rounded border p-3">
              <div className="text-sm text-gray-700">
                {new Date(reminder?.scheduled_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}{" "}
                • {formatTime(reminder?.scheduled_at)}
              </div>
              <div className="mt-1 text-sm text-gray-600">
                {appForReminder?.job?.company_name} — {appForReminder?.job?.title}
              </div>
              {reminder?.description && (
                <p className="mt-2 text-gray-800 whitespace-pre-wrap">{reminder.description}</p>
              )}
            </div>

            <section className="mt-4">
              <h4 className="font-medium text-gray-900">Notes</h4>
              <div className="mt-2 space-y-2">
                {notesLoading && <div className="text-sm text-gray-500">Loading notes…</div>}
                {!notesLoading && notes.length === 0 && (
                  <div className="text-sm text-gray-500">No notes yet.</div>
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
            <div className="rounded border p-3">
              <div className="text-sm font-medium text-gray-900">{event.summary || "Event"}</div>
              <div className="text-sm text-gray-700">
                {safeDate(event?.start?.dateTime ?? event?.start?.date)?.toLocaleString?.() || "—"}
              </div>
              {event?.location && (
                <div className="text-sm text-gray-600 mt-1">{event.location}</div>
              )}
              {event?.description && (
                <p className="mt-2 text-gray-800 whitespace-pre-wrap">{event.description}</p>
              )}
            </div>

            <div className="rounded border p-3">
              <label className="block text-sm font-medium">Import into application</label>
              <select
                className="mt-1 w-full rounded border px-2 py-1"
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
        className="flex-1 rounded border px-2 py-1"
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
    <div className="rounded border p-2">
      {editing ? (
        <div className="flex gap-2">
          <input
            className="flex-1 rounded border px-2 py-1"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Button size="sm" onClick={save}>Save</Button>
          <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-sm text-gray-800 whitespace-pre-wrap">{note.body}</div>
            <div className="text-xs text-gray-500 mt-1">
              {new Date(note.created_at || note.updated_at || Date.now()).toLocaleString()}
            </div>
          </div>
          <div className="flex-shrink-0 flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
            <Button size="sm" variant="destructive" onClick={() => onDelete?.(note.id)}>Delete</Button>
          </div>
        </div>
      )}
    </div>
  );
}
