"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EeRegistrationStep } from "@/app/annix/orbit/components/EeRegistrationStep";
import { annixOrbitApiClient, type RegisterEeDisclosurePayload } from "@/app/lib/api/annixOrbitApi";

export default function AnnixOrbitRegisterIndividualPage() {
  const [step, setStep] = useState<"account" | "ee">("account");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [popiaConsent, setPopiaConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStep("ee");
  };

  const finishRegistration = async (eeDisclosure: RegisterEeDisclosurePayload | null) => {
    setError(null);
    setIsLoading(true);
    try {
      await annixOrbitApiClient.registerIndividual({ name, email, password, eeDisclosure });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
            <p className="text-gray-600 mb-6">
              We have sent a verification link to <strong>{email}</strong>. Please check your inbox
              and click the link to verify your account.
            </p>
            <Link
              href="/annix/orbit/login?type=individual"
              className="inline-block bg-[#323288] text-white py-3 px-6 rounded-lg font-medium hover:bg-[#252560] transition-colors"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (step === "ee") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <EeRegistrationStep submitting={isLoading} error={error} onComplete={finishRegistration} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
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

          <form onSubmit={handleAccountSubmit} className="space-y-5">
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
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f0f0fc]0 focus:border-transparent"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
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
              Continue
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{" "}
              <Link
                href="/annix/orbit/login?type=individual"
                className="text-[#323288] hover:text-[#252560] font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <div className="text-center mt-6 space-x-4">
          <Link href="/annix/orbit" className="text-[#c0c0eb] hover:text-white text-sm">
            Choose a different account type
          </Link>
        </div>
      </div>
    </div>
  );
}
