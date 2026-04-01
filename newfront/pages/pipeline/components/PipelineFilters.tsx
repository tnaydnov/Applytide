/**
 * PipelineFilters Component
 * Search and status filters for pipeline
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, X, Filter, ArrowUpDown } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Checkbox } from '../../../components/ui/checkbox';
import { Label } from '../../../components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../../components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import type { PipelineStage } from '../PipelinePage';

export type SortOption = 'date-desc' | 'date-asc' | 'company' | 'status' | 'title';

interface PipelineFiltersProps {
  searchQuery: string;
  selectedStatuses: string[];
  stages: PipelineStage[];
  showArchived?: boolean;
  sortBy?: SortOption;
  onSearch: (query: string) => void;
  onStatusFilter: (statuses: string[]) => void;
  onToggleArchived?: (show: boolean) => void;
  onSortChange?: (sort: SortOption) => void;
  isRTL?: boolean;
}

export function PipelineFilters({
  searchQuery,
  selectedStatuses,
  stages,
  showArchived = false,
  sortBy = 'date-desc',
  onSearch,
  onStatusFilter,
  onToggleArchived,
  onSortChange,
  isRTL = false,
}: PipelineFiltersProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(localSearch);
  };

  const handleStatusToggle = (stageId: string, checked: boolean) => {
    if (checked) {
      onStatusFilter([...selectedStatuses, stageId]);
    } else {
      onStatusFilter(selectedStatuses.filter((id) => id !== stageId));
    }
  };

  const handleClearFilters = () => {
    setLocalSearch('');
    onSearch('');
    onStatusFilter([]);
  };

  const hasActiveFilters = searchQuery || selectedStatuses.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-[#383e4e]/50 border border-[#b6bac5]/20 rounded-xl p-4 mb-8"
      data-tour="filter-sort-section"
    >
      <div className="flex flex-col md:flex-row gap-4" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex-1">
          <div className="relative">
            <Search
              className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-5 w-5 text-[#6c757d]`}
            />
            <Input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder={
                isRTL
                  ? 'חפש לפי תפקיד או חברה...'
                  : 'Search by job title or company...'
              }
              aria-label={isRTL ? 'חפש לפי תפקיד או חברה' : 'Search by job title or company'}
              className={`${isRTL ? 'pr-11' : 'pl-11'} h-11`}
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => {
                  setLocalSearch('');
                  onSearch('');
                }}
                aria-label={isRTL ? 'נקה חיפוש' : 'Clear search'}
                className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-[#6c757d] hover:text-[#383e4e] dark:hover:text-white transition-colors`}
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </form>

        {/* Status Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-11">
              <Filter className="h-4 w-4 mr-2" />
              {isRTL ? 'סטטוס' : 'Status'}
              {selectedStatuses.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-[#9F5F80] text-white rounded-full text-xs">
                  {selectedStatuses.length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align={isRTL ? 'end' : 'start'} dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="space-y-3">
              <h4 className={`font-semibold text-sm text-[#383e4e] dark:text-white ${isRTL ? 'text-right' : 'text-left'}`}>
                {isRTL ? 'סנן לפי סטטוס' : 'Filter by status'}
              </h4>
              {stages.map((stage) => (
                <div key={stage.id} className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Checkbox
                    id={`status-${stage.id}`}
                    checked={selectedStatuses.includes(stage.id)}
                    onCheckedChange={(checked) =>
                      handleStatusToggle(stage.id, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={`status-${stage.id}`}
                    className={`flex items-center gap-2 cursor-pointer w-full ${isRTL ? 'flex-row-reverse justify-end' : ''}`}
                  >
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: stage.color }}
                    />
                    <span className={`text-sm ${isRTL ? 'text-right' : ''}`}>{stage.name}</span>
                  </Label>
                </div>
              ))}
              {selectedStatuses.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onStatusFilter([])}
                  className="w-full"
                >
                  {isRTL ? 'נקה הכל' : 'Clear all'}
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Sort */}
        {onSortChange && (
          <Select value={sortBy} onValueChange={(value) => onSortChange(value as SortOption)}>
            <SelectTrigger className="h-11 w-[180px]">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent align={isRTL ? 'end' : 'start'} dir={isRTL ? 'rtl' : 'ltr'}>
              <SelectItem value="date-desc">
                {isRTL ? 'תאריך (חדש לישן)' : 'Date (Newest)'}
              </SelectItem>
              <SelectItem value="date-asc">
                {isRTL ? 'תאריך (ישן לחדש)' : 'Date (Oldest)'}
              </SelectItem>
              <SelectItem value="company">
                {isRTL ? 'חברה (א-ת)' : 'Company (A-Z)'}
              </SelectItem>
              <SelectItem value="title">
                {isRTL ? 'תפקיד (א-ת)' : 'Job Title (A-Z)'}
              </SelectItem>
              <SelectItem value="status">
                {isRTL ? 'סטטוס' : 'Status'}
              </SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Archive Toggle */}
        {onToggleArchived && (
          <Button
            variant={showArchived ? 'default' : 'outline'}
            onClick={() => onToggleArchived(!showArchived)}
            className={`h-11 ${showArchived ? 'bg-[#9F5F80]' : ''}`}
          >
            {isRTL ? (showArchived ? 'הצג פעילות' : 'הצג ארכיון') : (showArchived ? 'Show Active' : 'Show Archived')}
          </Button>
        )}

        {/* Clear All */}
        {hasActiveFilters && (
          <Button variant="outline" onClick={handleClearFilters} className="h-11">
            <X className="h-4 w-4 mr-2" />
            {isRTL ? 'נקה פילטרים' : 'Clear Filters'}
          </Button>
        )}
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="pt-4 mt-4 border-t border-[#b6bac5]/20"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <div className="flex flex-wrap gap-2">
            {searchQuery && (
              <span className="px-3 py-1 bg-[#9F5F80]/10 text-[#9F5F80] rounded-full text-sm font-medium flex items-center gap-2">
                {isRTL ? 'חיפוש' : 'Search'}: {searchQuery}
                <button
                  onClick={() => onSearch('')}
                  aria-label={isRTL ? 'הסר סינון חיפוש' : 'Remove search filter'}
                  className="hover:text-[#383e4e] dark:hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {selectedStatuses.map((statusId) => {
              const stage = stages.find((s) => s.id === statusId);
              if (!stage) return null;
              return (
                <span
                  key={statusId}
                  className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 text-white"
                  style={{ backgroundColor: stage.color }}
                >
                  {stage.name}
                  <button
                    onClick={() => handleStatusToggle(statusId, false)}
                    aria-label={isRTL ? `הסר סינון ${stage.name}` : `Remove ${stage.name} filter`}
                    className="hover:opacity-75"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default PipelineFilters;