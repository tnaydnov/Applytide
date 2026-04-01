/**
 * AdvancedFilters Component
 * Advanced filtering options for pipeline applications
 */

import { useState } from 'react';
import {
  Filter,
  X,
  Calendar,
  Building2,
  FileText,
  ChevronDown,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../../components/ui/popover';
import { Calendar as CalendarComponent } from '../../../components/ui/calendar';
import { Checkbox } from '../../../components/ui/checkbox';
import { Label } from '../../../components/ui/label';
import { Separator } from '../../../components/ui/separator';
import { Badge } from '../../../components/ui/badge';
import { he } from 'date-fns/locale';

export interface AdvancedFilterOptions {
  dateRange?: {
    from: Date | undefined;
    to: Date | undefined;
  };
  hasResume?: boolean;
  hasCoverLetter?: boolean;
  hasNotes?: boolean;
  companies?: string[];
}

interface AdvancedFiltersProps {
  filters: AdvancedFilterOptions;
  onFiltersChange: (filters: AdvancedFilterOptions) => void;
  availableCompanies: string[];
  isRTL?: boolean;
}

export function AdvancedFilters({
  filters,
  onFiltersChange,
  availableCompanies,
  isRTL = false,
}: AdvancedFiltersProps) {
  const [open, setOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState<'from' | 'to' | null>(null);

  const activeFiltersCount = [
    filters.dateRange?.from || filters.dateRange?.to,
    filters.hasResume !== undefined,
    filters.hasCoverLetter !== undefined,
    filters.hasNotes !== undefined,
    filters.companies && filters.companies.length > 0,
  ].filter(Boolean).length;

  const handleDateRangeChange = (field: 'from' | 'to', date: Date | undefined) => {
    onFiltersChange({
      ...filters,
      dateRange: {
        from: filters.dateRange?.from ?? undefined,
        to: filters.dateRange?.to ?? undefined,
        [field]: date,
      },
    });
    setDatePickerOpen(null);
  };

  const handleDocumentFilterChange = (
    field: 'hasResume' | 'hasCoverLetter' | 'hasNotes',
    checked: boolean
  ) => {
    onFiltersChange({
      ...filters,
      [field]: checked ? true : undefined,
    });
  };

  const handleCompanyToggle = (company: string) => {
    const current = filters.companies || [];
    const updated = current.includes(company)
      ? current.filter((c) => c !== company)
      : [...current, company];
    
    onFiltersChange({
      ...filters,
      companies: updated.length > 0 ? updated : undefined,
    });
  };

  const handleClearAll = () => {
    onFiltersChange({
      dateRange: undefined,
      hasResume: undefined,
      hasCoverLetter: undefined,
      hasNotes: undefined,
      companies: undefined,
    });
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return isRTL ? 'בחר תאריך' : 'Select date';
    return date.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="relative border-[#b6bac5]/30 hover:border-[#9F5F80]/50"
          data-tour="advanced-filters-btn"
        >
          <Filter className="h-4 w-4 mr-2" />
          {isRTL ? 'סינון מתקדם' : 'Advanced Filters'}
          {activeFiltersCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-2 bg-[#9F5F80] text-white h-5 min-w-5 flex items-center justify-center"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 p-0"
        align={isRTL ? 'end' : 'start'}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="p-4 border-b border-[#b6bac5]/20">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[#383e4e] dark:text-white">
              {isRTL ? 'סינון מתקדם' : 'Advanced Filters'}
            </h3>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="text-xs text-[#9F5F80] hover:text-[#9F5F80]/80"
              >
                {isRTL ? 'נקה הכל' : 'Clear all'}
              </Button>
            )}
          </div>
        </div>

        <div className="p-4 space-y-6 max-h-[500px] overflow-y-auto">
          {/* Date Range Filter */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#9F5F80]" />
              <Label className="font-semibold text-[#383e4e] dark:text-white">
                {isRTL ? 'טווח תאריכים' : 'Date Range'}
              </Label>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Popover
                open={datePickerOpen === 'from'}
                onOpenChange={(open) => setDatePickerOpen(open ? 'from' : null)}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start text-left font-normal"
                  >
                    <span className="truncate">
                      {filters.dateRange?.from
                        ? formatDate(filters.dateRange.from)
                        : isRTL
                        ? 'מתאריך'
                        : 'From'}
                    </span>
                    <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={filters.dateRange?.from}
                    onSelect={(date) => handleDateRangeChange('from', date)}
                    locale={isRTL ? he : undefined}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover
                open={datePickerOpen === 'to'}
                onOpenChange={(open) => setDatePickerOpen(open ? 'to' : null)}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start text-left font-normal"
                  >
                    <span className="truncate">
                      {filters.dateRange?.to
                        ? formatDate(filters.dateRange.to)
                        : isRTL
                        ? 'עד תאריך'
                        : 'To'}
                    </span>
                    <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={filters.dateRange?.to}
                    onSelect={(date) => handleDateRangeChange('to', date)}
                    locale={isRTL ? he : undefined}
                    initialFocus
                    disabled={(date) =>
                      filters.dateRange?.from ? date < filters.dateRange.from : false
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>

            {(filters.dateRange?.from || filters.dateRange?.to) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDateRangeChange('from', undefined)}
                className="w-full text-xs text-red-600 hover:text-red-700"
              >
                <X className="h-3 w-3 mr-1" />
                {isRTL ? 'נקה טווח תאריכים' : 'Clear date range'}
              </Button>
            )}
          </div>

          <Separator />

          {/* Document Filters */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#9F5F80]" />
              <Label className="font-semibold text-[#383e4e] dark:text-white">
                {isRTL ? 'מסמכים' : 'Documents'}
              </Label>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="has-resume"
                  checked={filters.hasResume === true}
                  onCheckedChange={(checked) =>
                    handleDocumentFilterChange('hasResume', checked as boolean)
                  }
                />
                <Label
                  htmlFor="has-resume"
                  className="text-sm cursor-pointer text-[#6c757d] dark:text-[#b6bac5]"
                >
                  {isRTL ? 'עם קורות חיים' : 'Has Resume'}
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="has-cover-letter"
                  checked={filters.hasCoverLetter === true}
                  onCheckedChange={(checked) =>
                    handleDocumentFilterChange('hasCoverLetter', checked as boolean)
                  }
                />
                <Label
                  htmlFor="has-cover-letter"
                  className="text-sm cursor-pointer text-[#6c757d] dark:text-[#b6bac5]"
                >
                  {isRTL ? 'עם מכתב נלווה' : 'Has Cover Letter'}
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="has-notes"
                  checked={filters.hasNotes === true}
                  onCheckedChange={(checked) =>
                    handleDocumentFilterChange('hasNotes', checked as boolean)
                  }
                />
                <Label
                  htmlFor="has-notes"
                  className="text-sm cursor-pointer text-[#6c757d] dark:text-[#b6bac5]"
                >
                  {isRTL ? 'עם הערות' : 'Has Notes'}
                </Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* Company Filter */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#9F5F80]" />
              <Label className="font-semibold text-[#383e4e] dark:text-white">
                {isRTL ? 'חברות' : 'Companies'}
              </Label>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availableCompanies.length > 0 ? (
                availableCompanies.map((company) => (
                  <div key={company} className="flex items-center gap-2">
                    <Checkbox
                      id={`company-${company}`}
                      checked={filters.companies?.includes(company) || false}
                      onCheckedChange={() => handleCompanyToggle(company)}
                    />
                    <Label
                      htmlFor={`company-${company}`}
                      className="text-sm cursor-pointer text-[#6c757d] dark:text-[#b6bac5] truncate"
                    >
                      {company}
                    </Label>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#6c757d] dark:text-[#b6bac5] italic">
                  {isRTL ? 'אין חברות זמינות' : 'No companies available'}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[#b6bac5]/20">
          <Button
            onClick={() => setOpen(false)}
            className="w-full"
            style={{
              background: 'linear-gradient(135deg, #9F5F80 0%, #383e4e 100%)',
            }}
          >
            {isRTL ? 'החל סינונים' : 'Apply Filters'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default AdvancedFilters;