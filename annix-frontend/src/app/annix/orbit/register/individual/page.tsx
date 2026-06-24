"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { BackToHubLink } from "@/app/annix/orbit/components/BackToHubLink";
import { EeRegistrationStep } from "@/app/annix/orbit/components/EeRegistrationStep";
import { parseRegistrationError } from "@/app/annix/orbit/config/registration-errors";
import { PhoneInput } from "@/app/components/PhoneInput";
import {
  annixOrbitApiClient,
  type RegisterEeDisclosurePayload,
  SEEKER_AGE_GROUP_OPTIONS,
} from "@/app/lib/api/annixOrbitApi";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import { useIsTestEnv } from "@/app/lib/hooks/useIsTestEnv";

function RegisterIndividualContent() {
  const isTestEnv = useIsTestEnv();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nameParam = searchParams.get("name");
  const emailParam = searchParams.get("email");
  const mobileParam = searchParams.get("mobile");
  const ageParam = searchParams.get("age");
  const prefillAge = SEEKER_AGE_GROUP_OPTIONS.some((option) => option.value === ageParam)
    ? (ageParam ?? "")
    : "";
  const { confirm, ConfirmDialog } = useConfirm();
  const [step, setStep] = useState<"account" | "ee">("account");
  const [name, setName] = useState(nameParam || "");
  const [email, setEmail] = useState(emailParam || "");
  const [phone, setPhone] = useState(mobileParam || "");
  const [ageGroup, setAgeGroup] = useState(prefillAge);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [popiaConsent, setPopiaConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("ee");
  };

  const presentRegistrationError = async (err: unknown) => {
    const info = parseRegistrationError(err);
    if (info.alreadyExists) {
      const goSignIn = await confirm({
        title: "Email already registered",
        message: info.message,
        confirmLabel: "Sign in",
        cancelLabel: "Use a different email",
        variant: "info",
      });
      if (goSignIn) {
        router.push("/annix/orbit/login?type=individual");
      } else {
        setStep("account");
      }
      return;
    }
    await confirm({
      title: "Registration failed",
      message: info.message,
      confirmLabel: "OK",
      hideCancel: true,
      variant: "warning",
    });
  };

  const finishRegistration = async (eeDisclosure: RegisterEeDisclosurePayload | null) => {
    setIsLoading(true);
    try {
      const trimmedPhone = phone.trim();
      await annixOrbitApiClient.registerIndividual({
        name,
        email,
        password,
        phone: trimmedPhone.length > 0 ? trimmedPhone : null,
        ageGroup: ageGroup.length > 0 ? ageGroup : null,
        eeDisclosure,
      });
      setSuccess(true);
    } catch (err) {
      await presentRegistrationError(err);
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
              className="inline-block bg-[var(--brand-navbar,#323288)] text-white py-3 px-6 rounded-lg font-medium hover:bg-[var(--brand-navbar-active,#252560)] transition-colors"
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
        <EeRegistrationStep submitting={isLoading} onComplete={finishRegistration} />
        {ConfirmDialog}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <BackToHubLink />
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
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
            <p className="text-gray-600 mt-2">Build your CV profile and find your next role</p>
          </div>

          <form onSubmit={handleAccountSubmit} className="space-y-5">
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-navbar-50,#f0f0fc)] focus:border-transparent"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-navbar-50,#f0f0fc)] focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Mobile number <span className="text-gray-400">(optional)</span>
              </label>
              <PhoneInput id="phone" value={phone} onChange={setPhone} />
              <p className="text-xs text-gray-500 mt-1">
                For interview reminders by SMS or WhatsApp.
              </p>
            </div>

            <div>
              <label htmlFor="ageGroup" className="block text-sm font-medium text-gray-700 mb-1">
                Age group
              </label>
              <select
                id="ageGroup"
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-[var(--brand-navbar-50,#f0f0fc)] focus:border-transparent"
              >
                <option value="" disabled>
                  Select your age group
                </option>
                {SEEKER_AGE_GROUP_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Helps us match you with age-appropriate opportunities.
              </p>
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
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-navbar-50,#f0f0fc)] focus:border-transparent"
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
                className="mt-1 h-4 w-4 text-[var(--brand-navbar,#323288)] focus:ring-[var(--brand-navbar-50,#f0f0fc)] border-gray-300 rounded"
              />
              <label htmlFor="popiaConsent" className="ml-2 text-sm text-gray-600">
                I consent to the processing of my personal information in accordance with the{" "}
                <span className="text-[var(--brand-navbar,#323288)] font-medium">
                  Protection of Personal Information Act (POPIA)
                </span>
                . I understand that my data will be retained for 12 months from my last activity and
                I may request erasure of my data at any time.
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading || !popiaConsent}
              className="w-full bg-[var(--brand-navbar,#323288)] text-white py-3 px-4 rounded-lg font-medium hover:bg-[var(--brand-navbar-active,#252560)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-navbar-50,#f0f0fc)] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Continue
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{" "}
              <Link
                href="/annix/orbit/login?type=individual"
                className="text-[var(--brand-navbar,#323288)] hover:text-[var(--brand-navbar-active,#252560)] font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {!isTestEnv && (
          <div className="text-center mt-6 space-x-4">
            <Link
              href="/annix/orbit"
              className="text-[var(--brand-navbar-200,#c0c0eb)] hover:text-white text-sm"
            >
              Choose a different account type
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnnixOrbitRegisterIndividualPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-navbar-400,#7373c2)]" />
        </div>
      }
    >
      <RegisterIndividualContent />
    </Suspense>
  );
}
