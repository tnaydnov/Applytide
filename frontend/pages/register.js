import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useToast } from "../lib/toast";
import { api } from "../lib/api";

export default function Register() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    full_name: ""
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function handleSubmit(e) {
    console.log("=== HANDLE SUBMIT CALLED ===");
    e.preventDefault();
    
    console.log("=== REGISTER DEBUG START ===");
    console.log("1. Form state:", form);
    
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    const registerData = {
      email: form.email,
      password: form.password,
      full_name: form.full_name
    };
    
    console.log("2. Register data object:", registerData);
    console.log("3. Register data type:", typeof registerData);
    console.log("4. About to call api.register with:", registerData);
    console.log("5. api object:", api);
    console.log("6. api.register function:", api.register);

    setLoading(true);
    try {
      const data = await api.register(registerData);

      console.log("5. Registration response:", data);
      toast.success("Account created successfully! Welcome to Applytide!");
      
      console.log("6. About to redirect to dashboard");
      // Redirect to dashboard after successful registration
      router.push("/dashboard");
    } catch (err) {
      console.log("7. Registration error:", err);
      console.log("8. Error message:", err.message);
      toast.error(err.message || "Registration failed");
    } finally {
      console.log("9. Registration attempt finished");
      console.log("=== REGISTER DEBUG END ===");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-bold text-2xl">JF</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Create your account</h1>
        <p className="text-gray-600 mt-2">Start your job search journey today</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-lg space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Full Name
          </label>
          <input
            type="text"
            required
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="john@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <input
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="••••••••"
            minLength="6"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Confirm Password
          </label>
          <input
            type="password"
            required
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {loading ? "Creating Account..." : "Create Account"}
        </button>

        <div className="text-center">
          <span className="text-gray-600">Already have an account? </span>
          <Link href="/login" className="text-indigo-600 hover:text-indigo-500 font-medium">
            Sign in
          </Link>
        </div>
      </form>
    </div>
  );
}
