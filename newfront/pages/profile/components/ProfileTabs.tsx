/**
 * ProfileTabs Component
 * Tab navigation for profile sections
 */

import { motion } from 'motion/react';
import { User, Shield, Bell, AlertTriangle } from 'lucide-react';
import type { ProfileTab } from '../ProfilePage';

interface ProfileTabsProps {
  activeTab: ProfileTab;
  onChange: (tab: ProfileTab) => void;
  isRTL?: boolean;
}

const tabs = [
  {
    id: 'personal' as ProfileTab,
    label: { en: 'Personal Info', he: 'מידע אישי' },
    icon: User,
  },
  {
    id: 'security' as ProfileTab,
    label: { en: 'Security', he: 'אבטחה' },
    icon: Shield,
  },
  {
    id: 'notifications' as ProfileTab,
    label: { en: 'Notifications', he: 'התראות' },
    icon: Bell,
  },
  {
    id: 'danger' as ProfileTab,
    label: { en: 'Danger Zone', he: 'אזור סכנה' },
    icon: AlertTriangle,
  },
];

export function ProfileTabs({ activeTab, onChange, isRTL = false }: ProfileTabsProps) {
  return (
    <div className="border-b border-[#b6bac5]/20 overflow-x-auto" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex gap-2 min-w-max">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`
                relative px-6 py-4 font-medium transition-colors
                flex items-center gap-2 whitespace-nowrap
                ${
                  isActive
                    ? 'text-[#9F5F80]'
                    : 'text-[#6c757d] dark:text-[#b6bac5] hover:text-[#383e4e] dark:hover:text-white'
                }
              `}
            >
              <Icon className="h-5 w-5" />
              {tab.label[isRTL ? 'he' : 'en']}

              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#9F5F80]"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ProfileTabs;
