import { useCallback, useEffect, useState } from "react";
import {
  listReminderNotes,
  createReminderNote,
  updateReminderNote,
  deleteReminderNote,
} from "../../../services/googleCalendar";

/**
 * Notes timeline for a single reminder id.
 * Keeps itself in sync when the active reminder changes.
 */
export default function useReminderNotes(reminderId, opts = {}) {
  const toast = opts.toast;
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!reminderId) {
      setNotes([]);
      return;
    }
    try {
      setLoading(true);
      const data = await listReminderNotes(reminderId);
      setNotes(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("listReminderNotes failed:", e);
      toast?.error?.("Failed to load notes");
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [reminderId, toast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addNote = useCallback(
    async (body) => {
      if (!reminderId || !body?.trim()) return false;
      try {
        await createReminderNote(reminderId, body.trim());
        await refresh();
        toast?.success?.("Note added");
        return true;
      } catch (e) {
        console.error("createReminderNote failed:", e);
        toast?.error?.("Failed to add note");
        return false;
      }
    },
    [reminderId, refresh, toast]
  );

  const saveNote = useCallback(
    async (noteId, body) => {
      if (!noteId || !body?.trim()) return false;
      try {
        await updateReminderNote(noteId, body.trim());
        await refresh();
        toast?.success?.("Note updated");
        return true;
      } catch (e) {
        console.error("updateReminderNote failed:", e);
        toast?.error?.("Failed to update note");
        return false;
      }
    },
    [refresh, toast]
  );

  const removeNote = useCallback(
    async (noteId) => {
      if (!noteId) return false;
      try {
        await deleteReminderNote(noteId);
        await refresh();
        toast?.success?.("Note deleted");
        return true;
      } catch (e) {
        console.error("deleteReminderNote failed:", e);
        toast?.error?.("Failed to delete note");
        return false;
      }
    },
    [refresh, toast]
  );

  return { notes, loading, refresh, addNote, saveNote, removeNote };
}
