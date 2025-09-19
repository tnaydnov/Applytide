import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { Button, Card, Input } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../lib/toast';
import { api } from '../lib/api';

const countries = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda',
  'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain',
  'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
  'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria',
  'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada',
  'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros',
  'Congo (Congo-Brazzaville)', 'Congo (Democratic Republic)', 'Costa Rica', 'Croatia',
  'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominica',
  'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea',
  'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France',
  'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada',
  'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary',
  'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy',
  'Ivory Coast', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati',
  'Kosovo', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho',
  'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar',
  'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands',
  'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco',
  'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia',
  'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger',
  'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan',
  'Palau', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru',
  'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda',
  'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines',
  'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal',
  'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia',
  'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan',
  'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
  'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo',
  'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu',
  'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States',
  'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam',
  'Yemen', 'Zambia', 'Zimbabwe', 'Other'
].sort();

export default function ProfilePage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);
  const router = useRouter();
  const toast = useToast();

  // Form states
  const [personalInfo, setPersonalInfo] = useState({
    full_name: '',
    email: '',
    location: ''
  });

  const [preferences, setPreferences] = useState({
    notification_deadlines: true,
    notification_interviews: true,
    notification_status_updates: true,
    notification_job_matches: true,
    notification_weekly_summary: false
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  // Load user data
  useEffect(() => {
    if (user) {
      setPersonalInfo({
        full_name: user.full_name || '',
        email: user.email || '',
        location: user.location || ''
      });

      setPreferences({
        notification_deadlines: user.notification_deadlines ?? true,
        notification_interviews: user.notification_interviews ?? true,
        notification_status_updates: user.notification_status_updates ?? true,
        notification_job_matches: user.notification_job_matches ?? true,
        notification_weekly_summary: user.notification_weekly_summary ?? false
      });
    }
  }, [user]);

  const handlePersonalInfoChange = (e) => {
    const { name, value } = e.target;
    setPersonalInfo(prev => ({ ...prev, [name]: value }));
  };

  const handlePreferencesChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPreferences(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = () => setAvatarPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    
    setLoading(true);
    try {
      await api.uploadAvatar(avatarFile);
      toast.success('Avatar updated successfully!');
      await refreshUser();
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (error) {
      toast.error('Failed to upload avatar');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePersonalInfo = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.updateProfile(personalInfo);
      toast.success('Profile updated successfully!');
      await refreshUser();
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePreferences = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.updatePreferences(preferences);
      toast.success('Preferences updated successfully!');
      await refreshUser();
    } catch (error) {
      toast.error('Failed to update preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordForm.new_password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await api.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      toast.success('Password changed successfully!');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      toast.error(error.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      router.push('/login');
    } catch (error) {
      router.push('/login');
    }
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      toast.info('Account deletion feature coming soon');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getInitials = (name, email) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.charAt(0).toUpperCase() || 'U';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)'}}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)'}}>
        <div className="text-center">
          <p className="text-gray-300">Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'personal', name: 'Personal Info', icon: '👤' },
    { id: 'notifications', name: 'Notifications', icon: '🔔', disabled: true, comingSoon: true },
    { id: 'security', name: 'Security', icon: '🔐' },
    { id: 'activity', name: 'Activity', icon: '📊' }
  ];

  return (
    <div className="min-h-screen py-8" style={{background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)'}}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Profile Settings</h1>
          <p className="text-gray-300 mt-2">Manage your account and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card className="p-6 text-center glass-card border border-white/10">
              {/* Avatar */}
              <div className="relative mb-6">
                <div 
                  className="w-32 h-32 mx-auto rounded-full flex items-center justify-center cursor-pointer group relative overflow-hidden"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: avatarPreview || user.avatar_url 
                      ? `url(${avatarPreview || user.avatar_url}) center/cover` 
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  }}
                >
                  {!avatarPreview && !user.avatar_url && (
                    <span className="text-white font-bold text-3xl">
                      {getInitials(user.full_name, user.email)}
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarSelect}
                  className="hidden"
                />
              </div>

              {avatarFile && (
                <div className="mb-4 space-y-2">
                  <Button
                    onClick={handleAvatarUpload}
                    disabled={loading}
                    size="sm"
                    className="w-full"
                  >
                    {loading ? 'Uploading...' : 'Save Avatar'}
                  </Button>
                  <Button
                    onClick={() => {
                      setAvatarFile(null);
                      setAvatarPreview(null);
                    }}
                    variant="secondary"
                    size="sm"
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              )}

              {/* User Info */}
              <h3 className="text-xl font-semibold text-white mb-1">
                {user.full_name || 'Anonymous User'}
              </h3>
              <p className="text-sm text-gray-300 mb-2">{user.email}</p>
              
              {/* Account Status */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Account Type</span>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    user.is_premium 
                      ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-500/30' 
                      : 'bg-gray-900/30 text-gray-300 border border-gray-500/30'
                  }`}>
                    {user.is_premium ? 'Premium' : 'Free'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Member Since</span>
                  <span className="text-gray-300">{formatDate(user.created_at)}</span>
                </div>

                {user.last_login_at && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Last Login</span>
                    <span className="text-gray-300">{formatDate(user.last_login_at)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Email Verified</span>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    user.email_verified 
                      ? 'bg-green-900/30 text-green-300 border border-green-500/30' 
                      : 'bg-red-900/30 text-red-300 border border-red-500/30'
                  }`}>
                    {user.email_verified ? 'Verified' : 'Unverified'}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            {/* Tabs */}
            <div className="mb-8">
              <nav className="flex space-x-1 bg-black/20 p-1 rounded-xl">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => !tab.disabled && setActiveTab(tab.id)}
                    disabled={tab.disabled}
                    className={`relative flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-indigo-600 text-white shadow-lg'
                        : tab.disabled
                        ? 'text-gray-500 cursor-not-allowed opacity-60'
                        : 'text-gray-300 hover:text-white hover:bg-white/5'
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
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
              {/* Personal Info Tab */}
              {activeTab === 'personal' && (
                <Card className="p-6 glass-card border border-white/10">
                  <h3 className="text-xl font-semibold text-white mb-6">Personal Information</h3>
                  <form onSubmit={handleUpdatePersonalInfo} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Full Name *
                        </label>
                        <Input
                          name="full_name"
                          value={personalInfo.full_name}
                          onChange={handlePersonalInfoChange}
                          placeholder="Your professional name"
                          required
                        />
                        <p className="text-xs text-gray-400 mt-1">Used on resumes and applications</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Email
                        </label>
                        <Input
                          name="email"
                          value={personalInfo.email}
                          disabled
                          className="bg-gray-800 text-gray-500 cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Country/Location *
                      </label>
                      <select
                        name="location"
                        value={personalInfo.location}
                        onChange={handlePersonalInfoChange}
                        required
                        className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="" className="bg-gray-800">Select your country...</option>
                        {countries.map((country) => (
                          <option key={country} value={country} className="bg-gray-800">
                            {country}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-400 mt-1">Important for location-based job matching</p>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </form>
                </Card>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <Card className="p-6 glass-card border border-white/10">
                  <h3 className="text-xl font-semibold text-white mb-6">Notification Preferences</h3>
                  <p className="text-gray-300 mb-6">Choose which job search notifications you'd like to receive via email.</p>
                  
                  <form onSubmit={handleUpdatePreferences} className="space-y-6">
                    <div className="space-y-6">
                      <h4 className="text-lg font-medium text-white">Application Management</h4>
                      
                      <div className="space-y-4">
                        <div className="flex items-start justify-between p-4 bg-black/20 rounded-lg">
                          <div className="flex-1">
                            <h5 className="text-sm font-medium text-gray-200 mb-1">Application Deadlines</h5>
                            <p className="text-xs text-gray-400">Get reminded before application deadlines close</p>
                            <p className="text-xs text-indigo-400 mt-1">📅 "Application for Google closes in 3 days"</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer ml-4">
                            <input
                              type="checkbox"
                              name="notification_deadlines"
                              checked={preferences.notification_deadlines}
                              onChange={handlePreferencesChange}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                        </div>

                        <div className="flex items-start justify-between p-4 bg-black/20 rounded-lg">
                          <div className="flex-1">
                            <h5 className="text-sm font-medium text-gray-200 mb-1">Interview Reminders</h5>
                            <p className="text-xs text-gray-400">Never miss an interview with advance notifications</p>
                            <p className="text-xs text-indigo-400 mt-1">🎯 "Interview with Microsoft tomorrow at 2 PM"</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer ml-4">
                            <input
                              type="checkbox"
                              name="notification_interviews"
                              checked={preferences.notification_interviews}
                              onChange={handlePreferencesChange}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                        </div>

                        <div className="flex items-start justify-between p-4 bg-black/20 rounded-lg">
                          <div className="flex-1">
                            <h5 className="text-sm font-medium text-gray-200 mb-1">Status Updates</h5>
                            <p className="text-xs text-gray-400">Know when your application status changes</p>
                            <p className="text-xs text-indigo-400 mt-1">📊 "Your Apple application moved to 'Under Review'"</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer ml-4">
                            <input
                              type="checkbox"
                              name="notification_status_updates"
                              checked={preferences.notification_status_updates}
                              onChange={handlePreferencesChange}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                        </div>
                      </div>

                      <h4 className="text-lg font-medium text-white pt-4">Job Discovery</h4>
                      
                      <div className="space-y-4">
                        <div className="flex items-start justify-between p-4 bg-black/20 rounded-lg">
                          <div className="flex-1">
                            <h5 className="text-sm font-medium text-gray-200 mb-1">Job Match Alerts</h5>
                            <p className="text-xs text-gray-400">Get notified about new jobs that match your preferences</p>
                            <p className="text-xs text-indigo-400 mt-1">🎯 "5 new Software Engineer jobs in San Francisco"</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer ml-4">
                            <input
                              type="checkbox"
                              name="notification_job_matches"
                              checked={preferences.notification_job_matches}
                              onChange={handlePreferencesChange}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                        </div>

                        <div className="flex items-start justify-between p-4 bg-black/20 rounded-lg">
                          <div className="flex-1">
                            <h5 className="text-sm font-medium text-gray-200 mb-1">Weekly Summary</h5>
                            <p className="text-xs text-gray-400">Weekly progress report with application stats</p>
                            <p className="text-xs text-indigo-400 mt-1">📈 "You applied to 7 jobs this week - keep it up!"</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer ml-4">
                            <input
                              type="checkbox"
                              name="notification_weekly_summary"
                              checked={preferences.notification_weekly_summary}
                              onChange={handlePreferencesChange}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-white/10">
                      <Button
                        type="submit"
                        disabled={loading}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                      >
                        {loading ? 'Saving...' : 'Save Notification Preferences'}
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <Card className="p-6 glass-card border border-white/10">
                    <h3 className="text-xl font-semibold text-white mb-6">Change Password</h3>
                    {user.is_oauth_user ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 mx-auto mb-4 bg-blue-900/30 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path d="M12 1C7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53 1.48 0 2.73.4 3.71 1.06L19.28 2.9C17.46.98 14.97 0 12 0z"/>
                          </svg>
                        </div>
                        <h4 className="text-lg font-medium text-white mb-2">Google Account</h4>
                        <p className="text-gray-300">You're signed in with Google. Password changes must be done through your Google account.</p>
                        <Button
                          onClick={() => window.open('https://myaccount.google.com/security', '_blank')}
                          className="mt-4"
                          variant="secondary"
                        >
                          Manage Google Security
                        </Button>
                      </div>
                    ) : (
                      <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Current Password
                          </label>
                          <Input
                            type="password"
                            name="current_password"
                            value={passwordForm.current_password}
                            onChange={handlePasswordChange}
                            placeholder="Enter current password"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            New Password
                          </label>
                          <Input
                            type="password"
                            name="new_password"
                            value={passwordForm.new_password}
                            onChange={handlePasswordChange}
                            placeholder="Enter new password"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Confirm New Password
                          </label>
                          <Input
                            type="password"
                            name="confirm_password"
                            value={passwordForm.confirm_password}
                            onChange={handlePasswordChange}
                            placeholder="Confirm new password"
                            required
                          />
                        </div>
                        <Button
                          type="submit"
                          disabled={loading}
                          className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700"
                        >
                          {loading ? 'Changing...' : 'Change Password'}
                        </Button>
                      </form>
                    )}
                  </Card>

                  <Card className="p-6 glass-card border border-red-500/20">
                    <h3 className="text-xl font-semibold text-red-400 mb-4">Danger Zone</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-white">Logout from all devices</h4>
                          <p className="text-xs text-gray-400">This will log you out from all browsers and devices</p>
                        </div>
                        <Button
                          onClick={handleLogout}
                          variant="secondary"
                          size="sm"
                        >
                          Logout All
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-white">Delete Account</h4>
                          <p className="text-xs text-gray-400">Permanently delete your account and all data</p>
                        </div>
                        <Button
                          onClick={handleDeleteAccount}
                          className="bg-red-600 hover:bg-red-700"
                          size="sm"
                        >
                          Delete Account
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* Activity Tab */}
              {activeTab === 'activity' && (
                <Card className="p-6 glass-card border border-white/10">
                  <h3 className="text-xl font-semibold text-white mb-6">Account Activity</h3>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center p-4 bg-black/20 rounded-lg">
                        <div className="text-2xl font-bold text-indigo-400 mb-2">0</div>
                        <div className="text-sm text-gray-300">Applications</div>
                      </div>
                      <div className="text-center p-4 bg-black/20 rounded-lg">
                        <div className="text-2xl font-bold text-purple-400 mb-2">0</div>
                        <div className="text-sm text-gray-300">Interviews</div>
                      </div>
                      <div className="text-center p-4 bg-black/20 rounded-lg">
                        <div className="text-2xl font-bold text-green-400 mb-2">0</div>
                        <div className="text-sm text-gray-300">Job Offers</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-lg font-medium text-white mb-4">Recent Activity</h4>
                      <div className="text-center py-8 text-gray-400">
                        <svg className="w-12 h-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p>No recent activity</p>
                        <p className="text-sm">Start by adding your first job application!</p>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
