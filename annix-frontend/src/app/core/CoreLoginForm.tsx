"use client";

import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useAuRubberAuth } from "@/app/context/AuRubberAuthContext";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import { API_BASE_URL } from "@/lib/api-config";
import { CoreBrandHeader } from "./CoreBrandHeader";

type ResolvedApp = "stock-control" | "au-rubber";

const REMEMBERED_EMAIL_KEY = "coreRememberedEmail";
const REMEMBER_ME_KEY = "coreRememberMe";

const DASHBOARD_BY_APP: Record<ResolvedApp, string> = {
  "stock-control": "/stock-control/portal/dashboard",
  "au-rubber": "/au-rubber/portal/dashboard",
};

async function resolveAppForCredentials(email: string, password: string): Promise<ResolvedApp> {
  const response = await fetch(`${API_BASE_URL}/auth/resolve-app`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw new Error("Invalid credentials");
  }
  const data = await response.json();
  const app = data.app;
  if (app !== "stock-control" && app !== "au-rubber") {
    throw new Error("Invalid credentials");
  }
  return app;
}

export function CoreLoginForm() {
  const router = useRouter();
  const stockControl = useStockControlAuth();
  const auRubber = useAuRubberAuth();

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const savedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    const savedRemember = localStorage.getItem(REMEMBER_ME_KEY) === "true";
    if (savedEmail) {
      const inputEl = emailRef.current;
      if (inputEl && !inputEl.value) {
        inputEl.value = savedEmail;
      }
      setEmail(savedEmail);
    }
    if (savedRemember) {
      setRememberMe(true);
    }
  }, []);

  const persistRememberedEmail = (submitEmail: string) => {
    if (rememberMe) {
      localStorage.setItem(REMEMBERED_EMAIL_KEY, submitEmail);
      localStorage.setItem(REMEMBER_ME_KEY, "true");
    } else {
      localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      localStorage.removeItem(REMEMBER_ME_KEY);
    }
  };

  const mapLoginError = (message: string): string => {
    if (message.includes("Invalid credentials")) {
      return "Invalid email or password. Please try again.";
    }
    if (message.includes("not have permission") || message.includes("Forbidden")) {
      return "You do not have permission to access this application.";
    }
    if (message.includes("suspended") || message.includes("deactivated")) {
      return "Your account has been suspended. Please contact your administrator.";
    }
    return message;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailInput = emailRef.current;
    const passwordInput = passwordRef.current;
    const submitEmail = (emailInput ? emailInput.value : email).trim();
    const submitPassword = passwordInput ? passwordInput.value : "";

    setIsSubmitting(true);
    setError(null);

    try {
      const app = await resolveAppForCredentials(submitEmail, submitPassword);

      if (app === "stock-control") {
        await stockControl.login(submitEmail, submitPassword, rememberMe);
      } else {
        await auRubber.login(submitEmail, submitPassword, rememberMe);
      }

      persistRememberedEmail(submitEmail);
      router.push(DASHBOARD_BY_APP[app]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed. Please try again.";
      setError(mapLoginError(message));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#FF8A00]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center text-white">
          <CoreBrandHeader />
          <p className="mt-3 text-lg text-blue-200">Sign in to your operations platform</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-lg bg-white px-4 py-8 shadow-2xl sm:px-10">
          <form
            className="space-y-6"
            onSubmit={handleSubmit}
            name="login"
            data-form-type="login"
            method="post"
            action="#"
          >
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                ref={emailRef}
                id="email"
                name="email"
                type="email"
                autoComplete="username email"
                required
                defaultValue=""
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#FF8A00] focus:ring-[#FF8A00]"
                placeholder="user@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  ref={passwordRef}
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  defaultValue=""
                  className="block w-full rounded-md border-gray-300 pr-10 shadow-sm focus:border-[#FF8A00] focus:ring-[#FF8A00]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#FF8A00] focus:ring-[#FF8A00]"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                Remember me
              </label>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex">
                  <svg
                    className="mr-2 h-5 w-5 flex-shrink-0 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full justify-center rounded-md border border-transparent bg-[#FF8A00] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#e67c00] focus:outline-none focus:ring-2 focus:ring-[#FF8A00] focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {isSubmitting ? (
                <>
                  <div className="mr-2 h-5 w-5 animate-spin rounded-full border-b-2 border-white" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-blue-200 hover:text-white">
            Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
