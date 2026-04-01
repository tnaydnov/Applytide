/**
 * BulkActions Component
 * Provides bulk operations for jobs (archive, delete, etc.)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trash2,
  X,
  CheckSquare,
  Square,
  Loader2,
  Archive,
  ArchiveRestore,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
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
import type { Job } from '../../../features/jobs/api';
import { jobsApi } from '../../../features/jobs/api';
import { toast } from 'sonner';
import { logger } from '../../../lib/logger';

interface BulkActionsProps {
  jobs: Job[];
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  onComplete: () => void;
  isRTL?: boolean;
}

export function BulkActions({
  jobs,
  selectedIds,
  onSelectionChange,
  onComplete,
  isRTL = false,
}: BulkActionsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const selectedJobs = jobs.filter((job) => selectedIds.includes(job.id as number));
  const allSelected = jobs.length > 0 && selectedIds.length === jobs.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < jobs.length;
  
  // Check if all selected jobs are archived or not
  const allSelectedArchived = selectedJobs.every((job) => job.is_archived);

  const toggleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(jobs.map((job) => job.id as number));
    }
  };

  const handleBulkDelete = async () => {
    try {
      setDeleting(true);
      await Promise.all(selectedIds.map((id) => jobsApi.deleteJob(id)));
      toast.success(
        isRTL
          ? `${selectedIds.length} משרות נמחקו בהצלחה`
          : `${selectedIds.length} jobs deleted successfully`
      );
      onSelectionChange([]);
      onComplete();
    } catch (error) {
      logger.error('Failed to delete jobs:', error);
      toast.error(isRTL ? 'שגיאה במחיקת משרות' : 'Failed to delete jobs');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleBulkArchive = async () => {
    try {
      setArchiving(true);
      
      // Archive or unarchive based on current state
      if (allSelectedArchived) {
        // Unarchive all
        await Promise.all(selectedIds.map((id) => jobsApi.unarchiveJob(id)));
        toast.success(
          isRTL
            ? `${selectedIds.length} משרות שוחזרו מהארכיון`
            : `${selectedIds.length} jobs unarchived successfully`
        );
      } else {
        // Archive all (including mixed state - archive the non-archived ones)
        const jobsToArchive = selectedJobs.filter(job => !job.is_archived).map(job => job.id as number);
        if (jobsToArchive.length > 0) {
          await Promise.all(jobsToArchive.map((id) => jobsApi.archiveJob(id)));
        }
        toast.success(
          isRTL
            ? `${jobsToArchive.length} משרות הועברו לארכיון`
            : `${jobsToArchive.length} jobs archived successfully`
        );
      }
      
      onSelectionChange([]);
      onComplete();
    } catch (error) {
      logger.error('Failed to archive/unarchive jobs:', error);
      toast.error(
        isRTL 
          ? 'שגיאה בעדכון סטטוס ארכיון' 
          : 'Failed to update archive status'
      );
    } finally {
      setArchiving(false);
    }
  };

  if (selectedIds.length === 0 && !jobs.length) {
    return null;
  }

  return (
    <>
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-40 bg-white dark:bg-[#383e4e] border border-[#b6bac5]/20 rounded-xl shadow-2xl px-6 py-4"
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <div className="flex items-center gap-6">
              {/* Selection info */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onSelectionChange([])}
                  className="text-[#6c757d] hover:text-[#383e4e] dark:hover:text-white transition-colors"
                  title={isRTL ? 'ביטול בחירה' : 'Clear selection'}
                >
                  <X className="h-5 w-5" />
                </button>
                <span className="font-semibold text-[#383e4e] dark:text-white">
                  {selectedIds.length} {isRTL ? 'נבחרו' : 'selected'}
                </span>
              </div>

              {/* Divider */}
              <div className="h-6 w-px bg-[#b6bac5]/30" />

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkArchive}
                  disabled={archiving}
                  className={
                    allSelectedArchived
                      ? 'border-amber-300 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                      : 'border-blue-300 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  }
                >
                  {archiving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : allSelectedArchived ? (
                    <ArchiveRestore className="h-4 w-4 mr-2" />
                  ) : (
                    <Archive className="h-4 w-4 mr-2" />
                  )}
                  {allSelectedArchived 
                    ? (isRTL ? 'שחזר' : 'Unarchive')
                    : (isRTL ? 'ארכיון' : 'Archive')}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isRTL ? 'מחק' : 'Delete'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Select All Checkbox (shows when there are jobs) */}
      {jobs.length > 0 && (
        <div className="mb-4" dir={isRTL ? 'rtl' : 'ltr'}>
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-sm text-[#6c757d] dark:text-[#b6bac5] hover:text-[#383e4e] dark:hover:text-white transition-colors"
          >
            {allSelected ? (
              <CheckSquare className="h-5 w-5 text-[#9F5F80]" />
            ) : someSelected ? (
              <div className="h-5 w-5 border-2 border-[#9F5F80] rounded bg-[#9F5F80]/20 flex items-center justify-center">
                <div className="h-2 w-2 bg-[#9F5F80] rounded-sm" />
              </div>
            ) : (
              <Square className="h-5 w-5" />
            )}
            <span>
              {allSelected
                ? isRTL
                  ? 'בטל בחירת הכל'
                  : 'Deselect all'
                : isRTL
                ? 'בחר הכל'
                : 'Select all'}
            </span>
          </button>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isRTL ? 'מחיקת משרות' : 'Delete Jobs'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isRTL
                ? `האם אתה בטוח שברצונך למחוק ${selectedIds.length} משרות? פעולה זו אינה ניתנת לביטול.`
                : `Are you sure you want to delete ${selectedIds.length} jobs? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isRTL ? 'ביטול' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {isRTL ? 'מוחק...' : 'Deleting...'}
                </>
              ) : (
                <>{isRTL ? 'מחק' : 'Delete'}</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default BulkActions;