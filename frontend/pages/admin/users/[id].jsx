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
    if (!confirm(`${user.is_premium ? 'Revoke' : 'Grant'} premium for ${user.email}?`)) {
      return;
    }

    try {
      setActionLoading(true);
      const expiresAt = !user.is_premium 
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year from now
        : null;
      
      await adminApi.toggleUserPremium(id, !user.is_premium, expiresAt);
      toast.success(`Premium ${user.is_premium ? 'revoked' : 'granted'} successfully`);
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
            <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
            <div className="bg-white rounded-lg shadow p-6 space-y-4">
              <div className="h-6 bg-gray-200 rounded w-64"></div>
              <div className="h-4 bg-gray-200 rounded w-96"></div>
              <div className="h-4 bg-gray-200 rounded w-80"></div>
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
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
        >
          <FiArrowLeft />
          Back to Users
        </Link>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{user.email}</h1>
          <div className="mt-2 flex items-center gap-4">
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${
              user.role === 'admin' 
                ? 'bg-purple-100 text-purple-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {user.role}
            </span>
            {user.is_premium && (
              <span className="px-3 py-1 text-sm font-medium rounded-full bg-yellow-100 text-yellow-800">
                ⭐ Premium
              </span>
            )}
            {user.email_verified_at && (
              <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">
                ✓ Verified
              </span>
            )}
            {user.is_oauth_user && (
              <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
                🔗 OAuth
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Details */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Account Details</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="mt-1 text-sm font-medium text-gray-900 flex items-center gap-2">
                      <FiMail size={16} />
                      {user.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">User ID</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">#{user.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Joined</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {format(new Date(user.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Last Login</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {user.last_login_at 
                        ? format(new Date(user.last_login_at), 'MMM d, yyyy h:mm a')
                        : 'Never'
                      }
                    </p>
                  </div>
                </div>

                {user.is_premium && user.premium_expires_at && (
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600">Premium Expires</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {format(new Date(user.premium_expires_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Information */}
            {(user.location || user.timezone || user.phone || user.linkedin_url || user.website) && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
                </div>
                <div className="p-6 space-y-3">
                  {user.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <FiMapPin className="text-gray-400" />
                      <span className="text-gray-900">{user.location}</span>
                    </div>
                  )}
                  {user.timezone && (
                    <div className="flex items-center gap-2 text-sm">
                      <FiGlobe className="text-gray-400" />
                      <span className="text-gray-900">{user.timezone}</span>
                    </div>
                  )}
                  {user.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <FiPhone className="text-gray-400" />
                      <span className="text-gray-900">{user.phone}</span>
                    </div>
                  )}
                  {user.linkedin_url && (
                    <div className="flex items-center gap-2 text-sm">
                      <FiLinkedin className="text-gray-400" />
                      <a 
                        href={user.linkedin_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        LinkedIn Profile
                      </a>
                    </div>
                  )}
                  {user.website && (
                    <div className="flex items-center gap-2 text-sm">
                      <FiGlobe className="text-gray-400" />
                      <a 
                        href={user.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {user.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Activity Statistics</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{user.total_applications}</p>
                    <p className="text-sm text-gray-600">Applications</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{user.total_jobs}</p>
                    <p className="text-sm text-gray-600">Saved Jobs</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{user.total_reminders}</p>
                    <p className="text-sm text-gray-600">Reminders</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{user.total_documents}</p>
                    <p className="text-sm text-gray-600">Documents</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Actions</h2>
              </div>
              <div className="p-6 space-y-3">
                <button
                  onClick={handleTogglePremium}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                >
                  <FiCreditCard />
                  {user.is_premium ? 'Revoke Premium' : 'Grant Premium'}
                </button>

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

                <div className="pt-3 border-t border-gray-200">
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
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Sessions</h2>
              </div>
              <div className="p-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900">{user.active_sessions_count}</p>
                  <p className="text-sm text-gray-600 mt-1">Active Sessions</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Applications */}
        {applications.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Applications</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applied</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loadingApplications ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-center text-gray-500">Loading...</td>
                    </tr>
                  ) : (
                    applications.map((app) => (
                      <tr key={app.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {app.job_title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {app.company_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            {app.current_stage}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
          <div className="mt-6 bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Saved Jobs</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Saved</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loadingJobs ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-center text-gray-500">Loading...</td>
                    </tr>
                  ) : (
                    jobs.map((job) => (
                      <tr key={job.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {job.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {job.company}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {job.location || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {format(new Date(job.created_at), 'MMM d, yyyy')}
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
          <div className="mt-6 bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {loadingActivity ? (
                  <p className="text-center text-gray-500">Loading...</p>
                ) : (
                  activity.map((event) => (
                    <div key={event.id} className="flex gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                      <div className="flex-shrink-0">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          event.level === 'ERROR' ? 'bg-red-500' :
                          event.level === 'WARNING' ? 'bg-yellow-500' :
                          'bg-blue-500'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">{event.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
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
