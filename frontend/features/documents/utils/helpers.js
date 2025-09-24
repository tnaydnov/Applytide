// GENERIC, TESTABLE HELPERS

export function sanitizeName(name) {
  return (name || '')
    .replace(/\.[^/.]+$/, '')            // drop extension if present
    .replace(/[^a-z0-9 _-]+/gi, '')      // keep safe chars
    .trim();
}

export const getCompany = (job) =>
  job?.company || job?.company_name || 'Unknown Company';

export const getDocName = (d) =>
  d?.name || d?.file_name || d?.filename || 'Untitled';

export function getScoreColor(score) {
  if (Number(score) >= 80) return 'text-green-400';
  if (Number(score) >= 60) return 'text-yellow-400';
  return 'text-red-400';
}
