/**
 * Safe localStorage wrapper
 *
 * Handles Safari private browsing, disabled storage, quota exceeded,
 * and other edge cases where localStorage throws.
 */

/**
 * Safely get a value from localStorage.
 * Returns `null` if the key doesn't exist or storage is unavailable.
 */
export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Safely set a value in localStorage.
 * Returns `true` on success, `false` if storage is unavailable or quota exceeded.
 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely remove a value from localStorage.
 * Returns `true` on success, `false` if storage is unavailable.
 */
export function safeRemoveItem(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely get and parse a JSON value from localStorage.
 * Returns `defaultValue` if the key doesn't exist, parsing fails, or storage is unavailable.
 */
export function safeGetJSON<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Safely stringify and store a JSON value in localStorage.
 * Returns `true` on success, `false` if storage is unavailable or quota exceeded.
 */
export function safeSetJSON(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
