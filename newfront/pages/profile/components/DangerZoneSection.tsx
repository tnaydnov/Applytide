/**
 * DangerZoneSection Component
 * Account deletion and data export
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Download, Trash2, RotateCcw } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog';
import { profileApi, type UserProfile } from '../../../features/profile/api';
import { toast } from 'sonner';
import { resetOnboarding } from '../../../utils/onboarding';

interface DangerZoneSectionProps {
  profile?: UserProfile;
  isRTL?: boolean;
}

export function DangerZoneSection({ isRTL = false }: DangerZoneSectionProps) {
  const [exporting, setExporting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleResetOnboarding = () => {
    resetOnboarding();
    toast.success(
      isRTL
        ? 'החניכה אופסה בהצלחה. רענן את הדף כדי לראות את המסך פתיחה.'
        : 'Onboarding reset successfully. Refresh the page to see the welcome screen.'
    );
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const blob = await profileApi.exportData();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `applytide-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(
        isRTL ? 'הנתונים יוצאו בהצלחה!' : 'Data exported successfully!'
      );
    } catch (error) {
      toast.error(
        isRTL ? 'שגיאה בייצוא נתונים' : 'Failed to export data'
      );
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error(isRTL ? 'נא להזין סיסמה' : 'Please enter password');
      return;
    }

    setDeleting(true);
    try {
      await profileApi.requestAccountDeletion(deletePassword, deleteReason);
      toast.success(
        isRTL
          ? 'בקשה למחיקת חשבון נשלחה. תקבל אימייל תוך 24 שעות.'
          : 'Account deletion requested. You will receive an email within 24 hours.'
      );
      setShowDeleteDialog(false);
    } catch (error) {
      toast.error(
        isRTL ? 'שגיאה בבקשת מחיקה' : 'Failed to request deletion'
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Warning Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-6"
        >
          <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
            <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
              <h3 className="text-lg font-bold text-red-900 dark:text-red-200 mb-2">
                {isRTL ? 'אזור סכנה' : 'Danger Zone'}
              </h3>
              <p className="text-red-800 dark:text-red-300">
                {isRTL
                  ? 'הפעולות כאן בלתי הפיכות. נא לפעול בזהירות.'
                  : 'Actions here are irreversible. Please proceed with caution.'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Export Data */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-[#383e4e]/50 border border-[#b6bac5]/20 rounded-xl p-6"
        >
          <div className={`flex items-start gap-6 ${isRTL ? 'flex-row' : 'justify-between'}`}>
            <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
              <h3 className="text-lg font-bold text-[#383e4e] dark:text-white mb-2">
                {isRTL ? 'ייצא את הנתונים שלך' : 'Export Your Data'}
              </h3>
              <p className="text-[#6c757d] dark:text-[#b6bac5]">
                {isRTL
                  ? 'הורד עותק של כל הנתונים שלך בפורמט JSON'
                  : 'Download a copy of all your data in JSON format'}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleExportData}
              disabled={exporting}
              className={`flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <Download className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {exporting
                ? (isRTL ? 'מייצא...' : 'Exporting...')
                : (isRTL ? 'ייצא נתונים' : 'Export Data')}
            </Button>
          </div>
        </motion.div>

        {/* Reset Onboarding */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white dark:bg-[#383e4e]/50 border border-[#b6bac5]/20 rounded-xl p-6"
        >
          <div className={`flex items-start gap-6 ${isRTL ? 'flex-row' : 'justify-between'}`}>
            <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
              <h3 className="text-lg font-bold text-[#383e4e] dark:text-white mb-2">
                {isRTL ? 'איפוס מדריך ההתחלה' : 'Reset Onboarding'}
              </h3>
              <p className="text-[#6c757d] dark:text-[#b6bac5]">
                {isRTL
                  ? 'אפס את מדריך ההתחלה כדי לראות שוב את מסך הפתיחה והסיור'
                  : 'Reset the onboarding to see the welcome screen and tour again'}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleResetOnboarding}
              className={`flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <RotateCcw className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {isRTL ? 'איפוס' : 'Reset'}
            </Button>
          </div>
        </motion.div>

        {/* Delete Account */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-[#383e4e]/50 border border-red-200 dark:border-red-700 rounded-xl p-6"
        >
          <div className={`flex items-start gap-6 ${isRTL ? 'flex-row' : 'justify-between'}`}>
            <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
              <h3 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">
                {isRTL ? 'מחק חשבון' : 'Delete Account'}
              </h3>
              <p className="text-[#6c757d] dark:text-[#b6bac5] mb-2">
                {isRTL
                  ? 'מחיקת החשבון תמחק לצמיתות את כל הנתונים שלך'
                  : 'Deleting your account will permanently erase all your data'}
              </p>
              <ul className={`text-sm text-[#6c757d] dark:text-[#b6bac5] space-y-1 ${isRTL ? 'list-none' : 'list-disc list-inside'}`}>
                <li>{isRTL ? '• כל הבקשות והמסמכים יימחקו' : 'All applications and documents will be deleted'}</li>
                <li>{isRTL ? '• הגישה לחשבון תיחסם מיידית' : 'Account access will be blocked immediately'}</li>
                <li>{isRTL ? '• לא ניתן לשחזר את החשבון' : 'This action cannot be undone'}</li>
              </ul>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              className={`flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <Trash2 className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {isRTL ? 'מחק חשבון' : 'Delete Account'}
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <AlertDialogHeader>
            <AlertDialogTitle className={`text-red-600 ${isRTL ? 'text-right' : ''}`}>
              {isRTL ? 'האם אתה בטוח?' : 'Are you sure?'}
            </AlertDialogTitle>
            <AlertDialogDescription className={isRTL ? 'text-right' : ''}>
              {isRTL
                ? 'פעולה זו תמחק לצמיתות את החשבון שלך ואת כל הנתונים. לא ניתן לשחזר את החשבון.'
                : 'This action will permanently delete your account and all your data. This cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 my-4">
            <div>
              <Label className={isRTL ? 'text-right block' : ''}>{isRTL ? 'אמת סיסמה' : 'Confirm Password'}</Label>
              <Input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder={isRTL ? 'הזן את הסיסמה שלך' : 'Enter your password'}
                className={isRTL ? 'text-right' : ''}
              />
            </div>

            <div>
              <Label className={isRTL ? 'text-right block' : ''}>{isRTL ? 'סיבה (אופציונלי)' : 'Reason (Optional)'}</Label>
              <Textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder={isRTL
                  ? 'ספר לנו למה אתה עוזב...'
                  : 'Tell us why you are leaving...'}
                rows={3}
                className={isRTL ? 'text-right' : ''}
              />
            </div>
          </div>

          <AlertDialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
            <AlertDialogCancel disabled={deleting}>
              {isRTL ? 'ביטול' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting
                ? (isRTL ? 'מוחק...' : 'Deleting...')
                : (isRTL ? 'כן, מחק את החשבון' : 'Yes, Delete Account')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default DangerZoneSection;