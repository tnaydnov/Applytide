/**
 * Email validation
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Password strength validation
 */
export interface PasswordStrength {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

export function validatePassword(password: string): PasswordStrength {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{}|;':",./<>?`~\\]/.test(password),
  };
}

export function isPasswordStrong(password: string): boolean {
  const validation = validatePassword(password);
  return (
    validation.minLength &&
    validation.hasUppercase &&
    validation.hasLowercase &&
    validation.hasNumber &&
    validation.hasSpecial
  );
}

/**
 * Name validation
 */
export function isValidName(name: string): boolean {
  return name.trim().length >= 2;
}
