import { login as libLogin, api as libApi } from "../lib/api";

/** POST JSON helper (fallback when lib/api is missing a method) */
async function jsonFetch(url, options = {}) {
  const res = await fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json().catch(() => ({}));
}

/** Email/password login with remember-me */
export async function loginWithEmail(email, password, remember = false) {
  if (typeof libLogin === "function") {
    return libLogin(email, password, remember);
  }
  // Fallback to REST
  const data = await jsonFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, remember }),
  });
  return !!data?.success;
}

/** Register user */
export async function registerUser({ 
  email, 
  password, 
  full_name,
  terms_accepted,
  privacy_accepted,
  age_verified,
  data_processing_consent
}) {
  if (libApi?.register) {
    return libApi.register({ 
      email, 
      password, 
      full_name,
      terms_accepted,
      privacy_accepted,
      age_verified,
      data_processing_consent
    });
  }
  return jsonFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ 
      email, 
      password, 
      full_name,
      terms_accepted,
      privacy_accepted,
      age_verified,
      data_processing_consent
    }),
  });
}

/** Logout */
export async function logoutUser() {
  if (libApi?.logout) return libApi.logout();
  return jsonFetch("/api/auth/logout", { method: "POST" });
}

/** Optional: password reset start (if needed later) */
export async function startPasswordReset(email) {
  if (libApi?.startPasswordReset) return libApi.startPasswordReset(email);
  return jsonFetch("/api/auth/reset/start", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export default {
  loginWithEmail,
  registerUser,
  logoutUser,
  startPasswordReset,
};
