import { useState, useEffect } from 'react';

/**
 * Password Strength Indicator Component
 * Shows real-time validation feedback for password requirements
 */
export default function PasswordStrengthIndicator({ password, showRequirements = true }) {
  const [requirements, setRequirements] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
  });

  useEffect(() => {
    if (!password) {
      setRequirements({
        minLength: false,
        hasUppercase: false,
        hasLowercase: false,
        hasNumber: false,
      });
      return;
    }

    setRequirements({
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
    });
  }, [password]);

  const allRequirementsMet = Object.values(requirements).every(req => req);
  const someRequirementsMet = Object.values(requirements).some(req => req);

  if (!showRequirements && !password) {
    return null;
  }

  return (
    <div className="mt-2 space-y-2">
      {/* Strength Bar */}
      {password && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Password Strength</span>
            <span className={`font-medium ${
              allRequirementsMet ? 'text-green-500' : 
              someRequirementsMet ? 'text-yellow-500' : 
              'text-red-500'
            }`}>
              {allRequirementsMet ? 'Strong' : someRequirementsMet ? 'Weak' : 'Too Weak'}
            </span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                allRequirementsMet ? 'bg-green-500 w-full' : 
                someRequirementsMet ? 'bg-yellow-500 w-1/2' : 
                'bg-red-500 w-1/4'
              }`}
            />
          </div>
        </div>
      )}

      {/* Requirements List */}
      {showRequirements && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-slate-400">Password must contain:</p>
          <div className="space-y-1">
            <RequirementItem 
              met={requirements.minLength} 
              text="At least 8 characters"
            />
            <RequirementItem 
              met={requirements.hasUppercase} 
              text="At least one uppercase letter (A-Z)"
            />
            <RequirementItem 
              met={requirements.hasLowercase} 
              text="At least one lowercase letter (a-z)"
            />
            <RequirementItem 
              met={requirements.hasNumber} 
              text="At least one number (0-9)"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function RequirementItem({ met, text }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${
        met ? 'bg-green-500/20' : 'bg-slate-700'
      }`}>
        {met ? (
          <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </div>
      <span className={met ? 'text-slate-300' : 'text-slate-500'}>
        {text}
      </span>
    </div>
  );
}
