/**
 * DocumentFilters Component
 * Advanced filtering with search, type, status, and sorting
 */

import { Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import type { DocumentType, DocumentStatus } from '../../../features/documents/api';

export type SortOption = 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc' | 'size-asc' | 'size-desc';

interface DocumentFiltersProps {
  typeFilter: DocumentType | 'all';
  statusFilter: DocumentStatus | 'all';
  sortBy: SortOption;
  searchQuery: string;
  onTypeChange: (type: DocumentType | 'all') => void;
  onStatusChange: (status: DocumentStatus | 'all') => void;
  onSortChange: (sort: SortOption) => void;
  onSearchChange: (query: string) => void;
  counts: {
    all: number;
    resume: number;
    cover_letter: number;
    portfolio: number;
    transcript: number;
    certificate: number;
    reference_letter: number;
    other: number;
    active: number;
    archived: number;
    draft: number;
  };
  isRTL?: boolean;
}

export function DocumentFilters({
  typeFilter,
  statusFilter,
  sortBy,
  searchQuery,
  onTypeChange,
  onStatusChange,
  onSortChange,
  onSearchChange,
  counts,
  isRTL = false,
}: DocumentFiltersProps) {
  return (
    <div className="space-y-4 mb-6" dir={isRTL ? 'rtl' : 'ltr'} data-tour="filters-section">
      {/* Search Bar */}
      <div className="relative" data-tour="search-bar">
        <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6c757d]`} />
        <Input
          type="text"
          placeholder={isRTL ? 'חפש מסמכים...' : 'Search documents...'}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`${isRTL ? 'pr-10' : 'pl-10'} bg-white dark:bg-[#383e4e]/50 border-[#b6bac5]/20`}
        />
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
        {/* Type Filter */}
        <Select value={typeFilter} onValueChange={(value) => onTypeChange(value as DocumentType | 'all')}>
          <SelectTrigger className="w-full sm:w-[180px] md:w-[200px] bg-white dark:bg-[#383e4e]/50" data-tour="type-filter">
            <SelectValue placeholder={isRTL ? 'סוג מסמך' : 'Document Type'} />
          </SelectTrigger>
          <SelectContent dir={isRTL ? 'rtl' : 'ltr'}>
            <SelectItem value="all">
              {isRTL ? `הכל (${counts.all})` : `All (${counts.all})`}
            </SelectItem>
            <SelectItem value="resume">
              {isRTL ? `קורות חיים (${counts.resume})` : `Resume (${counts.resume})`}
            </SelectItem>
            <SelectItem value="cover_letter">
              {isRTL ? `מכתב נלווה (${counts.cover_letter})` : `Cover Letter (${counts.cover_letter})`}
            </SelectItem>
            <SelectItem value="portfolio">
              {isRTL ? `תיק עבודות (${counts.portfolio})` : `Portfolio (${counts.portfolio})`}
            </SelectItem>
            <SelectItem value="transcript">
              {isRTL ? `תעודת גמר (${counts.transcript})` : `Transcript (${counts.transcript})`}
            </SelectItem>
            <SelectItem value="certificate">
              {isRTL ? `תעודה (${counts.certificate})` : `Certificate (${counts.certificate})`}
            </SelectItem>
            <SelectItem value="reference_letter">
              {isRTL ? `מכתב המלצה (${counts.reference_letter})` : `Reference Letter (${counts.reference_letter})`}
            </SelectItem>
            <SelectItem value="other">
              {isRTL ? `אחר (${counts.other})` : `Other (${counts.other})`}
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={(value) => onStatusChange(value as DocumentStatus | 'all')}>
          <SelectTrigger className="w-full sm:w-[180px] bg-white dark:bg-[#383e4e]/50" data-tour="status-filter">
            <SelectValue placeholder={isRTL ? 'סטטוס' : 'Status'} />
          </SelectTrigger>
          <SelectContent dir={isRTL ? 'rtl' : 'ltr'}>
            <SelectItem value="all">
              {isRTL ? `הכל (${counts.all})` : `All (${counts.all})`}
            </SelectItem>
            <SelectItem value="active">
              {isRTL ? `פעיל (${counts.active})` : `Active (${counts.active})`}
            </SelectItem>
            <SelectItem value="draft">
              {isRTL ? `טיוטה (${counts.draft})` : `Draft (${counts.draft})`}
            </SelectItem>
            <SelectItem value="archived">
              {isRTL ? `בארכיון (${counts.archived})` : `Archived (${counts.archived})`}
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Sort By */}
        <Select value={sortBy} onValueChange={(value) => onSortChange(value as SortOption)}>
          <SelectTrigger className="w-full sm:w-[180px] bg-white dark:bg-[#383e4e]/50" data-tour="sort-by">
            <SlidersHorizontal className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            <SelectValue placeholder={isRTL ? 'מיון' : 'Sort by'} />
          </SelectTrigger>
          <SelectContent dir={isRTL ? 'rtl' : 'ltr'}>
            <SelectItem value="date-desc">
              {isRTL ? 'תאריך (חדש-ישן)' : 'Date (Newest)'}
            </SelectItem>
            <SelectItem value="date-asc">
              {isRTL ? 'תאריך (ישן-חדש)' : 'Date (Oldest)'}
            </SelectItem>
            <SelectItem value="name-asc">
              {isRTL ? 'שם (א-ת)' : 'Name (A-Z)'}
            </SelectItem>
            <SelectItem value="name-desc">
              {isRTL ? 'שם (ת-א)' : 'Name (Z-A)'}
            </SelectItem>
            <SelectItem value="size-desc">
              {isRTL ? 'גודל (גדול-קטן)' : 'Size (Largest)'}
            </SelectItem>
            <SelectItem value="size-asc">
              {isRTL ? 'גודל (קטן-גדול)' : 'Size (Smallest)'}
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {(typeFilter !== 'all' || statusFilter !== 'all' || searchQuery) && (
          <Button
            variant="outline"
            onClick={() => {
              onTypeChange('all');
              onStatusChange('all');
              onSearchChange('');
            }}
            className="w-full sm:w-auto"
          >
            {isRTL ? 'נקה סינון' : 'Clear Filters'}
          </Button>
        )}
      </div>
    </div>
  );
}

export default DocumentFilters;