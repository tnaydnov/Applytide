/**
 * SecuritySection Component
 * Security settings, password, 2FA, sessions
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Lock, Monitor } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Badge } from '../../../components/ui/badge';
import { profileApi, type UserProfile } from '../../../features/profile/api';
import { toast } from 'sonner';
import { logger } from '../../../lib/logger';
import { ConfirmDeleteDialog } from '../../../components/shared/ConfirmDeleteDialog';

interface SecuritySectionProps {
  profile: UserProfile;
  isRTL?: boolean;
}

export function SecuritySection({ profile: _profile, isRTL = false }: SecuritySectionProps) {
  const [changingPassword, setChangingPassword] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [sessions, setSessions] = useState<Array<{
    id: string; device: string; ip: string; location: string; last_active: string; current: boolean;
  }>>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const data = await profileApi.getSessions();
      setSessions(data);
    } catch (error) {
      logger.error('Failed to load sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error(isRTL ? 'הסיסמאות אינן תואמות' : 'Passwords do not match');
      return;
    }

    setChangingPassword(true);
    try {
      await profileApi.changePassword(passwordData);
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
      toast.success(isRTL ? 'הסיסמה שונתה בהצלחה!' : 'Password changed successfully!');
    } catch (error) {
      toast.error(isRTL ? 'שגיאה בשינוי סיסמה' : 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleRevokeAllSessions = async () => {
    try {
      await profileApi.revokeAllSessions();
      await loadSessions();
      toast.success(isRTL ? 'כל ההתחברויות נותקו' : 'All sessions revoked');
    } catch (error) {
      toast.error(isRTL ? 'שגיאה' : 'Failed');
    }
  };

  return (
    <div className="space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Password Change */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-[#383e4e]/50 border border-[#b6bac5]/20 rounded-xl p-6"
      >
        <h3 className={`text-lg font-bold text-[#383e4e] dark:text-white mb-4 flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
          <Lock className="h-5 w-5 text-[#9F5F80]" />
          {isRTL ? 'שנה סיסמה' : 'Change Password'}
        </h3>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <Label className={isRTL ? 'text-right block' : ''}>{isRTL ? 'סיסמה נוכחית' : 'Current Password'}</Label>
            <Input
              type="password"
              value={passwordData.current_password}
              onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
              required
              className={isRTL ? 'text-right' : ''}
            />
          </div>
          <div>
            <Label className={isRTL ? 'text-right block' : ''}>{isRTL ? 'סיסמה חדשה' : 'New Password'}</Label>
            <Input
              type="password"
              value={passwordData.new_password}
              onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
              required
              minLength={8}
              className={isRTL ? 'text-right' : ''}
            />
          </div>
          <div>
            <Label className={isRTL ? 'text-right block' : ''}>{isRTL ? 'אמת סיסמה חדשה' : 'Confirm New Password'}</Label>
            <Input
              type="password"
              value={passwordData.confirm_password}
              onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
              required
              className={isRTL ? 'text-right' : ''}
            />
          </div>
          <Button type="submit" disabled={changingPassword}>
            {changingPassword ? (isRTL ? 'משנה...' : 'Changing...') : (isRTL ? 'שנה סיסמה' : 'Change Password')}
          </Button>
        </form>
      </motion.div>



      {/* Active Sessions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-[#383e4e]/50 border border-[#b6bac5]/20 rounded-xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-bold text-[#383e4e] dark:text-white flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Monitor className="h-5 w-5 text-[#9F5F80]" />
            {isRTL ? 'התחברויות פעילות' : 'Active Sessions'}
          </h3>
          {sessions.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowRevokeConfirm(true)}>
              {isRTL ? 'ניתוק כל ההתחברויות' : 'Revoke All Sessions'}
            </Button>
          )}
        </div>

        {loadingSessions ? (
          <p className={`text-center text-[#6c757d] dark:text-[#b6bac5] py-4 ${isRTL ? 'text-right' : ''}`}>
            {isRTL ? 'טוען...' : 'Loading...'}
          </p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`flex items-center justify-between p-4 bg-gray-50 dark:bg-[#383e4e]/30 rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                  <div className={`flex items-center gap-2 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <p className="font-semibold text-[#383e4e] dark:text-white">
                      {session.device}
                    </p>
                    {session.current && (
                      <Badge variant="outline" className="text-xs">
                        {isRTL ? 'נוכחי' : 'Current'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-[#6c757d] dark:text-[#b6bac5]">
                    {session.location} • {session.ip}
                  </p>
                  <p className="text-xs text-[#6c757d] dark:text-[#b6bac5]">
                    {isRTL ? 'פעיל לאחרונה:' : 'Last active:'} {new Date(session.last_active).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Revoke All Sessions Confirmation */}
      <ConfirmDeleteDialog
        open={showRevokeConfirm}
        onOpenChange={setShowRevokeConfirm}
        onConfirm={() => {
          handleRevokeAllSessions();
          setShowRevokeConfirm(false);
        }}
        title={isRTL ? 'ניתוק כל ההתחברויות' : 'Revoke All Sessions'}
        description={
          isRTL
            ? 'האם אתה בטוח שברצונך לנתק את כל ההתחברויות, כולל זו? תצטרך להתחבר שוב.'
            : 'Are you sure you want to revoke all sessions, including this one? You will need to log in again.'
        }
        confirmLabel={isRTL ? 'נתק הכל' : 'Revoke All'}
        isRTL={isRTL}
      />
    </div>
  );
}

export default SecuritySection;