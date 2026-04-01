/**
 * ProfileHeader Component
 * User avatar, name, and basic info display
 */

import { motion } from 'motion/react';
import { Camera, Upload, Trash2, Mail, MapPin, Calendar } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';
import { Badge } from '../../../components/ui/badge';
import { type UserProfile } from '../../../features/profile/api';
import { useAvatarUpload, getProfileInitials } from '../../../features/profile/hooks';
import { ConfirmDeleteDialog } from '../../../components/shared/ConfirmDeleteDialog';

interface ProfileHeaderProps {
  profile: UserProfile;
  onUpdate: (updates: Partial<UserProfile>) => Promise<void>;
  isRTL?: boolean;
}

export function ProfileHeader({ profile, onUpdate, isRTL = false }: ProfileHeaderProps) {
  const {
    uploading,
    showAvatarMenu,
    setShowAvatarMenu,
    showDeleteAvatarConfirm,
    setShowDeleteAvatarConfirm,
    fileInputRef,
    handleAvatarUpload,
    handleAvatarDelete,
  } = useAvatarUpload({ onUpdate, isRTL });

  const getTierBadge = () => {
    const tiers = {
      free: { label: isRTL ? 'חינמי' : 'Free', color: 'bg-gray-500' },
      premium: { label: isRTL ? 'פרמיום' : 'Premium', color: 'bg-[#9F5F80]' },
      enterprise: { label: isRTL ? 'ארגוני' : 'Enterprise', color: 'bg-blue-600' },
    };
    return tiers[profile.subscription_tier] || tiers.free;
  };

  const tier = getTierBadge();
  const memberSince = profile.created_at 
    ? new Date(profile.created_at).toLocaleDateString(
        isRTL ? 'he-IL' : 'en-US',
        { year: 'numeric', month: 'long' }
      )
    : (isRTL ? 'לא זמין' : 'N/A');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-[#9F5F80] to-[#383e4e] rounded-2xl p-8 text-white relative overflow-hidden"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }} />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
        {/* Avatar */}
        <div className="relative group">
          <Avatar className="h-32 w-32 border-4 border-white/20">
            <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
            <AvatarFallback className="text-3xl font-bold bg-white/20">
              {getProfileInitials(profile)}
            </AvatarFallback>
          </Avatar>

          {/* Avatar Upload Button */}
          <button
            onClick={() => setShowAvatarMenu(!showAvatarMenu)}
            className="absolute bottom-0 right-0 bg-white text-[#9F5F80] rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
          >
            <Camera className="h-4 w-4" />
          </button>

          {/* Avatar Menu */}
          {showAvatarMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute top-full mt-2 bg-white dark:bg-[#383e4e] rounded-lg shadow-xl p-2 min-w-48 z-20"
            >
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full flex items-center gap-2 px-4 py-2 text-left text-[#383e4e] dark:text-white hover:bg-gray-100 dark:hover:bg-[#383e4e]/50 rounded transition-colors"
              >
                <Upload className="h-4 w-4" />
                {uploading
                  ? (isRTL ? 'מעלה...' : 'Uploading...')
                  : (isRTL ? 'העלה תמונה' : 'Upload Photo')}
              </button>
              {profile.avatar_url && (
                <button
                  onClick={() => {
                    setShowAvatarMenu(false);
                    setShowDeleteAvatarConfirm(true);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  {isRTL ? 'מחק תמונה' : 'Remove Photo'}
                </button>
              )}
            </motion.div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
            aria-label="Upload avatar image"
          />
        </div>

        {/* Info */}
        <div className="flex-1 text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3">
            <h2 className="text-3xl font-bold">{profile.full_name}</h2>
            <Badge className={`${tier.color} text-white`}>
              {tier.label}
            </Badge>
            {profile.email_verified && (
              <Badge variant="outline" className="bg-green-500/20 text-white border-green-400">
                {isRTL ? '✓ מאומת' : '✓ Verified'}
              </Badge>
            )}
          </div>

          <div className="space-y-2 text-white/90">
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <Mail className="h-4 w-4" />
              <span>{profile.email}</span>
            </div>

            {profile.location && (
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <MapPin className="h-4 w-4" />
                <span>{profile.location}</span>
              </div>
            )}

            <div className="flex items-center gap-2 justify-center md:justify-start">
              <Calendar className="h-4 w-4" />
              <span>
                {isRTL ? 'חבר מאז' : 'Member since'} {memberSince}
              </span>
            </div>
          </div>

          {profile.bio && (
            <p className="mt-4 text-white/80 max-w-2xl">
              {profile.bio}
            </p>
          )}
        </div>
      </div>

      {/* Avatar Delete Confirmation */}
      <ConfirmDeleteDialog
        open={showDeleteAvatarConfirm}
        onOpenChange={setShowDeleteAvatarConfirm}
        onConfirm={() => {
          handleAvatarDelete();
          setShowDeleteAvatarConfirm(false);
        }}
        title={isRTL ? 'מחיקת תמונה' : 'Remove Photo'}
        description={
          isRTL
            ? 'האם אתה בטוח שברצונך למחוק את תמונת הפרופיל?'
            : 'Are you sure you want to remove your profile photo?'
        }
        confirmLabel={isRTL ? 'מחק' : 'Remove'}
        isRTL={isRTL}
      />
    </motion.div>
  );
}

export default ProfileHeader;
