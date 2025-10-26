/**
 * Legal Agreements Component
 * Comprehensive legal agreement checkboxes for user registration
 * Ensures GDPR, CCPA, and COPPA compliance
 */

import { useState } from 'react';

export default function LegalAgreements({ onAgreementsChange, disabled = false }) {
  const [agreements, setAgreements] = useState({
    terms: false,
    privacy: false,
    age: false,
    dataProcessing: false,
  });

  const handleChange = (key) => {
    const newAgreements = {
      ...agreements,
      [key]: !agreements[key],
    };
    setAgreements(newAgreements);
    
    // Notify parent if all required agreements are checked
    const allChecked = Object.values(newAgreements).every(v => v === true);
    onAgreementsChange(allChecked, newAgreements);
  };

  const allAgreed = Object.values(agreements).every(v => v === true);

  return (
    <div className="space-y-3 mt-4">
      <div className="text-sm text-slate-300 font-medium mb-2">
        Legal Agreements (Required)
      </div>

      {/* Terms of Service */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={agreements.terms}
          onChange={() => handleChange('terms')}
          disabled={disabled}
          className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 
                   focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer
                   disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <span className="text-sm text-slate-300 group-hover:text-slate-200 transition-colors">
          I have read and agree to the{' '}
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
            onClick={(e) => e.stopPropagation()}
          >
            Terms of Service
          </a>
          {', '}including the Chrome Extension usage terms, third-party site compliance, and arbitration clause
        </span>
      </label>

      {/* Privacy Policy */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={agreements.privacy}
          onChange={() => handleChange('privacy')}
          disabled={disabled}
          className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 
                   focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer
                   disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <span className="text-sm text-slate-300 group-hover:text-slate-200 transition-colors">
          I have read and agree to the{' '}
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
            onClick={(e) => e.stopPropagation()}
          >
            Privacy Policy
          </a>
          {', '}
          <a
            href="/cookie-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
            onClick={(e) => e.stopPropagation()}
          >
            Cookie Policy
          </a>
          {', and '}
          <a
            href="/copyright-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
            onClick={(e) => e.stopPropagation()}
          >
            Copyright Policy
          </a>
        </span>
      </label>

      {/* Age Verification (COPPA Compliance) */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={agreements.age}
          onChange={() => handleChange('age')}
          disabled={disabled}
          className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 
                   focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer
                   disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <span className="text-sm text-slate-300 group-hover:text-slate-200 transition-colors">
          I confirm that I am <strong>at least 13 years of age</strong> and have the legal capacity to enter into this agreement
        </span>
      </label>

      {/* Data Processing (GDPR/CCPA) */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={agreements.dataProcessing}
          onChange={() => handleChange('dataProcessing')}
          disabled={disabled}
          className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 
                   focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer
                   disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <span className="text-sm text-slate-300 group-hover:text-slate-200 transition-colors">
          I consent to Applytide processing my personal data (resumes, job applications, documents) as described in the Privacy Policy, 
          and I understand my rights under GDPR/CCPA including the right to access, rectify, and delete my data
        </span>
      </label>

      {/* Visual Indicator */}
      {!allAgreed && (
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
