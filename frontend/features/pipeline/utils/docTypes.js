/**
 * Centralized helpers for document types + file input accept list.
 * Used by Apply/Attach flows (e.g., ApplicationDrawer, ApplyModal, etc.).
 */

/** Canonical type ids used by the backend */
export const DOC_TYPES = [
  'resume',
  'cover_letter',
  'portfolio',
  'certificate',
  'transcript',
  'reference',
  'other',
];

/** Human labels */
export const TYPE_LABELS = {
  resume: 'Resume',
  cover_letter: 'Cover letter',
  portfolio: 'Portfolio',
  certificate: 'Certificate',
  transcript: 'Transcript',
  reference: 'Reference',
  other: 'Other',
};

/** Normalize any backend/UI value to a known, safe type id */
export function normalizeDocType(t) {
  const k = String(t || '').toLowerCase();
  return DOC_TYPES.includes(k) ? k : 'other';
}

/** Safe label getter with reasonable fallback */
export function typeLabel(t) {
  const k = normalizeDocType(t);
  if (TYPE_LABELS[k]) return TYPE_LABELS[k];
  // Shouldn’t happen due to normalize, but keep legacy fallback:
  return String(t || 'Other')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Chip/badge styles for each type (tailwind class strings) */
export function typeChipClass(t) {
  switch (normalizeDocType(t)) {
    case 'resume':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30';
    case 'cover_letter':
      return 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30';
    case 'portfolio':
      return 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-400/30';
    case 'certificate':
      return 'bg-amber-500/20 text-amber-200 border-amber-400/30';
    case 'transcript':
      return 'bg-cyan-500/20 text-cyan-200 border-cyan-400/30';
    case 'reference':
      return 'bg-teal-500/20 text-teal-300 border-teal-400/30';
    default:
      return 'bg-slate-600/20 text-slate-200 border-slate-500/30';
  }
}

/** Handy for rendering a <select> */
export const DOC_TYPE_OPTIONS = DOC_TYPES.map((v) => ({
  value: v,
  label: typeLabel(v),
}));

/**
 * File input accept list — includes common docs, images, and audio.
 * Use as: <input type="file" accept={ACCEPT_ATTR} ... />
 */
export const ACCEPT_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.txt',
  '.rtf',
  '.png',
  '.jpg',
  '.jpeg',
  // Audio:
  '.mp3',
  '.wav',
  '.m4a',
  '.aac',
  '.ogg',
];
export const ACCEPT_ATTR = ACCEPT_EXTENSIONS.join(',');