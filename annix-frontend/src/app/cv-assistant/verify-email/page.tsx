"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { cvAssistantApiClient } from "@/app/lib/api/cvAssistantApi";

type Status = "pending" | "success" | "error";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("pending");
  const [message, setMessage] = useState<string | null>(null);
  const [autoSignedIn, setAutoSignedIn] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("This verification link is missing its token.");
      return;
    }

    let cancelled = false;
    const verify = async () => {
      try {
        const response = await cvAssistantApiClient.verifyEmail(token);
        if (cancelled) return;

        if (response.accessToken && response.refreshToken) {
          setAutoSignedIn(true);
          try {
            const profile = await cvAssistantApiClient.currentUser();
            if (cancelled) return;
            setStatus("success");
            setMessage("Email verified. Signing you in...");
            const target =
              profile.userType === "individual"
                ? "/cv-assistant/seeker/dashboard"
                : "/cv-assistant/portal/dashboard";
            setTimeout(() => router.push(target), 1500);
            return;
          } catch {
            cvAssistantApiClient.clearTokens();
          }
        }

        if (cancelled) return;
        setStatus("success");
        const verifiedMessage = response.message;
        setMessage(verifiedMessage ? verifiedMessage : "Email verified. You can now sign in.");
        setTimeout(() => router.push("/cv-assistant/login"), 2000);
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Verification failed");
      }
    };

    verify();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setResendMessage(null);
    setIsResending(true);
    try {
      const response = await cvAssistantApiClient.resendVerification(resendEmail);
      const resendResponseMessage = response.message;
      setResendMessage(
        resendResponseMessage
          ? resendResponseMessage
          : "Verification email resent. Check your inbox.",
      );
    } catch (err) {
      setResendMessage(err instanceof Error ? err.message : "Could not resend email");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a40] via-[#0d0d20] to-[#1a1a40] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          {status === "pending" && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#e0e0f5] rounded-full mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#323288]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying your email</h2>
              <p className="text-gray-600">Hold on while we confirm your verification link.</p>
            </>
          )}

          {status === "success" && (
            <>
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Email verified</h2>
              <p className="text-gray-600 mb-6">{message}</p>
              {!autoSignedIn && (
                <Link
                  href="/cv-assistant/login"
                  className="inline-block bg-[#323288] text-white py-3 px-6 rounded-lg font-medium hover:bg-[#252560] transition-colors"
                >
                  Sign in
                </Link>
              )}
            </>
          )}

          {status === "error" && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <svg
                  className="w-8 h-8 text-red-600"
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
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification failed</h2>
              <p className="text-gray-600 mb-6">
                {message || "This link may have expired or already been used."}
              </p>

              <form onSubmit={handleResend} className="text-left space-y-3">
                <label htmlFor="resendEmail" className="block text-sm font-medium text-gray-700">
                  Resend the verification email
                </label>
                <input
                  id="resendEmail"
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f0f0fc]0 focus:border-transparent"
                  placeholder="you@example.com"
                />
                <button
                  type="submit"
                  disabled={isResending}
                  className="w-full bg-[#323288] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#252560] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isResending ? "Sending..." : "Resend verification email"}
                </button>
                {resendMessage && (
                  <p className="text-sm text-gray-600 text-center pt-1">{resendMessage}</p>
                )}
              </form>

              <div className="mt-6">
                <Link
                  href="/cv-assistant/login"
                  className="text-[#323288] hover:text-[#252560] text-sm font-medium"
                >
                  Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CvAssistantVerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-[#1a1a40] via-[#0d0d20] to-[#1a1a40] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7373c2]" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
