"use client";

import { allIndustryLabels } from "@annix/product-data/portals/annix-rep-industries";
import { toPairs as entries } from "es-toolkit/compat";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { isApiError } from "@/app/lib/api/apiError";
import { cvAssistantApiClient } from "@/app/lib/api/cvAssistantApi";
import {
  COMPANY_SIZE_OPTIONS,
  SOUTH_AFRICAN_PROVINCES,
} from "@/app/lib/config/registration/constants";

export default function CvAssistantRegisterCompanyPage() {
  const { showToast } = useToast();
  const [popiaConsent, setPopiaConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [success, setSuccess] = useState(false);

  const industryOptions = useMemo(() => allIndustryLabels(), []);

  const readField = (form: HTMLFormElement, fieldName: string): string => {
    const el = form.elements.namedItem(fieldName) as HTMLInputElement | HTMLSelectElement | null;
    if (!el) return "";
    el.focus();
    el.blur();
    const value = el.value;
    return value || "";
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;

    const payload = {
      name: readField(form, "name").trim(),
      email: readField(form, "email").trim(),
      password: readField(form, "password"),
      companyName: readField(form, "companyName").trim(),
      industry: readField(form, "industry"),
      companySize: readField(form, "companySize"),
      province: readField(form, "province"),
      city: readField(form, "city").trim(),
    };

    const missing = entries(payload)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missing.length > 0) {
      showToast("Please fill in all required fields.", "error");
      return;
    }

    if (payload.password.length < 8) {
      showToast("Password must be at least 8 characters.", "error");
      return;
    }

    setIsLoading(true);
    try {
      await cvAssistantApiClient.register(payload);
      setSubmittedEmail(payload.email);
      setSuccess(true);
    } catch (err) {
      if (isApiError(err)) {
        if (err.isValidation()) {
          showToast("Please check your details and try again.", "error");
        } else if (err.status === 409) {
          showToast("An account with this email already exists.", "error");
        } else {
          showToast("Registration failed. Please try again.", "error");
        }
      } else {
        showToast("Registration failed. Please try again.", "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-violet-900 flex items-center justify-center px-4">
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
              We have sent a verification link to <strong>{submittedEmail}</strong>. Please check
              your inbox and click the link to verify your account.
            </p>
            <Link
              href="/cv-assistant/login?type=company"
              className="inline-block bg-violet-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-violet-700 transition-colors"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-violet-900 flex items-center justify-center px-4 py-12">
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
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Create your company account</h1>
            <p className="text-gray-600 mt-2">Start screening candidates with AI</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Your name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                placeholder="John Smith"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                Company name
              </label>
              <input
                id="companyName"
                name="companyName"
                type="text"
                autoComplete="organization"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                placeholder="Your Company"
              />
            </div>

            <div>
              <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
                Industry
              </label>
              <select
                id="industry"
                name="industry"
                defaultValue=""
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white"
              >
                <option value="" disabled>
                  Select your industry
                </option>
                {industryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="companySize" className="block text-sm font-medium text-gray-700 mb-1">
                Company size
              </label>
              <select
                id="companySize"
                name="companySize"
                defaultValue=""
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white"
              >
                <option value="" disabled>
                  Select company size
                </option>
                {COMPANY_SIZE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="province" className="block text-sm font-medium text-gray-700 mb-1">
                  Province
                </label>
                <select
                  id="province"
                  name="province"
                  autoComplete="address-level1"
                  defaultValue=""
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white"
                >
                  <option value="" disabled>
                    Select province
                  </option>
                  {SOUTH_AFRICAN_PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                  City / town
                </label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  autoComplete="address-level2"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  placeholder="Johannesburg"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
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
                className="mt-1 h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
              />
              <label htmlFor="popiaConsent" className="ml-2 text-sm text-gray-600">
                I consent to the processing of my personal information in accordance with the{" "}
                <span className="text-violet-600 font-medium">
                  Protection of Personal Information Act (POPIA)
                </span>
                . I understand that my data will be retained for 12 months from my last activity and
                I may request erasure of my data at any time.
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading || !popiaConsent}
              className="w-full bg-violet-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{" "}
              <Link
                href="/cv-assistant/login?type=company"
                className="text-violet-600 hover:text-violet-700 font-medium"
              >
                Sign in
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
