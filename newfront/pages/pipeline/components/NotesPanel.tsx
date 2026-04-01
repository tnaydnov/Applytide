/**
 * NotesPanel Component
 * Manage notes for an application with full CRUD operations
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  MessageSquare,
  Clock,
  Loader2,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import { ScrollArea } from '../../../components/ui/scroll-area';
import { apiFetch } from '../../../lib/api/core';
import { toast } from 'sonner';
import { logger } from '../../../lib/logger';
import { ConfirmDeleteDialog } from '../../../components/shared/ConfirmDeleteDialog';

interface Note {
  id: string;
  body: string;
  created_at: string;
  updated_at?: string;
}

interface NotesPanelProps {
  applicationId: number | string;
  isRTL?: boolean;
}

export function NotesPanel({ applicationId, isRTL = false }: NotesPanelProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editContent, setEditContent] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadNotes();
  }, [applicationId]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const response = await apiFetch(`/applications/${applicationId}/notes`);
      if (response.ok) {
        const data = await response.json();
        // Backend returns List[NoteOut] directly (flat array)
        setNotes(Array.isArray(data) ? data : data.notes || []);
      }
    } catch (error) {
      logger.error('Failed to load notes:', error);
      toast.error(isRTL ? 'שגיאה בטעינת הערות' : 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) {
      toast.error(isRTL ? 'נא להזין תוכן' : 'Please enter content');
      return;
    }

    try {
      const response = await apiFetch(`/applications/${applicationId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: newNoteContent }),
      });

      if (response.ok) {
        const data = await response.json();
        // Backend returns NoteOut directly (not wrapped in { note: ... })
        const newNote = data.note || data;
        setNotes([newNote, ...notes]);
        setNewNoteContent('');
        setAdding(false);
        toast.success(isRTL ? 'הערה נוספה בהצלחה' : 'Note added successfully');
      } else {
        throw new Error('Failed to add note');
      }
    } catch (error) {
      logger.error('Failed to add note:', error);
      toast.error(isRTL ? 'שגיאה בהוספת הערה' : 'Failed to add note');
    }
  };

  const handleEditNote = async (noteId: string) => {
    if (!editContent.trim()) {
      toast.error(isRTL ? 'נא להזין תוכן' : 'Please enter content');
      return;
    }

    try {
      setSavingId(noteId);
      const response = await apiFetch(`/applications/${applicationId}/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: editContent }),
      });

      if (response.ok) {
        const data = await response.json();
        // Backend returns NoteOut directly
        const updatedNote = data.note || data;
        setNotes(
          notes.map((note) =>
            note.id === noteId
              ? { ...note, body: editContent, updated_at: updatedNote.updated_at }
              : note
          )
        );
        setEditingId(null);
        setEditContent('');
        toast.success(isRTL ? 'הערה עודכנה בהצלחה' : 'Note updated successfully');
      } else {
        throw new Error('Failed to update note');
      }
    } catch (error) {
      logger.error('Failed to update note:', error);
      toast.error(isRTL ? 'שגיאה בעדכון הערה' : 'Failed to update note');
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      setDeletingId(noteId);
      const response = await apiFetch(`/applications/${applicationId}/notes/${noteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setNotes(notes.filter((note) => note.id !== noteId));
        toast.success(isRTL ? 'הערה נמחקה בהצלחה' : 'Note deleted successfully');
      } else {
        throw new Error('Failed to delete note');
      }
    } catch (error) {
      logger.error('Failed to delete note:', error);
      toast.error(isRTL ? 'שגיאה במחיקת הערה' : 'Failed to delete note');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(isRTL ? 'he-IL' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const startEdit = (note: Note) => {
    setEditingId(note.id);
    setEditContent(note.body);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-[#9F5F80]" />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-[#9F5F80]" />
          <h3 className="font-semibold text-[#383e4e] dark:text-white">
            {isRTL ? 'הערות' : 'Notes'}
          </h3>
          <span className="text-sm text-[#6c757d] dark:text-[#b6bac5]">
            ({notes.length})
          </span>
        </div>

        {!adding && (
          <Button
            size="sm"
            onClick={() => setAdding(true)}
            variant="outline"
            className="border-[#9F5F80]/30 hover:bg-[#9F5F80]/10"
          >
            <Plus className="h-4 w-4 mr-2" />
            {isRTL ? 'הוסף הערה' : 'Add Note'}
          </Button>
        )}
      </div>

      {/* Add new note form */}
      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#b6bac5]/10 dark:bg-[#383e4e]/50 rounded-lg p-4 border border-[#b6bac5]/20"
          >
            <Textarea
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder={
                isRTL ? 'כתוב את ההערה שלך כאן...' : 'Write your note here...'
              }
              rows={3}
              className="mb-3"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddNote} className="bg-[#9F5F80]">
                <Save className="h-4 w-4 mr-2" />
                {isRTL ? 'שמור' : 'Save'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setAdding(false);
                  setNewNoteContent('');
                }}
              >
                <X className="h-4 w-4 mr-2" />
                {isRTL ? 'ביטול' : 'Cancel'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notes list */}
      {notes.length === 0 ? (
        <div className="text-center py-8 text-[#6c757d] dark:text-[#b6bac5]">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">
            {isRTL ? 'אין הערות עדיין' : 'No notes yet'}
          </p>
          <p className="text-xs mt-1">
            {isRTL
              ? 'הוסף הערות כדי לעקוב אחר השיחות והעדכונים שלך'
              : 'Add notes to track your conversations and updates'}
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {notes.filter(note => note && note.id).map((note) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white dark:bg-[#383e4e] rounded-lg p-4 border border-[#b6bac5]/20 hover:border-[#9F5F80]/30 transition-colors"
              >
                {editingId === note.id ? (
                  // Edit mode
                  <div className="space-y-3">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleEditNote(note.id)}
                        disabled={savingId === note.id}
                        className="bg-[#9F5F80]"
                      >
                        {savingId === note.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            {isRTL ? 'שמור' : 'Save'}
                          </>
                        )}
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit}>
                        <X className="h-4 w-4 mr-2" />
                        {isRTL ? 'ביטול' : 'Cancel'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 text-xs text-[#6c757d] dark:text-[#b6bac5]">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(note.created_at)}</span>
                        {note.updated_at && note.updated_at !== note.created_at && (
                          <span className="text-[#9F5F80]">
                            ({isRTL ? 'עודכן' : 'edited'})
                          </span>
                        )}
                      </div>

                      <div className="flex gap-1">
                        <button
                          onClick={() => startEdit(note)}
                          className="p-1 hover:bg-[#b6bac5]/20 rounded transition-colors"
                          title={isRTL ? 'ערוך' : 'Edit'}
                        >
                          <Edit2 className="h-4 w-4 text-[#6c757d] dark:text-[#b6bac5]" />
                        </button>
                        <button
                          onClick={() => setPendingDeleteId(note.id)}
                          disabled={deletingId === note.id}
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                          title={isRTL ? 'מחק' : 'Delete'}
                        >
                          {deletingId === note.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-[#383e4e] dark:text-white whitespace-pre-wrap">
                      {note.body}
                    </p>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}
        onConfirm={() => {
          if (pendingDeleteId !== null) {
            handleDeleteNote(pendingDeleteId);
            setPendingDeleteId(null);
          }
        }}
        title={isRTL ? 'מחיקת הערה' : 'Delete Note'}
        description={
          isRTL
            ? 'האם אתה בטוח שברצונך למחוק הערה זו? פעולה זו אינה ניתנת לביטול.'
            : 'Are you sure you want to delete this note? This action cannot be undone.'
        }
        isRTL={isRTL}
      />
    </div>
  );
}

export default NotesPanel;