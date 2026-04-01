/**
 * ImportGoogleEventModal Component
 * Import Google Calendar events and convert them to reminders
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Briefcase,
  Download,
  Sparkles,
  Mail,
  Zap,
  Video,
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Checkbox } from '../../../components/ui/checkbox';
import { remindersApi, type ReminderType, type CreateReminderPayload, type NotificationSchedule } from '../../../features/reminders/api';
import { applicationsApi, type Application } from '../../../features/applications/api';
import { useAuth } from '../../../contexts/AuthContext';
import { toast } from 'sonner';
import { logger } from '../../../lib/logger';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';
import { Calendar } from '../../../components/ui/calendar';
import { Input } from '../../../components/ui/input';
import { TimeInput } from './TimeInput';
import { cn } from '../../../components/ui/utils';

interface GoogleEvent {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  location?: string;
  meetLink?: string;
  attendees?: string[];
}

interface ImportGoogleEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  event: GoogleEvent | null;
  isRTL?: boolean;
}

type ReminderFrequency = 'daily' | 'specific' | 'relative';
type RelativeUnit = 'hours' | 'days' | 'weeks';

export function ImportGoogleEventModal({
  isOpen,
  onClose,
  onSuccess,
  event,
  isRTL = false,
}: ImportGoogleEventModalProps) {
  const { user } = useAuth();
  const [importing, setImporting] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);

  // Form data
  const [application_id, setApplicationId] = useState('');
  const [reminderType, setReminderType] = useState<ReminderType>('interview');
  
  // Advanced features
  const [keepMeetLink, setKeepMeetLink] = useState(true);
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

  // Load applications when modal opens
  useEffect(() => {
    if (isOpen) {
      loadApplications();
    }
  }, [isOpen]);

  const loadApplications = async () => {
    try {
      setLoadingApps(true);
      const data = await applicationsApi.getAllApplications(false);
      setApplications(data);
    } catch (error) {
      logger.error('Failed to load applications:', error);
      toast.error(
        isRTL ? 'שגיאה בטעינת מועמדויות' : 'Failed to load applications'
      );
    } finally {
      setLoadingApps(false);
    }
  };

  const handleImport = async () => {
    if (!event || !application_id) {
      toast.error(
        isRTL ? 'נא לבחור מועמדות' : 'Please select an application'
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

    setImporting(true);
    try {
      const eventDate = new Date(event.start);

      const reminderData: CreateReminderPayload = {
        title: event.title,
        description: event.description,
        application_id: application_id,
        due_date: eventDate.toISOString(),
        event_type: reminderType,
        create_google_event: false, // Already exists in Google Calendar
        add_meet_link: keepMeetLink && !!event.meetLink,
        ai_prep_tips_enabled: enableAIPreparation && isPremium,
        email_notifications_enabled: enableEmailReminders,
      };

      // Add email notification schedule
      if (enableEmailReminders) {
        const schedule: NotificationSchedule = {
          frequency: reminderFrequency,
          ...(reminderFrequency === 'daily' && {
            days_before: parseInt(dailyReminderDays),
            time: dailyReminderTime,
          }),
          ...(reminderFrequency === 'specific' && {
            reminder_date: specificReminderDate ? format(specificReminderDate, 'yyyy-MM-dd') : undefined,
            reminder_time: specificReminderTime,
          }),
          ...(reminderFrequency === 'relative' && {
            amount: parseInt(relativeAmount),
            unit: relativeUnit,
          }),
        };
        reminderData.notification_schedule = schedule;
      }

      await remindersApi.createReminder(reminderData);

      toast.success(
        isRTL ? 'האירוע יובא בהצלחה!' : 'Event imported successfully!'
      );

      if (enableAIPreparation && isPremium) {
        toast.info(
          isRTL ? 'טיפים להכנה יישלחו לאימייל שלך בקרוב' : 'Preparation tips will be sent to your email shortly'
        );
      }

      onSuccess();

      // Reset form
      setApplicationId('');
      setReminderType('interview');
      setKeepMeetLink(true);
      setEnableAIPreparation(false);
      setEnableEmailReminders(false);
    } catch (error) {
      toast.error(
        isRTL ? 'שגיאה ביבוא אירוע' : 'Failed to import event'
      );
    } finally {
      setImporting(false);
    }
  };

  if (!event) return null;

  const eventDate = new Date(event.start);
  const eventEndDate = new Date(event.end);
  const selectedApp = applications.find((app) => app.id.toString() === application_id);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-2 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-[#383e4e] rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-md sm:max-w-3xl max-h-[95vh] overflow-hidden border border-gray-200 dark:border-[#b6bac5]/20"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="relative overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 p-8 text-white"
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full blur-3xl" />
                  <div className="absolute bottom-0 right-0 w-60 h-60 bg-white rounded-full blur-3xl" />
                </div>

                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Download className="h-7 w-7" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold mb-1">
                        {isRTL ? 'יבא אירוע מ-Google Calendar' : 'Import from Google Calendar'}
                      </h2>
                      <p className="text-white/80 text-sm">
                        {isRTL ? 'המר אירוע זה לתזכורת במערכת' : 'Convert this event to a reminder'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-8 space-y-6 max-h-[calc(90vh-280px)] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
                {/* Event Preview */}
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30">
                  <h3 className="text-xl font-bold text-blue-900 dark:text-blue-200 mb-3">{event.title}</h3>
                  {event.description && (
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">{event.description}</p>
                  )}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
                      <CalendarIcon className="h-4 w-4" />
                      <span>{format(eventDate, 'PPP')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
                      <Clock className="h-4 w-4" />
                      <span>{format(eventDate, 'p')} - {format(eventEndDate, 'p')}</span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
                        <MapPin className="h-4 w-4" />
                        <span>{event.location}</span>
                      </div>
                    )}
                    {event.meetLink && (
                      <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
                        <Video className="h-4 w-4" />
                        <span className="truncate">{event.meetLink}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Application Selector - REQUIRED */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-[#9F5F80]" />
                    {isRTL ? 'בחר מועמדות' : 'Select Application'}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={application_id}
                    onValueChange={setApplicationId}
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
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col">
                                <span className="font-medium">{app.job_title}</span>
                                <span className="text-xs text-muted-foreground">{app.company_name}</span>
                              </div>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>

                  {selectedApp && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 p-3 rounded-lg bg-gradient-to-br from-[#9F5F80]/10 to-[#9F5F80]/5 border border-[#9F5F80]/20"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <Briefcase className="h-4 w-4 text-[#9F5F80]" />
                        <span className="font-medium">{selectedApp.job_title}</span>
                        <span className="text-muted-foreground">at {selectedApp.company_name}</span>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Reminder Type */}
                <div className="space-y-2">
                  <Label className="text-base font-semibold">{isRTL ? 'סוג תזכורת' : 'Reminder Type'}</Label>
                  <Select value={reminderType} onValueChange={(val) => setReminderType(val as ReminderType)}>
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="interview">{isRTL ? 'ראיון' : 'Interview'}</SelectItem>
                      <SelectItem value="follow_up">{isRTL ? 'מעקב' : 'Follow-up'}</SelectItem>
                      <SelectItem value="deadline">{isRTL ? 'דדליין' : 'Deadline'}</SelectItem>
                      <SelectItem value="networking">{isRTL ? 'נטוורקינג' : 'Networking'}</SelectItem>
                      <SelectItem value="research">{isRTL ? 'מחקר' : 'Research'}</SelectItem>
                      <SelectItem value="other">{isRTL ? 'אחר' : 'Other'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Advanced Options */}
                <div className="space-y-3 pt-4 border-t">
                  <Label className="text-base font-semibold">{isRTL ? 'אפשרויות מתקדמות' : 'Advanced Options'}</Label>

                  <div className="space-y-2">
                    {/* Keep Meet Link */}
                    {event.meetLink && (
                      <div className="border-2 border-gray-200 dark:border-[#b6bac5]/30 rounded-xl p-4 bg-white dark:bg-[#383e4e]/30">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <Video className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1">
                            <span className="font-medium text-[#383e4e] dark:text-white">{isRTL ? 'שמור קישור Meet' : 'Keep Meet Link'}</span>
                          </div>
                          <Checkbox
                            id="keep-meet"
                            checked={keepMeetLink}
                            onCheckedChange={(checked) => setKeepMeetLink(checked as boolean)}
                            className="border-2 border-gray-400 dark:border-gray-500 data-[state=checked]:bg-[#9F5F80] data-[state=checked]:border-[#9F5F80] w-5 h-5"
                          />
                        </div>
                      </div>
                    )}

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
                                className={`grid grid-cols-2 gap-2 ${isRTL ? 'mr-6' : 'ml-6'}`}
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
                                    className="mt-1 h-9"
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
                                className="grid grid-cols-2 gap-2 ml-6"
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
                                        {specificReminderDate ? format(specificReminderDate, 'PP') : <span>{isRTL ? 'בחר' : 'Pick'}</span>}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <Calendar
                                        mode="single"
                                        selected={specificReminderDate}
                                        onSelect={setSpecificReminderDate}
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
                                    className="mt-1 h-9"
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
                                className="grid grid-cols-2 gap-2 ml-6"
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
                    disabled={importing}
                    className="flex-1 h-12 text-base border-2"
                  >
                    {isRTL ? 'ביטול' : 'Cancel'}
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={importing || !application_id}
                    className="flex-1 h-12 text-base font-semibold bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all"
                  >
                    {importing ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <Sparkles className="h-5 w-5 mr-2" />
                        </motion.div>
                        {isRTL ? 'מייבא...' : 'Importing...'}
                      </>
                    ) : (
                      <>
                        <Download className="h-5 w-5 mr-2" />
                        {isRTL ? 'יבא אירוע' : 'Import Event'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

export default ImportGoogleEventModal;