/**
 * ProfileSidebar Component
 * Modern profile overview card with avatar and key info
 */

import { motion } from 'motion/react';
import { 
  Camera, 
  Upload, 
  Trash2, 
  Mail, 
  MapPin, 
  Calendar,
  Star,
  Crown,
  Zap,
  CheckCircle
} from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';
import { type UserProfile } from '../../../features/profile/api';
import { useAvatarUpload, getProfileInitials } from '../../../features/profile/hooks';
import { getCountryName } from '../../../constants/countries-hebrew';
import { ConfirmDeleteDialog } from '../../../components/shared/ConfirmDeleteDialog';

interface ProfileSidebarProps {
  profile: UserProfile;
  onUpdate: (updates: Partial<UserProfile>) => Promise<void>;
  isRTL?: boolean;
}

export function ProfileSidebar({ profile, onUpdate, isRTL = false }: ProfileSidebarProps) {
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

  const getTierInfo = () => {
    const tiers = {
      free: { 
        label: isRTL ? 'חינמי' : 'Free', 
        color: 'from-gray-400 to-gray-600',
        icon: Star,
        glow: 'rgba(156, 163, 175, 0.3)'
      },
      premium: { 
        label: isRTL ? 'פרמיום' : 'Premium', 
        color: 'from-[#9F5F80] to-[#7a4960]',
        icon: Crown,
        glow: 'rgba(159, 95, 128, 0.3)'
      },
      enterprise: { 
        label: isRTL ? 'artnergi' : 'Enterprise', 
        color: 'from-blue-500 to-blue-700',
        icon: Zap,
        glow: 'rgba(59, 130, 246, 0.3)'
      },
    };
    return tiers[profile.subscription_tier] || tiers.free;
  };

  const tier = getTierInfo();
  const TierIcon = tier.icon;
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
      className="bg-white dark:bg-[#383e4e]/50 border border-[#b6bac5]/20 rounded-2xl overflow-hidden"
    >
      {/* Header with Gradient */}
      <div 
        className="relative h-32 bg-gradient-to-br from-[#9F5F80] to-[#383e4e] overflow-hidden"
      >
        {/* Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }} />
        </div>

        {/* Floating Orbs */}
        <motion.div
          animate={{
            x: [0, 20, 0],
            y: [0, -10, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-4 right-8 w-20 h-20 rounded-full bg-white/10 blur-xl"
        />
        <motion.div
          animate={{
            x: [0, -15, 0],
            y: [0, 15, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-4 left-8 w-16 h-16 rounded-full bg-white/10 blur-xl"
        />
      </div>

      {/* Profile Content */}
      <div className="px-6 pb-6" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Avatar - Overlapping Header */}
        <div className="relative -mt-16 mb-4 flex justify-center">
          <div className="relative group">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="relative"
            >
              <Avatar className="h-32 w-32 border-4 border-white dark:border-[#383e4e] shadow-xl">
                <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-[#9F5F80] to-[#383e4e] text-white">
                  {getProfileInitials(profile)}
                </AvatarFallback>
              </Avatar>

              {/* Tier Badge on Avatar */}
              <div 
                className={`absolute -bottom-2 -right-2 bg-gradient-to-r ${tier.color} rounded-full p-2 shadow-lg border-2 border-white dark:border-[#383e4e]`}
                style={{
                  boxShadow: `0 0 20px ${tier.glow}`
                }}
              >
                <TierIcon className="h-5 w-5 text-white" />
              </div>

              {/* Upload Button */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAvatarMenu(!showAvatarMenu)}
                className="absolute -top-2 -left-2 bg-[#9F5F80] text-white rounded-full p-2.5 shadow-lg hover:bg-[#7a4960] transition-colors"
              >
                <Camera className="h-4 w-4" />
              </motion.button>
            </motion.div>

            {/* Avatar Menu */}
            {showAvatarMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="absolute top-full mt-3 left-1/2 -translate-x-1/2 bg-white dark:bg-[#383e4e] rounded-xl shadow-2xl p-2 min-w-48 z-20 border border-[#b6bac5]/20"
              >
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-[#383e4e] dark:text-white hover:bg-gray-100 dark:hover:bg-[#383e4e]/50 rounded-lg transition-colors"
                >
                  <Upload className="h-4 w-4 text-[#9F5F80]" />
                  <span>
                    {uploading
                      ? (isRTL ? 'מעלה...' : 'Uploading...')
                      : (isRTL ? 'העלה תמונה' : 'Upload Photo')}
                  </span>
                </button>
                {profile.avatar_url && (
                  <button
                    onClick={() => {
                      setShowAvatarMenu(false);
                      setShowDeleteAvatarConfirm(true);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>{isRTL ? 'מחק תמונה' : 'Remove Photo'}</span>
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
        </div>

        {/* Name & Tier */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-[#383e4e] dark:text-white mb-2">
            {profile.full_name}
          </h2>
          
          <div className="flex items-center justify-center gap-2 mb-3">
            <Badge 
              className={`bg-gradient-to-r ${tier.color} text-white border-0 px-3 py-1`}
              style={{
                boxShadow: `0 0 15px ${tier.glow}`
              }}
            >
              <TierIcon className="h-3 w-3 mr-1" />
              {tier.label}
            </Badge>
            
            {profile.email_verified && (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-400/30">
                <CheckCircle className="h-3 w-3 mr-1" />
                {isRTL ? 'מאומת' : 'Verified'}
              </Badge>
            )}
          </div>

          {profile.bio && (
            <p className="text-sm text-[#6c757d] dark:text-[#b6bac5] leading-relaxed">
              {profile.bio}
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#b6bac5]/30 to-transparent mb-6" />

        {/* Info Items */}
        <div className="space-y-4">
          <motion.div 
            whileHover={{ x: isRTL ? -5 : 5 }}
            className={`flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-[#383e4e]/30 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : ''}`}>
              <p className="text-xs text-[#6c757d] dark:text-[#b6bac5] mb-0.5">
                {isRTL ? 'אימייל' : 'Email'}
              </p>
              <p className="text-sm font-medium text-[#383e4e] dark:text-white truncate">
                {profile.email}
              </p>
            </div>
          </motion.div>

          {profile.location && (
            <motion.div 
              whileHover={{ x: isRTL ? -5 : 5 }}
              className={`flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-[#383e4e]/30 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <div className="p-2 rounded-lg bg-green-500/10">
                <MapPin className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
                <p className="text-xs text-[#6c757d] dark:text-[#b6bac5] mb-0.5">
                  {isRTL ? 'מיקום' : 'Location'}
                </p>
                <p className="text-sm font-medium text-[#383e4e] dark:text-white">
                  {getCountryName(profile.location, isRTL)}
                </p>
              </div>
            </motion.div>
          )}

          <motion.div 
            whileHover={{ x: isRTL ? -5 : 5 }}
            className={`flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-[#383e4e]/30 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
              <p className="text-xs text-[#6c757d] dark:text-[#b6bac5] mb-0.5">
                {isRTL ? 'חבר מאז' : 'Member since'}
              </p>
              <p className="text-sm font-medium text-[#383e4e] dark:text-white">
                {memberSince}
              </p>
            </div>
          </motion.div>
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

export default ProfileSidebar;