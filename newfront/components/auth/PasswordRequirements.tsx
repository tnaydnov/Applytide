import { Check, X } from "lucide-react";
import { PasswordValidation } from "../../types";
import { useLanguage } from "../../contexts/LanguageContext";
import { authTranslations } from "../../utils/translations";

interface PasswordRequirementsProps {
  validation: PasswordValidation;
}

export function PasswordRequirements({ validation }: PasswordRequirementsProps) {
  const { language, dir } = useLanguage();
  const isRTL = dir === 'rtl';
  
  const requirements = [
    { key: "minLength", label: authTranslations.passwordRequirements.minLength[language], met: validation.minLength },
    { key: "hasUppercase", label: authTranslations.passwordRequirements.hasUppercase[language], met: validation.hasUppercase },
    { key: "hasLowercase", label: authTranslations.passwordRequirements.hasLowercase[language], met: validation.hasLowercase },
    { key: "hasNumber", label: authTranslations.passwordRequirements.hasNumber[language], met: validation.hasNumber },
  ];

  return (
    <div className="mb-4 md:mb-5 space-y-2" dir={dir}>
      {requirements.map((req) => (
        <div key={req.key} className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div
            className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: req.met
                ? "rgba(34, 197, 94, 0.2)"
                : "rgba(239, 68, 68, 0.2)",
              border: `1px solid ${req.met ? "#22c55e" : "#ef4444"}`,
            }}
          >
            {req.met ? (
              <Check className="w-2.5 h-2.5" style={{ color: "#22c55e" }} />
            ) : (
              <X className="w-2.5 h-2.5" style={{ color: "#ef4444" }} />
            )}
          </div>
          <span
            className="text-xs"
            style={{
              color: req.met ? "#22c55e" : "#b6bac5",
              opacity: req.met ? 1 : 0.6,
              textAlign: isRTL ? 'right' : 'left',
            }}
          >
            {req.label}
          </span>
        </div>
      ))}
    </div>
  );
}
