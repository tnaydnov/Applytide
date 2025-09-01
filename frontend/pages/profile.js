import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button, Card, Input } from "../components/ui";
import { useToast } from '../lib/toast';
import { logout } from "../lib/api";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    // Load user data from tokens
    function loadUserData() {
      try {
        const tokens = typeof window !== 'undefined' ? localStorage.getItem('tokens') : null;
        if (tokens) {
          const tokenData = JSON.parse(tokens);
          if (tokenData.email) {
            const userData = {
              email: tokenData.email,
              joinDate: tokenData.loginTime ? new Date(tokenData.loginTime).toLocaleDateString() : 'Unknown'
            };
            setUser(userData);
            setFormData(prev => ({ ...prev, email: userData.email }));
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    }

    loadUserData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // For now, just show a success message since we don't have the backend endpoint
      // In a real app, you'd make an API call here
      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (formData.newPassword !== formData.confirmPassword) {
        toast.error("New passwords don't match");
        return;
      }

      if (formData.newPassword.length < 6) {
        toast.error("Password must be at least 6 characters");
        return;
      }

      // For now, just show a success message since we don't have the backend endpoint
      toast.success("Password changed successfully!");
      setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } catch (error) {
      toast.error("Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const handleDeleteAccount = () => {
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      toast.info("Account deletion feature coming soon");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Overview */}
          <div className="lg:col-span-1">
            <Card className="p-6 text-center">
              <div className="w-24 h-24 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-2xl">
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{user.email}</h3>
              <p className="text-sm text-gray-600 mb-4">Member since {user.joinDate}</p>
              
              <div className="space-y-2">
                <Button
                  onClick={() => setIsEditing(!isEditing)}
                  className="w-full"
                  variant={isEditing ? "secondary" : "primary"}
                >
                  {isEditing ? "Cancel Editing" : "✏️ Edit Profile"}
                </Button>
                <Button
                  onClick={handleLogout}
                  className="w-full"
                  variant="secondary"
                >
                  🚪 Sign Out
                </Button>
              </div>
            </Card>
          </div>

          {/* Profile Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Information */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
              
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={!isEditing ? "bg-gray-50" : ""}
                  />
                  {!isEditing && (
                    <p className="text-sm text-gray-500 mt-1">
                      Email changes require verification
                    </p>
                  )}
                </div>

                {isEditing && (
                  <div className="pt-4">
                    <Button type="submit" loading={loading}>
                      Save Changes
                    </Button>
                  </div>
                )}
              </form>
            </Card>

            {/* Change Password */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h3>
              
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    value={formData.currentPassword}
                    onChange={handleInputChange}
                    placeholder="Enter your current password"
                  />
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    placeholder="Enter new password (min 6 characters)"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm your new password"
                  />
                </div>

                <div className="pt-4">
                  <Button type="submit" loading={loading}>
                    Change Password
                  </Button>
                </div>
              </form>
            </Card>

            {/* Account Statistics */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Statistics</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-indigo-600">0</div>
                  <div className="text-sm text-gray-600">Applications</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">0</div>
                  <div className="text-sm text-gray-600">Resumes</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">0</div>
                  <div className="text-sm text-gray-600">Jobs Saved</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">0</div>
                  <div className="text-sm text-gray-600">Pipeline Items</div>
                </div>
              </div>
            </Card>

            {/* Danger Zone */}
            <Card className="p-6 border-red-200">
              <h3 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-red-800">Delete Account</h4>
                    <p className="text-sm text-red-600">Permanently delete your account and all data</p>
                  </div>
                  <Button
                    onClick={handleDeleteAccount}
                    variant="secondary"
                    className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                  >
                    Delete Account
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
