/**
 * @fileoverview API utility functions
 * Helper functions for API calls
 */

/**
 * Converts params object to URL query string
 * @param params - Query parameters as object or string
 * @returns Query string (without leading ?)
 */
export function toQuery(params: Record<string, string | number | boolean | undefined | null> | string | undefined | null): string {
  if (!params) return "";
  if (typeof params === "string") return params.replace(/^\?/, "");
  
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    usp.set(k, String(v));
  });
  return usp.toString();
}
