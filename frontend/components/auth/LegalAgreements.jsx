/**
 * Legal Agreements Component
 * Simplified single-checkbox agreement for user registration
 * Ensures GDPR, CCPA, and COPPA compliance
 */

import { useState } from 'react';

export default function LegalAgreements({ onAgreementsChange, disabled = false }) {
  const [agreed, setAgreed] = useState(false);

  const handleChange = () => {
    const newValue = !agreed;
    setAgreed(newValue);
    
    // Return all agreements as true when checked (for backend compatibility)
    const agreements = {
      terms: newValue,
      privacy: newValue,
      age: newValue,
      dataProcessing: newValue,
    };
    onAgreementsChange(newValue, agreements);
  };

  return (
    <div className="mt-4">
      {/* Single consolidated checkbox */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={agreed}
          onChange={handleChange}
          disabled={disabled}
          className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 
                   focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer
                   disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <span className="text-sm text-slate-300 group-hover:text-slate-200 transition-colors leading-relaxed">
          I agree to the{' '}
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
            onClick={(e) => e.stopPropagation()}
          >
            Terms of Service
          </a>
          {' and '}
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
            onClick={(e) => e.stopPropagation()}
          >
            Privacy Policy
          </a>
          , and confirm I am at least 13 years old
        </span>
      </label>

      {/* Visual Indicator */}
      {!agreed && (
        <div className="text-xs text-amber-400 mt-2 flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Please check all boxes to continue
        </div>
      )}
    </div>
  );
}
