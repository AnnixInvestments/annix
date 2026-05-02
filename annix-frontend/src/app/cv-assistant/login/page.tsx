"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PasskeyLoginButton } from "@/app/components/PasskeyLoginButton";
import { useCvAssistantAuth } from "@/app/context/CvAssistantAuthContext";
import { cvAssistantApiClient } from "@/app/lib/api/cvAssistantApi";
import { cvAssistantTokenStore } from "@/app/lib/api/portalTokenStores";
import { redirectAfterPasskeyLogin, storePasskeyJwt } from "@/app/lib/passkey";

function postLoginPath(userType: string | undefined, returnUrl: string | null): string {
  if (returnUrl) return returnUrl;
  if (userType === "individual") return "/cv-assistant/seeker/dashboard";
  return "/cv-assistant/portal/dashboard";
}

function CvAssistantLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl");
  const accountType = searchParams.get("type");
  const { login, isLoading } = useCvAssistantAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const profile = await login(email, password, rememberMe);
      router.push(postLoginPath(profile.userType, returnUrl));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  };

  const registerHref =
    accountType === "individual"
      ? "/cv-assistant/register/individual"
      : accountType === "company"
        ? "/cv-assistant/register/company"
        : "/cv-assistant";

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-violet-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-violet-100 rounded-2xl mb-4">
              <svg
                className="w-8 h-8 text-violet-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">CV Assistant</h1>
            <p className="text-gray-600 mt-2">
              {accountType === "individual"
                ? "Sign in to your job seeker account"
                : accountType === "company"
                  ? "Sign in to your company account"
                  : "Sign in"}
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-6"
            name="login"
            data-form-type="login"
            method="post"
            action="#"
          >
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                placeholder="Enter your password"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
              </label>
              <Link
                href="/cv-assistant/forgot-password"
                className="text-sm text-violet-600 hover:text-violet-700"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-violet-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>
            <div className="mt-4">
              <PasskeyLoginButton
                email={email}
                appCode="cv-assistant"
                onSuccess={async (response) => {
                  storePasskeyJwt(cvAssistantTokenStore, response, rememberMe);
                  const profile = await cvAssistantApiClient.currentUser();
                  redirectAfterPasskeyLogin(postLoginPath(profile.userType, returnUrl));
                }}
                onError={(message) => setError(message)}
              />
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Do not have an account?{" "}
              <Link
                href={registerHref}
                className="text-violet-600 hover:text-violet-700 font-medium"
              >
                Register
              </Link>
            </p>
          </div>
        </div>

        <div className="text-center mt-6 space-x-4">
          <Link href="/cv-assistant" className="text-violet-200 hover:text-white text-sm">
            Choose a different account type
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CvAssistantLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-violet-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-400" />
        </div>
      }
    >
      <CvAssistantLoginContent />
    </Suspense>
  );
}
