"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { CalendarProvider } from "@/app/lib/api/fieldflowApi";
import { useConnectCalendar } from "@/app/lib/query/hooks";

type ConnectionState = "connecting" | "success" | "error";

function OAuthCallbackContent() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<ConnectionState>("connecting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const connectCalendar = useConnectCalendar();

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const provider = searchParams.get("state") as CalendarProvider | null;

    if (error) {
      setState("error");
      setErrorMessage(searchParams.get("error_description") ?? "Authorization was denied");
      return;
    }

    if (!code || !provider) {
      setState("error");
      setErrorMessage("Missing authorization code or provider");
      return;
    }

    const redirectUri = `${window.location.origin}/fieldflow/oauth/callback`;

    connectCalendar.mutate(
      {
        provider,
        authCode: code,
        redirectUri,
      },
      {
        onSuccess: () => {
          setState("success");
          if (window.opener) {
            window.opener.postMessage(
              { type: "CALENDAR_CONNECTED", provider },
              window.location.origin,
            );
            window.close();
          }
        },
        onError: (err) => {
          setState("error");
          setErrorMessage(err instanceof Error ? err.message : "Failed to connect calendar");
        },
      },
    );
  }, [searchParams, connectCalendar]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-8 text-center">
          {state === "connecting" && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Connecting Calendar
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                Please wait while we connect your calendar...
              </p>
            </>
          )}

          {state === "success" && (
            <>
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-600 dark:text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Calendar Connected
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Your calendar has been successfully connected. You can close this window.
              </p>
              <button
                onClick={() => window.close()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Close Window
              </button>
            </>
          )}

          {state === "error" && (
            <>
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-600 dark:text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Connection Failed
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-4">{errorMessage}</p>
              <button
                onClick={() => window.close()}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600"
              >
                Close Window
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  );
}
