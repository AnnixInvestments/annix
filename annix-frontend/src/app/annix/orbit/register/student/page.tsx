"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EeRegistrationStep } from "@/app/annix/orbit/components/EeRegistrationStep";
import { parseRegistrationError } from "@/app/annix/orbit/config/registration-errors";
import { annixOrbitApiClient, type RegisterEeDisclosurePayload } from "@/app/lib/api/annixOrbitApi";
import { useConfirm } from "@/app/lib/hooks/useConfirm";

export default function AnnixOrbitRegisterStudentPage() {
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();
  const [step, setStep] = useState<"account" | "ee">("account");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
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
        router.push("/annix/orbit/login?type=student");
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
      await annixOrbitApiClient.registerStudent({ name, email, password, eeDisclosure });
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
              href="/annix/orbit/login?type=student"
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
        <EeRegistrationStep submitting={isLoading} onComplete={finishRegistration} />
        {ConfirmDialog}
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
                  d="M12 14l9-5-9-5-9 5 9 5z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14v5" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Create your student account</h1>
            <p className="text-gray-600 mt-2">
              Plan your FuturePath — subjects, marks, and the qualifications that get you there
            </p>
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
                . If I am under 18, a parent or guardian has given permission for me to create this
                account. I understand my data may be retained and I may request erasure at any time.
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
                href="/annix/orbit/login?type=student"
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
