/**
 * ReminderDetailsModal Component
 * Comprehensive reminder details view with all settings and application info
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Trash2,
  Calendar,
  Clock,
  Building2,
  Briefcase,
  MapPin,
  FileText,
  Video,
  Mail,
  Zap,
  Users,
  Bell,
  Target,
  Network,
  Search,
  Sparkles,
  ExternalLink,
  CalendarCheck,
  Timer,
  CalendarClock,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { ScrollArea } from '../../../components/ui/scroll-area';
import type { Reminder } from '../../../features/reminders/api';
import { apiFetch } from '../../../lib/api/core';
import { ConfirmDeleteDialog } from '../../../components/shared/ConfirmDeleteDialog';
import { logger } from '../../../lib/logger';

interface ReminderDetailsModalProps {
  reminder: Reminder | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  onDelete: (id: number | string) => void;
  isRTL?: boolean;
}

const typeConfig: Record<string, {
  icon: React.ElementType;
  label: string;
  labelHe: string;
  bgColor: string;
}> = {
  interview: { icon: Users, label: 'Interview', labelHe: 'ראיון', bgColor: 'bg-blue-100 dark:bg-blue-500/20' },
  follow_up: { icon: Bell, label: 'Follow-up', labelHe: 'מעקב', bgColor: 'bg-purple-100 dark:bg-purple-500/20' },
  deadline: { icon: Target, label: 'Deadline', labelHe: 'דדליין', bgColor: 'bg-red-100 dark:bg-red-500/20' },
  networking: { icon: Network, label: 'Networking', labelHe: 'נטוורקינג', bgColor: 'bg-green-100 dark:bg-green-500/20' },
  research: { icon: Search, label: 'Research', labelHe: 'מחקר', bgColor: 'bg-amber-100 dark:bg-amber-500/20' },
  general: { icon: Sparkles, label: 'General', labelHe: 'כללי', bgColor: 'bg-gray-100 dark:bg-gray-500/20' },
  other: { icon: Sparkles, label: 'Other', labelHe: 'אחר', bgColor: 'bg-gray-100 dark:bg-gray-500/20' },
};

interface ApplicationInfo {
  job_title?: string;
  company_name?: string;
  location?: string;
  status?: string;
}

export function ReminderDetailsModal({
  reminder,
  isOpen,
  onClose,
  onUpdate: _onUpdate,
  onDelete,
  isRTL = false,
}: ReminderDetailsModalProps) {
  const [applicationInfo, setApplicationInfo] = useState<ApplicationInfo | null>(null);
  const [loadingApp, setLoadingApp] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen && reminder?.application_id) {
      loadApplicationInfo(reminder.application_id);
    } else {
      setApplicationInfo(null);
    }
  }, [isOpen, reminder?.application_id]);

  const loadApplicationInfo = async (appId: number | string) => {
    try {
      setLoadingApp(true);
      const response = await apiFetch(`/applications/${appId}/detail`);
      if (response.ok) {
        const data = await response.json();
        setApplicationInfo({
          job_title: data.job?.title || data.job_title || '',
          company_name: data.job?.company_name || data.company_name || '',
          location: data.job?.location || data.location || '',
          status: data.status || '',
        });
      }
    } catch (error) {
      logger.error('Failed to load application info:', error);
    } finally {
      setLoadingApp(false);
    }
  };

  if (!reminder) return null;

  // Use type (from normalizeReminder), fall back to raw event_type, then 'other'
  const resolvedTypeKey = reminder.type || reminder.event_type || 'other';
  const type = typeConfig[resolvedTypeKey] || typeConfig.other;
  const TypeIcon = type.icon;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(isRTL ? 'he-IL' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes);
    return date.toLocaleTimeString(isRTL ? 'he-IL' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const now = new Date();
  const reminderDate = new Date(reminder.date);
  const isPast = reminderDate < now && reminderDate.toDateString() !== now.toDateString();
  const isToday = reminderDate.toDateString() === now.toDateString();
  const isTomorrow = new Date(now.getTime() + 86400000).toDateString() === reminderDate.toDateString();

  const getTimeUntil = () => {
    if (isPast) return null;
    const diff = reminderDate.getTime() - now.getTime();
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    if (days > 0) return isRTL ? `בעוד ${days} ימים` : `in ${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return isRTL ? `בעוד ${hours} שעות` : `in ${hours} hour${hours > 1 ? 's' : ''}`;
    return isRTL ? 'בקרוב' : 'soon';
  };

  const meetLink = reminder.meet_link || reminder.meet_url;
  const timeUntil = getTimeUntil();

  const formatNotificationSchedule = () => {
    const schedule = reminder.notification_schedule;
    if (!schedule) return null;
    if (schedule.frequency === 'daily') {
      const days = schedule.days_before || 3;
      const time = schedule.time || '09:00';
      return isRTL
        ? `יומי, ${days} ימים לפני, בשעה ${formatTime(time)}`
        : `Daily, ${days} days before at ${formatTime(time)}`;
    }
    if (schedule.frequency === 'specific') {
      const date = schedule.reminder_date;
      const time = schedule.reminder_time || '09:00';
      return isRTL
        ? `תאריך ספציפי: ${date} בשעה ${formatTime(time)}`
        : `Specific: ${date} at ${formatTime(time)}`;
    }
    if (schedule.frequency === 'relative') {
      const amount = schedule.amount || 1;
      const unit = schedule.unit || 'days';
      const unitLabel = isRTL
        ? ({ hours: 'שעות', days: 'ימים', weeks: 'שבועות' } as Record<string, string>)[unit] || unit
        : unit;
      return isRTL ? `${amount} ${unitLabel} לפני` : `${amount} ${unitLabel} before`;
    }
    return null;
  };

  const statusLabel = (status: string) => {
    const labels: Record<string, { en: string; he: string }> = {
      wishlist: { en: 'Wishlist', he: 'רשימת משאלות' },
      applied: { en: 'Applied', he: 'הוגשה' },
      interview: { en: 'Interview', he: 'ראיון' },
      offer: { en: 'Offer', he: 'הצעה' },
      rejected: { en: 'Rejected', he: 'נדחתה' },
      accepted: { en: 'Accepted', he: 'התקבלה' },
    };
    return labels[status] ? (isRTL ? labels[status].he : labels[status].en) : status;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-[#383e4e] rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden border border-gray-200 dark:border-[#b6bac5]/20"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with gradient */}
              <div
                className="relative overflow-hidden bg-gradient-to-r from-[#9F5F80] to-[#383e4e] p-5 sm:p-6 text-white"
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full blur-3xl" />
                  <div className="absolute bottom-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl" />
                </div>

                <div className="relative flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                      <TypeIcon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg sm:text-xl font-bold truncate">{reminder.title}</h2>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/20 font-medium">
                          {isRTL ? type.labelHe : type.label}
                        </span>
                        {isPast && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/40 font-medium flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {isRTL ? 'עבר' : 'Past due'}
                          </span>
                        )}
                        {isToday && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-400/40 font-medium">
                            {isRTL ? 'היום' : 'Today'}
                          </span>
                        )}
                        {isTomorrow && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-400/30 font-medium">
                            {isRTL ? 'מחר' : 'Tomorrow'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button onClick={onClose} className="text-white/80 hover:text-white flex-shrink-0 p-1">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <ScrollArea className="max-h-[55vh]">
                <div className="p-5 sm:p-6 space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>

                  {/* Date & Time Card */}
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#2d3340] border border-gray-100 dark:border-[#b6bac5]/10">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#9F5F80]/10 flex items-center justify-center">
                          <Calendar className="h-4 w-4 text-[#9F5F80]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#383e4e] dark:text-white">
                            {formatDate(reminder.date)}
                          </p>
                          {timeUntil && (
                            <p className="text-xs text-[#9F5F80] font-medium mt-0.5">{timeUntil}</p>
                          )}
                        </div>
                      </div>
                      {reminder.time && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-[#383e4e] border border-gray-200 dark:border-[#b6bac5]/20">
                          <Clock className="h-3.5 w-3.5 text-[#9F5F80]" />
                          <span className="text-sm font-semibold text-[#383e4e] dark:text-white">
                            {formatTime(reminder.time)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {reminder.description && (
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#2d3340] border border-gray-100 dark:border-[#b6bac5]/10">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-[#9F5F80]" />
                        <h3 className="text-sm font-semibold text-[#383e4e] dark:text-white">
                          {isRTL ? 'תיאור' : 'Description'}
                        </h3>
                      </div>
                      <p className="text-sm text-[#6c757d] dark:text-[#b6bac5] whitespace-pre-wrap leading-relaxed">
                        {reminder.description}
                      </p>
                    </div>
                  )}

                  {/* Application Info */}
                  {(applicationInfo || reminder.company_name || reminder.job_title || reminder.application_id) && (
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#2d3340] border border-gray-100 dark:border-[#b6bac5]/10">
                      <div className="flex items-center gap-2 mb-3">
                        <Briefcase className="h-4 w-4 text-[#9F5F80]" />
                        <h3 className="text-sm font-semibold text-[#383e4e] dark:text-white">
                          {isRTL ? 'מועמדות מקושרת' : 'Linked Application'}
                        </h3>
                      </div>
                      {loadingApp ? (
                        <div className="flex items-center gap-2 text-xs text-[#6c757d]">
                          <div className="w-3 h-3 border-2 border-[#9F5F80] border-t-transparent rounded-full animate-spin" />
                          {isRTL ? 'טוען...' : 'Loading...'}
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {(applicationInfo?.company_name || reminder.company_name) && (
                            <div className="flex items-center gap-2.5">
                              <Building2 className="h-4 w-4 text-[#6c757d] flex-shrink-0" />
                              <span className="text-sm font-medium text-[#383e4e] dark:text-white">
                                {applicationInfo?.company_name || reminder.company_name}
                              </span>
                            </div>
                          )}
                          {(applicationInfo?.job_title || reminder.job_title) && (
                            <div className="flex items-center gap-2.5">
                              <Briefcase className="h-4 w-4 text-[#6c757d] flex-shrink-0" />
                              <span className="text-sm text-[#6c757d] dark:text-[#b6bac5]">
                                {applicationInfo?.job_title || reminder.job_title}
                              </span>
                            </div>
                          )}
                          {(applicationInfo?.location || reminder.location) && (
                            <div className="flex items-center gap-2.5">
                              <MapPin className="h-4 w-4 text-[#6c757d] flex-shrink-0" />
                              <span className="text-sm text-[#6c757d] dark:text-[#b6bac5]">
                                {applicationInfo?.location || reminder.location}
                              </span>
                            </div>
                          )}
                          {applicationInfo?.status && (
                            <div className="flex items-center gap-2.5">
                              <ChevronRight className="h-4 w-4 text-[#6c757d] flex-shrink-0" />
                              <span className="text-xs px-2 py-0.5 rounded-full bg-[#9F5F80]/10 text-[#9F5F80] font-medium">
                                {statusLabel(applicationInfo.status)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Google Meet Link */}
                  {meetLink && (
                    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                            <Video className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                              Google Meet
                            </span>
                            <p className="text-xs text-blue-500 dark:text-blue-400">
                              {isRTL ? 'קישור לפגישה מוכן' : 'Meeting link ready'}
                            </p>
                          </div>
                        </div>
                        <a
                          href={meetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          {isRTL ? 'הצטרף' : 'Join'}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Settings & Features Section */}
                  {(reminder.google_event_id || reminder.email_notifications_enabled || reminder.ai_prep_tips_enabled) && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-[#6c757d] dark:text-[#b6bac5] uppercase tracking-wider px-1">
                        {isRTL ? 'הגדרות ושילובים' : 'Settings & Integrations'}
                      </h3>

                      <div className="space-y-2">
                        {/* Google Calendar Sync */}
                        {reminder.google_event_id && (
                          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-[#2d3340] border border-gray-100 dark:border-[#b6bac5]/10">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                              <CalendarCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1">
                              <span className="text-sm font-medium text-[#383e4e] dark:text-white">
                                Google Calendar
                              </span>
                              <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                {isRTL ? 'מסונכרן' : 'Synced'}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Email Notifications */}
                        {reminder.email_notifications_enabled && (
                          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#2d3340] border border-gray-100 dark:border-[#b6bac5]/10">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-500/10 flex items-center justify-center flex-shrink-0">
                                <Mail className="h-4 w-4 text-green-600 dark:text-green-400" />
                              </div>
                              <div className="flex-1">
                                <span className="text-sm font-medium text-[#383e4e] dark:text-white">
                                  {isRTL ? 'תזכורות במייל' : 'Email Reminders'}
                                </span>
                                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  {isRTL ? 'מופעל' : 'Enabled'}
                                </p>
                              </div>
                            </div>
                            {/* Notification Schedule Details */}
                            {reminder.notification_schedule && (
                              <div className="mt-2.5 ml-11 p-2.5 rounded-lg bg-white dark:bg-[#383e4e] border border-gray-200 dark:border-[#b6bac5]/10">
                                <div className="flex items-center gap-2">
                                  <Timer className="h-3.5 w-3.5 text-[#6c757d]" />
                                  <span className="text-xs text-[#6c757d] dark:text-[#b6bac5]">
                                    {formatNotificationSchedule()}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* AI Preparation Tips */}
                        {reminder.ai_prep_tips_enabled && (
                          <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#2d3340] border border-gray-100 dark:border-[#b6bac5]/10">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                                <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                              </div>
                              <div className="flex-1">
                                <span className="text-sm font-medium text-[#383e4e] dark:text-white">
                                  {isRTL ? 'טיפים להכנה עם AI' : 'AI Preparation Tips'}
                                </span>
                                <p className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  {reminder.ai_prep_tips_generated
                                    ? (isRTL ? 'נוצרו' : 'Generated')
                                    : (isRTL ? 'בהמתנה' : 'Pending')
                                  }
                                </p>
                              </div>
                            </div>
                            {/* Show generated AI tips */}
                            {reminder.ai_prep_tips_generated && (
                              <div className="mt-2.5 ml-11 p-3 rounded-lg bg-purple-50 dark:bg-purple-500/5 border border-purple-100 dark:border-purple-500/20">
                                <p className="text-xs text-[#383e4e] dark:text-[#b6bac5] whitespace-pre-wrap leading-relaxed">
                                  {reminder.ai_prep_tips_generated}
                                </p>
                                {reminder.ai_prep_tips_generated_at && (
                                  <p className="text-[10px] text-purple-400 mt-2">
                                    {isRTL ? 'נוצר ' : 'Generated '}
                                    {new Date(reminder.ai_prep_tips_generated_at).toLocaleDateString(
                                      isRTL ? 'he-IL' : 'en-US',
                                      { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
                                    )}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {reminder.notes && (
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-[#2d3340] border border-gray-100 dark:border-[#b6bac5]/10">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-[#9F5F80]" />
                        <h3 className="text-sm font-semibold text-[#383e4e] dark:text-white">
                          {isRTL ? 'הערות' : 'Notes'}
                        </h3>
                      </div>
                      <p className="text-sm text-[#6c757d] dark:text-[#b6bac5] whitespace-pre-wrap leading-relaxed">
                        {reminder.notes}
                      </p>
                    </div>
                  )}

                  {/* Meta info */}
                  <div className="flex items-center justify-between text-xs text-[#6c757d] dark:text-[#b6bac5] pt-2 border-t border-gray-100 dark:border-[#b6bac5]/10">
                    <div className="flex items-center gap-1.5">
                      <CalendarClock className="h-3 w-3" />
                      {reminder.created_at && (
                        <span>
                          {isRTL ? 'נוצר ' : 'Created '}
                          {new Date(reminder.created_at).toLocaleDateString(isRTL ? 'he-IL' : 'en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                    {reminder.updated_at && reminder.updated_at !== reminder.created_at && (
                      <span>
                        {isRTL ? 'עודכן ' : 'Updated '}
                        {new Date(reminder.updated_at).toLocaleDateString(isRTL ? 'he-IL' : 'en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </ScrollArea>

              {/* Footer */}
              <div className="p-4 bg-gray-50 dark:bg-[#383e4e]/50 border-t border-gray-200 dark:border-[#b6bac5]/20 flex gap-3" dir={isRTL ? 'rtl' : 'ltr'}>
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  {isRTL ? 'סגור' : 'Close'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {isRTL ? 'מחק' : 'Delete'}
                </Button>
              </div>
            </motion.div>
          </div>

          <ConfirmDeleteDialog
            open={showDeleteConfirm}
            onOpenChange={setShowDeleteConfirm}
            onConfirm={() => {
              if (reminder.id != null) onDelete(reminder.id);
              setShowDeleteConfirm(false);
            }}
            title={isRTL ? 'מחיקת תזכורת' : 'Delete Reminder'}
            description={
              isRTL
                ? 'האם אתה בטוח שברצונך למחוק תזכורת זו? פעולה זו אינה ניתנת לביטול.'
                : 'Are you sure you want to delete this reminder? This action cannot be undone.'
            }
            isRTL={isRTL}
          />
        </>
      )}
    </AnimatePresence>
  );
}

export default ReminderDetailsModal;
