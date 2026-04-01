/**
 * Profile API Module
 * Handles user profile, settings, and account management
 * 
 * Backend routes:
 *   Profile:    /api/profile/* (GET/PUT)
 *   Avatar:     /api/auth/upload-avatar (POST), /api/auth/delete-avatar (DELETE)
 *   Password:   /api/auth/change-password (POST)
 *   Prefs:      /api/auth/preferences (PUT)
 *   Security:   /api/auth/security (GET)
 *   2FA:        /api/auth/2fa/* (POST)
 *   Sessions:   /api/auth/sessions (GET/DELETE)
 *   Activity:   /api/auth/activity (GET)
 *   Deletion:   /api/profile/account (DELETE), /api/profile/cancel-deletion (POST)
 */

import { apiFetch, clearCache } from '../../lib/api/core';

// Types

export interface JobPreferencesResponse {
  company_size: string[];
  company_stage: string[];
  company_culture: string[];
  team_size: string;
  management_interest: boolean;
  preferences?: Record<string, unknown>;
}

export interface CareerGoalsResponse {
  short_term_goals: string[];
  long_term_goals: string[];
  career_path: string;
  goals?: string[];
}

export interface UserProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  avatar_url?: string;
  phone?: string;
  location?: string;
  timezone?: string;
  bio?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  twitter_url?: string;
  instagram_url?: string;
  youtube_url?: string;
  custom_links?: Array<{ platform: string; url: string }>;
  subscription_tier: 'free' | 'premium' | 'enterprise';
  email_verified: boolean;
  two_factor_enabled: boolean;
  profile_completed?: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationSettings {
  email_applications: boolean;
  email_interviews: boolean;
  email_reminders: boolean;
  email_weekly_summary: boolean;
  email_marketing: boolean;
  push_applications: boolean;
  push_interviews: boolean;
  push_reminders: boolean;
}

export interface SecuritySettings {
  two_factor_enabled: boolean;
  active_sessions: number;
  last_password_change: string;
  login_history: Array<{
    ip: string;
    location: string;
    device: string;
    timestamp: string;
  }>;
}

export interface ActivityLog {
  activities: Array<{
    id: number;
    type: string;
    description: string;
    metadata?: Record<string, unknown>;
    created_at: string;
  }>;
  total: number;
}

export interface PasswordChangeData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface AvatarUploadResponse {
  avatar_url: string;
}

// API Functions
export const profileApi = {
  /**
   * Get user profile
   */
  async getProfile(): Promise<UserProfile> {
    const response = await apiFetch('/profile');
    return response.json();
  },

  /**
   * Update user profile (account fields like name, bio, phone, location, social links)
   * Uses PUT /auth/profile for user account data, then re-fetches merged profile
   */
  async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    // Map frontend field names to backend field names
    const payload: Record<string, unknown> = {};
    if (data.first_name !== undefined) payload.first_name = data.first_name;
    if (data.last_name !== undefined) payload.last_name = data.last_name;
    if (data.full_name !== undefined) payload.full_name = data.full_name;
    if (data.bio !== undefined) payload.bio = data.bio;
    if (data.phone !== undefined) payload.phone = data.phone;
    if (data.location !== undefined) payload.location = data.location;
    if (data.timezone !== undefined) payload.timezone = data.timezone;
    if (data.linkedin_url !== undefined) payload.linkedin_url = data.linkedin_url;
    if (data.github_url !== undefined) payload.github_url = data.github_url;
    if (data.portfolio_url !== undefined) payload.website = data.portfolio_url;

    // Update user account fields via auth endpoint
    await apiFetch('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    // Clear cached profile data so re-fetch gets fresh data
    clearCache('GET:/profile');

    // Re-fetch the merged profile data
    return this.getProfile();
  },

  /**
   * Upload avatar - uses /auth/upload-avatar endpoint
   */
  async uploadAvatar(file: File): Promise<AvatarUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiFetch('/auth/upload-avatar', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    });
    return response.json();
  },

  /**
   * Get current user info (auth endpoint)
   */
  async getCurrentUser(): Promise<UserProfile> {
    const response = await apiFetch('/auth/me');
    return response.json();
  },

  /**
   * Update user preferences (auth endpoint)
   */
  async updatePreferences(preferences: Partial<NotificationSettings>): Promise<NotificationSettings> {
    const response = await apiFetch('/auth/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
    return response.json();
  },

  /**
   * Change password - uses /auth/change-password endpoint
   */
  async changePassword(data: PasswordChangeData): Promise<void> {
    const response = await apiFetch('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Password change failed' }));
      if (errorData.error?.details && Array.isArray(errorData.error.details)) {
        const messages = errorData.error.details.map((err: { msg?: string; message?: string }) =>
          (err.msg?.replace('Value error, ', '') || err.message || 'Validation error')
        );
        throw new Error(messages.join('. '));
      }
      if (errorData.error?.message) throw new Error(errorData.error.message);
      if (errorData.detail) throw new Error(errorData.detail);
      throw new Error('Password change failed');
    }
  },

  /**
   * Get job preferences
   */
  async getJobPreferences(): Promise<JobPreferencesResponse> {
    const response = await apiFetch('/profile/job-preferences');
    return response.json();
  },

  /**
   * Update job preferences
   */
  async updateJobPreferences(data: Record<string, unknown>): Promise<{ message: string }> {
    const response = await apiFetch('/profile/job-preferences', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.json();
  },

  /**
   * Get career goals
   */
  async getCareerGoals(): Promise<CareerGoalsResponse> {
    const response = await apiFetch('/profile/career-goals');
    return response.json();
  },

  /**
   * Update career goals
   */
  async updateCareerGoals(data: Record<string, unknown>): Promise<{ message: string }> {
    const response = await apiFetch('/profile/career-goals', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.json();
  },

  /**
   * Mark welcome modal as seen
   */
  async markWelcomeModalSeen(): Promise<void> {
    await apiFetch('/auth/welcome-modal-seen', { method: 'POST' });
  },

  // =========================================================================
  // Connected to backend endpoints
  // =========================================================================

  /** Delete avatar via dedicated endpoint */
  async deleteAvatar(): Promise<void> {
    const response = await apiFetch('/auth/delete-avatar', { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete avatar');
  },

  /**
   * Get notification settings from preferences store
   * Uses /preferences/notification_settings key
   */
  async getNotificationSettings(): Promise<NotificationSettings> {
    try {
      const response = await apiFetch('/preferences/notification_settings');
      if (!response.ok) throw new Error('not found');
      const data = await response.json();
      return data.preference_value ?? data;
    } catch {
      // Return defaults if no preference saved yet
      return {
        email_applications: true, email_interviews: true, email_reminders: true,
        email_weekly_summary: true, email_marketing: false,
        push_applications: false, push_interviews: false, push_reminders: false,
      };
    }
  },

  /**
   * Save notification settings to preferences store
   */
  async updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<NotificationSettings> {
    const current = await profileApi.getNotificationSettings();
    const merged = { ...current, ...settings };
    await apiFetch('/preferences', {
      method: 'POST',
      body: JSON.stringify({ preference_key: 'notification_settings', preference_value: merged }),
    });
    return merged;
  },

  /**
   * Get security overview from backend
   */
  async getSecuritySettings(): Promise<SecuritySettings> {
    const response = await apiFetch('/auth/security');
    if (!response.ok) {
      return {
        two_factor_enabled: false,
        active_sessions: 1,
        last_password_change: '',
        login_history: [],
      };
    }
    return response.json();
  },

  /** Enable 2FA - generates QR code and secret */
  async enableTwoFactor(): Promise<{ qr_code: string; secret: string }> {
    const response = await apiFetch('/auth/2fa/enable', { method: 'POST' });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Failed to enable 2FA' }));
      throw new Error(err.detail || 'Failed to enable 2FA');
    }
    return response.json();
  },

  /** Verify 2FA setup with TOTP code - returns backup codes */
  async verifyTwoFactor(code: string): Promise<{ backup_codes: string[] }> {
    const response = await apiFetch('/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Invalid code' }));
      throw new Error(err.detail || 'Verification failed');
    }
    return response.json();
  },

  /** Disable 2FA - requires password */
  async disableTwoFactor(password: string): Promise<void> {
    const response = await apiFetch('/auth/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Failed to disable 2FA' }));
      throw new Error(err.detail || 'Failed to disable 2FA');
    }
  },

  /**
   * Get active sessions from backend
   */
  async getSessions(): Promise<Array<{
    id: string; device: string; ip: string; location: string; last_active: string; current: boolean;
  }>> {
    const response = await apiFetch('/auth/sessions');
    if (!response.ok) {
      return [{
        id: 'current',
        device: navigator.userAgent.includes('Mobile') ? 'Mobile Browser' : 'Desktop Browser',
        ip: '',
        location: '',
        last_active: new Date().toISOString(),
        current: true,
      }];
    }
    return response.json();
  },

  /** Revoke a single session */
  async revokeSession(sessionId: string): Promise<void> {
    const response = await apiFetch(`/auth/sessions/${sessionId}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to revoke session');
  },

  /**
   * Revoke all sessions - uses POST /auth/logout_all
   */
  async revokeAllSessions(): Promise<void> {
    const response = await apiFetch('/auth/logout_all', { method: 'POST' });
    if (!response.ok) throw new Error('Failed to revoke sessions');
  },

  /**
   * Get user activity log from backend
   */
  async getActivityLog(params?: { page?: number; limit?: number }): Promise<ActivityLog> {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const response = await apiFetch(`/auth/activity?page=${page}&limit=${limit}`);
    if (!response.ok) return { activities: [], total: 0 };
    return response.json();
  },

  /**
   * Export all user data - uses GET /profile/export
   */
  async exportData(): Promise<Blob> {
    const response = await apiFetch('/profile/export');
    if (!response.ok) throw new Error('Failed to export data');
    const data = await response.json();
    return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  },

  /**
   * Request account deletion - uses DELETE /profile/account
   */
  async requestAccountDeletion(password: string, reason?: string): Promise<void> {
    const response = await apiFetch('/profile/account', {
      method: 'DELETE',
      body: JSON.stringify({ password, confirmation: 'DELETE', reason }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Deletion failed' }));
      throw new Error(err.detail || 'Failed to delete account');
    }
  },

  /** Cancel a pending account deletion */
  async cancelAccountDeletion(): Promise<void> {
    const response = await apiFetch('/profile/cancel-deletion', { method: 'POST' });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Failed to cancel deletion' }));
      throw new Error(err.detail || 'Failed to cancel deletion');
    }
  },

  /**
   * Resend email verification link.
   * Backend: POST /auth/send_verification  { email }
   */
  async resendVerificationEmail(email: string): Promise<void> {
    const response = await apiFetch('/auth/send_verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Failed to send verification email' }));
      throw new Error(err.detail || 'Failed to send verification email');
    }
  },
};
