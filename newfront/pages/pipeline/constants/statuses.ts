/**
 * Centralized Status Configuration
 * Single source of truth for all application statuses
 */

export interface StatusConfig {
  id: string;
  name: string;
  nameHe: string;
  color: string;
  category?:
    | "application"
    | "screening"
    | "assessment"
    | "interview"
    | "decision"
    | "offer"
    | "final"
    | "inactive";
}

/**
 * Core default statuses - these are the main workflow stages
 */
export const DEFAULT_STATUSES: StatusConfig[] = [
  {
    id: "applied",
    name: "Applied",
    nameHe: "נשלחה",
    color: "#3b82f6",
    category: "application",
  },
  {
    id: "phone_screen",
    name: "Phone Screen",
    nameHe: "סינון טלפוני",
    color: "#8b5cf6",
    category: "screening",
  },
  {
    id: "interviewing",
    name: "Interviewing",
    nameHe: "בתהליך ראיון",
    color: "#f59e0b",
    category: "interview",
  },
  {
    id: "technical",
    name: "Technical",
    nameHe: "שלב טכני",
    color: "#ec4899",
    category: "assessment",
  },
  {
    id: "onsite",
    name: "Onsite",
    nameHe: "ראיון במשרד",
    color: "#06b6d4",
    category: "interview",
  },
  {
    id: "offer",
    name: "Offer",
    nameHe: "הצעה",
    color: "#10b981",
    category: "offer",
  },
  {
    id: "accepted",
    name: "Accepted",
    nameHe: "התקבלתי",
    color: "#22c55e",
    category: "final",
  },
  {
    id: "rejected",
    name: "Rejected",
    nameHe: "נדחיתי",
    color: "#ef4444",
    category: "final",
  },
  {
    id: "withdrawn",
    name: "Withdrawn",
    nameHe: "משכתי מועמדות",
    color: "#6b7280",
    category: "inactive",
  },
];

/**
 * All available status suggestions for customization
 * Users can add these as custom stages
 */
export const ALL_STATUS_SUGGESTIONS: StatusConfig[] = [
  // Application stages
  {
    id: "wishlist",
    name: "Wishlist",
    nameHe: "רשימת משאלות",
    color: "#94a3b8",
    category: "application",
  },
  {
    id: "to_apply",
    name: "To Apply",
    nameHe: "להגיש מועמדות",
    color: "#64748b",
    category: "application",
  },
  {
    id: "applied",
    name: "Applied",
    nameHe: "נשלחה",
    color: "#3b82f6",
    category: "application",
  },
  {
    id: "application_submitted",
    name: "Application Submitted",
    nameHe: "בקשה נשלחה",
    color: "#2563eb",
    category: "application",
  },
  {
    id: "application_under_review",
    name: "Application Under Review",
    nameHe: "בקשה בבדיקה",
    color: "#1d4ed8",
    category: "application",
  },

  // Initial screening
  {
    id: "resume_review",
    name: "Resume Review",
    nameHe: "סקירת קורות חיים",
    color: "#7c3aed",
    category: "screening",
  },
  {
    id: "phone_screen",
    name: "Phone Screen",
    nameHe: "סינון טלפוני",
    color: "#8b5cf6",
    category: "screening",
  },
  {
    id: "hr_screen",
    name: "HR Screen",
    nameHe: "סינון משאבי אנוש",
    color: "#9333ea",
    category: "screening",
  },
  {
    id: "recruiter_call",
    name: "Recruiter Call",
    nameHe: "שיחה עם מגייס",
    color: "#a855f7",
    category: "screening",
  },
  {
    id: "initial_contact",
    name: "Initial Contact",
    nameHe: "יצירת קשר ראשונית",
    color: "#c084fc",
    category: "screening",
  },

  // Assessment stages
  {
    id: "assessment",
    name: "Assessment",
    nameHe: "הערכה",
    color: "#f59e0b",
    category: "assessment",
  },
  {
    id: "technical_test",
    name: "Technical Test",
    nameHe: "מבחן טכני",
    color: "#d97706",
    category: "assessment",
  },
  {
    id: "take_home_assignment",
    name: "Take-Home Assignment",
    nameHe: "מטלת בית",
    color: "#ea580c",
    category: "assessment",
  },
  {
    id: "coding_challenge",
    name: "Coding Challenge",
    nameHe: "אתגר קידוד",
    color: "#dc2626",
    category: "assessment",
  },
  {
    id: "portfolio_review",
    name: "Portfolio Review",
    nameHe: "סקירת תיק עבודות",
    color: "#f97316",
    category: "assessment",
  },
  {
    id: "skills_test",
    name: "Skills Test",
    nameHe: "מבחן מיומנויות",
    color: "#fb923c",
    category: "assessment",
  },
  {
    id: "technical",
    name: "Technical",
    nameHe: "שלב טכני",
    color: "#ec4899",
    category: "assessment",
  },

  // Interview stages
  {
    id: "interview",
    name: "Interview",
    nameHe: "ראיון",
    color: "#f59e0b",
    category: "interview",
  },
  {
    id: "interviewing",
    name: "Interviewing",
    nameHe: "בתהליך ראיון",
    color: "#f59e0b",
    category: "interview",
  },
  {
    id: "first_interview",
    name: "First Interview",
    nameHe: "ראיון ראשון",
    color: "#fbbf24",
    category: "interview",
  },
  {
    id: "second_interview",
    name: "Second Interview",
    nameHe: "ראיון שני",
    color: "#f59e0b",
    category: "interview",
  },
  {
    id: "third_interview",
    name: "Third Interview",
    nameHe: "ראיון שלישי",
    color: "#d97706",
    category: "interview",
  },
  {
    id: "final_interview",
    name: "Final Interview",
    nameHe: "ראיון סופי",
    color: "#b45309",
    category: "interview",
  },
  {
    id: "panel_interview",
    name: "Panel Interview",
    nameHe: "ראיון פאנל",
    color: "#f97316",
    category: "interview",
  },
  {
    id: "technical_interview",
    name: "Technical Interview",
    nameHe: "ראיון טכני",
    color: "#ea580c",
    category: "interview",
  },
  {
    id: "behavioral_interview",
    name: "Behavioral Interview",
    nameHe: "ראיון התנהגותי",
    color: "#fb923c",
    category: "interview",
  },
  {
    id: "team_interview",
    name: "Team Interview",
    nameHe: "ראיון צוות",
    color: "#fdba74",
    category: "interview",
  },
  {
    id: "manager_interview",
    name: "Manager Interview",
    nameHe: "ראיון מנהל",
    color: "#fed7aa",
    category: "interview",
  },
  {
    id: "executive_interview",
    name: "Executive Interview",
    nameHe: "ראיון הנהלה",
    color: "#ffedd5",
    category: "interview",
  },
  {
    id: "onsite_interview",
    name: "On-site Interview",
    nameHe: "ראיון במשרד",
    color: "#f59e0b",
    category: "interview",
  },
  {
    id: "virtual_interview",
    name: "Virtual Interview",
    nameHe: "ראיון וירטואלי",
    color: "#fbbf24",
    category: "interview",
  },
  {
    id: "onsite",
    name: "Onsite",
    nameHe: "ראיון במשרד",
    color: "#06b6d4",
    category: "interview",
  },

  // Advanced stages
  {
    id: "reference_check",
    name: "Reference Check",
    nameHe: "בדיקת ממליצים",
    color: "#06b6d4",
    category: "decision",
  },
  {
    id: "background_check",
    name: "Background Check",
    nameHe: "בדיקת רקע",
    color: "#0891b2",
    category: "decision",
  },
  {
    id: "culture_fit",
    name: "Culture Fit",
    nameHe: "התאמה תרבותית",
    color: "#0e7490",
    category: "decision",
  },
  {
    id: "meet_the_team",
    name: "Meet the Team",
    nameHe: "פגישת הצוות",
    color: "#155e75",
    category: "decision",
  },
  {
    id: "office_visit",
    name: "Office Visit",
    nameHe: "ביקור במשרד",
    color: "#06b6d4",
    category: "decision",
  },

  // Decision stages
  {
    id: "under_consideration",
    name: "Under Consideration",
    nameHe: "בשקילה",
    color: "#14b8a6",
    category: "decision",
  },
  {
    id: "shortlisted",
    name: "Shortlisted",
    nameHe: "ברשימה הקצרה",
    color: "#0d9488",
    category: "decision",
  },
  {
    id: "finalist",
    name: "Finalist",
    nameHe: "מועמד סופי",
    color: "#0f766e",
    category: "decision",
  },
  {
    id: "pending_decision",
    name: "Pending Decision",
    nameHe: "ממתין להחלטה",
    color: "#115e59",
    category: "decision",
  },
  {
    id: "decision_made",
    name: "Decision Made",
    nameHe: "ההחלטה התקבלה",
    color: "#14b8a6",
    category: "decision",
  },

  // Offer stages
  {
    id: "offer",
    name: "Offer",
    nameHe: "הצעה",
    color: "#10b981",
    category: "offer",
  },
  {
    id: "offer_extended",
    name: "Offer Extended",
    nameHe: "הצעה נשלחה",
    color: "#059669",
    category: "offer",
  },
  {
    id: "offer_received",
    name: "Offer Received",
    nameHe: "קיבלתי הצעה",
    color: "#047857",
    category: "offer",
  },
  {
    id: "negotiation",
    name: "Negotiation",
    nameHe: "משא ומתן",
    color: "#065f46",
    category: "offer",
  },
  {
    id: "offer_accepted",
    name: "Offer Accepted",
    nameHe: "קיבלתי את ההצעה",
    color: "#10b981",
    category: "offer",
  },
  {
    id: "pre_boarding",
    name: "Pre-boarding",
    nameHe: "טרום קליטה",
    color: "#34d399",
    category: "offer",
  },
  {
    id: "accepted",
    name: "Accepted",
    nameHe: "התקבלתי",
    color: "#22c55e",
    category: "final",
  },

  // Rejection/withdrawal stages
  {
    id: "rejected",
    name: "Rejected",
    nameHe: "נדחיתי",
    color: "#ef4444",
    category: "final",
  },
  {
    id: "not_selected",
    name: "Not Selected",
    nameHe: "לא נבחרתי",
    color: "#dc2626",
    category: "final",
  },
  {
    id: "withdrawn",
    name: "Withdrawn",
    nameHe: "משכתי מועמדות",
    color: "#6b7280",
    category: "inactive",
  },
  {
    id: "declined_offer",
    name: "Declined Offer",
    nameHe: "דחיתי את ההצעה",
    color: "#991b1b",
    category: "inactive",
  },
  {
    id: "not_a_fit",
    name: "Not a Fit",
    nameHe: "לא מתאים לי",
    color: "#7f1d1d",
    category: "final",
  },
  {
    id: "on_hold",
    name: "On Hold",
    nameHe: "בהמתנה",
    color: "#f97316",
    category: "inactive",
  },
  {
    id: "ghosted",
    name: "Ghosted",
    nameHe: "לא חזרו אליי",
    color: "#78716c",
    category: "inactive",
  },
];

/**
 * Get status configuration by ID
 */
export function getStatusById(
  statusId: string,
): StatusConfig | undefined {
  return ALL_STATUS_SUGGESTIONS.find((s) => s.id === statusId);
}

/**
 * Get status name (localized)
 */
export function getStatusName(
  statusId: string,
  isRTL: boolean = false,
): string {
  const status = getStatusById(statusId);
  if (!status) {
    return statusId;
  }
  return isRTL ? status.nameHe : status.name;
}

/**
 * Get status color
 */
export function getStatusColor(statusId: string): string {
  const status = getStatusById(statusId);
  return status?.color || "#6b7280";
}

