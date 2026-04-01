/**
 * ApplicationTimeline Component
 * Shows the history of status changes for an application
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Clock,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Calendar,
  Loader2,
} from 'lucide-react';
import { ScrollArea } from '../../../components/ui/scroll-area';
import { apiFetch } from '../../../lib/api/core';
import { getStatusById, getStatusColor, ALL_STATUS_SUGGESTIONS } from '../constants/statuses';
import { logger } from '../../../lib/logger';

interface TimelineEvent {
  id: number;
  from_status?: string;
  to_status: string;
  changed_at: string;
  notes?: string;
}

interface ApplicationTimelineProps {
  applicationId: number;
  currentStatus: string;
  appliedAt: string;
  isRTL?: boolean;
}

export function ApplicationTimeline({
  applicationId,
  currentStatus,
  appliedAt,
  isRTL = false,
}: ApplicationTimelineProps) {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTimeline();
  }, [applicationId, currentStatus]);

  const loadTimeline = async () => {
    try {
      setLoading(true);
      // Backend has /applications/{id}/stages, not /timeline
      const response = await apiFetch(`/applications/${applicationId}/stages`);
      if (response.ok) {
        const data = await response.json();
        // Backend returns List[StageOut] directly (flat array)
        // Map stages to timeline events format
        const stages = Array.isArray(data) ? data : data.timeline || [];
        if (stages.length > 0) {
          const events = stages.map((stage: Record<string, unknown>, index: number) => ({
            id: stage.id || index + 1,
            to_status: stage.name || stage.status || stage.to_status || currentStatus,
            changed_at: stage.created_at || stage.changed_at || appliedAt,
            notes: stage.notes || undefined,
          }));
          // Sort newest first for display
          events.sort((a: TimelineEvent, b: TimelineEvent) => 
            new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
          );
          // Add from_status by looking at the previous event's to_status
          for (let i = 0; i < events.length - 1; i++) {
            events[i].from_status = events[i + 1].to_status;
          }
          setTimeline(events);
        } else {
          // No stages yet, create a basic timeline from current data
          setTimeline([
            {
              id: 1,
              to_status: currentStatus,
              changed_at: appliedAt,
            },
          ]);
        }
      } else {
        // If endpoint fails, create a basic timeline from current data
        setTimeline([
          {
            id: 1,
            to_status: currentStatus,
            changed_at: appliedAt,
          },
        ]);
      }
    } catch (error) {
      logger.error('Failed to load timeline:', error);
      // Fallback to basic timeline
      setTimeline([
        {
          id: 1,
          to_status: currentStatus,
          changed_at: appliedAt,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(isRTL ? 'he-IL' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getStatusInfo = (status: string) => {
    // Try exact ID match first
    let statusConfig = getStatusById(status);
    
    // Try case-insensitive ID match (e.g., "Interview" → "interview")
    if (!statusConfig) {
      statusConfig = getStatusById(status.toLowerCase().replace(/\s+/g, '_'));
    }
    
    // Try matching by display name (e.g., "Phone Screen" matches name: "Phone Screen")
    if (!statusConfig) {
      const lowerStatus = status.toLowerCase();
      statusConfig = ALL_STATUS_SUGGESTIONS.find(
        (s) => s.name.toLowerCase() === lowerStatus
      );
    }
    
    if (statusConfig) {
      return {
        color: statusConfig.color,
        labelEn: statusConfig.name,
        labelHe: statusConfig.nameHe,
        icon: <TrendingUp className="h-4 w-4" />,
      };
    }
    
    return {
      color: '#6b7280',
      labelEn: status,
      labelHe: status,
      icon: <Clock className="h-4 w-4" />,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-[#9F5F80]" />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-[#9F5F80]" />
        <h3 className="font-semibold text-[#383e4e] dark:text-white">
          {isRTL ? 'ציר זמן' : 'Timeline'}
        </h3>
      </div>

      {/* Timeline */}
      <ScrollArea className="h-[300px]">
        <div className="relative">
          {/* Vertical line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-[#b6bac5]/30"
            style={{ [isRTL ? 'right' : 'left']: '11px' }}
          />

          {/* Events */}
          <div className="space-y-6">
            {timeline.map((event, index) => {
              const fromInfo = event.from_status ? getStatusInfo(event.from_status) : null;
              const toInfo = getStatusInfo(event.to_status);
              const isLatest = index === 0;
              const isFirst = index === timeline.length - 1;

              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative flex gap-4"
                  style={{ [isRTL ? 'paddingRight' : 'paddingLeft']: '32px' }}
                >
                  {/* Status dot */}
                  <div
                    className={`absolute ${isRTL ? 'right-0' : 'left-0'} w-6 h-6 rounded-full flex items-center justify-center ${
                      isLatest
                        ? 'ring-4 ring-[#9F5F80]/20 animate-pulse'
                        : 'ring-2 ring-white dark:ring-[#383e4e]'
                    }`}
                    style={{ backgroundColor: toInfo.color }}
                  >
                    <div className="text-white">{toInfo.icon}</div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 bg-white dark:bg-[#383e4e] rounded-lg p-4 border border-[#b6bac5]/20">
                    {/* Status change */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {fromInfo && (
                        <>
                          <span
                            className="px-2 py-1 rounded text-xs font-medium text-white"
                            style={{ backgroundColor: fromInfo.color }}
                          >
                            {isRTL ? fromInfo.labelHe : fromInfo.labelEn}
                          </span>
                          <ArrowRight
                            className={`h-4 w-4 text-[#6c757d] ${isRTL ? 'rotate-180' : ''}`}
                          />
                        </>
                      )}
                      <span
                        className="px-2 py-1 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: toInfo.color }}
                      >
                        {isRTL ? toInfo.labelHe : toInfo.labelEn}
                      </span>
                      {isLatest && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-[#9F5F80]/20 text-[#9F5F80]">
                          {isRTL ? 'נוכחי' : 'Current'}
                        </span>
                      )}
                      {isFirst && !isLatest && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                          {isRTL ? 'התחלה' : 'Start'}
                        </span>
                      )}
                    </div>

                    {/* Date */}
                    <div className="flex items-center gap-2 text-xs text-[#6c757d] dark:text-[#b6bac5]">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(event.changed_at)}</span>
                    </div>

                    {/* Notes */}
                    {event.notes && (
                      <p className="mt-2 text-sm text-[#383e4e] dark:text-white">
                        {event.notes}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {/* Applied event marker (initial) — only if first stage isn't already "Applied" */}
            {timeline.length > 0 && 
              timeline[timeline.length - 1].to_status.toLowerCase() !== 'applied' && (
              <motion.div
                initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: timeline.length * 0.1 }}
                className="relative flex gap-4"
                style={{ [isRTL ? 'paddingRight' : 'paddingLeft']: '32px' }}
              >
                {/* Status dot */}
                <div
                  className={`absolute ${isRTL ? 'right-0' : 'left-0'} w-6 h-6 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-[#383e4e]`}
                  style={{ backgroundColor: getStatusColor('applied') }}
                >
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>

                {/* Content */}
                <div className="flex-1 bg-white dark:bg-[#383e4e] rounded-lg p-4 border border-[#b6bac5]/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 rounded text-xs font-medium text-white" style={{ backgroundColor: getStatusColor('applied') }}>
                      {isRTL ? 'נשלחה' : 'Applied'}
                    </span>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                      {isRTL ? 'התחלה' : 'Start'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#6c757d] dark:text-[#b6bac5]">
                    <Clock className="h-3 w-3" />
                    <span>{formatDate(appliedAt)}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Summary */}
      <div className="bg-[#b6bac5]/10 dark:bg-[#383e4e]/50 rounded-lg p-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-[#6c757d] dark:text-[#b6bac5]">
            {isRTL ? 'סטטוס נוכחי:' : 'Current status:'}
          </span>
          <span
            className="px-2 py-1 rounded font-medium text-white"
            style={{ backgroundColor: getStatusInfo(currentStatus).color }}
          >
            {isRTL
              ? getStatusInfo(currentStatus).labelHe
              : getStatusInfo(currentStatus).labelEn}
          </span>
        </div>
      </div>
    </div>
  );
}

export default ApplicationTimeline;