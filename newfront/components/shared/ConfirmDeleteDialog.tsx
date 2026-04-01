/**
 * ConfirmDeleteDialog Component
 * Reusable confirmation dialog for delete actions across the app
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isRTL?: boolean;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  isRTL = false,
}: ConfirmDeleteDialogProps) {
  const defaultTitle = isRTL ? 'אישור מחיקה' : 'Confirm Delete';
  const defaultDescription = isRTL
    ? 'האם אתה בטוח שברצונך למחוק? פעולה זו אינה ניתנת לביטול.'
    : 'Are you sure you want to delete this? This action cannot be undone.';
  const defaultConfirm = isRTL ? 'מחק' : 'Delete';
  const defaultCancel = isRTL ? 'ביטול' : 'Cancel';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent dir={isRTL ? 'rtl' : 'ltr'} className="z-[200]">
        <AlertDialogHeader className={isRTL ? 'text-right' : 'text-left'}>
          <AlertDialogTitle>{title || defaultTitle}</AlertDialogTitle>
          <AlertDialogDescription className={isRTL ? 'text-right' : 'text-left'}>
            {description || defaultDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className={isRTL ? 'flex-row-reverse' : ''}>
          <AlertDialogCancel>{cancelLabel || defaultCancel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {confirmLabel || defaultConfirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default ConfirmDeleteDialog;
