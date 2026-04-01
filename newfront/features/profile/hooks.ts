/**
 * Profile feature hooks
 * Shared logic for profile-related components
 */

import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { profileApi, type UserProfile } from './api';

interface UseAvatarUploadOptions {
  onUpdate: (updates: Partial<UserProfile>) => Promise<void>;
  isRTL?: boolean;
}

interface UseAvatarUploadReturn {
  uploading: boolean;
  showAvatarMenu: boolean;
  setShowAvatarMenu: (show: boolean) => void;
  showDeleteAvatarConfirm: boolean;
  setShowDeleteAvatarConfirm: (show: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleAvatarUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleAvatarDelete: () => Promise<void>;
}

/**
 * Shared hook for avatar upload/delete logic.
 * Used by ProfileSidebar and ProfileHeader to avoid code duplication.
 */
export function useAvatarUpload({ onUpdate, isRTL = false }: UseAvatarUploadOptions): UseAvatarUploadReturn {
  const [uploading, setUploading] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [showDeleteAvatarConfirm, setShowDeleteAvatarConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null!);

  const handleAvatarUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(isRTL ? 'נא לבחור קובץ תמונה' : 'Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(isRTL ? 'הקובץ גדול מדי (מקסימום 5MB)' : 'File too large (max 5MB)');
      return;
    }

    setUploading(true);
    try {
      const { avatar_url } = await profileApi.uploadAvatar(file);
      await onUpdate({ avatar_url });
      setShowAvatarMenu(false);
      toast.success(isRTL ? 'תמונה הועלתה בהצלחה!' : 'Avatar uploaded successfully!');
    } catch {
      toast.error(isRTL ? 'שגיאה בהעלאת תמונה' : 'Failed to upload avatar');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [onUpdate, isRTL]);

  const handleAvatarDelete = useCallback(async () => {
    try {
      await profileApi.deleteAvatar();
      await onUpdate({ avatar_url: undefined });
      setShowAvatarMenu(false);
      toast.success(isRTL ? 'תמונה נמחקה בהצלחה' : 'Avatar deleted successfully');
    } catch {
      toast.error(isRTL ? 'שגיאה במחיקת תמונה' : 'Failed to delete avatar');
    }
  }, [onUpdate, isRTL]);

  return {
    uploading,
    showAvatarMenu,
    setShowAvatarMenu,
    showDeleteAvatarConfirm,
    setShowDeleteAvatarConfirm,
    fileInputRef,
    handleAvatarUpload,
    handleAvatarDelete,
  };
}

/**
 * Get user initials for avatar fallback display.
 */
export function getProfileInitials(profile: Pick<UserProfile, 'first_name' | 'last_name' | 'email'>): string {
  const first = profile.first_name?.[0] || '';
  const last = profile.last_name?.[0] || '';
  const initials = (first + last).toUpperCase();
  if (initials) return initials;

  if (profile.email && profile.email.length > 0) {
    return profile.email[0].toUpperCase();
  }

  return 'U';
}
