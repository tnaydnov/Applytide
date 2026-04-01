/**
 * CreateReminderModal Component - Professional Design
 * Clean reminder creation with professional UI
 * Reminders are always attached to an existing application
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  Building2,
  Briefcase,
  Users,
  Bell,
  Target,
  Network,
  Search,
  Sparkles,
  Video,
  Mail,
  Zap,
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';
import { Calendar } from '../../../components/ui/calendar';
import { Input } from '../../../components/ui/input';
import { Checkbox } from '../../../components/ui/checkbox';
import { remindersApi, type ReminderType, type CreateReminderPayload } from '../../../features/reminders/api';
import { type Application } from '../../../features/applications/api';
import { apiFetch } from '../../../lib/api/core';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'sonner';
import { logger } from '../../../lib/logger';
import { cn } from '../../../components/ui/utils';
import { he } from 'date-fns/locale';
import { TimeInput } from './TimeInput';

interface CreateReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isRTL?: boolean;
  preselectedApplication?: Application;
}

type ReminderFrequency = 'daily' | 'specific' | 'relative';
type RelativeUnit = 'hours' | 'days' | 'weeks';

export function CreateReminderModal({
  isOpen,
  onClose,
  onSuccess,
  isRTL = false,
  preselectedApplication,
}: CreateReminderModalProps) {
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>();
  
  // Form data
  const [formData, setFormData] = useState({
    title: '',
    application_id: '',
    date: '',
    time: '09:00',
    type: 'interview' as ReminderType,
  });

  // Advanced features
  const [addToGoogleCalendar, setAddToGoogleCalendar] = useState(false);
  const [createMeetLink, setCreateMeetLink] = useState(false);
  const [enableAIPreparation, setEnableAIPreparation] = useState(false);
  const [enableEmailReminders, setEnableEmailReminders] = useState(false);
  
  // Email reminders configuration
  const [reminderFrequency, setReminderFrequency] = useState<ReminderFrequency>('daily');
  const [dailyReminderDays, setDailyReminderDays] = useState('3');
  const [dailyReminderTime, setDailyReminderTime] = useState('09:00');
  const [specificReminderDate, setSpecificReminderDate] = useState<Date>();
  const [specificReminderTime, setSpecificReminderTime] = useState('09:00');
  const [relativeAmount, setRelativeAmount] = useState('1');
  const [relativeUnit, setRelativeUnit] = useState<RelativeUnit>('days');

  // User subscription check
  const isPremium = user?.subscription_tier === 'pro' || user?.subscription_tier === 'enterprise';
  const isGoogleConnected = user?.googleConnected === true;

  // Load applications when modal opens
  useEffect(() => {
    if (isOpen) {
      loadApplications();
      // Auto-set application when preselected
      if (preselectedApplication) {
        setFormData((prev) => ({ ...prev, application_id: preselectedApplication.id.toString() }));
      }
    }
  }, [isOpen, preselectedApplication]);

  const loadApplications = async () => {
    try {
      setLoadingApps(true);
      // Use /cards endpoint which includes job info (title, company_name)
      const response = await apiFetch('/applications/cards');
      const items = await response.json();
      const flattened = (Array.isArray(items) ? items : []).map((item: any) => ({
        ...item,
        job_title: item.job?.title ?? item.job_title ?? '',
        company_name: item.job?.company_name ?? item.company_name ?? '',
        archived: item.is_archived ?? item.archived ?? false,
      }));
      setApplications(flattened);
    } catch (error) {
      logger.error('Failed to load applications:', error);
      toast.error(
        isRTL ? 'שגיאה בטעינת מועמדויות' : 'Failed to load applications'
      );
    } finally {
      setLoadingApps(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.application_id) {
      toast.error(
        isRTL ? 'נא לבחור מועמדות' : 'Please select an application'
      );
      return;
    }

    if (!formData.title || !formData.date || !formData.time) {
      toast.error(
        isRTL ? 'נא למלא את כל השדות הנדרשים' : 'Please fill in all required fields'
      );
      return;
    }

    // Validate AI preparation for non-premium users
    if (enableAIPreparation && !isPremium) {
      toast.error(
        isRTL ? 'תכונת הכנה עם AI זמינה רק למשתמשי Pro ו-Enterprise' : 'AI Preparation is only available for Pro and Enterprise users'
      );
      return;
    }

    setCreating(true);
    try {
      // Combine date + time into ISO datetime for backend's due_date field
      const due_date = `${formData.date}T${formData.time || '09:00'}:00`;

      const reminderData: CreateReminderPayload = {
        title: formData.title,
        application_id: formData.application_id || undefined,
        due_date,
        event_type: formData.type,
        create_google_event: addToGoogleCalendar && isGoogleConnected,
        add_meet_link: createMeetLink && addToGoogleCalendar && isGoogleConnected,
        ai_prep_tips_enabled: enableAIPreparation && isPremium,
      };

      // Add email reminders configuration
      if (enableEmailReminders) {
        reminderData.email_notifications_enabled = true;
        reminderData.notification_schedule = {
          frequency: reminderFrequency,
          ...(reminderFrequency === 'daily' && {
            days_before: parseInt(dailyReminderDays),
            time: dailyReminderTime,
          }),
          ...(reminderFrequency === 'specific' && {
            reminder_date: specificReminderDate ? format(specificReminderDate, 'yyyy-MM-dd') : null,
            reminder_time: specificReminderTime,
          }),
          ...(reminderFrequency === 'relative' && {
            amount: parseInt(relativeAmount),
            unit: relativeUnit,
          }),
        };
      }

      await remindersApi.createReminder(reminderData);
      
      toast.success(
        isRTL ? 'תזכורת נוצרה בהצלחה!' : 'Reminder created successfully!'
      );
      
      if (enableAIPreparation && isPremium) {
        toast.info(
          isRTL ? 'טיפים להכנה יישלחו לאימייל שלך בקרוב' : 'Preparation tips will be sent to your email shortly'
        );
      }
      
      onSuccess();
      
      // Reset form
      setFormData({
        title: '',
        application_id: '',
        date: '',
        time: '09:00',
        type: 'interview',
      });
      setSelectedDate(undefined);
      setAddToGoogleCalendar(false);
      setCreateMeetLink(false);
      setEnableAIPreparation(false);
      setEnableEmailReminders(false);
    } catch (error) {
      toast.error(
        isRTL ? 'שגיאה ביצירת תזכורת' : 'Failed to create reminder'
      );
    } finally {
      setCreating(false);
    }
  };

  const reminderTypes = [
    {
      value: 'interview',
      label: isRTL ? 'ראן' : 'Interview',
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-500/10',
      borderColor: 'border-blue-200 dark:border-blue-500/30',
    },
    {
      value: 'follow_up',
      label: isRTL ? 'מעקב' : 'Follow-up',
      icon: Bell,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-500/10',
      borderColor: 'border-purple-200 dark:border-purple-500/30',
    },
    {
      value: 'deadline',
      label: isRTL ? 'דדליין' : 'Deadline',
      icon: Target,
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50 dark:bg-red-500/10',
      borderColor: 'border-red-200 dark:border-red-500/30',
    },
    {
      value: 'networking',
      label: isRTL ? 'נטוורקינג' : 'Networking',
      icon: Network,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50 dark:bg-green-500/10',
      borderColor: 'border-green-200 dark:border-green-500/30',
    },
    {
      value: 'research',
      label: isRTL ? 'מחקר' : 'Research',
      icon: Search,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-500/10',
      borderColor: 'border-amber-200 dark:border-amber-500/30',
    },
    {
      value: 'other',
      label: isRTL ? 'אחר' : 'Other',
      icon: Sparkles,
      color: 'from-gray-500 to-gray-600',
      bgColor: 'bg-gray-50 dark:bg-gray-500/10',
      borderColor: 'border-gray-200 dark:border-gray-500/30',
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[110]"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-[110] p-2 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-[#383e4e] rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-md sm:max-w-4xl max-h-[95vh] overflow-hidden border border-gray-200 dark:border-[#b6bac5]/20"
              onClick={(e) => e.stopPropagation()}
            >
              <form onSubmit={handleSubmit} noValidate>
                {/* Premium Header with Gradient */}
                <div
                  className="relative overflow-hidden bg-gradient-to-br from-[#9F5F80] via-[#8a5472] to-[#7a4a63] p-6 sm:p-8 text-white"
                  dir={isRTL ? 'rtl' : 'ltr'}
                >
                  {/* Background Pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full blur-3xl" />
                    <div className="absolute bottom-0 right-0 w-60 h-60 bg-white rounded-full blur-3xl" />
                  </div>

                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <CalendarIcon className="h-6 w-6 sm:h-7 sm:w-7" />
                      </div>
                      <div>
                        <h2 className="text-2xl sm:text-3xl font-bold mb-1">
                          {isRTL ? 'תזכורת חדשה' : 'New Reminder'}
                        </h2>
                        <p className="text-white/80 text-xs sm:text-sm">
                          {isRTL ? 'הוסף תזכורת למועמדות קיימת' : 'Add a reminder to an existing application'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all flex-shrink-0"
                    >
                      <X className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-8 space-y-4 sm:space-y-6 max-h-[calc(90vh-280px)] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
                  {/* Application Selector */}
                  {preselectedApplication ? (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-[#9F5F80]/10 to-[#9F5F80]/5 border border-[#9F5F80]/20">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#9F5F80]/20 flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-5 w-5 text-[#9F5F80]" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm">{preselectedApplication.job_title}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">{preselectedApplication.company_name}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs px-2 py-1 rounded-md bg-white dark:bg-[#383e4e] border border-[#9F5F80]/20">
                              {preselectedApplication.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                  <div className="space-y-2">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-[#9F5F80]" />
                      {isRTL ? 'בחר מועמדות' : 'Select Application'}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.application_id}
                      onValueChange={(value) => setFormData({ ...formData, application_id: value })}
                      disabled={loadingApps}
                    >
                      <SelectTrigger className="h-12 text-base border-2 focus:border-[#9F5F80] transition-colors">
                        <SelectValue placeholder={loadingApps ? (isRTL ? 'טוען...' : 'Loading...') : (isRTL ? 'בחר מועמדות' : 'Select an application')} />
                      </SelectTrigger>
                      <SelectContent>
                        {applications.length === 0 ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            {isRTL ? 'אין מועמדויות זמינות' : 'No applications available'}
                          </div>
                        ) : (
                          applications.map((app) => (
                            <SelectItem key={app.id} value={app.id.toString()}>
                              {app.job_title}{app.company_name ? ` - ${app.company_name}` : ''}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  )}

                  {/* Title */}
                  <div className="space-y-2">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <Bell className="h-4 w-4 text-[#9F5F80]" />
                      {isRTL ? 'כותרת התזכורת' : 'Reminder Title'}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder={isRTL ? 'לדוגמה: ראיון טכני ראשון' : 'e.g. First Technical Interview'}
                      required
                      className="h-12 text-base border-2 focus:border-[#9F5F80] transition-colors"
                    />
                  </div>

                  {/* Type Selector - Visual Cards */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[#9F5F80]" />
                      {isRTL ? 'סוג תזכורת' : 'Reminder Type'}
                      <span className="text-red-500">*</span>
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                      {reminderTypes.map((type) => {
                        const Icon = type.icon;
                        const isSelected = formData.type === type.value;
                        return (
                          <motion.button
                            key={type.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, type: type.value as ReminderType })}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`
                              relative p-3 sm:p-4 rounded-xl border-2 transition-all
                              ${isSelected
                                ? `${type.bgColor} ${type.borderColor} shadow-md`
                                : 'bg-white dark:bg-[#383e4e]/50 border-gray-200 dark:border-[#b6bac5]/20 hover:border-[#9F5F80]/30'
                              }
                            `}
                          >
                            <div className="flex flex-col items-center gap-1.5 sm:gap-2 text-center">
                              <div
                                className={`
                                  w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center
                                  ${isSelected ? `bg-gradient-to-br ${type.color} text-white` : 'bg-gray-100 dark:bg-[#383e4e] text-gray-600 dark:text-[#b6bac5]'}
                                `}
                              >
                                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                              </div>
                              <span className={`text-xs sm:text-sm font-medium ${isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-[#b6bac5]'}`}>
                                {type.label}
                              </span>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Date & Time Row */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Date Picker */}
                    <div className="space-y-2">
                      <Label className="text-base font-semibold flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-[#9F5F80]" />
                        {isRTL ? 'תאריך' : 'Date'}
                        <span className="text-red-500">*</span>
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              'w-full h-12 justify-start text-left border-2 focus:border-[#9F5F80] transition-colors',
                              !selectedDate && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDate ? (
                              format(selectedDate, 'PPP', { locale: isRTL ? he : undefined })
                            ) : (
                              <span>{isRTL ? 'בחר תאריך' : 'Pick a date'}</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-[120]" align="start">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => {
                              setSelectedDate(date);
                              if (date) {
                                setFormData({ ...formData, date: format(date, 'yyyy-MM-dd') });
                              }
                            }}
                            locale={isRTL ? he : undefined}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Time Input */}
                    <div className="space-y-2">
                      <Label className="text-base font-semibold flex items-center gap-2">
                        <Clock className="h-4 w-4 text-[#9F5F80]" />
                        {isRTL ? 'שעה' : 'Time'}
                        <span className="text-red-500">*</span>
                      </Label>
                      <TimeInput
                        value={formData.time}
                        onChange={(time) => setFormData({ ...formData, time })}
                        isRTL={isRTL}
                      />
                    </div>
                  </div>

                  {/* Advanced Options - Professional Checkboxes */}
                  <div className="space-y-3 pt-4 border-t">
                    <Label className="text-base font-semibold">{isRTL ? 'אפשרויות מתקדמות' : 'Advanced Options'}</Label>
                    
                    <div className="space-y-2">
                      {/* Google Calendar Integration */}
                      <div className="border-2 border-gray-200 dark:border-[#b6bac5]/30 rounded-xl p-4 bg-white dark:bg-[#383e4e]/30">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <CalendarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[#383e4e] dark:text-white">{isRTL ? 'Google Calendar' : 'Google Calendar'}</span>
                              {!isGoogleConnected ? (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 font-medium">
                                  {isRTL ? 'לא מחובר' : 'Not Connected'}
                                </span>
                              ) : (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 font-medium">
                                  {isRTL ? 'מחובר' : 'Connected'}
                                </span>
                              )}
                            </div>
                          </div>
                          <Checkbox
                            id="google-calendar"
                            checked={addToGoogleCalendar}
                            onCheckedChange={(checked) => setAddToGoogleCalendar(checked as boolean)}
                            disabled={!isGoogleConnected}
                            className="border-2 border-gray-400 dark:border-gray-500 data-[state=checked]:bg-[#9F5F80] data-[state=checked]:border-[#9F5F80] w-5 h-5"
                          />
                        </div>

                        {addToGoogleCalendar && isGoogleConnected && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="border-t px-4 pb-4"
                          >
                            <div className="flex items-center gap-3 pt-4">
                              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                <Video className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="flex-1">
                                <span className="font-medium text-sm">{isRTL ? 'צור קישור Google Meet' : 'Create Google Meet Link'}</span>
                              </div>
                              <Checkbox
                                id="meet-link"
                                checked={createMeetLink}
                                onCheckedChange={(checked) => setCreateMeetLink(checked as boolean)}
                              />
                            </div>
                          </motion.div>
                        )}
                      </div>

                      {/* AI Preparation */}
                      <div className="border-2 border-gray-200 dark:border-[#b6bac5]/30 rounded-xl p-4 bg-white dark:bg-[#383e4e]/30">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                            <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[#383e4e] dark:text-white">{isRTL ? 'טיפים להכנה עם AI' : 'AI Preparation Tips'}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 font-medium">
                                PRO
                              </span>
                            </div>
                          </div>
                          <Checkbox
                            id="ai-prep"
                            checked={enableAIPreparation}
                            onCheckedChange={(checked) => setEnableAIPreparation(checked as boolean)}
                            disabled={!isPremium}
                            className="border-2 border-gray-400 dark:border-gray-500 data-[state=checked]:bg-[#9F5F80] data-[state=checked]:border-[#9F5F80] w-5 h-5"
                          />
                        </div>
                      </div>

                      {/* Email Reminders */}
                      <div className="border-2 border-gray-200 dark:border-[#b6bac5]/30 rounded-xl bg-white dark:bg-[#383e4e]/30">
                        <div className="flex items-center gap-3 p-4">
                          <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-500/10 flex items-center justify-center flex-shrink-0">
                            <Mail className="h-5 w-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                            <span className="font-medium text-[#383e4e] dark:text-white">{isRTL ? 'תזכורות במייל' : 'Email Reminders'}</span>
                          </div>
                          <Checkbox
                            id="email-reminders"
                            checked={enableEmailReminders}
                            onCheckedChange={(checked) => setEnableEmailReminders(checked as boolean)}
                            className="border-2 border-gray-400 dark:border-gray-500 data-[state=checked]:bg-[#9F5F80] data-[state=checked]:border-[#9F5F80] w-5 h-5"
                          />
                        </div>

                        {enableEmailReminders && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="border-t p-4 space-y-3"
                            dir={isRTL ? 'rtl' : 'ltr'}
                          >
                            <Label className={`text-sm font-medium ${isRTL ? 'block w-full' : ''}`} style={isRTL ? { textAlign: 'right' } : {}}>{isRTL ? 'סוג תזכורת' : 'Reminder Type'}</Label>

                            {/* Daily Reminder */}
                            <div className="space-y-3">
                              <label className={`flex items-start gap-2 cursor-pointer ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <input
                                  type="radio"
                                  name="reminder-frequency"
                                  value="daily"
                                  checked={reminderFrequency === 'daily'}
                                  onChange={(e) => setReminderFrequency(e.target.value as ReminderFrequency)}
                                  className="w-4 h-4 text-[#9F5F80] focus:ring-[#9F5F80] mt-0.5"
                                />
                                <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                                  <span className="text-sm font-medium block">{isRTL ? 'תזכורת יומית' : 'Daily Reminder'}</span>
                                  <span className="text-xs text-[#6c757d] dark:text-[#b6bac5]">
                                    {isRTL 
                                      ? 'תזכורת שתישלח פעם ביום בשעה קבועה, במשך מספר ימים לפני המועד' 
                                      : 'Sent once daily at a set time, for several days before the event'}
                                  </span>
                                </div>
                              </label>
                              {reminderFrequency === 'daily' && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  className={`grid grid-cols-2 gap-1.5 sm:gap-2 ${isRTL ? 'mr-3 sm:mr-6' : 'ml-3 sm:ml-6'}`}
                                >
                                  <div className={isRTL ? 'text-right' : ''}>
                                    <Label 
                                      className="text-xs" 
                                      style={isRTL ? { display: 'flex', justifyContent: 'flex-end', width: '100%' } : {}}
                                    >
                                      {isRTL ? 'ימים לפני' : 'Days Before'}
                                    </Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      max="30"
                                      value={dailyReminderDays}
                                      onChange={(e) => setDailyReminderDays(e.target.value)}
                                      className="h-9 mt-1"
                                    />
                                  </div>
                                  <div className={isRTL ? 'text-right' : ''}>
                                    <Label 
                                      className="text-xs" 
                                      style={isRTL ? { display: 'flex', justifyContent: 'flex-end', width: '100%' } : {}}
                                    >
                                      {isRTL ? 'שעה' : 'Time'}
                                      <span className={`text-[10px] text-[#6c757d] dark:text-[#b6bac5] ${isRTL ? 'mr-1' : 'ml-1'}`}>
                                        (HH:MM)
                                      </span>
                                    </Label>
                                    <TimeInput
                                      value={dailyReminderTime}
                                      onChange={setDailyReminderTime}
                                      isRTL={isRTL}
                                      compact
                                      className="mt-1"
                                    />
                                  </div>
                                </motion.div>
                              )}
                            </div>

                            {/* Specific Date/Time */}
                            <div className="space-y-3">
                              <label className={`flex items-start gap-2 cursor-pointer ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <input
                                  type="radio"
                                  name="reminder-frequency"
                                  value="specific"
                                  checked={reminderFrequency === 'specific'}
                                  onChange={(e) => setReminderFrequency(e.target.value as ReminderFrequency)}
                                  className="w-4 h-4 text-[#9F5F80] focus:ring-[#9F5F80] mt-0.5"
                                />
                                <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                                  <span className="text-sm font-medium block">{isRTL ? 'תאריך ושעה ספציפיים' : 'Specific Date & Time'}</span>
                                  <span className="text-xs text-[#6c757d] dark:text-[#b6bac5]">
                                    {isRTL 
                                      ? 'תזכורת חד-פעמית בתאריך ושעה מדויקים שתבחר' 
                                      : 'One-time reminder at an exact date and time'}
                                  </span>
                                </div>
                              </label>
                              {reminderFrequency === 'specific' && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  className="grid grid-cols-2 gap-1.5 sm:gap-2 ml-3 sm:ml-6"
                                >
                                  <div>
                                    <Label className="text-xs">{isRTL ? 'תאריך' : 'Date'}</Label>
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          className={cn(
                                            'w-full h-9 justify-start text-left mt-1 text-xs',
                                            !specificReminderDate && 'text-muted-foreground'
                                          )}
                                        >
                                          {specificReminderDate ? format(specificReminderDate, 'PP', { locale: isRTL ? he : undefined }) : <span>{isRTL ? 'בחר' : 'Pick'}</span>}
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-0 z-[120]" align="start">
                                        <Calendar
                                          mode="single"
                                          selected={specificReminderDate}
                                          onSelect={setSpecificReminderDate}
                                          locale={isRTL ? he : undefined}
                                        />
                                      </PopoverContent>
                                    </Popover>
                                  </div>
                                  <div>
                                    <Label className="text-xs">{isRTL ? 'שעה' : 'Time'}</Label>
                                    <TimeInput
                                      value={specificReminderTime}
                                      onChange={setSpecificReminderTime}
                                      isRTL={isRTL}
                                      compact
                                      className="mt-1"
                                    />
                                  </div>
                                </motion.div>
                              )}
                            </div>

                            {/* Relative Reminder */}
                            <div className="space-y-3">
                              <label className={`flex items-start gap-2 cursor-pointer ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <input
                                  type="radio"
                                  name="reminder-frequency"
                                  value="relative"
                                  checked={reminderFrequency === 'relative'}
                                  onChange={(e) => setReminderFrequency(e.target.value as ReminderFrequency)}
                                  className="w-4 h-4 text-[#9F5F80] focus:ring-[#9F5F80] mt-0.5"
                                />
                                <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                                  <span className="text-sm font-medium block">{isRTL ? 'תזכורת יחסית' : 'Relative Reminder'}</span>
                                  <span className="text-xs text-[#6c757d] dark:text-[#b6bac5]">
                                    {isRTL 
                                      ? 'תזכורת שתישלח X שעות/ימים/שבועות לפני המועד' 
                                      : 'Sent X hours/days/weeks before the event'}
                                  </span>
                                </div>
                              </label>
                              {reminderFrequency === 'relative' && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  className="grid grid-cols-2 gap-1.5 sm:gap-2 ml-3 sm:ml-6"
                                >
                                  <div>
                                    <Label className="text-xs">{isRTL ? 'כמות' : 'Amount'}</Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={relativeAmount}
                                      onChange={(e) => setRelativeAmount(e.target.value)}
                                      className="h-9 mt-1"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">{isRTL ? 'יחידה' : 'Unit'}</Label>
                                    <Select value={relativeUnit} onValueChange={(val: RelativeUnit) => setRelativeUnit(val)}>
                                      <SelectTrigger className="h-9 mt-1">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="hours">{isRTL ? 'שעות' : 'Hours'}</SelectItem>
                                        <SelectItem value="days">{isRTL ? 'ימים' : 'Days'}</SelectItem>
                                        <SelectItem value="weeks">{isRTL ? 'שבועות' : 'Weeks'}</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </motion.div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-gradient-to-t from-gray-50 to-white dark:from-[#383e4e]/80 dark:to-[#383e4e] border-t border-gray-200 dark:border-[#b6bac5]/20" dir={isRTL ? 'rtl' : 'ltr'}>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      disabled={creating}
                      className="flex-1 h-12 text-base border-2"
                    >
                      {isRTL ? 'ביטול' : 'Cancel'}
                    </Button>
                    <Button
                      type="submit"
                      disabled={creating || !formData.application_id}
                      className="flex-1 h-12 text-base font-semibold bg-gradient-to-r from-[#9F5F80] to-[#7a4a63] hover:from-[#8a5472] hover:to-[#6b3f56] text-white shadow-lg hover:shadow-xl transition-all"
                    >
                      {creating ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          >
                            <Sparkles className="h-5 w-5 mr-2" />
                          </motion.div>
                          {isRTL ? 'יוצר...' : 'Creating...'}
                        </>
                      ) : (
                        <>
                          <Plus className="h-5 w-5 mr-2" />
                          {isRTL ? 'צור תזכורת' : 'Create Reminder'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

export default CreateReminderModal;