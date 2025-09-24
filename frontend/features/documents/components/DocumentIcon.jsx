import React from "react";

/**
 * DocumentIcon
 * Renders a colored inline SVG based on a document type.
 *
 * Props:
 * - type: one of 'resume' | 'cover_letter' | 'portfolio' | 'certificate' | 'transcript' | 'reference' | 'other'
 * - className: size utilities etc. (default "w-6 h-6")
 * - colorClass: override tailwind text color (optional)
 */
export default function DocumentIcon({
  type = "other",
  className = "w-6 h-6",
  colorClass,
  ...props
}) {
  const colorByType = {
    resume: "text-blue-400",
    cover_letter: "text-green-400",
    portfolio: "text-purple-400",
    certificate: "text-yellow-400",
    transcript: "text-indigo-400",
    reference: "text-pink-400",
    other: "text-gray-400",
  };

  const color = colorClass || colorByType[type] || colorByType.other;
  const cls = `${className} ${color}`;

  switch (type) {
    case "resume":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case "cover_letter":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case "portfolio":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      );
    case "certificate":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "transcript":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      );
    case "reference":
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    default:
      return (
        <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
  }
}
