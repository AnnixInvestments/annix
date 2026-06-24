"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { annixOrbitApiClient } from "@/app/lib/api/annixOrbitApi";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const emailParam = searchParams.get("email");
  const typeParam = searchParams.get("type");
  const email = emailParam || "";
  const isSeeker = typeParam === "individual";
  const loginHref = isSeeker ? "/annix/orbit/login?type=individual" : "/annix/orbit/login";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("This reset link is missing its token. Please request a new one.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      await annixOrbitApiClient.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => router.push(loginHref), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isSeeker ? "You're all set" : "Password reset"}
            </h2>
            <p className="text-gray-600 mb-6">
              Your password has been set. Redirecting you to sign in...
            </p>
            <Link
              href={loginHref}
              className="inline-block bg-[var(--brand-navbar,#323288)] text-white py-3 px-6 rounded-lg font-medium hover:bg-[var(--brand-navbar-active,#252560)] transition-colors"
            >
              Sign in now
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--brand-navbar-100,#e0e0f5)] rounded-2xl mb-4">
              <svg
                className="w-8 h-8 text-[var(--brand-navbar,#323288)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isSeeker ? "Set your Annix Orbit Seeker password" : "Choose a new password"}
            </h1>
            <p className="text-gray-600 mt-2">
              {isSeeker
                ? "You're invited to Annix Orbit Seeker — just create a password to finish setting up your account."
                : "Enter and confirm your new password below."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <input
              type="email"
              name="username"
              autoComplete="username"
              value={email}
              readOnly
              hidden
            />

            {email ? (
              <div>
                <label
                  htmlFor="account-email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Your email
                </label>
                <input
                  id="account-email"
                  type="email"
                  value={email}
                  readOnly
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-100 text-gray-600"
                />
              </div>
            ) : null}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                {isSeeker ? "Create a password" : "New password"}
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-navbar-50,#f0f0fc)] focus:border-transparent"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-navbar-50,#f0f0fc)] focus:border-transparent"
                placeholder="Re-enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !token}
              className="w-full bg-[var(--brand-navbar,#323288)] text-white py-3 px-4 rounded-lg font-medium hover:bg-[var(--brand-navbar-active,#252560)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-navbar-50,#f0f0fc)] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "Saving…" : isSeeker ? "Create my account" : "Update password"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href={loginHref}
              className="text-[var(--brand-navbar,#323288)] hover:text-[var(--brand-navbar-active,#252560)] text-sm font-medium"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnnixOrbitResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-navbar-400,#7373c2)]" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
