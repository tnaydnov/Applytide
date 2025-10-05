import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "../../../components/ui";
import { api, apiFetch } from "../../../lib/api";

/**
 * NoteModal
 * Props:
 *  - application: { id, job?: { title, company_name, company? } }
 *  - onClose(): void
 */
export default function NoteModal({ application, onClose }) {
  const appId = useMemo(() => String(application?.id ?? ""), [application?.id]);
  const [mounted, setMounted] = useState(false);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [editText, setEditText] = useState("");

  // Avoid SSR portal crash
  useEffect(() => setMounted(true), []);

  // Load notes
  useEffect(() => {
    if (!appId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        let notesData = [];
        if (api?.getNotes) {
          notesData = (await api.getNotes(appId)) || [];
        } else {
          const res = await apiFetch(`/applications/${appId}/notes`);
          notesData = (await res.json()) || [];
        }
        if (!cancelled) setNotes(Array.isArray(notesData) ? notesData : []);
      } catch {
        if (!cancelled) setNotes([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [appId]);

  const addNote = async () => {
    const body = newNote.trim();
    if (!body || !appId) return;
    setLoading(true);
    try {
      let saved;
      if (api?.addNote) {
        saved = await api.addNote(appId, body);
      } else {
        const res = await apiFetch(`/applications/${appId}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        });
        saved = await res.json();
      }
      // fallbacks for shape
      const safeSaved = saved || {
        id: Math.random().toString(36).slice(2),
        body,
        created_at: new Date().toISOString(),
      };
      setNotes((prev) => [safeSaved, ...prev]);
      setNewNote("");
    } catch {
      // keep silent to avoid blocking UX; you can toast here if desired
      // e.g., useToast().error("Failed to save note")
    } finally {
      setLoading(false);
    }
  };

  const updateNote = async (noteId, text) => {
    const body = (text ?? "").trim();
    if (!body || !appId || !noteId) return;
    setLoading(true);
    try {
      if (api?.updateNote) {
        await api.updateNote(appId, noteId, body);
      } else {
        await apiFetch(`/applications/${appId}/notes/${noteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        });
      }
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, body, updated_at: new Date().toISOString() } : n))
      );
      setEditingNote(null);
      setEditText("");
    } catch {
      // optimistic UI already updated above only on success
    } finally {
      setLoading(false);
    }
  };

  const deleteNote = async (noteId) => {
    if (!noteId || !appId) return;
    if (typeof window !== "undefined" && !window.confirm("Are you sure you want to delete this note?")) return;
    // optimistic remove
    const prev = notes;
    setNotes((p) => p.filter((n) => n.id !== noteId));
    try {
      if (api?.deleteNote) {
        await api.deleteNote(appId, noteId);
      } else {
        await apiFetch(`/applications/${appId}/notes/${noteId}`, { method: "DELETE" });
      }
    } catch {
      // rollback if server failed
      setNotes(prev);
    }
  };

  if (!mounted) return null;
  if (!application || !appId) return null;

  const title = application.job?.title || "Unknown Position";
  const company = application.job?.company?.name || application.job?.company_name || "Unknown Company";

  return createPortal(
    <div className="fixed inset-0 z-[9999] p-4" role="dialog" aria-modal="true">
      <div className="modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
        <div className="modal-glass rounded-xl w-full max-w-full sm:max-w-2xl max-h-[calc(100vh-2rem)] my-4 flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-white/10 flex-shrink-0">
            <h2 className="text-xl font-semibold text-white drop-shadow-lg">Notes</h2>
            <button onClick={onClose} className="text-white/70 hover:text-white transition-colors" aria-label="Close">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-6 py-3 bg-white/5 border-b border-white/10 flex-shrink-0">
            <h3 className="font-medium text-white text-sm">{title}</h3>
            <p className="text-xs text-white/60">{company}</p>
          </div>

          <div className="p-4 border-b border-white/10 flex-shrink-0">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note..."
              className="input-glass w-full p-3 resize-none"
              rows={3}
            />
            <div className="flex justify-end mt-2">
              <Button size="sm" onClick={addNote} disabled={!newNote.trim() || loading}>
                {loading ? "Adding..." : "Add Note"}
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {notes.length === 0 ? (
              <div className="text-center text-white/70 py-8">
                <span className="text-2xl mb-2 block">📝</span>
                <p>No notes yet</p>
                <p className="text-sm">Add your first note above</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notes.map((note) => {
                  const created = note.created_at ? new Date(note.created_at) : null;
                  const updated = note.updated_at ? new Date(note.updated_at) : null;
                  return (
                    <div key={note.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/10">
                      {editingNote === note.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="input-glass w-full p-2 resize-none"
                            rows={3}
                          />
                          <div className="flex justify-end space-x-2">
                            <button onClick={() => setEditingNote(null)} className="text-sm text-white/70 hover:text-white" type="button">
                              Cancel
                            </button>
                            <Button size="sm" onClick={() => updateNote(note.id, editText)} disabled={!editText.trim()}>
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-start mb-2">
                            <p className="text-white text-sm flex-1 pr-2">{note.body || note.content}</p>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => {
                                  setEditingNote(note.id);
                                  setEditText(note.body || note.content || "");
                                }}
                                className="text-white/60 hover:text-cyan-300 p-1"
                                title="Edit note"
                                type="button"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </button>
                              <button
                                onClick={() => deleteNote(note.id)}
                                className="text-white/60 hover:text-red-300 p-1"
                                title="Delete note"
                                type="button"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-xs text-white/60">
                            <span>
                              {created ? `${created.toLocaleDateString()} at ${created.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                            </span>
                            {updated && (!created || updated.getTime() !== created.getTime()) && (
                              <span className="text-white/50">Edited {updated.toLocaleDateString()}</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end p-4 border-t border-white/10 bg-white/5 flex-shrink-0">
            <Button variant="outline" onClick={onClose} className="border-white/20 text-white hover:bg-white/10">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
