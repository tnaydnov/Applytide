import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  FiArrowLeft, 
  FiTrash2, 
  FiShield, 
  FiCreditCard, 
  FiLogOut,
  FiMail,
  FiMapPin,
  FiGlobe,
  FiLinkedin,
  FiPhone
} from 'react-icons/fi';
import AdminGuard from '../../../components/guards/AdminGuard';
import AdminLayout from '../../../components/admin/AdminLayout';
import { adminApi } from '../../../features/admin/api';
import { useToast } from '../../../lib/toast';

export default function UserDetailPage() {
  const router = useRouter();
  const toast = useToast();
  const { id } = router.query;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState(false);
  const [subscriptionPlan, setSubscriptionPlan] = useState('starter');
  const [subscriptionStatus, setSubscriptionStatus] = useState('active');
  const [subscriptionEndsAt, setSubscriptionEndsAt] = useState('');
  
  // Optional data
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);

  useEffect(() => {
    if (id) {
      loadUser();
      loadApplications();
      loadJobs();
      loadActivity();
    }
  }, [id]);

  const loadUser = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getUser(id);
      setUser(data);
    } catch (error) {
      console.error('Error loading user:', error);
      toast.error('Failed to load user');
      router.push('/admin/users');
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async () => {
    try {
      setLoadingApplications(true);
      const data = await adminApi.getUserApplications(id, 10);
      setApplications(data);
    } catch (error) {
      console.error('Error loading applications:', error);
    } finally {
      setLoadingApplications(false);
    }
  };

  const loadJobs = async () => {
    try {
      setLoadingJobs(true);
      const data = await adminApi.getUserJobs(id, 10);
      setJobs(data);
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoadingJobs(false);
    }
  };

  const loadActivity = async () => {
    try {
      setLoadingActivity(true);
      const data = await adminApi.getUserActivity(id, 15);
      setActivity(data);
    } catch (error) {
      console.error('Error loading activity:', error);
    } finally {
      setLoadingActivity(false);
    }
  };

  const handleTogglePremium = async () => {
    const hasPaidPlan = user.subscription_plan !== 'starter' && user.subscription_status === 'active';
    if (!confirm(`${hasPaidPlan ? 'Revoke' : 'Grant'} premium for ${user.email}?`)) {
      return;
    }

    try {
      setActionLoading(true);
      const newPlan = hasPaidPlan ? 'starter' : 'premium';
      const newStatus = hasPaidPlan ? 'active' : 'active';
      const expiresAt = !hasPaidPlan 
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year from now
        : null;
      
      await adminApi.toggleUserPremium(id, newPlan, newStatus, expiresAt);
      toast.success(`Premium ${hasPaidPlan ? 'revoked' : 'granted'} successfully`);
      await loadUser();
    } catch (error) {
      console.error('Error toggling premium:', error);
      toast.error('Failed to update premium status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeRole = async (newRole) => {
    if (!confirm(`Change role for ${user.email} to ${newRole}?`)) {
      return;
    }

    try {
      setActionLoading(true);
      await adminApi.changeUserRole(id, newRole);
      toast.success('Role changed successfully');
      await loadUser();
    } catch (error) {
      console.error('Error changing role:', error);
      toast.error(error.response?.data?.detail || 'Failed to change role');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeSessions = async () => {
    if (!confirm(`Revoke all sessions for ${user.email}? This will force logout on all devices.`)) {
      return;
    }

    try {
      setActionLoading(true);
      await adminApi.revokeUserSessions(id);
      toast.success('All sessions revoked successfully');
      await loadUser();
    } catch (error) {
      console.error('Error revoking sessions:', error);
      toast.error('Failed to revoke sessions');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    const confirmed = confirm(
      `⚠️ WARNING: Delete user ${user.email}?\n\nThis action is PERMANENT and will delete:\n- User account\n- All applications\n- All saved jobs\n- All documents\n- All reminders\n\nType "${user.email}" to confirm.`
    );
    
    if (!confirmed) return;

    const typedEmail = prompt('Type the user email to confirm deletion:');
    if (typedEmail !== user.email) {
      toast.error('Email does not match');
      return;
    }

    try {
      setActionLoading(true);
      await adminApi.deleteUser(id);
      toast.success('User deleted successfully');
      router.push('/admin/users');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminGuard>
        <AdminLayout>
          <div className="animate-pulse">
            <div className="h-8 bg-slate-700 rounded w-48 mb-8"></div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg shadow p-6 space-y-4">
              <div className="h-6 bg-slate-700 rounded w-64"></div>
              <div className="h-4 bg-slate-700 rounded w-96"></div>
              <div className="h-4 bg-slate-700 rounded w-80"></div>
            </div>
          </div>
        </AdminLayout>
      </AdminGuard>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AdminGuard>
      <AdminLayout>
        {/* Back Button */}
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6"
        >
          <FiArrowLeft />
          Back to Users
        </Link>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">{user.email}</h1>
          <div className="mt-2 flex items-center gap-4">
            <span className={`px-3 py-1 text-sm font-medium rounded-full border ${
              user.role === 'admin' 
                ? 'bg-purple-900/30 text-purple-300 border-purple-600' 
                : 'bg-slate-700 text-slate-300 border-slate-600'
            }`}>
              {user.role}
            </span>
            {user.subscription_plan !== 'starter' && user.subscription_status === 'active' && (
              <span className="px-3 py-1 text-sm font-medium rounded-full bg-yellow-900/30 text-yellow-300 border border-yellow-600">
                ⭐ {user.subscription_plan.charAt(0).toUpperCase() + user.subscription_plan.slice(1)}
              </span>
            )}
            {user.email_verified_at && (
              <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-900/30 text-green-300 border border-green-600">
                ✓ Verified
              </span>
            )}
            {user.is_oauth_user && (
              <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-900/30 text-blue-300 border border-blue-600">
                🔗 OAuth
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Details */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg shadow">
              <div className="p-6 border-b border-slate-700">
                <h2 className="text-lg font-semibold text-white">Account Details</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-400">Email</p>
                    <p className="mt-1 text-sm font-medium text-white flex items-center gap-2">
                      <FiMail size={16} />
                      {user.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">User ID</p>
                    <p className="mt-1 text-sm font-medium text-white">#{user.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Joined</p>
                    <p className="mt-1 text-sm font-medium text-white">
                      {format(new Date(user.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Last Login</p>
                    <p className="mt-1 text-sm font-medium text-white">
                      {user.last_login_at 
                        ? format(new Date(user.last_login_at), 'MMM d, yyyy h:mm a')
                        : 'Never'
                      }
                    </p>
                  </div>
                </div>

                {user.subscription_plan !== 'starter' && user.subscription_ends_at && (
                  <div className="pt-4 border-t border-slate-700">
                    <p className="text-sm text-slate-400">
                      Subscription {user.subscription_status === 'canceled' ? 'Ends' : 'Renews'}
                    </p>
                    <p className="mt-1 text-sm font-medium text-white">
                      {format(new Date(user.subscription_ends_at), 'MMM d, yyyy')}
                    </p>
                    {user.subscription_period && (
                      <p className="mt-1 text-xs text-slate-400">
                        {user.subscription_period.charAt(0).toUpperCase() + user.subscription_period.slice(1)} plan
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Profile Information */}
            {(user.location || user.timezone || user.phone || user.linkedin_url || user.website) && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg shadow">
                <div className="p-6 border-b border-slate-700">
                  <h2 className="text-lg font-semibold text-white">Profile Information</h2>
                </div>
                <div className="p-6 space-y-3">
                  {user.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <FiMapPin className="text-slate-400" />
                      <span className="text-white">{user.location}</span>
                    </div>
                  )}
                  {user.timezone && (
                    <div className="flex items-center gap-2 text-sm">
                      <FiGlobe className="text-slate-400" />
                      <span className="text-white">{user.timezone}</span>
                    </div>
                  )}
                  {user.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <FiPhone className="text-slate-400" />
                      <span className="text-white">{user.phone}</span>
                    </div>
                  )}
                  {user.linkedin_url && (
                    <div className="flex items-center gap-2 text-sm">
                      <FiLinkedin className="text-slate-400" />
                      <a 
                        href={user.linkedin_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        LinkedIn Profile
                      </a>
                    </div>
                  )}
                  {user.website && (
                    <div className="flex items-center gap-2 text-sm">
                      <FiGlobe className="text-slate-400" />
                      <a 
                        href={user.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        {user.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg shadow">
              <div className="p-6 border-b border-slate-700">
                <h2 className="text-lg font-semibold text-white">Activity Statistics</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{user.total_applications}</p>
                    <p className="text-sm text-slate-400">Applications</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{user.total_jobs}</p>
                    <p className="text-sm text-slate-400">Saved Jobs</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{user.total_reminders}</p>
                    <p className="text-sm text-slate-400">Reminders</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{user.total_documents}</p>
                    <p className="text-sm text-slate-400">Documents</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg shadow">
              <div className="p-6 border-b border-slate-700">
                <h2 className="text-lg font-semibold text-white">Actions</h2>
              </div>
              <div className="p-6 space-y-3">
                <button
                  onClick={handleTogglePremium}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                >
                  <FiCreditCard />
                  {user.subscription_plan !== 'starter' && user.subscription_status === 'active' ? 'Revoke Premium' : 'Grant Premium'}
                </button>

                {/* Inline subscription editor */}
                <div className="mt-3">
                  {!editingSubscription ? (
                    <button
                      onClick={() => {
                        // initialize form values from user
                        setSubscriptionPlan(user.subscription_plan || 'starter');
                        setSubscriptionStatus(user.subscription_status || 'active');
                        setSubscriptionEndsAt(user.subscription_ends_at ? user.subscription_ends_at.split('T')[0] : '');
                        setEditingSubscription(true);
                      }}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50"
                    >
                      ✏️ Set Plan
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 gap-2">
                        <select
                          value={subscriptionPlan}
                          onChange={(e) => setSubscriptionPlan(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-600 text-white rounded px-3 py-2"
                        >
                          <option value="starter">Starter</option>
                          <option value="pro">Pro</option>
                          <option value="premium">Premium</option>
                        </select>

                        <select
                          value={subscriptionStatus}
                          onChange={(e) => setSubscriptionStatus(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-600 text-white rounded px-3 py-2"
                        >
                          <option value="active">Active</option>
                          <option value="canceled">Canceled</option>
                          <option value="expired">Expired</option>
                        </select>

                        <input
                          type="date"
                          value={subscriptionEndsAt}
                          onChange={(e) => setSubscriptionEndsAt(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-600 text-white rounded px-3 py-2"
                          placeholder="Expiry date (optional)"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            if (!confirm(`Update subscription for ${user.email} to ${subscriptionPlan} (${subscriptionStatus})?`)) return;
                            try {
                              setActionLoading(true);
                              const expiresAt = subscriptionEndsAt ? new Date(subscriptionEndsAt).toISOString() : null;
                              await adminApi.toggleUserPremium(id, subscriptionPlan, subscriptionStatus, expiresAt);
                              toast.success('Subscription updated');
                              setEditingSubscription(false);
                              await loadUser();
                            } catch (err) {
                              console.error('Error updating subscription:', err);
                              toast.error('Failed to update subscription');
                            } finally {
                              setActionLoading(false);
                            }
                          }}
                          disabled={actionLoading}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingSubscription(false)}
                          disabled={actionLoading}
                          className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {user.role !== 'admin' && (
                  <button
                    onClick={() => handleChangeRole('admin')}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    <FiShield />
                    Make Admin
                  </button>
                )}

                {user.role === 'admin' && (
                  <button
                    onClick={() => handleChangeRole('user')}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    <FiShield />
                    Remove Admin
                  </button>
                )}

                <button
                  onClick={handleRevokeSessions}
                  disabled={actionLoading || user.active_sessions_count === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  <FiLogOut />
                  Revoke Sessions ({user.active_sessions_count})
                </button>

                <div className="pt-3 border-t border-slate-700">
                  <button
                    onClick={handleDeleteUser}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    <FiTrash2 />
                    Delete User
                  </button>
                </div>
              </div>
            </div>

            {/* Sessions Info */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg shadow">
              <div className="p-6 border-b border-slate-700">
                <h2 className="text-lg font-semibold text-white">Sessions</h2>
              </div>
              <div className="p-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-white">{user.active_sessions_count}</p>
                  <p className="text-sm text-slate-400 mt-1">Active Sessions</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Applications */}
        {applications.length > 0 && (
          <div className="mt-6 bg-slate-800 border border-slate-700 rounded-lg shadow">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">Recent Applications</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Job Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Stage</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Applied</th>
                  </tr>
                </thead>
                <tbody className="bg-slate-800 divide-y divide-slate-700">
                  {loadingApplications ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-center text-slate-400">Loading...</td>
                    </tr>
                  ) : (
                    applications.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-700/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                          {app.job_title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                          {app.company_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-900/30 text-blue-300 border border-blue-600">
                            {app.current_stage}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                          {app.applied_date 
                            ? format(new Date(app.applied_date), 'MMM d, yyyy')
                            : 'Not set'
                          }
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Saved Jobs */}
        {jobs.length > 0 && (
          <div className="mt-6 bg-slate-800 border border-slate-700 rounded-lg shadow">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">Saved Jobs</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Saved</th>
                  </tr>
                </thead>
                <tbody className="bg-slate-800 divide-y divide-slate-700">
                  {loadingJobs ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-center text-slate-400">Loading...</td>
                    </tr>
                  ) : (
                    jobs.map((job) => (
                      <tr key={job.id} className="hover:bg-slate-700/50">
                        <td className="px-6 py-4 text-sm font-medium text-white">
                          {job.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                          {job.company}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                          {job.location || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                          {job.created_at 
                            ? format(new Date(job.created_at), 'MMM d, yyyy')
                            : '-'
                          }
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {activity.length > 0 && (
          <div className="mt-6 bg-slate-800 border border-slate-700 rounded-lg shadow">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {loadingActivity ? (
                  <p className="text-center text-slate-400">Loading...</p>
                ) : (
                  activity.map((event) => (
                    <div key={event.id} className="flex gap-4 pb-4 border-b border-slate-700 last:border-0 last:pb-0">
                      <div className="flex-shrink-0">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          event.level === 'ERROR' ? 'bg-red-500' :
                          event.level === 'WARNING' ? 'bg-yellow-500' :
                          'bg-blue-500'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">{event.message}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {event.timestamp 
                            ? formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })
                            : 'Unknown time'
                          }
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </AdminGuard>
  );
}
