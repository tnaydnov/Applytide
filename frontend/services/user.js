import { api as libApi } from "../lib/api";

/** Upload avatar */
export async function uploadAvatar(file) {
  if (libApi?.uploadAvatar) return libApi.uploadAvatar(file);

  const form = new FormData();
  form.append("avatar", file);

  const res = await fetch("/api/user/avatar", {
    method: "POST",
    body: form,
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Upload failed (${res.status})`);
  }
  return res.json().catch(() => ({}));
}

/** Update personal info */
export async function updateProfile(data) {
  if (libApi?.updateProfile) return libApi.updateProfile(data);

  const res = await fetch("/api/user/profile", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Update failed (${res.status})`);
  }
  return res.json().catch(() => ({}));
}

/** Update notification preferences */
export async function updatePreferences(data) {
  if (libApi?.updatePreferences) return libApi.updatePreferences(data);

  const res = await fetch("/api/user/preferences", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Update failed (${res.status})`);
  }
  return res.json().catch(() => ({}));
}

/** Change password */
export async function changePassword({ current_password, new_password }) {
  if (libApi?.changePassword) return libApi.changePassword({ current_password, new_password });

  const res = await fetch("/api/auth/change-password", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ current_password, new_password }),
  });
  
  if (!res.ok) {
    let errorMessage = "Password change failed";
    
    try {
      const errorData = await res.json();
      
      // Handle validation errors with details array
      if (errorData.error?.details && Array.isArray(errorData.error.details)) {
        const messages = errorData.error.details.map(err => {
          // Clean up the message (remove "Value error, " prefix)
          return err.msg?.replace('Value error, ', '') || err.message || 'Validation error';
        });
        errorMessage = messages.join('. ');
      }
      // Handle simple error messages
      else if (errorData.error?.message) {
        errorMessage = errorData.error.message;
      }
      // Handle detail field (common in FastAPI)
      else if (errorData.detail) {
        errorMessage = errorData.detail;
      }
    } catch (parseError) {
      const text = await res.text().catch(() => "");
      if (text) errorMessage = text;
    }
    
    throw new Error(errorMessage);
  }
  
  return res.json().catch(() => ({}));
}

/** Logout */
export async function logout() {
  if (libApi?.logout) return libApi.logout();
  return fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
}

export default {
  uploadAvatar,
  updateProfile,
  updatePreferences,
  changePassword,
  logout,
};
