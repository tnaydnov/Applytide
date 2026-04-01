/**
 * NotificationsSection Component
 * Email and push notification preferences
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Mail, Smartphone, Save } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Switch } from '../../../components/ui/switch';
import { Label } from '../../../components/ui/label';
import { profileApi, type NotificationSettings } from '../../../features/profile/api';
import { toast } from 'sonner';
import { logger } from '../../../lib/logger';

interface NotificationsSectionProps {
  profile?: unknown;
  onUpdate?: unknown;
  isRTL?: boolean;
}

export function NotificationsSection({ isRTL = false }: NotificationsSectionProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    email_applications: true,
    email_interviews: true,
    email_reminders: true,
    email_weekly_summary: true,
    email_marketing: false,
    push_applications: true,
    push_interviews: true,
    push_reminders: true,
  });

  const loadSettings = useCallback(async () => {
    try {
      const data = await profileApi.getNotificationSettings();
      setSettings(data);
    } catch (error) {
      logger.error('Failed to load notification settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await profileApi.updateNotificationSettings(settings);
      toast.success(
        isRTL ? 'הגדרות נשמרו בהצלחה!' : 'Settings saved successfully!'
      );
    } catch (error) {
      toast.error(
        isRTL ? 'שגיאה בשמירת הגדרות' : 'Failed to save settings'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key: keyof NotificationSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-[#6c757d] dark:text-[#b6bac5]">
          {isRTL ? 'טוען הגדרות...' : 'Loading settings...'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Email Notifications */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-[#383e4e]/50 border border-[#b6bac5]/20 rounded-xl p-6"
      >
        <h3 className="text-lg font-bold text-[#383e4e] dark:text-white mb-4 flex items-center gap-2">
          <Mail className="h-5 w-5 text-[#9F5F80]" />
          {isRTL ? 'התראות אימייל' : 'Email Notifications'}
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>{isRTL ? 'בקשות תעסוקה' : 'Job Applications'}</Label>
              <p className="text-sm text-[#6c757d] dark:text-[#b6bac5]">
                {isRTL
                  ? 'קבל התראות כשסטטוס הבקשה משתנה'
                  : 'Get notified when application status changes'}
              </p>
            </div>
            <Switch
              checked={settings.email_applications}
              onCheckedChange={() => handleToggle('email_applications')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>{isRTL ? 'ראיונות' : 'Interviews'}</Label>
              <p className="text-sm text-[#6c757d] dark:text-[#b6bac5]">
                {isRTL
                  ? 'קבל תזכורות לפני ראיונות'
                  : 'Get reminders before interviews'}
              </p>
            </div>
            <Switch
              checked={settings.email_interviews}
              onCheckedChange={() => handleToggle('email_interviews')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>{isRTL ? 'תזכורות' : 'Reminders'}</Label>
              <p className="text-sm text-[#6c757d] dark:text-[#b6bac5]">
                {isRTL
                  ? 'קבל תזכורות על משימות ומועדים'
                  : 'Get reminders for tasks and deadlines'}
              </p>
            </div>
            <Switch
              checked={settings.email_reminders}
              onCheckedChange={() => handleToggle('email_reminders')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>{isRTL ? 'סיכום שבועי' : 'Weekly Summary'}</Label>
              <p className="text-sm text-[#6c757d] dark:text-[#b6bac5]">
                {isRTL
                  ? 'קבל סיכום שבועי של הפעילות שלך'
                  : 'Receive a weekly summary of your activity'}
              </p>
            </div>
            <Switch
              checked={settings.email_weekly_summary}
              onCheckedChange={() => handleToggle('email_weekly_summary')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>{isRTL ? 'שיווק ועדכונים' : 'Marketing & Updates'}</Label>
              <p className="text-sm text-[#6c757d] dark:text-[#b6bac5]">
                {isRTL
                  ? 'קבל חדשות, טיפים ומבצעים'
                  : 'Receive news, tips, and promotions'}
              </p>
            </div>
            <Switch
              checked={settings.email_marketing}
              onCheckedChange={() => handleToggle('email_marketing')}
            />
          </div>
        </div>
      </motion.div>

      {/* Push Notifications */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-[#383e4e]/50 border border-[#b6bac5]/20 rounded-xl p-6"
      >
        <h3 className="text-lg font-bold text-[#383e4e] dark:text-white mb-4 flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-[#9F5F80]" />
          {isRTL ? 'התראות דחיפה' : 'Push Notifications'}
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>{isRTL ? 'בקשות תעסוקה' : 'Job Applications'}</Label>
              <p className="text-sm text-[#6c757d] dark:text-[#b6bac5]">
                {isRTL
                  ? 'התראות מיידיות על שינויים'
                  : 'Instant notifications for changes'}
              </p>
            </div>
            <Switch
              checked={settings.push_applications}
              onCheckedChange={() => handleToggle('push_applications')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>{isRTL ? 'ראיונות' : 'Interviews'}</Label>
              <p className="text-sm text-[#6c757d] dark:text-[#b6bac5]">
                {isRTL
                  ? 'תזכורות לראיונות קרובים'
                  : 'Reminders for upcoming interviews'}
              </p>
            </div>
            <Switch
              checked={settings.push_interviews}
              onCheckedChange={() => handleToggle('push_interviews')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>{isRTL ? 'תזכורות' : 'Reminders'}</Label>
              <p className="text-sm text-[#6c757d] dark:text-[#b6bac5]">
                {isRTL
                  ? 'התראות על משימות ומועדים'
                  : 'Notifications for tasks and deadlines'}
              </p>
            </div>
            <Switch
              checked={settings.push_reminders}
              onCheckedChange={() => handleToggle('push_reminders')}
            />
          </div>
        </div>
      </motion.div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: 'linear-gradient(135deg, #9F5F80 0%, #383e4e 100%)',
          }}
        >
          <Save className="h-4 w-4 mr-2" />
          {saving
            ? (isRTL ? 'שומר...' : 'Saving...')
            : (isRTL ? 'שמור הגדרות' : 'Save Settings')}
        </Button>
      </div>
    </div>
  );
}

export default NotificationsSection;
