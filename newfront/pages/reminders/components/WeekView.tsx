/**
 * WeekView Component
 * Week calendar view with mobile-responsive 3-day view
 */

import { useState } from 'react';
import { ExternalLink, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import type { Reminder } from '../../../features/reminders/api';

interface WeekViewProps {
  currentDate: Date;
  reminders: Reminder[];
  onReminderClick: (reminder: Reminder) => void;
  onImportGoogleEvent?: (reminder: Reminder) => void;
  isRTL?: boolean;
}

const getReminderColor = (type: string, isExternal?: boolean) => {
  if (isExternal) {
    // Google Calendar external events - blue gradient with pattern
    return 'bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-blue-300';
  }
  
  // Our reminders - solid colors
  const colors = {
    interview: 'bg-purple-500',
    follow_up: 'bg-blue-500',
    deadline: 'bg-red-500',
    networking: 'bg-green-500',
    research: 'bg-amber-500',
    other: 'bg-gray-500',
  };
  return colors[type as keyof typeof colors] || colors.other;
};

export function WeekView({ 
  currentDate, 
  reminders, 
  onReminderClick, 
  onImportGoogleEvent,
  isRTL = false 
}: WeekViewProps) {
  const [mobileOffset, setMobileOffset] = useState(0);

  // Get week days
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return date;
  });

  // Mobile: show 3 days at a time (yesterday, today, tomorrow relative to current position)
  const mobileDays = weekDays.slice(mobileOffset, mobileOffset + 3);

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const getDayReminders = (date: Date) => {
    return reminders.filter((r) => {
      const reminderDate = new Date(r.date);
      return (
        reminderDate.getDate() === date.getDate() &&
        reminderDate.getMonth() === date.getMonth() &&
        reminderDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const handlePrev = () => {
    if (mobileOffset > 0) {
      setMobileOffset(mobileOffset - 1);
    }
  };

  const handleNext = () => {
    if (mobileOffset < 4) {
      setMobileOffset(mobileOffset + 1);
    }
  };

  const renderDayColumn = (date: Date, idx: number) => {
    const dayReminders = getDayReminders(date);
    const today = isToday(date);

    return (
      <div
        key={idx}
        className={`
          bg-white dark:bg-[#383e4e]/30 
          border border-[#b6bac5]/20 
          rounded-xl p-3
          min-h-[200px]
          ${today ? 'ring-2 ring-[#9F5F80] shadow-lg' : ''}
        `}
      >
        {/* Day Header */}
        <div className="text-center mb-3 pb-2 border-b border-[#b6bac5]/10">
          <div className={`text-xs font-semibold uppercase ${today ? 'text-[#9F5F80]' : 'text-[#6c757d] dark:text-[#b6bac5]'}`}>
            {date.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', { weekday: 'short' })}
          </div>
          <div className={`text-xl font-bold mt-1 ${today ? 'text-[#9F5F80]' : 'text-[#383e4e] dark:text-white'}`}>
            {date.getDate()}
          </div>
        </div>

        {/* Reminders */}
        <div className="space-y-2">
          {dayReminders.map((reminder) => {
            const isExternal = reminder.is_google_external;
            const isImported = reminder.imported_from_google;

            return (
              <div key={reminder.id} className="relative group">
                <button
                  onClick={() => onReminderClick(reminder)}
                  className={`
                    w-full text-left px-2.5 py-2 rounded-lg text-sm font-medium text-white
                    hover:opacity-80 transition-all
                    ${getReminderColor(reminder.type, isExternal)}
                    ${isExternal ? 'relative overflow-hidden' : ''}
                  `}
                >
                  {/* Pattern overlay for external events */}
                  {isExternal && (
                    <div 
                      className="absolute inset-0 opacity-10"
                      style={{
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.3) 10px, rgba(255,255,255,.3) 20px)'
                      }}
                    />
                  )}
                  
                  <div className="relative">
                    <div className="flex items-start justify-between gap-1">
                      <div className="truncate flex-1">
                        {reminder.title}
                        {isExternal && (
                          <ExternalLink className="inline-block h-3 w-3 ml-1" />
                        )}
                        {isImported && !isExternal && (
                          <span className="text-[10px] ml-1 px-1 py-0.5 rounded bg-white/20">
                            {isRTL ? 'מיובא' : 'Imported'}
                          </span>
                        )}
                      </div>
                    </div>
                    {reminder.time && (
                      <div className="text-xs opacity-90 mt-0.5">{reminder.time}</div>
                    )}
                  </div>
                </button>

                {/* Import button for external events */}
                {isExternal && onImportGoogleEvent && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onImportGoogleEvent(reminder);
                    }}
                    className="absolute top-1 right-1 w-6 h-6 rounded bg-white/20 hover:bg-white/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title={isRTL ? 'יבא אירוע' : 'Import event'}
                  >
                    <Download className="h-3 w-3 text-white" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {dayReminders.length === 0 && (
          <div className="text-center text-xs text-[#6c757d] dark:text-[#b6bac5]/50 mt-4">
            {isRTL ? 'אין אירועים' : 'No events'}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Desktop: 7-day week view */}
      <div className="hidden md:block">
        <div className="grid grid-cols-7 gap-3">
          {weekDays.map((date, idx) => renderDayColumn(date, idx))}
        </div>
      </div>

      {/* Mobile: 3-day view with navigation */}
      <div className="md:hidden">
        <div className="flex items-center gap-2 mb-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrev}
            disabled={mobileOffset === 0}
            className="flex-shrink-0"
            aria-label={isRTL ? 'הקודם' : 'Previous'}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-center text-sm text-[#6c757d] dark:text-[#b6bac5] flex-1">
            {mobileDays[0]?.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', { month: 'short', day: 'numeric' })}
            {' - '}
            {mobileDays[2]?.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', { month: 'short', day: 'numeric' })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={mobileOffset >= 4}
            className="flex-shrink-0"
            aria-label={isRTL ? 'הבא' : 'Next'}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {mobileDays.map((date, idx) => renderDayColumn(date, idx))}
        </div>
      </div>
    </>
  );
}

export default WeekView;
