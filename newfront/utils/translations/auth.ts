/**
 * Authentication Translations
 * 
 * Translations for sign-in, sign-up, and password reset flows.
 */

import { TranslatedText } from "./types";

export const authTranslations = {
  // Sign In
  signIn: { en: "Sign In", he: "התחבר" },
  signInTitle: { en: "Welcome Back", he: "ברוך שובך" },
  signInSubtitle: {
    en: "Sign in to continue your job search journey",
    he: "התחבר כדי להמשיך במסע חיפוש העבודה שלך"
  },
  
  // Sign Up
  signUp: { en: "Sign Up", he: "הרשמה" },
  signUpTitle: { en: "Create Account", he: "צור חשבון" },
  signUpSubtitle: {
    en: "Join thousands tracking their job applications",
    he: "הצטרף לאלפים שעוקבים אחרי בקשות העבודה שלהם"
  },
  
  // Form Fields
  email: { en: "Email", he: "אימייל" },
  emailAddress: { en: "Email Address", he: "כתובת אימייל" },
  emailPlaceholder: { en: "you@example.com", he: "example@mail.com" },
  password: { en: "Password", he: "סיסמה" },
  passwordPlaceholder: { en: "Enter your password", he: "הזן את הסיסמה שלך" },
  confirmPassword: { en: "Confirm Password", he: "אמת סיסמה" },
  fullName: { en: "Full Name", he: "שם מלא" },
  fullNamePlaceholder: { en: "John Doe", he: "שם מלא" },
  rememberMe: { en: "Remember me", he: "זכור אותי" },
  
  // Actions
  forgotPassword: { en: "Forgot password?", he: "שכחת סיסמה?" },
  resetPassword: { en: "Reset Password", he: "איפוס סיסמה" },
  sendResetLink: { en: "Send Reset Link", he: "שלח קישור איפוס" },
  backToSignIn: { en: "Back to Sign In", he: "חזור להתחברות" },
  continueWith: { en: "Or continue with", he: "או המשך עם" },
  continueWithGoogle: { en: "Continue with Google", he: "המשך עם Google" },
  createAccount: { en: "Create an account", he: "צור חשבון" },
  signInAction: { en: "Sign In", he: "התחבר" },
  signUpAction: { en: "Create Account", he: "צור חשבון" },
  
  // Forgot Password
  resetYourPassword: { en: "Reset Your Password", he: "אפס את הסיסמה שלך" },
  resetInstructions: { 
    en: "We'll send you instructions to reset your password",
    he: "נשלח לך הוראות לאיפוס הסיסמה שלך"
  },
  checkYourEmail: { en: "Check Your Email", he: "בדוק את האימייל שלך" },
  emailSent: { 
    en: "We've sent password reset instructions",
    he: "שלחנו הוראות לאיפוס סיסמה"
  },
  emailSentTo: {
    en: "We've sent password reset instructions to:",
    he: "שלחנו הוראות לאיפוס סיסמה אל:"
  },
  checkEmailInstructions: {
    en: "Please check your email and click the reset link. If you don't see it, check your spam folder.",
    he: "אנא בדוק את האימייל שלך ולחץ על קישור האיפוס. אם אינך רואה אותו, בדוק את תיקיית הספאם."
  },
  returnToDashboard: { en: "Return to Dashboard", he: "חזור ללוח הבקרה" },
  didntReceiveEmail: { 
    en: "Didn't receive the email? Try again",
    he: "לא קיבלת את האימייל? נסה שוב"
  },
  
  // Reset Password
  createNewPassword: { en: "Create New Password", he: "צור סיסמה חדשה" },
  chooseStrongPassword: {
    en: "Choose a strong password for your account",
    he: "בחר סיסמה חזקה לחשבון שלך"
  },
  passwordResetSuccess: { 
    en: "Password Reset Successfully",
    he: "הסיסמה אופסה בהצלחה"
  },
  canSignInNow: {
    en: "You can now sign in with your new password",
    he: "כעת תוכל להתחבר עם הסיסמה החדשה שלך"
  },
  newPassword: { en: "New Password", he: "סיסמה חדשה" },
  confirmNewPassword: { en: "Confirm New Password", he: "אמת סיסמה חדשה" },
  passwordsMatch: { en: "Passwords match", he: "הסיסמאות תואמות" },
  passwordsDontMatch: { en: "Passwords don't match", he: "הסיסמאות אינן תואמות" },
  resetMyPassword: { en: "Reset My Password", he: "אפס את הסיסמה שלי" },
  passwordResetComplete: {
    en: "Your password has been successfully reset. You can now sign in with your new password.",
    he: "הסיסמה שלך אופסה בהצלחה. כעת תוכל להתחבר עם הסיסמה החדשה שלך."
  },
  
  // Messages
  accountExists: {
    en: "Already have an account?",
    he: "כבר יש לך חשבון?"
  },
  noAccount: {
    en: "Don't have an account?",
    he: "אין לך חשבון?"
  },
  agreeToTerms: {
    en: "I agree to the Terms of Service and Privacy Policy",
    he: "אני מסכים לתנאי השימוש ולמדיניות הפרטיות"
  },
  
  // Password Requirements
  passwordRequirements: {
    minLength: { en: "At least 8 characters", he: "לפחות 8 תווים" },
    hasUppercase: { en: "One uppercase letter", he: "אות גדולה אחת" },
    hasLowercase: { en: "One lowercase letter", he: "אות קטנה אחת" },
    hasNumber: { en: "One number", he: "ספרה אחת" },
  },
  
  // Errors
  invalidEmail: { en: "Invalid email address", he: "כתובת אימייל לא תקינה" },
  passwordTooShort: { en: "Password too short", he: "הסיסמה קצרה מדי" },
  agreementRequired: { en: "You must agree to the terms", he: "עליך להסכים לתנאים" },
} as const satisfies Record<string, TranslatedText | Record<string, TranslatedText>>;
