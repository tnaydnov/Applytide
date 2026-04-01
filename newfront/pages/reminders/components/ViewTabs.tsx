/**
 * ViewTabs Component
 * Calendar view mode selector (Month/Week/Day)
 */

import { Button } from '../../../components/ui/button';
import type { CalendarViewType } from '../RemindersPage';

interface ViewTabsProps {
  view: CalendarViewType;
  onViewChange: (view: CalendarViewType) => void;
  isRTL?: boolean;
}

export function ViewTabs({ view, onViewChange, isRTL = false }: ViewTabsProps) {
  const views: { id: CalendarViewType; label: { en: string; he: string } }[] = [
    { id: 'month', label: { en: 'Month', he: 'חודש' } },
    { id: 'week', label: { en: 'Week', he: 'שבוע' } },
    { id: 'day', label: { en: 'Day', he: 'יום' } },
  ];

  return (
    <div className="flex gap-2 bg-white dark:bg-[#383e4e]/50 border border-[#b6bac5]/20 rounded-lg p-1">
      {views.map((v) => (
        <Button
          key={v.id}
          variant={view === v.id ? 'default' : 'ghost'}
          size="sm"
          onClick={() => onViewChange(v.id)}
          className={view === v.id ? 'bg-[#9F5F80]' : ''}
        >
          {v.label[isRTL ? 'he' : 'en']}
        </Button>
      ))}
    </div>
  );
}

export default ViewTabs;
