/**
 * @fileoverview API utility functions
 * Extracted from lib/api.js during refactoring
 */

/**
 * Converts params object to URL query string
 * @param {Object|string} params - Query parameters
 * @returns {string} Query string (without leading ?)
 */
export function toQuery(params) {
  if (!params) return "";
  if (typeof params === "string") return params.replace(/^\?/, "");
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    usp.set(k, String(v));
  });
  return usp.toString();
}
