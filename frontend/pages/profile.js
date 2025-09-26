// frontend/pages/profile.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../lib/toast";

import useAvatarUpload from "../features/profile/hooks/useAvatarUpload";
import ProfileSidebar from "../features/profile/components/ProfileSidebar";
import PersonalInfoForm from "../features/profile/components/PersonalInfoForm";
import NotificationsForm from "../features/profile/components/NotificationsForm";
import SecurityForm from "../features/profile/components/SecurityForm";
import ActivityPanel from "../features/profile/components/ActivityPanel";

import {
  updateProfile,
  updatePreferences,
  changePassword,
  logout as logoutService,
} from "../services/user";

export default function ProfilePage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState("personal");
  const [loading, setLoading] = useState(false);

  const avatar = useAvatarUpload();
  const router = useRouter();
  const toast = useToast();

  // forms
  const [personalInfo, setPersonalInfo] = useState({
    full_name: "",
    email: "",
    location: "",
  });

  const [preferences, setPreferences] = useState({
    notification_deadlines: true,
    notification_interviews: true,
    notification_status_updates: true,
    notification_job_matches: true,
    notification_weekly_summary: false,
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  // Load user data
  useEffect(() => {
    if (user) {
      setPersonalInfo({
        full_name: user.full_name || "",
        email: user.email || "",
        location: user.location || "",
      });

      setPreferences({
        notification_deadlines: user.notification_deadlines ?? true,
        notification_interviews: user.notification_interviews ?? true,
        notification_status_updates: user.notification_status_updates ?? true,
        notification_job_matches: user.notification_job_matches ?? true,
        notification_weekly_summary: user.notification_weekly_summary ?? false,
      });
    }
  }, [user]);

  const handlePersonalInfoChange = (e) => {
    const { name, value } = e.target;
    setPersonalInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handlePreferencesChange = (e) => {
    const { name, type, checked, value } = e.target;
    setPreferences((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdatePersonalInfo = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile(personalInfo);
      toast.success("Profile updated successfully!");
      await refreshUser?.();
    } catch (error) {
      toast.error(error?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePreferences = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updatePreferences(preferences);
      toast.success("Preferences updated successfully!");
      await refreshUser?.();
    } catch (error) {
      toast.error(error?.message || "Failed to update preferences");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error("New passwords do not match");
      return;
    }
    if ((passwordForm.new_password || "").length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      await changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      toast.success("Password changed successfully!");
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (error) {
      toast.error(error?.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutService();
      router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  const handleDeleteAccount = () => {
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      toast.info("Account deletion feature coming soon");
    }
  };

  // Loading states / auth gate (matches original UX)
  if (authLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)" }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)" }}
      >
        <div className="text-center">
          <p className="text-gray-300">Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "personal", name: "Personal Info", icon: "👤" },
    { id: "notifications", name: "Notifications", icon: "🔔", disabled: true, comingSoon: true },
    { id: "security", name: "Security", icon: "🔐" },
    { id: "activity", name: "Activity", icon: "📊" },
  ];

  return (
    <div
      className="min-h-screen py-8"
      style={{ background: "linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)" }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Profile Settings</h1>
          <p className="text-gray-300 mt-2">Manage your account and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <ProfileSidebar user={user} avatar={avatar} onLogout={handleLogout} />
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            {/* Tabs */}
            <div className="mb-8">
              <nav className="flex space-x-1 bg-black/20 p-1 rounded-xl">
                {tabs.map((tab) => {
                  const active = activeTab === tab.id;
                  const disabled = !!tab.disabled;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => !disabled && setActiveTab(tab.id)}
                      disabled={disabled}
                      className={`relative flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? "bg-indigo-600 text-white shadow-lg"
                          : disabled
                          ? "text-gray-500 cursor-not-allowed opacity-60"
                          : "text-gray-300 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <span className="mr-2">{tab.icon}</span>
                      {tab.name}
                      {tab.comingSoon && (
                        <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs font-bold bg-yellow-500 text-black rounded-full">
                          SOON
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Panels */}
            <div className="space-y-6">
              {activeTab === "personal" && (
                <PersonalInfoForm
                  values={personalInfo}
                  onChange={handlePersonalInfoChange}
                  onSubmit={handleUpdatePersonalInfo}
                  loading={loading}
                />
              )}

              {activeTab === "notifications" && (
                <NotificationsForm
                  values={preferences}
                  onChange={handlePreferencesChange}
                  onSubmit={handleUpdatePreferences}
                  loading={loading}
                />
              )}

              {activeTab === "security" && (
                <SecurityForm
                  user={user}
                  passwordForm={passwordForm}
                  onChangePasswordInput={handlePasswordChange}
                  onSubmitPassword={handleChangePassword}
                  loading={loading}
                  onLogoutAll={handleLogout}
                  onDeleteAccount={handleDeleteAccount}
                />
              )}

              {activeTab === "activity" && <ActivityPanel />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
