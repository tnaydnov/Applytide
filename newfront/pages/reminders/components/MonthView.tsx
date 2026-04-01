/**
 * MonthView Component
 * Full month calendar grid
 */

import type { Reminder } from '../../../features/reminders/api';

interface MonthViewProps {
  currentDate: Date;
  reminders: Reminder[];
  onReminderClick: (reminder: Reminder) => void;
  isRTL?: boolean;
}

const getReminderColor = (type: string) => {
  const colors: Record<string, string> = {
    interview: 'bg-purple-500',
    follow_up: 'bg-blue-500',
    deadline: 'bg-red-500',
    networking: 'bg-green-500',
    research: 'bg-amber-500',
    general: 'bg-gray-500',
    other: 'bg-gray-500',
  };
  return colors[type] || colors.other;
};

export function MonthView({ currentDate, reminders, onReminderClick, isRTL = false }: MonthViewProps) {
  // Get days in month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  // Build calendar grid
  const days = [];
  const totalSlots = Math.ceil((daysInMonth + startingDayOfWeek) / 7) * 7;

  for (let i = 0; i < totalSlots; i++) {
    const dayNum = i - startingDayOfWeek + 1;
    const date = new Date(year, month, dayNum);
    const isCurrentMonth = dayNum > 0 && dayNum <= daysInMonth;
    const isToday =
      date.getDate() === new Date().getDate() &&
      date.getMonth() === new Date().getMonth() &&
      date.getFullYear() === new Date().getFullYear();

    // Get reminders for this day
    const dayReminders = isCurrentMonth
      ? reminders.filter((r) => {
          const reminderDate = new Date(r.date);
          return (
            reminderDate.getDate() === dayNum &&
            reminderDate.getMonth() === month &&
            reminderDate.getFullYear() === year
          );
        })
      : [];

    days.push({
      date: dayNum,
      fullDate: date,
      isCurrentMonth,
      isToday,
      reminders: dayReminders,
    });
  }

  // Day headers
  const dayHeaders = isRTL
    ? ['ש', 'ו', 'ה', 'ד', 'ג', 'ב', 'א']
    : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="space-y-2">
      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 sm:mb-4">
        {dayHeaders.map((day, idx) => (
          <div
            key={idx}
            className="text-center text-xs sm:text-sm font-semibold text-[#6c757d] dark:text-[#b6bac5] py-1 sm:py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {days.map((day, idx) => (
          <div
            key={idx}
            className={`
              min-h-16 sm:min-h-24 p-1 sm:p-2 rounded-lg border
              ${
                day.isCurrentMonth
                  ? 'bg-white dark:bg-[#383e4e]/30 border-[#b6bac5]/20'
                  : 'bg-gray-50 dark:bg-[#383e4e]/10 border-transparent'
              }
              ${day.isToday ? 'ring-1 sm:ring-2 ring-[#9F5F80]' : ''}
            `}
          >
            {day.isCurrentMonth && (
              <>
                <div className={`text-xs sm:text-sm font-semibold mb-1 ${day.isToday ? 'text-[#9F5F80]' : 'text-[#383e4e] dark:text-white'}`}>
                  {day.date}
                </div>

                {/* Reminders */}
                <div className="space-y-1">
                  {day.reminders.slice(0, 2).map((reminder) => (
                    <button
                      key={reminder.id}
                      onClick={() => onReminderClick(reminder)}
                      className={`
                        w-full text-left px-1 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium text-white
                        hover:opacity-80 transition-opacity truncate
                        ${getReminderColor(reminder.type || reminder.event_type || 'other')}
                      `}
                    >
                      {reminder.title}
                    </button>
                  ))}
                  {day.reminders.length > 2 && (
                    <div className="text-[9px] sm:text-xs text-[#6c757d] dark:text-[#b6bac5] px-1 sm:px-2">
                      +{day.reminders.length - 2}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 sm:gap-4 pt-3 sm:pt-4 border-t border-[#b6bac5]/20">
        {[
          { type: 'interview', label: { en: 'Interview', he: 'ראיון' } },
          { type: 'follow_up', label: { en: 'Follow-up', he: 'מעקב' } },
          { type: 'deadline', label: { en: 'Deadline', he: 'דדליין' } },
          { type: 'networking', label: { en: 'Networking', he: 'נטוורקינג' } },
          { type: 'research', label: { en: 'Research', he: 'מחקר' } },
        ].map((item) => (
          <div key={item.type} className="flex items-center gap-1.5 sm:gap-2">
            <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${getReminderColor(item.type)}`} />
            <span className="text-xs sm:text-sm text-[#6c757d] dark:text-[#b6bac5]">
              {item.label[isRTL ? 'he' : 'en']}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MonthView;