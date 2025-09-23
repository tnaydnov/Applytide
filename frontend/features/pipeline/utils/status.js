/**
 * Centralized icons + status config for the Pipeline.
 * Safe fallbacks are provided for unknown status names.
 */

/* ---------------------------------- icons ---------------------------------- */

const ICONS = {
  mail: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  phone: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  ),
  users: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
    </svg>
  ),
  code: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
  wrench: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  building: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  keyboard: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  home: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  "chart-bar": (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  presentation: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
    </svg>
  ),
  leaf: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
    </svg>
  ),
  handshake: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6V11m0-5.5v-1a1.5 1.5 0 00-1.5-1.5H5.5A1.5 1.5 0 004 5.5v1M7 11.5V14m0-2.5c0-1.5 1.5-3 3-3s3 1.5 3 3m-3-3V11m0-5.5v-1a1.5 1.5 0 011.5-1.5H14.5A1.5 1.5 0 0116 5.5v1M7 14h10M10 14v2.5A1.5 1.5 0 0011.5 18h1a1.5 1.5 0 001.5-1.5V14M10 14v-2.5A1.5 1.5 0 0111.5 11h1A1.5 1.5 0 0114 12.5V14m-4 0h4" />
    </svg>
  ),
  "user-tie": (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  star: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
  "user-group": (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  target: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  "building-office": (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  clipboard: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  "magnifying-glass": (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  gift: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
  ),
  briefcase: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m8 0V8a2 2 0 01-2 2H8a2 2 0 01-2-2V6m8 0H8m0 0V4" />
    </svg>
  ),
  "check-circle": (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  "x-circle": (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  ban: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728" />
    </svg>
  ),
};

export const renderIcon = (name) => ICONS[name] || ICONS.clipboard;

/* --------------------------------- stages --------------------------------- */

export const DEFAULT_STAGES = [
  "Applied",
  "Phone Screen",
  "Tech",
  "On-site",
  "Offer",
  "Accepted",
  "Rejected",
];

/* ----------------------------- status styling ----------------------------- */

export const STATUS_CONFIG = {
  Applied: {
    color: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
    icon: renderIcon("mail"),
    gradient: "from-[#12274D] to-[#0E1A33]",
    bgColor: "bg-[#3D7BFF]",
  },
  "Phone Screen": {
    color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    icon: renderIcon("phone"),
    gradient: "from-[#3B2A00] to-[#1C1400]",
    bgColor: "bg-amber-500",
  },
  "HR Round": {
    color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    icon: renderIcon("users"),
    gradient: "from-[#08363B] to-[#06252A]",
    bgColor: "bg-cyan-500",
  },
  Tech: {
    color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    icon: renderIcon("code"),
    gradient: "from-[#2B1B46] to-[#1A112E]",
    bgColor: "bg-violet-600",
  },
  "Tech Interview 1": {
    color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    icon: renderIcon("code"),
    gradient: "from-[#2B1B46] to-[#1A112E]",
    bgColor: "bg-violet-600",
  },
  "Tech Interview 2": {
    color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    icon: renderIcon("wrench"),
    gradient: "from-[#2B1B46] to-[#1A112E]",
    bgColor: "bg-violet-600",
  },
  "System Design": {
    color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    icon: renderIcon("building"),
    gradient: "from-[#162853] to-[#0F1C3B]",
    bgColor: "bg-indigo-600",
  },
  "Coding Challenge": {
    color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    icon: renderIcon("keyboard"),
    gradient: "from-[#08361F] to-[#062616]",
    bgColor: "bg-emerald-600",
  },
  "Take Home Assignment": {
    color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    icon: renderIcon("home"),
    gradient: "from-[#122E52] to-[#0E223D]",
    bgColor: "bg-sky-600",
  },
  "Case Study": {
    color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    icon: renderIcon("chart-bar"),
    gradient: "from-[#063640] to-[#04242B]",
    bgColor: "bg-cyan-600",
  },
  Presentation: {
    color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    icon: renderIcon("presentation"),
    gradient: "from-[#4C1133] to-[#2B0A1E]",
    bgColor: "bg-fuchsia-600",
  },
  "Culture Fit": {
    color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    icon: renderIcon("leaf"),
    gradient: "from-[#084326] to-[#062F1B]",
    bgColor: "bg-green-600",
  },
  "Team Match": {
    color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    icon: renderIcon("handshake"),
    gradient: "from-[#083A3A] to-[#062929]",
    bgColor: "bg-teal-600",
  },
  "Founder Chat": {
    color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    icon: renderIcon("user-tie"),
    gradient: "from-[#4B240A] to-[#2E1606]",
    bgColor: "bg-orange-600",
  },
  "Bar Raiser": {
    color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    icon: renderIcon("star"),
    gradient: "from-[#4A1038] to-[#2B0A22]",
    bgColor: "bg-pink-600",
  },
  "Partner Interview": {
    color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    icon: renderIcon("user-group"),
    gradient: "from-[#430F18] to-[#29090F]",
    bgColor: "bg-rose-600",
  },
  "Final Round": {
    color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    icon: renderIcon("target"),
    gradient: "from-[#2B1B46] to-[#1A112E]",
    bgColor: "bg-violet-600",
  },
  "On-site": {
    color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    icon: renderIcon("building-office"),
    gradient: "from-[#162853] to-[#0F1C3B]",
    bgColor: "bg-indigo-600",
  },
  "Reference Check": {
    color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    icon: renderIcon("clipboard"),
    gradient: "from-[#3E2D00] to-[#231A00]",
    bgColor: "bg-amber-600",
  },
  "Background Check": {
    color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    icon: renderIcon("magnifying-glass"),
    gradient: "from-[#3E3400] to-[#221D00]",
    bgColor: "bg-yellow-600",
  },
  Offer: {
    color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    icon: renderIcon("gift"),
    gradient: "from-[#0A4327] to-[#072F1C]",
    bgColor: "bg-emerald-600",
  },
  Negotiation: {
    color: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    icon: renderIcon("briefcase"),
    gradient: "from-[#122B4F] to-[#0C1D35]",
    bgColor: "bg-blue-600",
  },
  Accepted: {
    color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    icon: renderIcon("check-circle"),
    gradient: "from-[#0A4B30] to-[#073523]",
    bgColor: "bg-emerald-600",
  },
  Rejected: {
    color: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    icon: renderIcon("x-circle"),
    gradient: "from-[#4A0E1E] to-[#2C0913]",
    bgColor: "bg-rose-600",
  },
  Withdrawn: {
    color: "bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300",
    icon: renderIcon("ban"),
    gradient: "from-[#222] to-[#161616]",
    bgColor: "bg-neutral-600",
  },
};

export const DEFAULT_STATUS_STYLE = {
  color: "bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300",
  icon: renderIcon("clipboard"),
  gradient: "from-[#1a1a1a] to-[#111]",
  bgColor: "bg-neutral-600",
};

// For backward compatibility with original_pipeline.js
export const statusConfig = STATUS_CONFIG;

/** Safe accessor that always returns a config object (never undefined). */
export function getStatusConfig(statusName) {
  return STATUS_CONFIG[statusName] || DEFAULT_STATUS_STYLE;
}

/** Convenience export: list of known status names. */
export const KNOWN_STATUSES = Object.keys(STATUS_CONFIG);
