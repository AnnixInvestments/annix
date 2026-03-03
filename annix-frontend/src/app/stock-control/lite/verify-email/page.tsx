"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function VerifyEmailContent() {
  var searchParams = useSearchParams();
  var token = searchParams.get("token");

  var statusOptions = {
    verifying: "verifying",
    complete: "complete",
    error: "error",
  };

  var getInitialStatus = () => statusOptions.verifying;

  var state = useState(getInitialStatus());
  var status = state[0];
  var setStatus = state[1];

  var messageState = useState("");
  var message = messageState[0];
  var setMessage = messageState[1];

  useEffect(() => {
    if (!token) {
      setStatus(statusOptions.error);
      setMessage("No verification token provided.");
      return;
    }

    var apiBase = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

    fetch(`${apiBase}/stock-control/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((response) => {
        if (!response.ok) {
          return response.text().then((text) => {
            throw new Error(text || "Verification failed");
          });
        }
        return response.json();
      })
      .then((data) => {
        setStatus(statusOptions.complete);
        setMessage(data.message || "Email verified successfully.");
      })
      .catch((e) => {
        setStatus(statusOptions.error);
        var errorMessage =
          e instanceof Error ? e.message : "Verification failed. Please try again.";
        setMessage(errorMessage);
      });
  }, [token]);

  if (status === statusOptions.verifying) {
    return (
      <div className="max-w-md mx-auto text-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="animate-spin w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full mx-auto"></div>
          <h1 className="mt-4 text-xl font-bold text-gray-900">Verifying your email...</h1>
          <p className="mt-2 text-gray-600">Please wait while we verify your email address.</p>
        </div>
      </div>
    );
  }

  if (status === statusOptions.complete) {
    return (
      <div className="max-w-md mx-auto text-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
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
          <h1 className="mt-4 text-xl font-bold text-gray-900">Email Verified</h1>
          <p className="mt-2 text-gray-600">{message}</p>
          <Link
            href="/stock-control/lite/login"
            className="mt-6 block w-full py-4 bg-teal-600 text-white rounded-lg font-bold text-lg hover:bg-teal-700"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto text-center">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h1 className="mt-4 text-xl font-bold text-gray-900">Verification Failed</h1>
        <p className="mt-2 text-gray-600">{message}</p>
        <Link
          href="/stock-control/lite/login"
          className="mt-6 block w-full py-4 bg-teal-600 text-white rounded-lg font-bold text-lg hover:bg-teal-700"
        >
          Go to Sign In
        </Link>
      </div>
    </div>
  );
}

export default function LiteVerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-600 mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">ASCA Stock Control</h1>
      </div>

      <Suspense
        fallback={
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="animate-spin w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          </div>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
