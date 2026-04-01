/**
 * Reminders Page
 * Calendar and event management with Google Calendar integration
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar, List, Download, Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { remindersApi, type Reminder } from '../../features/reminders/api';
import { PageContainer } from '../../components/layout/PageContainer';
import { Button } from '../../components/ui/button';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { ViewTabs } from './components/ViewTabs';
import { StatsDashboard } from './components/StatsDashboard';
import { CalendarView } from './components/CalendarView';
import { EventsList } from './components/EventsList';
import { ReminderDetailsModal } from './components/ReminderDetailsModal';
import { CreateReminderModal } from './components/CreateReminderModal';
import { ImportGoogleEventModal } from './components/ImportGoogleEventModal';
import { GoogleCalendarButton } from './components/GoogleCalendarButton';
import { RemindersHelp } from '../../components/help/RemindersHelp';
import { RemindersAnnotations } from './components/RemindersAnnotations';
import { toast } from 'sonner';
import { logger } from '../../lib/logger';

export type ViewMode = 'calendar' | 'list';
export type CalendarViewType = 'month' | 'week' | 'day';

export function RemindersPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';

  // State
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [calendarView, setCalendarView] = useState<CalendarViewType>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedGoogleEvent, setSelectedGoogleEvent] = useState<Reminder | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [showPageTour, setShowPageTour] = useState(false);

  // Load reminders
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    loadReminders(() => cancelled);
    return () => { cancelled = true; };
  }, [user, currentDate]);

  const loadReminders = async (isCancelled?: () => boolean) => {
    try {
      setLoading(true);
      const data = await remindersApi.getReminders();
      if (isCancelled?.()) return;
      setReminders(Array.isArray(data) ? data : []);
    } catch (error) {
      if (isCancelled?.()) return;
      logger.error('Failed to load reminders:', error);
      toast.error(
        isRTL ? 'שגיאה בטעינת תזכורות' : 'Failed to load reminders'
      );
    } finally {
      if (!isCancelled?.()) setLoading(false);
    }
  };

  const handleCreateReminder = async () => {
    setShowCreateModal(false);
    await loadReminders();
    toast.success(
      isRTL ? 'תזכורת נוצרה בהצלחה!' : 'Reminder created successfully!'
    );
  };

  const handleUpdateReminder = async () => {
    setShowDetailsModal(false);
    setSelectedReminder(null);
    await loadReminders();
    toast.success(
      isRTL ? 'תזכורת עודכנה בהצלחה!' : 'Reminder updated successfully!'
    );
  };

  const handleDeleteReminder = async (id: number | string) => {
    try {
      await remindersApi.deleteReminder(id);
      await loadReminders();
      setShowDetailsModal(false);
      setSelectedReminder(null);
      toast.success(
        isRTL ? 'תזכורת נמחקה בהצלחה' : 'Reminder deleted successfully'
      );
    } catch (error) {
      toast.error(
        isRTL ? 'שגיאה במחיקת תזכורת' : 'Failed to delete reminder'
      );
    }
  };

  const handleExportICS = async () => {
    try {
      const blob = await remindersApi.exportICS();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reminders-${new Date().toISOString().split('T')[0]}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(
        isRTL ? 'קובץ ICS יוצא בהצלחה' : 'ICS file exported successfully'
      );
    } catch (error) {
      toast.error(
        isRTL ? 'שגיאה בייצוא קובץ' : 'Failed to export file'
      );
    }
  };

  const handleGoogleCalendarSync = async () => {
    try {
      setSyncing(true);
      await remindersApi.syncGoogleCalendar();
      await loadReminders();
      toast.success(
        isRTL ? 'סונכרן עם Google Calendar בהצלחה' : 'Synced with Google Calendar successfully'
      );
    } catch (error) {
      toast.error(
        isRTL ? 'שגיאה בסנכרון' : 'Failed to sync'
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleReminderClick = (reminder: Reminder) => {
    setSelectedReminder(reminder);
    setShowDetailsModal(true);
  };

  const handleImportGoogleEvent = (event: Reminder) => {
    setSelectedGoogleEvent(event);
    setShowImportModal(true);
  };

  const handleImportSuccess = async () => {
    setShowImportModal(false);
    setSelectedGoogleEvent(null);
    await loadReminders();
  };

  // Filter reminders by date for calendar view
  const getRemindersForDate = (date: Date) => {
    return reminders.filter((reminder) => {
      const reminderDate = new Date(reminder.date);
      return (
        reminderDate.getDate() === date.getDate() &&
        reminderDate.getMonth() === date.getMonth() &&
        reminderDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Calculate stats
  const today = new Date();
  const todayReminders = getRemindersForDate(today);
  const upcomingReminders = reminders.filter((r) => {
    const reminderDate = new Date(r.date);
    return reminderDate > today;
  });
  const overdueReminders = reminders.filter((r) => {
    const reminderDate = new Date(r.date);
    return reminderDate < today;
  });

  return (
    <>
      {/* Reminders Help Guide */}
      <RemindersHelp 
        isRTL={isRTL} 
        onShowVisualGuide={() => setShowPageTour(true)}
      />

      {/* Page Tour - Interactive Hover Guide */}
      <RemindersAnnotations
        isActive={showPageTour}
        onClose={() => setShowPageTour(false)}
        isRTL={isRTL}
        viewMode={viewMode}
      />

      {/* Modals */}
      <ReminderDetailsModal
        reminder={selectedReminder}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedReminder(null);
        }}
        onUpdate={handleUpdateReminder}
        onDelete={handleDeleteReminder}
        isRTL={isRTL}
      />

      <CreateReminderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateReminder}
        isRTL={isRTL}
      />

      <ImportGoogleEventModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={handleImportSuccess}
        event={selectedGoogleEvent as any}
        isRTL={isRTL}
      />

      <PageContainer>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 sm:mb-8" dir={isRTL ? 'rtl' : 'ltr'} data-tour="page-header">
          <motion.div
            initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#383e4e] dark:text-white flex items-center gap-2 sm:gap-3">
                <Calendar className="h-7 w-7 sm:h-9 sm:w-9 md:h-10 md:w-10 text-[#9F5F80]" />
                {isRTL ? 'תזכורות' : 'Reminders'}
              </h1>
            </div>
            <p className="text-[#6c757d] dark:text-[#b6bac5] mt-1 sm:mt-2 text-xs sm:text-sm md:text-base">
              {isRTL
                ? 'נהלו ראיונות, מעקבים ותזכורות'
                : 'Manage interviews, follow-ups, and other reminders'}
            </p>
          </motion.div>

          <div className="flex flex-wrap gap-2 sm:gap-3">
            {/* Google Calendar Sync */}
            <div data-tour="google-calendar-sync">
              <GoogleCalendarButton
                onSync={handleGoogleCalendarSync}
                syncing={syncing}
                isRTL={isRTL}
              />
            </div>

            {/* Export ICS */}
            <Button
              variant="outline"
              onClick={handleExportICS}
              className="text-xs sm:text-sm px-2 sm:px-4"
              data-tour="export-ics"
            >
              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              <span className="hidden sm:inline">{isRTL ? 'יצוא ICS' : 'Export ICS'}</span>
              <span className="sm:hidden">{isRTL ? 'יצוא' : 'Export'}</span>
            </Button>

            {/* Refresh */}
            <Button
              variant="outline"
              onClick={() => loadReminders()}
              className="px-2 sm:px-4"
              data-tour="refresh"
            >
              <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>

            {/* Create Reminder */}
            <Button
              onClick={() => setShowCreateModal(true)}
              style={{
                background: 'linear-gradient(135deg, #9F5F80 0%, #383e4e 100%)',
              }}
              className="text-xs sm:text-sm px-2 sm:px-4"
              data-tour="new-reminder"
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              <span className="hidden sm:inline">{isRTL ? 'תזכורת חדשה' : 'New Reminder'}</span>
              <span className="sm:hidden">{isRTL ? 'חדש' : 'New'}</span>
            </Button>
          </div>
        </div>

        {/* Stats Dashboard */}
        <StatsDashboard
          todayCount={todayReminders.length}
          upcomingCount={upcomingReminders.length}
          overdueCount={overdueReminders.length}
          isRTL={isRTL}
        />

        {/* View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6" dir={isRTL ? 'rtl' : 'ltr'}>
          {/* View Mode Tabs */}
          <div className="flex gap-2 bg-white dark:bg-[#383e4e]/50 border border-[#b6bac5]/20 rounded-lg p-1 w-full sm:w-auto" data-tour="view-mode-toggle">
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('calendar')}
              className={`flex-1 sm:flex-none ${viewMode === 'calendar' ? 'bg-[#9F5F80]' : ''}`}
            >
              <Calendar className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{isRTL ? 'לוח שנה' : 'Calendar'}</span>
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={`flex-1 sm:flex-none ${viewMode === 'list' ? 'bg-[#9F5F80]' : ''}`}
            >
              <List className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{isRTL ? 'רשימה' : 'List'}</span>
            </Button>
          </div>

          {/* Calendar View Tabs (only show in calendar mode) */}
          {viewMode === 'calendar' && (
            <div data-tour="calendar-view-tabs">
              <ViewTabs
                view={calendarView}
                onViewChange={setCalendarView}
                isRTL={isRTL}
              />
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <LoadingSpinner
            size="lg"
            text={isRTL ? 'טוען תזכורות...' : 'Loading reminders...'}
          />
        )}

        {/* Content */}
        {!loading && (
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {viewMode === 'calendar' ? (
              <div data-tour="calendar-grid">
                <CalendarView
                  view={calendarView}
                  currentDate={currentDate}
                  onDateChange={setCurrentDate}
                  reminders={reminders}
                  onReminderClick={handleReminderClick}
                  onImportGoogleEvent={handleImportGoogleEvent}
                  isRTL={isRTL}
                />
              </div>
            ) : (
              <div data-tour="reminder-cards">
                <EventsList
                  reminders={reminders}
                  onReminderClick={handleReminderClick}
                  isRTL={isRTL}
                />
              </div>
            )}
          </motion.div>
        )}
      </PageContainer>
    </>
  );
}

export default RemindersPage;