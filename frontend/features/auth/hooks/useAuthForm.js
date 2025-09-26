import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useToast } from "../../../lib/toast";
import { useAuth } from "../../../contexts/AuthContext";
import { loginWithEmail, registerUser } from "../../../services/auth";

export default function useAuthForm() {
  const [mode, setMode] = useState("login"); // 'login' | 'register'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);

  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const toast = useToast();

  // Redirect if already logged in (matches original)
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  const toggleMode = () => setMode((m) => (m === "login" ? "register" : "login"));

  const submit = async (e) => {
    e?.preventDefault?.();
    setLoading(true);
    try {
      if (mode === "login") {
        const success = await loginWithEmail(email, password, remember);
        if (success) {
          toast.success("Welcome back!");
          setTimeout(() => {
            window.location.replace("/dashboard");
          }, 500);
        } else {
          toast.error("Login failed");
        }
      } else {
        await registerUser({ email, password, full_name: fullName });
        toast.success("Account created successfully! Welcome to Applytide!");
        window.location.href = "/dashboard";
      }
    } catch (err) {
      toast.error(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return {
    // state
    mode,
    email,
    password,
    fullName,
    loading,
    remember,

    // setters
    setEmail,
    setPassword,
    setFullName,
    setRemember,
    setMode: toggleMode,

    // actions
    submit,
  };
}
