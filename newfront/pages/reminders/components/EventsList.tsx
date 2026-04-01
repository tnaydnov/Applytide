/**
 * EventsList Component
 * List view of all reminders
 */

import { motion } from 'motion/react';
import { Calendar, MapPin, Building } from 'lucide-react';
import type { Reminder } from '../../../features/reminders/api';

interface EventsListProps {
  reminders: Reminder[];
  onReminderClick: (reminder: Reminder) => void;
  isRTL?: boolean;
}

const getTypeIcon = (type: string) => {
  const icons: Record<string, string> = {
    interview: '🎯',
    follow_up: '📧',
    deadline: '⏰',
    networking: '🤝',
    research: '🔍',
    general: '📌',
    other: '📌',
  };
  return icons[type] || icons.other;
};

const getTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    interview: 'border-purple-500 bg-purple-50 dark:bg-purple-900/20',
    follow_up: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
    deadline: 'border-red-500 bg-red-50 dark:bg-red-900/20',
    networking: 'border-green-500 bg-green-50 dark:bg-green-900/20',
    research: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20',
    general: 'border-gray-500 bg-gray-50 dark:bg-gray-900/20',
    other: 'border-gray-500 bg-gray-50 dark:bg-gray-900/20',
  };
  return colors[type] || colors.other;
};

export function EventsList({ reminders, onReminderClick, isRTL = false }: EventsListProps) {
  // Group by date
  const groupedReminders = reminders.reduce((acc, reminder) => {
    const date = new Date(reminder.date).toLocaleDateString(isRTL ? 'he-IL' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(reminder);
    return acc;
  }, {} as Record<string, Reminder[]>);

  const sortedDates = Object.keys(groupedReminders).sort((a, b) => {
    return new Date(groupedReminders[a][0].date).getTime() - new Date(groupedReminders[b][0].date).getTime();
  });

  if (reminders.length === 0) {
    return (
      <div className="text-center py-16">
        <Calendar className="h-16 w-16 text-[#b6bac5] mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-[#383e4e] dark:text-white mb-2">
          {isRTL ? 'אין תזכורות' : 'No Reminders'}
        </h3>
        <p className="text-[#6c757d] dark:text-[#b6bac5]">
          {isRTL
            ? 'צור תזכורת חדשה כדי להתחיל'
            : 'Create a new reminder to get started'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
      {sortedDates.map((date, dateIdx) => (
        <div key={date}>
          <h3 className="text-lg font-bold text-[#383e4e] dark:text-white mb-4">
            {date}
          </h3>
          <div className="space-y-3">
            {groupedReminders[date].map((reminder, idx) => (
              <motion.button
                key={reminder.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (dateIdx * 0.1) + (idx * 0.05) }}
                onClick={() => onReminderClick(reminder)}
                className={`
                  w-full text-left p-4 rounded-xl border-l-4
                  hover:shadow-lg transition-all
                  ${getTypeColor(reminder.type || reminder.event_type || 'other')}
                `}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{getTypeIcon(reminder.type || reminder.event_type || 'other')}</span>
                      <h4 className="font-bold text-[#383e4e] dark:text-white">
                        {reminder.title}
                      </h4>
                    </div>

                    {reminder.description && (
                      <p className="text-sm text-[#6c757d] dark:text-[#b6bac5] mb-2">
                        {reminder.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-4 text-sm text-[#6c757d] dark:text-[#b6bac5]">
                      {reminder.time && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{reminder.time}</span>
                        </div>
                      )}
                      {reminder.company_name && (
                        <div className="flex items-center gap-1">
                          <Building className="h-4 w-4" />
                          <span>{reminder.company_name}</span>
                        </div>
                      )}
                      {reminder.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{reminder.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default EventsList;
