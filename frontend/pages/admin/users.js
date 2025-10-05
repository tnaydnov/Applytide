// frontend/pages/admin/users.js
import { useState } from 'react';
import AdminGuard from '../../components/guards/AdminGuard';
import PageContainer from '../../components/layout/PageContainer';
import PageHeader from '../../components/layout/PageHeader';
import { useAdminUsers } from '../../features/admin/hooks/useAdminData';
import UsersTable from '../../features/admin/components/UsersTable';
import { Button } from '../../components/ui';
import { getUserDetail, updateUserAdminStatus, updateUserPremiumStatus } from '../../services/admin';
import toast from '../../lib/toast';

export default function AdminUsers() {
  const [filters, setFilters] = useState({ page: 1, page_size: 50 });
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { users, total, totalPages, loading, error, refresh } = useAdminUsers(filters);

  const handleUserClick = async (user) => {
    try {
      const details = await getUserDetail(user.id);
      setSelectedUser(details);
      setDetailsOpen(true);
    } catch (err) {
      toast.error('Failed to load user details');
    }
  };

  const handleUpdateAdminStatus = async (userId, isAdmin) => {
    try {
      await updateUserAdminStatus(userId, isAdmin);
      toast.success('Admin status updated');
      refresh();
      if (selectedUser?.id === userId) {
        const details = await getUserDetail(userId);
        setSelectedUser(details);
      }
    } catch (err) {
      toast.error('Failed to update admin status');
    }
  };

  const handleUpdatePremiumStatus = async (userId, isPremium) => {
    try {
      await updateUserPremiumStatus(userId, isPremium);
      toast.success('Premium status updated');
      refresh();
      if (selectedUser?.id === userId) {
        const details = await getUserDetail(userId);
        setSelectedUser(details);
      }
    } catch (err) {
      toast.error('Failed to update premium status');
    }
  };

  return (
    <AdminGuard>
      <PageContainer>
        <PageHeader
          title="User Management"
          subtitle={`${total} total users`}
          actions={
            <Button onClick={refresh} variant="outline">
              Refresh
            </Button>
          }
        />

        {/* Filters */}
        <div className="glass-card p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <input
              type="text"
              placeholder="Search by email or name..."
              className="input-glass input-cyan flex-1 min-w-[200px]"
              onChange={(e) => {
                const search = e.target.value || null;
                setFilters(f => ({ ...f, search, page: 1 }));
              }}
            />
            
            <select
              className="input-glass input-cyan"
              onChange={(e) => {
                const value = e.target.value;
                setFilters(f => ({ 
                  ...f, 
                  is_premium: value === 'all' ? null : value === 'true',
                  page: 1 
                }));
              }}
            >
              <option value="all">All Users</option>
              <option value="true">Premium Only</option>
              <option value="false">Free Only</option>
            </select>

            <select
              className="input-glass input-cyan"
              onChange={(e) => {
                const value = e.target.value;
                setFilters(f => ({ 
                  ...f, 
                  is_admin: value === 'all' ? null : value === 'true',
                  page: 1 
                }));
              }}
            >
              <option value="all">All Roles</option>
              <option value="true">Admins Only</option>
              <option value="false">Regular Users</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
          </div>
        ) : error ? (
          <div className="glass-card p-6 text-center text-red-300">
            Error: {error}
          </div>
        ) : (
          <>
            <UsersTable 
              users={users} 
              onUserClick={handleUserClick}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  disabled={filters.page === 1}
                  onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                >
                  Previous
                </Button>
                <div className="px-4 py-2 text-slate-300">
                  Page {filters.page} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  disabled={filters.page === totalPages}
                  onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}

        {/* User Details Modal */}
        {detailsOpen && selectedUser && (
          <div 
            className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setDetailsOpen(false)}
          >
            <div 
              className="modal-glass w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <h2 className="modal-title text-xl mb-4">User Details</h2>

                <div className="space-y-4">
                  {/* Basic Info */}
                  <div className="field">
                    <div className="field-label">Email</div>
                    <div className="field-value">{selectedUser.email}</div>
                  </div>

                  <div className="field">
                    <div className="field-label">Name</div>
                    <div className="field-value">{selectedUser.full_name || 'Not set'}</div>
                  </div>

                  {/* Status */}
                  <div className="field">
                    <div className="field-label">Admin Status</div>
                    <div className="flex items-center gap-2">
                      <span className={selectedUser.is_admin ? 'text-rose-300' : 'text-slate-400'}>
                        {selectedUser.is_admin ? 'Admin' : 'Regular User'}
                      </span>
                      <Button
                        onClick={() => handleUpdateAdminStatus(selectedUser.id, !selectedUser.is_admin)}
                        variant="outline"
                        size="sm"
                      >
                        {selectedUser.is_admin ? 'Remove Admin' : 'Make Admin'}
                      </Button>
                    </div>
                  </div>

                  <div className="field">
                    <div className="field-label">Premium Status</div>
                    <div className="flex items-center gap-2">
                      <span className={selectedUser.is_premium ? 'text-amber-300' : 'text-slate-400'}>
                        {selectedUser.is_premium ? 'Premium' : 'Free'}
                      </span>
                      <Button
                        onClick={() => handleUpdatePremiumStatus(selectedUser.id, !selectedUser.is_premium)}
                        variant="outline"
                        size="sm"
                      >
                        {selectedUser.is_premium ? 'Remove Premium' : 'Grant Premium'}
                      </Button>
                    </div>
                  </div>

                  {/* Activity Stats */}
                  <div className="modal-divider my-4" />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="field">
                      <div className="field-label">Applications</div>
                      <div className="field-value">{selectedUser.total_applications}</div>
                    </div>
                    <div className="field">
                      <div className="field-label">Documents</div>
                      <div className="field-value">{selectedUser.total_documents}</div>
                    </div>
                    <div className="field">
                      <div className="field-label">Jobs</div>
                      <div className="field-value">{selectedUser.total_jobs}</div>
                    </div>
                    <div className="field">
                      <div className="field-label">Reminders</div>
                      <div className="field-value">{selectedUser.total_reminders}</div>
                    </div>
                  </div>

                  {/* Timestamps */}
                  <div className="modal-divider my-4" />
                  
                  <div className="field">
                    <div className="field-label">Last Login</div>
                    <div className="field-value">
                      {selectedUser.last_login_at 
                        ? new Date(selectedUser.last_login_at).toLocaleString()
                        : 'Never'}
                    </div>
                  </div>

                  <div className="field">
                    <div className="field-label">Joined</div>
                    <div className="field-value">
                      {new Date(selectedUser.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button onClick={() => setDetailsOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    </AdminGuard>
  );
}
