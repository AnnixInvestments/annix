"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { cvAssistantApiClient } from "@/app/lib/api/cvAssistantApi";

type Status = "pending" | "success" | "error";

function ConfirmDeleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("pending");
  const [message, setMessage] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (!token) {
      setStatus("error");
      setMessage("This deletion link is missing its token.");
      return;
    }

    let cancelled = false;
    const confirmDeletion = async () => {
      try {
        const response = await cvAssistantApiClient.confirmMyAccountDeletion(token);
        if (cancelled) return;
        cvAssistantApiClient.clearTokens();
        const responseMessage = response.message;
        setStatus("success");
        setMessage(responseMessage || "Account deleted.");
        setTimeout(() => router.push("/cv-assistant"), 3000);
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Confirmation failed");
      }
    };

    confirmDeletion();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-violet-900 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          {status === "pending" && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-violet-100 rounded-full mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Deleting your account</h2>
              <p className="text-gray-600">
                We are permanently erasing your data. This will only take a moment.
              </p>
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Account deleted</h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <Link
                href="/cv-assistant"
                className="inline-block bg-violet-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-violet-700 transition-colors"
              >
                Return home
              </Link>
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Deletion failed</h2>
              <p className="text-gray-600 mb-6">
                {message || "This link may have expired or already been used."}
              </p>
              <p className="text-sm text-gray-500 mb-4">
                If you still want to delete your account, sign in and request a new link from
                Settings.
              </p>
              <Link
                href="/cv-assistant/login?type=individual"
                className="inline-block bg-violet-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-violet-700 transition-colors"
              >
                Sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CvAssistantConfirmDeletePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-violet-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-400" />
        </div>
      }
    >
      <ConfirmDeleteContent />
    </Suspense>
  );
}
