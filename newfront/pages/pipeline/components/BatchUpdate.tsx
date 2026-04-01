/**
 * BatchUpdate Component
 * Batch update multiple applications at once
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  CheckSquare,
  Square,
  Loader2,
  Archive,
  Trash2,
  FolderEdit,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
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
import type { Application, ApplicationStatus } from '../../../features/applications/api';
import { applicationsApi } from '../../../features/applications/api';
import type { PipelineStage } from '../PipelinePage';
import { toast } from 'sonner';
import { logger } from '../../../lib/logger';

interface BatchUpdateProps {
  applications: Application[];
  selectedIds: (number | string)[];
  onSelectionChange: (ids: (number | string)[]) => void;
  onComplete: () => void;
  stages: PipelineStage[];
  isRTL?: boolean;
}

export function BatchUpdate({
  applications,
  selectedIds,
  onSelectionChange,
  onComplete,
  stages,
  isRTL = false,
}: BatchUpdateProps) {
  const [showBatchActions, setShowBatchActions] = useState(false);
  const [batchStatus, setBatchStatus] = useState<string>('');
  const [updating, setUpdating] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  const allSelected = applications.length > 0 && selectedIds.length === applications.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < applications.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(applications.map((app) => app.id));
    }
  };

  const handleBatchStatusUpdate = async () => {
    if (!batchStatus) {
      toast.error(isRTL ? 'נא לבחור סטטוס' : 'Please select a status');
      return;
    }

    try {
      setUpdating(true);
      await Promise.all(
        selectedIds.map((id) =>
          applicationsApi.updateApplication(id, { status: batchStatus as ApplicationStatus })
        )
      );
      toast.success(
        isRTL
          ? `${selectedIds.length} בקשות עודכנו בהצלחה`
          : `${selectedIds.length} applications updated successfully`
      );
      onSelectionChange([]);
      onComplete();
      setBatchStatus('');
      setShowBatchActions(false);
    } catch (error) {
      logger.error('Failed to batch update:', error);
      toast.error(isRTL ? 'שגיאה בעדכון בקשות' : 'Failed to update applications');
    } finally {
      setUpdating(false);
    }
  };

  const handleBatchArchive = async () => {
    try {
      setArchiving(true);
      await Promise.all(
        selectedIds.map((id) =>
          applicationsApi.updateApplication(id, { archived: true })
        )
      );
      toast.success(
        isRTL
          ? `${selectedIds.length} בקשות הועברו לארכיון`
          : `${selectedIds.length} applications archived`
      );
      onSelectionChange([]);
      onComplete();
    } catch (error) {
      logger.error('Failed to archive:', error);
      toast.error(isRTL ? 'שגיאה בהעברה לארכיון' : 'Failed to archive');
    } finally {
      setArchiving(false);
      setShowArchiveConfirm(false);
    }
  };

  const handleBatchDelete = async () => {
    try {
      setDeleting(true);
      await Promise.all(selectedIds.map((id) => applicationsApi.deleteApplication(id)));
      toast.success(
        isRTL
          ? `${selectedIds.length} בקשות נמחקו בהצלחה`
          : `${selectedIds.length} applications deleted`
      );
      onSelectionChange([]);
      onComplete();
    } catch (error) {
      logger.error('Failed to delete:', error);
      toast.error(isRTL ? 'שגיאה במחיקת בקשות' : 'Failed to delete applications');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (applications.length === 0) {
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
                  onClick={() => setShowBatchActions(!showBatchActions)}
                  className="border-[#9F5F80]/30 hover:bg-[#9F5F80]/10"
                >
                  <FolderEdit className="h-4 w-4 mr-2" />
                  {isRTL ? 'עדכן סטטוס' : 'Update Status'}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowArchiveConfirm(true)}
                  disabled={archiving}
                  className="border-orange-300 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                >
                  {archiving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Archive className="h-4 w-4 mr-2" />
                  )}
                  {isRTL ? 'ארכיון' : 'Archive'}
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

            {/* Batch Status Update Panel */}
            <AnimatePresence>
              {showBatchActions && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 pt-4 border-t border-[#b6bac5]/20"
                >
                  <div className="flex items-center gap-3">
                    <Select value={batchStatus} onValueChange={setBatchStatus}>
                      <SelectTrigger className="w-48">
                        <SelectValue
                          placeholder={isRTL ? 'בחר סטטוס' : 'Select status'}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: stage.color }}
                              />
                              {stage.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      size="sm"
                      onClick={handleBatchStatusUpdate}
                      disabled={!batchStatus || updating}
                      style={{
                        background: 'linear-gradient(135deg, #9F5F80 0%, #383e4e 100%)',
                      }}
                    >
                      {updating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          {isRTL ? 'מעדכן...' : 'Updating...'}
                        </>
                      ) : (
                        <>{isRTL ? 'עדכן' : 'Update'}</>
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Select All Checkbox */}
      {applications.length > 0 && (
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
        <AlertDialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <AlertDialogHeader className={isRTL ? 'text-right' : 'text-left'}>
            <AlertDialogTitle>
              {isRTL ? 'מחיקת בקשות' : 'Delete Applications'}
            </AlertDialogTitle>
            <AlertDialogDescription className={isRTL ? 'text-right' : 'text-left'}>
              {isRTL
                ? `האם אתה בטוח שברצונך למחוק ${selectedIds.length} בקשות? פעולה זו אינה ניתנת לביטול.`
                : `Are you sure you want to delete ${selectedIds.length} applications? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
            <AlertDialogCancel>{isRTL ? 'ביטול' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDelete}
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

      {/* Archive Confirmation */}
      <AlertDialog open={showArchiveConfirm} onOpenChange={setShowArchiveConfirm}>
        <AlertDialogContent dir={isRTL ? 'rtl' : 'ltr'}>
          <AlertDialogHeader className={isRTL ? 'text-right' : 'text-left'}>
            <AlertDialogTitle>
              {isRTL ? 'העברה לארכיון' : 'Archive Applications'}
            </AlertDialogTitle>
            <AlertDialogDescription className={isRTL ? 'text-right' : 'text-left'}>
              {isRTL
                ? `האם אתה בטוח שברצונך להעביר ${selectedIds.length} בקשות לארכיון? תוכל לשחזר אותן מאוחר יותר.`
                : `Are you sure you want to archive ${selectedIds.length} applications? You can restore them later.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
            <AlertDialogCancel>{isRTL ? 'ביטול' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchArchive}
              disabled={archiving}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {archiving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {isRTL ? 'מעביר...' : 'Archiving...'}
                </>
              ) : (
                <>{isRTL ? 'ארכיון' : 'Archive'}</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default BatchUpdate;