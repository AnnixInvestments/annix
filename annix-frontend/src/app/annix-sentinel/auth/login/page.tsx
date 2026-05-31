"use client";

import { Eye, EyeOff, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { login } from "@/app/annix-sentinel/lib/api";
import { BrandLoginCard } from "@/app/components/BrandLoginCard";

export default function LoginPage() {
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const emailInput = emailRef.current;
    const passwordInput = passwordRef.current;
    const submitEmail = emailInput ? emailInput.value : "";
    const submitPassword = passwordInput ? passwordInput.value : "";
    setError(null);
    setLoading(true);

    try {
      const result = await login(submitEmail, submitPassword);
      if (result.termsOutdated) {
        router.push("/annix-sentinel/auth/accept-terms");
      } else {
        router.push("/annix-sentinel/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/annix-sentinel" className="block mb-8">
          <BrandLoginCard brand="annix-sentinel" />
        </Link>

        <div className="bg-[#1A2332] border border-slate-700 rounded-xl p-8">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">Welcome Back</h1>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 mb-6 text-sm">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
            name="login"
            data-form-type="login"
            method="post"
            action="#"
          >
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
              <input
                ref={emailRef}
                id="email"
                name="email"
                type="email"
                autoComplete="username email"
                required
                defaultValue=""
                className="w-full bg-[#0A1B3D] border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-[#1E90FF] transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  ref={passwordRef}
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  defaultValue=""
                  className="w-full bg-[#0A1B3D] border border-slate-600 rounded-lg px-4 py-2.5 pr-11 text-white placeholder-slate-500 focus:outline-none focus:border-[#1E90FF] transition-colors"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4.5 w-4.5" />
                  ) : (
                    <Eye className="h-4.5 w-4.5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1E90FF] hover:bg-[#1565C0] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <LogIn className="h-4 w-4" />
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-6">
            Don&apos;t have an account?{" "}
            <Link
              href="/annix-sentinel/auth/signup"
              className="text-[#1E90FF] hover:text-[#4FA8FF] font-medium"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
