/**
 * Friendly error formatting for auth flows.
 *
 * Handles:
 *  - FastAPI 422 validation payloads ({ detail: [{ loc, msg, type }] })
 *  - Backend HTTPException 400 messages (string detail)
 *  - 401 invalid credentials
 *  - 403 banned / suspended
 *  - 429 rate limited (with Retry-After hints)
 *  - 5xx server errors
 *  - Network failures
 *  - ApiError instances
 */

import { ApiError } from './api/core';

interface FastAPIValidationItem {
  loc: (string | number)[];
  msg: string;
  type: string;
  ctx?: Record<string, unknown>;
}

const FIELD_LABELS: Record<string, string> = {
  email: 'Email',
  password: 'Password',
  full_name: 'Full name',
  first_name: 'First name',
  last_name: 'Last name',
  phone: 'Phone',
  terms_accepted: 'Terms of Service',
  privacy_accepted: 'Privacy Policy',
  age_verified: 'Age confirmation',
  data_processing_consent: 'Data processing consent',
};

function humanizeField(field: string): string {
  return FIELD_LABELS[field] ?? field.replace(/_/g, ' ');
}

function mapValidationItem(item: FastAPIValidationItem): string {
  // last segment of loc that isn't 'body' is usually the field name
  const fieldRaw = [...item.loc].reverse().find((p) => p !== 'body');
  const field = typeof fieldRaw === 'string' ? humanizeField(fieldRaw) : 'Field';
  const msg = (item.msg || '').trim();

  // Common pydantic messages → friendlier copy
  if (item.type === 'value_error.email' || /valid email/i.test(msg)) {
    return 'Please enter a valid email address.';
  }
  if (item.type === 'string_too_short' || /at least \d+ characters/i.test(msg)) {
    if (fieldRaw === 'password') return 'Password must be at least 8 characters.';
    return `${field} is too short.`;
  }
  if (item.type === 'string_too_long') {
    return `${field} is too long.`;
  }
  if (item.type === 'missing' || /field required/i.test(msg)) {
    return `${field} is required.`;
  }
  if (item.type === 'bool_type' || item.type === 'bool_parsing') {
    return `${field} must be accepted.`;
  }
  // Password strength messages thrown from validator
  if (/uppercase letter/i.test(msg)) return 'Password must contain at least one uppercase letter.';
  if (/lowercase letter/i.test(msg)) return 'Password must contain at least one lowercase letter.';
  if (/number|digit/i.test(msg)) return 'Password must contain at least one number.';
  if (/special character/i.test(msg)) return 'Password must contain at least one special character (e.g. !@#$%).';

  // Pydantic v2 prefixes errors with "Value error, " — strip it
  const cleaned = msg.replace(/^Value error,\s*/i, '');
  return `${field}: ${cleaned}`;
}

function mapKnownBackendMessage(status: number, detail: string): string | null {
  const d = detail.toLowerCase();

  if (status === 400) {
    if (d.includes('email already registered')) {
      return 'This email is already registered. Try signing in instead.';
    }
    if (d.includes('legal agreements')) {
      return 'You must accept the Terms of Service, Privacy Policy, age confirmation, and data processing consent to continue.';
    }
    if (d.includes('email not verified')) {
      return 'Please verify your email address before signing in. Check your inbox for the verification link.';
    }
  }

  if (status === 401) {
    if (d.includes('invalid') || d.includes('incorrect') || d.includes('credentials')) {
      return 'Invalid email or password.';
    }
    return 'Invalid email or password.';
  }

  if (status === 403) {
    if (d.includes('suspended') || d.includes('banned') || d.includes('blocked')) {
      return detail; // backend's message is already user-friendly
    }
    return 'Access denied.';
  }

  return null;
}

export interface FormattedAuthError {
  message: string;
  /** Optional list of secondary messages (e.g. one per failed field) */
  details?: string[];
  status?: number;
}

/**
 * Convert any thrown/returned error from an auth API call into user-facing text.
 */
export function formatAuthError(err: unknown, fallback = 'Something went wrong. Please try again.'): FormattedAuthError {
  // Network / unknown
  if (err instanceof TypeError) {
    return { message: 'Network error — please check your connection and try again.' };
  }

  if (err instanceof ApiError) {
    return formatApiErrorBody(err.status, err.detail, err.message, fallback);
  }

  if (err instanceof Error) {
    return { message: err.message || fallback };
  }

  return { message: fallback };
}

/**
 * Convert a fetch Response (already known to be non-ok) into user-facing text.
 * Reads the JSON body for you.
 */
export async function formatResponseError(
  res: Response,
  fallback = 'Something went wrong. Please try again.',
): Promise<FormattedAuthError> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* empty body */
  }

  const formatted = formatApiErrorBody(res.status, body, res.statusText, fallback);

  if (res.status === 429) {
    const retry = res.headers.get('Retry-After');
    const seconds = retry ? parseInt(retry, 10) : NaN;
    if (Number.isFinite(seconds) && seconds > 0) {
      const minutes = Math.ceil(seconds / 60);
      formatted.message = `Too many attempts. Please try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
    } else {
      formatted.message = 'Too many attempts. Please wait a moment and try again.';
    }
  }

  return formatted;
}

function formatApiErrorBody(
  status: number,
  body: unknown,
  fallbackDetail: string,
  fallback: string,
): FormattedAuthError {
  // Extract `detail` (FastAPI convention) — could be string or array
  const detail = (body && typeof body === 'object' && 'detail' in body
    ? (body as { detail: unknown }).detail
    : undefined) ?? fallbackDetail;

  // 422 validation array
  if (status === 422 && Array.isArray(detail)) {
    const items = detail as FastAPIValidationItem[];
    const messages = items.map(mapValidationItem);
    const unique = Array.from(new Set(messages));
    return {
      status,
      message: unique[0] ?? 'Please check the form and try again.',
      details: unique.length > 1 ? unique : undefined,
    };
  }

  if (typeof detail === 'string') {
    const known = mapKnownBackendMessage(status, detail);
    if (known) return { status, message: known };

    if (status >= 500) {
      return { status, message: 'Our server is having trouble. Please try again in a moment.' };
    }
    if (status === 429) {
      return { status, message: 'Too many attempts. Please wait a moment and try again.' };
    }
    return { status, message: detail || fallback };
  }

  if (status >= 500) {
    return { status, message: 'Our server is having trouble. Please try again in a moment.' };
  }
  return { status, message: fallback };
}
