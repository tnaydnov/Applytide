import { useState } from "react";
import { Button, Input } from "../../../components/ui";
import LegalAgreements from "../../../components/auth/LegalAgreements";
import PasswordStrengthIndicator from "../../../components/auth/PasswordStrengthIndicator";

export default function AuthForm({
  mode,
  email,
  password,
  fullName,
  loading,
  remember,
  setEmail,
  setPassword,
  setFullName,
  setRemember,
  submit,
  validationError,
  // Legal agreements for registration
  legalAgreements,
  setLegalAgreements,
  allAgreed,
  setAllAgreed,
}) {
  const handleAgreementsChange = (allChecked, agreements) => {
    setAllAgreed(allChecked);
    setLegalAgreements(agreements);
  };

  return (
    <div className="glass-card glass-cyan">
      {/* Match original dark input theme */}
      <style jsx global>{`
        .login-form input {
          background-color: rgb(15 23 42 / 0.8) !important;
          color: rgb(226 232 240) !important;
          border-color: rgb(148 163 184 / 0.3) !important;
        }
        .login-form input::placeholder {
          color: rgb(148 163 184) !important;
        }
        .login-form input:focus {
          background-color: rgb(15 23 42 / 0.9) !important;
          border-color: rgb(99 102 241 / 0.6) !important;
          box-shadow: 0 0 0 2px rgb(99 102 241 / 0.2) !important;
        }
        .login-form label {
          color: rgb(226 232 240) !important;
        }
      `}</style>

      <form onSubmit={submit} className="space-y-6 login-form" id="login-form" name="login-form">
        {/* Validation Error Alert */}
        {validationError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-400">Validation Error</p>
                <p className="text-sm text-red-300 mt-1">{validationError}</p>
              </div>
            </div>
          </div>
        )}
        
        {mode === "register" && (
          <Input
            label="Full Name"
            type="text"
            name="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="John Doe"
            required
            className="dark-input"
            autocomplete="name"
            style={{
              backgroundColor: "rgb(15 23 42 / 0.8)",
              color: "rgb(226 232 240)",
              borderColor: "rgb(148 163 184 / 0.3)",
            }}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
          />
        )}

        <Input
          label="Email Address"
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="dark-input"
          autocomplete={mode === "login" ? "username" : "email"}
          style={{
            backgroundColor: "rgb(15 23 42 / 0.8)",
            color: "rgb(226 232 240)",
            borderColor: "rgb(148 163 184 / 0.3)",
          }}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
        />

        <Input
          label="Password"
          type="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          className="dark-input"
          autocomplete={mode === "login" ? "current-password" : "new-password"}
          style={{
            backgroundColor: "rgb(15 23 42 / 0.8)",
            color: "rgb(226 232 240)",
            borderColor: "rgb(148 163 184 / 0.3)",
          }}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          }
        />

        {/* Password Strength Indicator for Registration */}
        {mode === "register" && (
          <PasswordStrengthIndicator password={password} showRequirements={true} />
        )}

        {mode === "login" && (
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded bg-slate-800"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <label htmlFor="remember" className="ml-2 block text-sm text-gray-300">
                Remember me
              </label>
            </div>
            <button
              type="button"
              onClick={() => (window.location.href = "/auth/reset")}
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors duration-200"
            >
              Forgot your password?
            </button>
          </div>
        )}

        {/* Legal Agreements for Registration */}
        {mode === "register" && (
          <LegalAgreements
            onAgreementsChange={handleAgreementsChange}
            disabled={loading}
          />
        )}

        <Button 
          type="submit" 
          className="w-full" 
          size="lg" 
          loading={loading} 
          disabled={!email || !password || (mode === "register" && !allAgreed)}
        >
          {loading ? (mode === "login" ? "Signing in..." : "Creating account...") : (mode === "login" ? "Sign In" : "Create Account")}
        </Button>
      </form>
    </div>
  );
}
