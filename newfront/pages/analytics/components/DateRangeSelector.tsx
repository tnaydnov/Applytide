/**
 * DateRangeSelector Component
 * Select date range for analytics with custom range picker
 */

import { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../../components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../components/ui/dialog';
import { Calendar } from '../../../components/ui/calendar';
import { he } from 'date-fns/locale';

interface DateRangeSelectorProps {
  dateRange: { from: Date; to: Date } | null;
  onChange: (range: { from: Date; to: Date } | null) => void;
  isRTL?: boolean;
}

type DateRangeState = {
  from?: Date;
  to?: Date;
};

export function DateRangeSelector({ dateRange, onChange, isRTL = false }: DateRangeSelectorProps) {
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customRange, setCustomRange] = useState<DateRangeState>({
    from: dateRange?.from,
    to: dateRange?.to,
  });

  const presets = [
    {
      label: isRTL ? '7 ימים אחרונים' : 'Last 7 Days',
      getValue: () => ({
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        to: new Date(),
      }),
    },
    {
      label: isRTL ? '30 ימים אחרונים' : 'Last 30 Days',
      getValue: () => ({
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: new Date(),
      }),
    },
    {
      label: isRTL ? '90 ימים אחרונים' : 'Last 90 Days',
      getValue: () => ({
        from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        to: new Date(),
      }),
    },
    {
      label: isRTL ? 'שנה אחרונה' : 'Last Year',
      getValue: () => ({
        from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        to: new Date(),
      }),
    },
    {
      label: isRTL ? 'כל הזמינו' : 'All Times',
      getValue: () => null,
    },
  ];

  const formatDateRange = () => {
    if (!dateRange) {
      return isRTL ? 'כל הזמינו' : 'All Times';
    }
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    return `${dateRange.from.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', options)} - ${dateRange.to.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', options)}`;
  };

  const handlePresetClick = (preset: typeof presets[0]) => {
    const value = preset.getValue();
    onChange(value);
  };

  const handleCustomRangeSelect = (range: DateRangeState | undefined) => {
    if (range) {
      setCustomRange({
        from: range.from,
        to: range.to,
      });
    }
  };

  const handleApplyCustomRange = () => {
    if (customRange.from && customRange.to) {
      onChange({
        from: customRange.from,
        to: customRange.to,
      });
      setIsCustomOpen(false);
    }
  };

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">
            <CalendarIcon className="h-4 w-4 mr-2" />
            {formatDateRange()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align={isRTL ? 'end' : 'start'}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetClick(preset)}
                  className={
                    preset.label === (isRTL ? 'כל הזמינו' : 'All Times') && !dateRange
                      ? 'bg-[#9F5F80] text-white hover:bg-[#9F5F80]/90 hover:text-white'
                      : ''
                  }
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <div className="border-t border-[#b6bac5]/20 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCustomOpen(true)}
                className="w-full"
              >
                {isRTL ? 'טווח מותאם אישית' : 'Custom Range'}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Custom Range Picker Dialog */}
      <Dialog open={isCustomOpen} onOpenChange={setIsCustomOpen}>
        <DialogContent className="max-w-fit" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>
              {isRTL ? 'בחר טווח תאריכים' : 'Select Date Range'}
            </DialogTitle>
            <DialogDescription>
              {isRTL 
                ? 'בחר תאריך התחלה ותאריך סיום לניתוח הנתונים שלך' 
                : 'Choose a start and end date to analyze your data'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <Calendar
              mode="range"
              selected={customRange as import('react-day-picker').DateRange | undefined}
              onSelect={handleCustomRangeSelect}
              numberOfMonths={2}
              className="rounded-md"
              locale={isRTL ? he : undefined}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsCustomOpen(false)}
            >
              {isRTL ? 'ביטול' : 'Cancel'}
            </Button>
            <Button
              onClick={handleApplyCustomRange}
              disabled={!customRange.from || !customRange.to}
              style={{
                background: customRange.from && customRange.to
                  ? 'linear-gradient(135deg, #9F5F80 0%, #383e4e 100%)'
                  : undefined,
              }}
            >
              {isRTL ? 'החל' : 'Apply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default DateRangeSelector;