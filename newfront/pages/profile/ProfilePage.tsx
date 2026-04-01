/**
 * Profile Page - Redesigned
 * Modern, interactive profile management with amazing UX
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Shield, 
  AlertTriangle, 
  Bell,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { profileApi, type UserProfile } from '../../features/profile/api';
import { PageContainer } from '../../components/layout/PageContainer';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { PersonalInfoSection } from './components/PersonalInfoSection';
import { SecuritySection } from './components/SecuritySection';
import { DangerZoneSection } from './components/DangerZoneSection';
import { NotificationsSection } from './components/NotificationsSection';
import { ProfileSidebar } from './components/ProfileSidebar';
import { ProfileStats } from './components/ProfileStats';
import { toast } from 'sonner';
import { logger } from '../../lib/logger';

export type ProfileTab = 'personal' | 'notifications' | 'security' | 'danger';

export function ProfilePage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'he';

  // State
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('personal');

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await profileApi.getProfile();
      setProfile(data);
    } catch (error) {
      logger.error('Failed to load profile:', error);
      toast.error(
        isRTL ? 'שגיאה בטעינת פרופיל' : 'Failed to load profile'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    try {
      const updated = await profileApi.updateProfile(updates);
      setProfile(updated);
      toast.success(
        isRTL ? 'פרופיל עודכן בהצלחה!' : 'Profile updated successfully!'
      );
    } catch (error) {
      toast.error(
        isRTL ? 'שגיאה בעדכון פרופיל' : 'Failed to update profile'
      );
      throw error;
    }
  };

  const tabs = [
    {
      id: 'personal' as ProfileTab,
      label: { en: 'Personal Info', he: 'מידע אישי' },
      icon: User,
      description: { en: 'Manage your personal details', he: 'נהל את הפרטים האישיים שלך' }
    },
    {
      id: 'notifications' as ProfileTab,
      label: { en: 'Notifications', he: 'התראות' },
      icon: Bell,
      description: { en: 'Email and push notifications', he: 'התראות אימייל ופוש' }
    },
    {
      id: 'security' as ProfileTab,
      label: { en: 'Security', he: 'אבטחה' },
      icon: Shield,
      description: { en: 'Password and security settings', he: 'סיסמה והגדרות אבטחה' }
    },
    {
      id: 'danger' as ProfileTab,
      label: { en: 'Danger Zone', he: 'אזור סכנה' },
      icon: AlertTriangle,
      description: { en: 'Delete account and data', he: 'מחק חשבון ונתונים' }
    },
  ];

  const renderSection = () => {
    if (!profile) return null;

    switch (activeTab) {
      case 'personal':
        return <PersonalInfoSection profile={profile} onUpdate={handleUpdateProfile} isRTL={isRTL} />;
      case 'notifications':
        return <NotificationsSection profile={profile} onUpdate={handleUpdateProfile} isRTL={isRTL} />;
      case 'security':
        return <SecuritySection profile={profile} isRTL={isRTL} />;
      case 'danger':
        return <DangerZoneSection profile={profile} isRTL={isRTL} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner
            size="lg"
            text={isRTL ? 'טוען פרופיל...' : 'Loading profile...'}
          />
        </div>
      </PageContainer>
    );
  }

  if (!profile) {
    return (
      <PageContainer>
        <div className="text-center py-12">
          <p className="text-[#6c757d]">
            {isRTL ? 'לא ניתן לטעון פרופיל' : 'Failed to load profile'}
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer showHelp={false}>
      <div className="min-h-screen pb-12" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className={`flex items-center gap-3 mb-2 ${isRTL ? 'flex-row justify-end' : ''}`}>
            <div className={`flex-1 ${isRTL ? 'text-right' : ''}`}>
              <h1 className="text-4xl font-bold text-[#383e4e] dark:text-white">
                {isRTL ? 'פרופיל והגדרות' : 'Profile & Settings'}
              </h1>
              <p className="text-[#6c757d] dark:text-[#b6bac5] mt-1">
                {isRTL
                  ? 'ניהול חשבון והעדפות'
                  : 'Manage your account and preferences'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gradient-to-br from-[#9F5F80] to-[#383e4e]">
              <User className="h-7 w-7 text-white" />
            </div>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Profile Overview */}
          <div className="lg:col-span-4 space-y-6">
            <ProfileSidebar 
              profile={profile} 
              onUpdate={handleUpdateProfile}
              isRTL={isRTL}
            />
            
            <ProfileStats profile={profile} isRTL={isRTL} />
          </div>

          {/* Right Content - Settings Sections */}
          <div className="lg:col-span-8 space-y-6">
            {/* Tab Navigation - Modern Card Style */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-[#383e4e]/50 border border-[#b6bac5]/20 rounded-2xl p-6"
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {tabs.map((tab, index) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;

                  return (
                    <motion.button
                      key={tab.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + index * 0.05 }}
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        relative p-5 rounded-xl transition-all duration-300
                        flex flex-col gap-3
                        group overflow-hidden
                        ${isRTL ? 'items-end text-right' : 'items-start text-left'}
                        ${
                          isActive
                            ? 'bg-gradient-to-br from-[#9F5F80] to-[#383e4e] text-white shadow-lg scale-105'
                            : 'bg-gray-50 dark:bg-[#383e4e]/30 hover:bg-gray-100 dark:hover:bg-[#383e4e]/50 text-[#383e4e] dark:text-white'
                        }
                      `}
                    >
                      {/* Background Pattern */}
                      {isActive && (
                        <div className="absolute inset-0 opacity-10">
                          <div className="absolute inset-0" style={{
                            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                            backgroundSize: '20px 20px',
                          }} />
                        </div>
                      )}

                      <div className="relative z-10 w-full">
                        <div className={`flex items-center justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <Icon className={`h-6 w-6 ${isActive ? 'text-white' : 'text-[#9F5F80]'}`} />
                          {isActive && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="bg-white/20 rounded-full p-1"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </motion.div>
                          )}
                        </div>
                        <div className={`font-bold text-lg mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                          {tab.label[isRTL ? 'he' : 'en']}
                        </div>
                        <div className={`text-sm ${isRTL ? 'text-right' : 'text-left'} ${isActive ? 'text-white/80' : 'text-[#6c757d] dark:text-[#b6bac5]'}`}>
                          {tab.description[isRTL ? 'he' : 'en']}
                        </div>
                      </div>

                      {/* Hover Arrow */}
                      <motion.div
                        className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2`}
                        initial={{ opacity: 0, x: isRTL ? 10 : -10 }}
                        whileHover={{ opacity: 1, x: 0 }}
                      >
                        <ChevronRight className={`h-5 w-5 ${isRTL ? 'rotate-180' : ''}`} />
                      </motion.div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>

            {/* Section Content with Smooth Transitions */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                {renderSection()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

export default ProfilePage;