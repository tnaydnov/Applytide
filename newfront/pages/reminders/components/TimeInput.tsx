/**
 * TimeInput Component
 * Clean native time input with optional quick-pick preset chips
 */

import { Clock } from 'lucide-react';
import { cn } from '../../../components/ui/utils';

interface TimePreset {
  label: string;
  value: string; // 24-hour "HH:mm"
}

const DEFAULT_PRESETS: TimePreset[] = [
  { label: '9 AM', value: '09:00' },
  { label: '12 PM', value: '12:00' },
  { label: '2 PM', value: '14:00' },
  { label: '5 PM', value: '17:00' },
  { label: '7 PM', value: '19:00' },
];

interface TimeInputProps {
  value: string; // Format: "HH:mm" (24-hour)
  onChange: (value: string) => void;
  className?: string;
  isRTL?: boolean;
  /** Show quick-pick preset chips below the input */
  showPresets?: boolean;
  /** Compact mode for smaller contexts (notification schedule) */
  compact?: boolean;
}

export function TimeInput({
  value,
  onChange,
  className,
  isRTL: _isRTL = false,
  showPresets = false,
  compact = false,
}: TimeInputProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {/* Native time input - styled to match date picker button */}
      <div
        className={cn(
          'flex items-center gap-2 rounded-md border-2 bg-background text-foreground transition-colors hover:border-[#9F5F80]/50 focus-within:border-[#9F5F80]',
          compact ? 'h-9 px-2' : 'h-10 sm:h-12 px-3'
        )}
      >
        <Clock
          className={cn(
            'text-muted-foreground flex-shrink-0',
            compact ? 'h-3.5 w-3.5' : 'h-4 w-4'
          )}
        />
        <input
          type="time"
          value={value || '09:00'}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'flex-1 bg-transparent outline-none text-foreground',
            compact ? 'text-sm' : 'text-base',
            '[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute',
          )}
        />
      </div>

      {/* Quick-pick presets */}
      {showPresets && (
        <div className="flex flex-wrap gap-1.5">
          {DEFAULT_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => onChange(preset.value)}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                value === preset.value
                  ? 'bg-[#9F5F80] text-white shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-[#9F5F80]/10 hover:text-[#9F5F80]'
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default TimeInput;