"use client";

import Link from "next/link";
import { useState } from "react";
import { cvAssistantApiClient } from "@/app/lib/api/cvAssistantApi";

export default function CvAssistantRegisterIndividualPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [popiaConsent, setPopiaConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await cvAssistantApiClient.registerIndividual({ name, email, password });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a40] via-[#0d0d20] to-[#1a1a40] flex items-center justify-center px-4">
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
            <p className="text-gray-600 mb-6">
              We have sent a verification link to <strong>{email}</strong>. Please check your inbox
              and click the link to verify your account.
            </p>
            <Link
              href="/cv-assistant/login?type=individual"
              className="inline-block bg-[#323288] text-white py-3 px-6 rounded-lg font-medium hover:bg-[#252560] transition-colors"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a40] via-[#0d0d20] to-[#1a1a40] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#e0e0f5] rounded-2xl mb-4">
              <svg
                className="w-8 h-8 text-[#323288]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
            <p className="text-gray-600 mt-2">Build your CV profile and find your next role</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Full name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f0f0fc]0 focus:border-transparent"
                placeholder="Jane Smith"
              />
            </div>

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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f0f0fc]0 focus:border-transparent"
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
                minLength={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f0f0fc]0 focus:border-transparent"
                placeholder="At least 8 characters"
              />
            </div>

            <div className="flex items-start">
              <input
                id="popiaConsent"
                type="checkbox"
                checked={popiaConsent}
                onChange={(e) => setPopiaConsent(e.target.checked)}
                required
                className="mt-1 h-4 w-4 text-[#323288] focus:ring-[#f0f0fc]0 border-gray-300 rounded"
              />
              <label htmlFor="popiaConsent" className="ml-2 text-sm text-gray-600">
                I consent to the processing of my personal information in accordance with the{" "}
                <span className="text-[#323288] font-medium">
                  Protection of Personal Information Act (POPIA)
                </span>
                . I understand that my data will be retained for 12 months from my last activity and
                I may request erasure of my data at any time.
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading || !popiaConsent}
              className="w-full bg-[#323288] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#252560] focus:outline-none focus:ring-2 focus:ring-[#f0f0fc]0 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{" "}
              <Link
                href="/cv-assistant/login?type=individual"
                className="text-[#323288] hover:text-[#252560] font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <div className="text-center mt-6 space-x-4">
          <Link href="/cv-assistant" className="text-[#c0c0eb] hover:text-white text-sm">
            Choose a different account type
          </Link>
        </div>
      </div>
    </div>
  );
}
