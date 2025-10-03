// frontend/services/admin.js
import { apiFetch } from '../lib/api';

// ==================== DASHBOARD & STATS ====================

export const getDashboardStats = async () => {
  const res = await apiFetch('/admin/dashboard/stats');
  if (!res.ok) throw new Error('Failed to fetch dashboard stats');
  return res.json();
};

export const getSystemHealth = async () => {
  const res = await apiFetch('/admin/system/health');
  if (!res.ok) throw new Error('Failed to fetch system health');
  return res.json();
};

export const getAnalytics = async (days = 30) => {
  const res = await apiFetch(`/admin/analytics?days=${days}`);
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
};

// ==================== USER MANAGEMENT ====================

export const listUsers = async ({
  page = 1,
  page_size = 50,
  search = null,
  is_premium = null,
  is_admin = null,
  sort_by = 'created_at',
  sort_order = 'desc'
}) => {
  const params = new URLSearchParams();
  params.append('page', page);
  params.append('page_size', page_size);
  if (search) params.append('search', search);
  if (is_premium !== null) params.append('is_premium', is_premium);
  if (is_admin !== null) params.append('is_admin', is_admin);
  params.append('sort_by', sort_by);
  params.append('sort_order', sort_order);

  const res = await apiFetch(`/admin/users?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
};

export const getUserDetail = async (userId) => {
  const res = await apiFetch(`/admin/users/${userId}`);
  if (!res.ok) throw new Error('Failed to fetch user details');
  return res.json();
};

export const updateUserAdminStatus = async (userId, isAdmin) => {
  const res = await apiFetch(`/admin/users/${userId}/admin-status`, {
    method: 'PATCH',
    body: JSON.stringify({ is_admin: isAdmin })
  });
  if (!res.ok) throw new Error('Failed to update admin status');
  return res.json();
};

export const updateUserPremiumStatus = async (userId, isPremium, expiresAt = null) => {
  const res = await apiFetch(`/admin/users/${userId}/premium-status`, {
    method: 'PATCH',
    body: JSON.stringify({ is_premium: isPremium, expires_at: expiresAt })
  });
  if (!res.ok) throw new Error('Failed to update premium status');
  return res.json();
};

// ==================== ADMIN LOGS ====================

export const getAdminLogs = async ({
  page = 1,
  page_size = 50,
  admin_id = null,
  action = null
}) => {
  const params = new URLSearchParams();
  params.append('page', page);
  params.append('page_size', page_size);
  if (admin_id) params.append('admin_id', admin_id);
  if (action) params.append('action', action);

  const res = await apiFetch(`/admin/logs?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch admin logs');
  return res.json();
};
