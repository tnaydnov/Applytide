/**
 * QuickReminderModal Component
 * Quick create reminder linked to an application
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bell, Calendar as CalendarIcon, Clock, Save, Loader2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Calendar } from '../../../components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';
import { toast } from 'sonner';
import { remindersApi } from '../../../features/reminders/api';
import { logger } from '../../../lib/logger';
import type { Application } from '../../../features/applications/api';

interface ReminderTypeOption {
  value: string;
  label: { en: string; he: string };
}
import { he } from 'date-fns/locale';

interface QuickReminderModalProps {
  application: Application;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  isRTL?: boolean;
}

const REMINDER_TYPES: ReminderTypeOption[] = [
  { value: 'follow_up', label: { en: 'Follow Up', he: 'מעקב' } },
  { value: 'interview', label: { en: 'Interview', he: 'ראיון' } },
  { value: 'deadline', label: { en: 'Deadline', he: 'דדליין' } },
  { value: 'task', label: { en: 'Task', he: 'משימה' } },
  { value: 'other', label: { en: 'Other', he: 'אחר' } },
];

export function QuickReminderModal({
  application,
  isOpen,
  onClose,
  onSuccess,
  isRTL = false,
}: QuickReminderModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState('12:00');
  const [reminderType, setReminderType] = useState('follow_up');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      // Set default title based on application
      setTitle(`Follow up on ${application.job_title} at ${application.company_name}`);
      // Set default date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDate(tomorrow);
    }
  }, [isOpen, application]);

  const handleSave = async () => {
    if (!title || !date) {
      toast.error(isRTL ? 'נא למלא את כל השדות' : 'Please fill all required fields');
      return;
    }

    try {
      setSaving(true);

      // Combine date and time into ISO datetime for backend's due_date field
      const [hours, minutes] = time.split(':').map(Number);
      const reminderDate = new Date(date);
      reminderDate.setHours(hours, minutes, 0, 0);

      await remindersApi.createReminder({
        title,
        description,
        due_date: reminderDate.toISOString(),
        application_id: String(application.id),
        event_type: reminderType,
        create_google_event: false,
      });

      toast.success(isRTL ? 'תזכורת נוצרה בהצלחה' : 'Reminder created successfully');
      onSuccess?.();
      onClose();

      // Reset form
      setTitle('');
      setDescription('');
      setDate(undefined);
      setTime('12:00');
      setReminderType('follow_up');
    } catch (error) {
      logger.error('Failed to create reminder:', error);
      toast.error(isRTL ? 'שגיאה ביצירת תזכורת' : 'Failed to create reminder');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-[#383e4e] rounded-2xl shadow-2xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              {/* Header */}
              <div className="relative bg-gradient-to-r from-[#9F5F80] to-[#383e4e] p-6 text-white rounded-t-2xl">
                <button
                  onClick={onClose}
                  className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-4 text-white/80 hover:text-white transition-colors`}
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-3">
                  <Bell className="h-6 w-6" />
                  <h2 className="text-xl font-bold">
                    {isRTL ? 'תזכורת מהירה' : 'Quick Reminder'}
                  </h2>
                </div>

                <p className="text-white/80 text-sm mt-2">
                  {application.job_title} • {application.company_name}
                </p>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Title */}
                <div>
                  <label className="text-sm font-medium text-[#6c757d] dark:text-[#b6bac5] mb-2 block">
                    {isRTL ? 'כותרת' : 'Title'} *
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={isRTL ? 'למשל: מעקב על הגשה' : 'e.g., Follow up on application'}
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="text-sm font-medium text-[#6c757d] dark:text-[#b6bac5] mb-2 block">
                    {isRTL ? 'סוג' : 'Type'}
                  </label>
                  <Select value={reminderType} onValueChange={setReminderType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REMINDER_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {isRTL ? type.label.he : type.label.en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-[#6c757d] dark:text-[#b6bac5] mb-2 block">
                      {isRTL ? 'תאריך' : 'Date'} *
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          {date ? date.toLocaleDateString(isRTL ? 'he-IL' : 'en-US') : isRTL ? 'בחר תאריך' : 'Pick date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar 
                          mode="single" 
                          selected={date} 
                          onSelect={setDate}
                          locale={isRTL ? he : undefined}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[#6c757d] dark:text-[#b6bac5] mb-2 block">
                      {isRTL ? 'שעה' : 'Time'}
                    </label>
                    <div className="relative">
                      <Clock className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-[#6c757d]`} />
                      <Input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className={isRTL ? 'pr-10' : 'pl-10'}
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm font-medium text-[#6c757d] dark:text-[#b6bac5] mb-2 block">
                    {isRTL ? 'תיאור' : 'Description'}
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={isRTL ? 'הוסף פרטים נוספים...' : 'Add additional details...'}
                    rows={3}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 bg-gray-50 dark:bg-[#383e4e]/50 border-t border-[#b6bac5]/20 flex gap-3">
                <Button variant="outline" onClick={onClose} disabled={saving} className="flex-1">
                  {isRTL ? 'ביטול' : 'Cancel'}
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || !title || !date}
                  className="flex-1"
                  style={{
                    background: 'linear-gradient(135deg, #9F5F80 0%, #383e4e 100%)',
                  }}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {isRTL ? 'שומר...' : 'Saving...'}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {isRTL ? 'צור תזכורת' : 'Create Reminder'}
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

export default QuickReminderModal;