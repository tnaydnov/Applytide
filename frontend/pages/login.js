import useAuthForm from "../features/auth/hooks/useAuthForm";
import AuthForm from "../features/auth/components/AuthForm";
import OAuthDivider from "../features/auth/components/OAuthDivider";
import FeatureList from "../features/auth/components/FeatureList";
import GoogleLoginButton from "../components/GoogleLoginButton";
import { Button } from "../components/ui";

export default function LoginPage() {
  const {
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
    setMode,
    submit,
  } = useAuthForm();

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <img src="/images/logomark.svg" alt="Applytide" className="h-20 w-20" />
          </div>
          <h1 className="text-3xl font-bold text-slate-200">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-slate-400 mt-2">
            {mode === "login"
              ? "Sign in to continue your job search journey"
              : "Join Applytide and streamline your applications"}
          </p>
        </div>

        {/* Form */}
        <AuthForm
          mode={mode}
          email={email}
          password={password}
          fullName={fullName}
          loading={loading}
          remember={remember}
          setEmail={setEmail}
          setPassword={setPassword}
          setFullName={setFullName}
          setRemember={setRemember}
          submit={submit}
        />

        {/* Google OAuth Login */}
        <div className="mt-6">
          <OAuthDivider />
          <div className="mt-6">
            <GoogleLoginButton className="w-full bg-slate-700 hover:bg-slate-600 text-white" />
          </div>
        </div>

        {/* Mode Switch */}
        <div className="text-center space-y-4">
          <p className="text-slate-400">
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}
          </p>
          <div className="flex justify-center">
            <Button
              variant="ghost"
              onClick={setMode}
              className="text-slate-300 hover:text-slate-200"
            >
              {mode === "login" ? "Create an account" : "Sign in instead"}
            </Button>
          </div>
        </div>

        {/* Features for new users */}
        {mode === "register" && <FeatureList />}
      </div>
    </div>
  );
}
