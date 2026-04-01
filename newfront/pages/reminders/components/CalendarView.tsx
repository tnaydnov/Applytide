/**
 * CalendarView Component
 * Main calendar display with month/week/day views
 */

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import type { CalendarViewType } from '../RemindersPage';
import type { Reminder } from '../../../features/reminders/api';

interface CalendarViewProps {
  view: CalendarViewType;
  currentDate: Date;
  onDateChange: (date: Date) => void;
  reminders: Reminder[];
  onReminderClick: (reminder: Reminder) => void;
  onImportGoogleEvent?: (reminder: Reminder) => void;
  isRTL?: boolean;
}

export function CalendarView({
  view,
  currentDate,
  onDateChange,
  reminders,
  onReminderClick,
  onImportGoogleEvent,
  isRTL = false,
}: CalendarViewProps) {
  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    onDateChange(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    onDateChange(newDate);
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  const getHeaderText = () => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long' };
    if (view === 'day') {
      options.day = 'numeric';
    }
    return currentDate.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', options);
  };

  return (
    <div className="bg-white dark:bg-[#383e4e]/50 border border-[#b6bac5]/20 rounded-xl overflow-hidden">
      {/* Calendar Header */}
      <div className="p-4 sm:p-6 border-b border-[#b6bac5]/20" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-xl sm:text-2xl font-bold text-[#383e4e] dark:text-white">
            {getHeaderText()}
          </h2>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToday}
              className="text-xs sm:text-sm"
            >
              {isRTL ? 'היום' : 'Today'}
            </Button>

            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
                aria-label={isRTL ? 'הקודם' : 'Previous'}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                aria-label={isRTL ? 'הבא' : 'Next'}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Body */}
      <div className="p-3 sm:p-6">
        {view === 'month' && (
          <MonthView
            currentDate={currentDate}
            reminders={reminders}
            onReminderClick={onReminderClick}
            isRTL={isRTL}
          />
        )}
        {view === 'week' && (
          <WeekView
            currentDate={currentDate}
            reminders={reminders}
            onReminderClick={onReminderClick}
            onImportGoogleEvent={onImportGoogleEvent}
            isRTL={isRTL}
          />
        )}
        {view === 'day' && (
          <DayView
            currentDate={currentDate}
            reminders={reminders}
            onReminderClick={onReminderClick}
            isRTL={isRTL}
          />
        )}
      </div>
    </div>
  );
}

export default CalendarView;