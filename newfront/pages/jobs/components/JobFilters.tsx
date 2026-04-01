/**
 * JobFilters Component
 * Search and filter controls for jobs page
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, MapPin, Wifi, X, Archive, ArrowUpDown } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';

interface JobFiltersProps {
  searchQuery: string;
  locationFilter: string;
  remoteTypeFilter: string;
  showArchived: boolean;
  sortBy: 'newest' | 'oldest';
  onSearch: (query: string) => void;
  onFilterChange: (filters: { location?: string; remoteType?: string }) => void;
  onToggleArchived: () => void;
  onSortChange: (sort: 'newest' | 'oldest') => void;
  onClearFilters: () => void;
  isRTL?: boolean;
}

const REMOTE_TYPES = [
  { value: 'all', label: { en: 'All Types', he: 'כל הסוגים' } },
  { value: 'remote', label: { en: 'Remote', he: 'עבודה מרחוק' } },
  { value: 'hybrid', label: { en: 'Hybrid', he: 'היברידי' } },
  { value: 'onsite', label: { en: 'On-site', he: 'במשרד' } },
];

export function JobFilters({
  searchQuery,
  locationFilter,
  remoteTypeFilter,
  showArchived,
  sortBy,
  onSearch,
  onFilterChange,
  onToggleArchived,
  onSortChange,
  onClearFilters,
  isRTL = false,
}: JobFiltersProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(localSearch);
  };

  const hasActiveFilters = searchQuery || locationFilter || remoteTypeFilter;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-[#383e4e]/50 border border-[#b6bac5]/20 rounded-xl p-6 mb-8"
    >
      <div className="space-y-4">
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="relative">
            <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 h-5 w-5 text-[#6c757d]`} />
            <Input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder={
                isRTL
                  ? 'חפש לפי תפקיד, חברה או מילות מפתח...'
                  : 'Search by title, company, or keywords...'
              }
              aria-label={isRTL ? 'חפש לפי תפקיד, חברה או מילות מפתח' : 'Search by title, company, or keywords'}
              className={`${isRTL ? 'pr-12' : 'pl-12'} h-12 text-base`}
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => {
                  setLocalSearch('');
                  onSearch('');
                }}
                aria-label={isRTL ? 'נקה חיפוש' : 'Clear search'}
                className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-[#6c757d] hover:text-[#383e4e] dark:hover:text-white transition-colors`}
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </form>

        {/* Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4" dir={isRTL ? 'rtl' : 'ltr'}>
          {/* Location Filter */}
          <div className="relative">
            <MapPin className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 h-5 w-5 text-[#6c757d] pointer-events-none z-10`} />
            <Input
              type="text"
              value={locationFilter}
              onChange={(e) => onFilterChange({ location: e.target.value })}
              placeholder={isRTL ? 'מיקום' : 'Location'}
              className={`${isRTL ? 'pr-12' : 'pl-12'} h-11`}
            />
          </div>

          {/* Remote Type Filter */}
          <div className={`relative ${isRTL ? 'rtl-select-wrapper' : ''}`}>
            <Wifi className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 h-5 w-5 text-[#6c757d] pointer-events-none z-10`} />
            <Select
              value={remoteTypeFilter}
              onValueChange={(value) => onFilterChange({ remoteType: value })}
            >
              <SelectTrigger className={`${isRTL ? 'pr-12' : 'pl-12'} h-11`}>
                <SelectValue
                  placeholder={isRTL ? 'סוג עבודה' : 'Work type'}
                />
              </SelectTrigger>
              <SelectContent align={isRTL ? 'end' : 'start'} dir={isRTL ? 'rtl' : 'ltr'}>
                {REMOTE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {isRTL ? type.label.he : type.label.en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sort Dropdown */}
          <div className={`relative ${isRTL ? 'rtl-select-wrapper' : ''}`}>
            <ArrowUpDown className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 h-5 w-5 text-[#6c757d] pointer-events-none z-10`} />
            <Select value={sortBy} onValueChange={onSortChange}>
              <SelectTrigger className={`${isRTL ? 'pr-12' : 'pl-12'} h-11`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent align={isRTL ? 'end' : 'start'} dir={isRTL ? 'rtl' : 'ltr'}>
                <SelectItem value="newest">
                  {isRTL ? 'חדשים ביותר' : 'Newest First'}
                </SelectItem>
                <SelectItem value="oldest">
                  {isRTL ? 'ישנים ביותר' : 'Oldest First'}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Archive Toggle */}
          <Button
            variant={showArchived ? 'default' : 'outline'}
            onClick={onToggleArchived}
            className={`h-11 ${
              showArchived
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'border-2 hover:border-amber-500/50 hover:bg-amber-50 dark:hover:bg-amber-900/20'
            }`}
          >
            <Archive className="h-4 w-4 mr-2" />
            {isRTL ? (showArchived ? 'מציג ארכיון' : 'הצג ארכיון') : (showArchived ? 'Showing Archive' : 'Show Archive')}
          </Button>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              onClick={onClearFilters}
              className="h-11"
            >
              <X className="h-4 w-4 mr-2" />
              {isRTL ? 'נקה פילטרים' : 'Clear Filters'}
            </Button>
          )}
        </div>

        {/* Active Filters Indicator */}
        {hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="pt-4 border-t border-[#b6bac5]/20"
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <div className="flex flex-wrap gap-2">
              {searchQuery && (
                <span className="px-3 py-1 bg-[#9F5F80]/10 text-[#9F5F80] rounded-full text-sm font-medium">
                  {isRTL ? 'חיפוש' : 'Search'}: {searchQuery}
                </span>
              )}
              {locationFilter && (
                <span className="px-3 py-1 bg-[#9F5F80]/10 text-[#9F5F80] rounded-full text-sm font-medium">
                  {isRTL ? 'מיקום' : 'Location'}: {locationFilter}
                </span>
              )}
              {remoteTypeFilter && (
                <span className="px-3 py-1 bg-[#9F5F80]/10 text-[#9F5F80] rounded-full text-sm font-medium">
                  {isRTL ? 'סוג' : 'Type'}:{' '}
                  {REMOTE_TYPES.find((t) => t.value === remoteTypeFilter)?.label[
                    isRTL ? 'he' : 'en'
                  ]}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

export default JobFilters;