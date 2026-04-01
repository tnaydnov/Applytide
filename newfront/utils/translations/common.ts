/**
 * Common Translations
 * 
 * Commonly used translations across the application.
 */

import { TranslatedText } from "./types";

export const commonTranslations = {
  // Actions
  save: { en: "Save", he: "שמור" },
  cancel: { en: "Cancel", he: "ביטול" },
  delete: { en: "Delete", he: "מחק" },
  edit: { en: "Edit", he: "ערוך" },
  close: { en: "Close", he: "סגור" },
  submit: { en: "Submit", he: "שלח" },
  search: { en: "Search", he: "חיפוש" },
  filter: { en: "Filter", he: "סינון" },
  
  // Status
  loading: { en: "Loading...", he: "טוען..." },
  error: { en: "Error", he: "שגיאה" },
  success: { en: "Success", he: "הצלחה" },
  warning: { en: "Warning", he: "אזהרה" },
  
  // Common UI
  home: { en: "Home", he: "בית" },
  back: { en: "Back", he: "חזור" },
  next: { en: "Next", he: "הבא" },
  previous: { en: "Previous", he: "הקודם" },
  
  // Time
  today: { en: "Today", he: "היום" },
  yesterday: { en: "Yesterday", he: "אתמול" },
  tomorrow: { en: "Tomorrow", he: "מחר" },
  
  // Other
  optional: { en: "Optional", he: "אופציונלי" },
  required: { en: "Required", he: "חובה" },
  or: { en: "or", he: "או" },
  and: { en: "and", he: "ו" },
} as const satisfies Record<string, TranslatedText>;
