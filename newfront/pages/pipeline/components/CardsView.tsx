/**
 * CardsView Component
 * Grid layout view for applications
 */

import React from 'react';
import { motion } from 'motion/react';
import { Building2, Calendar, FileText, MessageSquare, CheckSquare, Square } from 'lucide-react';
import type { Application } from '../../../features/applications/api';
import type { PipelineStage } from '../PipelinePage';
import { getStatusName, getStatusColor } from '../constants/statuses';

interface CardsViewProps {
  applications: Application[];
  stages: PipelineStage[];
  onApplicationClick: (app: Application) => void;
  isRTL?: boolean;
  selectedIds?: (number | string)[];
  onToggleSelect?: (id: number | string) => void;
}

const formatDate = (dateString: string | undefined, isRTL: boolean): string => {
  if (!dateString) return isRTL ? 'לא ידוע' : 'Unknown';

  const date = new Date(dateString);
  return date.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });
};

const getStatusBadge = (status: string, stages: PipelineStage[], isRTL: boolean) => {
  // First try to find custom stage
  const customStage = stages.find(
    (stage) => stage.id === status.toLowerCase().replace(/\s+/g, '_')
  );
  
  if (customStage) {
    return { name: customStage.name, color: customStage.color };
  }
  
  // Use centralized status configuration
  const statusId = status.toLowerCase().replace(/\s+/g, '_');
  return {
    name: getStatusName(statusId, isRTL),
    color: getStatusColor(statusId),
  };
};

export function CardsView({
  applications,
  stages,
  onApplicationClick,
  isRTL = false,
  selectedIds = [],
  onToggleSelect,
}: CardsViewProps) {
  const handleSelectClick = (e: React.MouseEvent, appId: number | string) => {
    e.stopPropagation();
    onToggleSelect?.(appId);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-tour="cards-grid">
      {applications.map((app, idx) => {
        const statusBadge = getStatusBadge(app.status, stages, isRTL);
        const isSelected = selectedIds.includes(app.id);

        return (
          <motion.div
            key={app.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05, duration: 0.3 }}
            onClick={() => onApplicationClick(app)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onApplicationClick(app); } }}
            role="button"
            tabIndex={0}
            className={`
              bg-white dark:bg-[#383e4e]/50 
              border ${isSelected ? 'border-[#9F5F80] shadow-xl' : 'border-[#b6bac5]/20'}
              rounded-xl p-6 
              hover:border-[#9F5F80]/50 
              hover:shadow-xl
              transition-all duration-200
              cursor-pointer group
              relative overflow-hidden
            `}
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            {/* Selection Checkbox - opposite side of status badge */}
            {onToggleSelect && (
              <button
                onClick={(e) => handleSelectClick(e, app.id)}
                className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-4 z-20 p-1.5 rounded hover:bg-[#b6bac5]/20 transition-colors`}
                title={isRTL ? (isSelected ? 'בטל בחירה' : 'בחר') : (isSelected ? 'Deselect' : 'Select')}
              >
                {isSelected ? (
                  <CheckSquare className="h-5 w-5 text-[#9F5F80]" />
                ) : (
                  <Square className="h-5 w-5 text-[#6c757d] group-hover:text-[#9F5F80]" />
                )}
              </button>
            )}

            {/* Hover Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#9F5F80]/0 to-[#383e4e]/0 group-hover:from-[#9F5F80]/5 group-hover:to-[#383e4e]/5 transition-all duration-300 pointer-events-none" />

            <div className="relative z-10">
              {/* Status Badge & Date - Fixed Layout */}
              <div className={`flex items-start justify-between gap-3 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                {/* Status Badge - with padding for checkbox */}
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold text-white whitespace-nowrap ${onToggleSelect ? (isRTL ? 'ml-8' : 'mr-8') : ''}`}
                  style={{ backgroundColor: statusBadge.color }}
                >
                  {statusBadge.name}
                </span>
                
                {/* Date */}
                <div className={`flex items-center gap-1 text-xs text-[#6c757d] dark:text-[#b6bac5] whitespace-nowrap`}>
                  <Calendar className="h-3 w-3 flex-shrink-0" />
                  <span>{formatDate(app.created_at, isRTL)}</span>
                </div>
              </div>

              {/* Job Title */}
              <h3 className={`font-bold text-lg text-[#383e4e] dark:text-white mb-2 group-hover:text-[#9F5F80] transition-colors line-clamp-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                {app.job_title}
              </h3>

              {/* Company */}
              <div className={`flex items-center gap-2 text-[#6c757d] dark:text-[#b6bac5] mb-4 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
                <Building2 className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium truncate">{app.company_name}</span>
              </div>

              {/* Notes Preview */}
              {app.notes && (
                <p className={`text-sm text-[#6c757d] dark:text-[#b6bac5] line-clamp-2 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {app.notes}
                </p>
              )}

              {/* Metadata Footer */}
              <div className={`flex items-center gap-4 pt-4 border-t border-[#b6bac5]/20 ${isRTL ? 'justify-start' : ''}`}>
                {app.resume_id && (
                  <div className="flex items-center gap-2 text-xs text-[#6c757d] dark:text-[#b6bac5]">
                    <div className="p-1.5 rounded bg-blue-100 dark:bg-blue-900/30">
                      <FileText className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span>{isRTL ? 'קורות חיים' : 'Resume'}</span>
                  </div>
                )}

                {app.notes && (
                  <div className="flex items-center gap-2 text-xs text-[#6c757d] dark:text-[#b6bac5]">
                    <div className="p-1.5 rounded bg-amber-100 dark:bg-amber-900/30">
                      <MessageSquare className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                    </div>
                    <span>{isRTL ? 'הערות' : 'Notes'}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export default CardsView;