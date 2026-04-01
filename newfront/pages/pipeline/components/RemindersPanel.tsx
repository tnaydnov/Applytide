/**
 * RemindersPanel Component
 * View and manage all reminders for an application
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Bell,
  Clock,
  Trash2,
  Loader2,
  Plus,
  Users,
  Target,
  Network,
  Search,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { ScrollArea } from '../../../components/ui/scroll-area';
import { apiFetch } from '../../../lib/api/core';
import { CreateReminderModal } from '../../reminders/components/CreateReminderModal';
import { ReminderDetailsModal } from '../../reminders/components/ReminderDetailsModal';
import type { Reminder } from '../../../features/reminders/api';
import type { Application } from '../../../features/applications/api';
import { toast } from 'sonner';
import { logger } from '../../../lib/logger';
import { ConfirmDeleteDialog } from '../../../components/shared/ConfirmDeleteDialog';

interface RemindersPanelProps {
  applicationId: number | string;
  application?: Application;
  isRTL?: boolean;
}

const typeIcons: Record<string, React.ElementType> = {
  interview: Users,
  follow_up: Bell,
  deadline: Target,
  networking: Network,
  research: Search,
  other: Sparkles,
};

const typeColors: Record<string, string> = {
  interview: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300',
  follow_up: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300',
  deadline: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300',
  networking: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300',
  research: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
  other: 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-300',
};

export function RemindersPanel({ applicationId, application, isRTL = false }: RemindersPanelProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    loadReminders();
  }, [applicationId]);

  const loadReminders = async () => {
    try {
      setLoading(true);
      const response = await apiFetch(`/calendars/reminders`);
      if (response.ok) {
        const data = await response.json();
        const all = Array.isArray(data) ? data : data.reminders || [];
        const appIdStr = String(applicationId);
        const filtered = all.filter((r: Partial<Reminder> & Record<string, unknown>) => String(r.application_id) === appIdStr);
        // Normalize through remindersApi-compatible shape
        const normalized: Reminder[] = filtered.map((raw: Partial<Reminder> & Record<string, unknown>) => {
          const dueDate = raw.due_date ? new Date(raw.due_date) : null;
          return {
            ...raw,
            due_date: raw.due_date || '',
            date: dueDate ? dueDate.toISOString().split('T')[0] : raw.date || '',
            time: dueDate
              ? `${String(dueDate.getHours()).padStart(2, '0')}:${String(dueDate.getMinutes()).padStart(2, '0')}`
              : raw.time || '',
            type: raw.event_type || raw.type || 'other',
            meet_link: raw.meet_url || raw.meet_link || '',
          };
        });
        setReminders(normalized);
      }
    } catch (error) {
      logger.error('Failed to load reminders:', error);
      toast.error(isRTL ? 'שגיאה בטעינת תזכורות' : 'Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReminder = async (reminderId: number | string) => {
    try {
      setDeletingId(reminderId);
      const response = await apiFetch(`/calendars/reminders/${reminderId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setReminders(reminders.filter((reminder) => reminder.id !== reminderId));
        toast.success(isRTL ? 'תזכורת נמחקה בהצלחה' : 'Reminder deleted successfully');
        // Close details modal if the deleted reminder is currently shown
        if (selectedReminder?.id === reminderId) {
          setShowDetailsModal(false);
          setSelectedReminder(null);
        }
      }
    } catch (error) {
      logger.error('Failed to delete reminder:', error);
      toast.error(isRTL ? 'שגיאה במחיקת תזכורת' : 'Failed to delete reminder');
    } finally {
      setDeletingId(null);
    }
  };

  const handleReminderClick = (reminder: Reminder) => {
    setSelectedReminder(reminder);
    setShowDetailsModal(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const formatted = new Intl.DateTimeFormat(isRTL ? 'he-IL' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    }).format(date);

    if (isToday) return isRTL ? 'היום' : 'Today';
    return formatted;
  };

  const getDateColor = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    if (date < now && date.toDateString() !== now.toDateString()) return 'text-red-600 dark:text-red-400';
    if (date.toDateString() === now.toDateString()) return 'text-orange-600 dark:text-orange-400';
    return 'text-[#6c757d] dark:text-[#b6bac5]';
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
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-[#9F5F80]" />
        <h3 className="font-semibold text-[#383e4e] dark:text-white">
          {isRTL ? 'תזכורות' : 'Reminders'}
        </h3>
        <span className="text-sm text-[#6c757d] dark:text-[#b6bac5]">
          ({reminders.length})
        </span>
      </div>

      {/* Reminders list */}
      {reminders.length === 0 ? (
        <div className="text-center py-8 text-[#6c757d] dark:text-[#b6bac5]">
          <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">
            {isRTL ? 'אין תזכורות עדיין' : 'No reminders yet'}
          </p>
          <p className="text-xs mt-1">
            {isRTL
              ? 'השתמש בכפתור "תזכורת" למטה כדי ליצור תזכורות'
              : 'Use the "Reminder" button below to create reminders'}
          </p>
        </div>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {reminders
              .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
              .map((reminder) => {
                const TypeIcon = typeIcons[reminder.type] || Sparkles;
                const colorClass = typeColors[reminder.type] || typeColors.other;
                return (
                  <motion.div
                    key={reminder.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onClick={() => handleReminderClick(reminder)}
                    className="p-4 rounded-lg border bg-white dark:bg-[#383e4e] border-[#b6bac5]/20 hover:border-[#9F5F80]/30 cursor-pointer transition-all hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Type icon */}
                        <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                          <TypeIcon className="h-4 w-4" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-[#383e4e] dark:text-white truncate">
                            {reminder.title}
                          </h4>

                          {reminder.description && (
                            <p className="text-sm text-[#6c757d] dark:text-[#b6bac5] mb-2 line-clamp-1">
                              {reminder.description}
                            </p>
                          )}

                          <div className={`flex items-center gap-1.5 text-xs ${getDateColor(reminder.due_date)}`}>
                            <Clock className="h-3 w-3" />
                            <span className="font-medium">
                              {formatDate(reminder.due_date)}
                              {reminder.time && ` • ${reminder.time}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingDeleteId(reminder.id!);
                        }}
                        disabled={deletingId === reminder.id}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors flex-shrink-0"
                        title={isRTL ? 'מחק' : 'Delete'}
                      >
                        {deletingId === reminder.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
          </div>
        </ScrollArea>
      )}

      {/* Add Reminder Button */}
      <Button
        onClick={() => setIsModalOpen(true)}
        className="w-full mt-4 bg-[#9F5F80] hover:bg-[#8a5472]"
      >
        <Plus className="h-4 w-4 mr-2" />
        {isRTL ? 'תזכורת חדשה' : 'New Reminder'}
      </Button>

      {/* Full Create Reminder Modal (with preselected application) */}
      {application && (
        <CreateReminderModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            loadReminders();
            toast.success(isRTL ? 'תזכורת נוצרה בהצלחה' : 'Reminder created successfully');
          }}
          isRTL={isRTL}
          preselectedApplication={application}
        />
      )}

      {/* Reminder Details Modal */}
      <ReminderDetailsModal
        reminder={selectedReminder}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedReminder(null);
        }}
        onUpdate={() => {
          loadReminders();
          setShowDetailsModal(false);
          setSelectedReminder(null);
        }}
        onDelete={(id) => {
          handleDeleteReminder(id);
        }}
        isRTL={isRTL}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}
        onConfirm={() => {
          if (pendingDeleteId !== null) {
            handleDeleteReminder(pendingDeleteId);
            setPendingDeleteId(null);
          }
        }}
        title={isRTL ? 'מחיקת תזכורת' : 'Delete Reminder'}
        description={
          isRTL
            ? 'האם אתה בטוח שברצונך למחוק תזכורת זו? פעולה זו אינה ניתנת לביטול.'
            : 'Are you sure you want to delete this reminder? This action cannot be undone.'
        }
        isRTL={isRTL}
      />
    </div>
  );
}

export default RemindersPanel;