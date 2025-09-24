// DOCUMENT & STATUS CONSTANTS
export const DOCUMENT_TYPES = [
  { value: 'resume',       label: 'Resume',       icon: 'resume' },
  { value: 'cover_letter', label: 'Cover Letter', icon: 'cover_letter' },
  { value: 'portfolio',    label: 'Portfolio',    icon: 'portfolio' },
  { value: 'certificate',  label: 'Certificate',  icon: 'certificate' },
  { value: 'transcript',   label: 'Transcript',   icon: 'transcript' },
  { value: 'reference',    label: 'Reference',    icon: 'reference' },
  { value: 'other',        label: 'Other',        icon: 'other' }
];

export const DOCUMENT_STATUS = [
  { value: 'active',   label: 'Active',   color: 'green'  },
  { value: 'draft',    label: 'Draft',    color: 'yellow' },
  { value: 'archived', label: 'Archived', color: 'gray'   },
  { value: 'template', label: 'Template', color: 'blue'   }
];
