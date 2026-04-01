/**
 * KanbanCard Component - Premium with Drag & Drop
 * Clean, focused card design with drag-and-drop support
 */

import React from 'react';
import { motion } from 'motion/react';
import {
  MapPin,
  MoreVertical,
  Calendar,
  FileText,
  MessageSquare,
  Archive,
  GripVertical,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import type { Application } from '../../../features/applications/api';

interface KanbanCardProps {
  application: Application;
  onClick: () => void;
  onMoveToStage?: (stageId: string) => void;
  onArchive?: () => void;
  stages?: Array<{ id: string; name: string; color: string }>;
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
  isRTL?: boolean;
}

export function KanbanCard({
  application,
  onClick,
  onMoveToStage,
  onArchive,
  stages = [],
  isDragging = false,
  dragHandleProps,
  isRTL = false,
}: KanbanCardProps) {
  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return isRTL ? 'היום' : 'Today';
    if (diffDays === 1) return isRTL ? 'אתמול' : 'Yesterday';
    if (diffDays < 7) return isRTL ? `לפני ${diffDays} ימים` : `${diffDays}d ago`;
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return isRTL ? `לפני ${weeks} שבועות` : `${weeks}w ago`;
    }
    const months = Math.floor(diffDays / 30);
    return isRTL ? `לפני ${months} חודשים` : `${months}mo ago`;
  };

  const hasNotes = application.notes && application.notes.length > 0;
  const hasResume = !!application.resume_id;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={`
        group relative bg-white dark:bg-[#383e4e] rounded-xl p-4 
        border-2 transition-all cursor-pointer
        hover:shadow-lg hover:border-[#9F5F80]/40
        ${
          isDragging
            ? 'border-[#9F5F80] shadow-xl opacity-50 rotate-2'
            : 'border-gray-200 dark:border-[#b6bac5]/20'
        }
      `}
      onClick={onClick}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Drag Handle & Menu */}
      <div className="flex items-start justify-between mb-3">
        {/* Drag Handle */}
        <div
          {...dragHandleProps}
          className="cursor-grab active:cursor-grabbing p-1 -ml-1 hover:bg-gray-100 dark:hover:bg-[#b6bac5]/10 rounded transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-5 w-5 text-[#6c757d] dark:text-[#b6bac5]" />
        </div>

        {/* Three-dot menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={handleMenuClick}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#b6bac5]/10 transition-colors"
            >
              <MoreVertical className="h-5 w-5 text-[#6c757d] dark:text-[#b6bac5]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className={`px-2 py-1.5 text-xs font-semibold text-[#6c757d] dark:text-[#b6bac5] ${isRTL ? 'text-right' : ''}`}>
              {isRTL ? 'העבר לשלב' : 'Move to stage'}
            </div>
            <DropdownMenuSeparator />
            {stages.map((stage) => (
              <DropdownMenuItem
                key={stage.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveToStage?.(stage.id);
                }}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2 w-full">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className="truncate">{stage.name}</span>
                </div>
              </DropdownMenuItem>
            ))}
            {onArchive && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchive?.();
                  }}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2 w-full">
                    <Archive className="h-3 w-3" />
                    <span className="truncate">
                      {application.archived
                        ? (isRTL ? 'הסר מארכיון' : 'Unarchive')
                        : (isRTL ? 'העבר לארכיון' : 'Archive')
                      }
                    </span>
                  </div>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Job Title - Most Prominent */}
      <h3 className="font-bold text-lg text-[#383e4e] dark:text-white mb-2 leading-tight line-clamp-2 group-hover:text-[#9F5F80] transition-colors">
        {application.job_title}
      </h3>

      {/* Company Name */}
      <p className="text-sm font-medium text-[#6c757d] dark:text-[#b6bac5] mb-3">
        {application.company_name}
      </p>

      {/* Application Date */}
      <div className="flex items-center gap-1.5 text-xs text-[#6c757d] dark:text-[#b6bac5] mb-3">
        <Calendar className="h-3.5 w-3.5" />
        <span>{formatDate(application.created_at || application.applied_date)}</span>
      </div>

      {/* Location (if available) */}
      {application.location && (
        <div className="flex items-center gap-1.5 text-xs text-[#6c757d] dark:text-[#b6bac5] mb-3">
          <MapPin className="h-3.5 w-3.5" />
          <span className="truncate">{application.location}</span>
        </div>
      )}

      {/* Badges - Bottom */}
      <div className="flex items-center gap-2 flex-wrap">
        {hasResume && (
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md text-xs font-medium">
            <FileText className="h-3 w-3" />
            <span>{isRTL ? 'קו"ח' : 'Resume'}</span>
          </div>
        )}
        {hasNotes && (
          <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-md text-xs font-medium">
            <MessageSquare className="h-3 w-3" />
            <span>{isRTL ? 'הערות' : 'Notes'}</span>
          </div>
        )}
        {application.archived && (
          <div className="flex items-center gap-1 px-2 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-md text-xs font-medium">
            <Archive className="h-3 w-3" />
            <span>{isRTL ? 'ארכיון' : 'Archived'}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default KanbanCard;