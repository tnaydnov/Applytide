/**
 * DayView Component
 * Single day timeline view
 */

import type { Reminder } from '../../../features/reminders/api';

interface DayViewProps {
  currentDate: Date;
  reminders: Reminder[];
  onReminderClick: (reminder: Reminder) => void;
  isRTL?: boolean;
}

const getReminderColor = (type: string) => {
  const colors = {
    interview: 'border-purple-500 bg-purple-50 dark:bg-purple-900/20',
    follow_up: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
    deadline: 'border-red-500 bg-red-50 dark:bg-red-900/20',
    networking: 'border-green-500 bg-green-50 dark:bg-green-900/20',
    research: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20',
    other: 'border-gray-500 bg-gray-50 dark:bg-gray-900/20',
  };
  return colors[type as keyof typeof colors] || colors.other;
};

export function DayView({ currentDate, reminders, onReminderClick, isRTL = false }: DayViewProps) {
  // Filter reminders for current day
  const dayReminders = reminders.filter((r) => {
    const reminderDate = new Date(r.date);
    return (
      reminderDate.getDate() === currentDate.getDate() &&
      reminderDate.getMonth() === currentDate.getMonth() &&
      reminderDate.getFullYear() === currentDate.getFullYear()
    );
  }).sort((a, b) => {
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="space-y-4">
      {/* All-day events */}
      {dayReminders.filter((r) => !r.time).length > 0 && (
        <div className="bg-gray-50 dark:bg-[#383e4e]/30 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-[#6c757d] dark:text-[#b6bac5] mb-3">
            {isRTL ? 'כל היום' : 'All Day'}
          </h3>
          <div className="space-y-2">
            {dayReminders.filter((r) => !r.time).map((reminder) => (
              <button
                key={reminder.id}
                onClick={() => onReminderClick(reminder)}
                className={`
                  w-full text-left p-4 rounded-lg border-l-4
                  hover:shadow-md transition-all
                  ${getReminderColor(reminder.type)}
                `}
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                <div className="font-semibold text-[#383e4e] dark:text-white mb-1">
                  {reminder.title}
                </div>
                {reminder.company_name && (
                  <div className="text-sm text-[#6c757d] dark:text-[#b6bac5]">
                    {reminder.company_name}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="border border-[#b6bac5]/20 rounded-lg">
        {hours.map((hour) => {
          const hourReminders = dayReminders.filter((r) => {
            if (!r.time) return false;
            const reminderHour = parseInt(r.time.split(':')[0]);
            return reminderHour === hour;
          });

          return (
            <div
              key={hour}
              className="flex gap-4 p-3 border-b border-[#b6bac5]/20 last:border-b-0"
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              <div className="w-20 text-sm font-semibold text-[#6c757d] dark:text-[#b6bac5]">
                {hour.toString().padStart(2, '0')}:00
              </div>
              <div className="flex-1 space-y-2">
                {hourReminders.map((reminder) => (
                  <button
                    key={reminder.id}
                    onClick={() => onReminderClick(reminder)}
                    className={`
                      w-full text-left p-3 rounded-lg border-l-4
                      hover:shadow-md transition-all
                      ${getReminderColor(reminder.type)}
                    `}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold text-[#383e4e] dark:text-white">
                        {reminder.title}
                      </div>
                      <div className="text-sm text-[#6c757d] dark:text-[#b6bac5]">
                        {reminder.time}
                      </div>
                    </div>
                    {reminder.company_name && (
                      <div className="text-sm text-[#6c757d] dark:text-[#b6bac5]">
                        {reminder.company_name}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DayView;
