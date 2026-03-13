"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { MeetingPlatform } from "@/app/lib/api/annixRepApi";
import { useConnectMeetingPlatform } from "@/app/lib/query/hooks";

type ConnectionState = "connecting" | "success" | "error";

function PlatformOAuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<ConnectionState>("connecting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const connectPlatform = useConnectMeetingPlatform();

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const stateParam = searchParams.get("state");

    if (error) {
      setState("error");
      setErrorMessage(searchParams.get("error_description") ?? "Authorization was denied");
      return;
    }

    if (!code || !stateParam) {
      setState("error");
      setErrorMessage("Missing authorization code or state");
      return;
    }

    let platform: MeetingPlatform | null = null;
    try {
      const decodedState = JSON.parse(atob(stateParam));
      platform = decodedState.platform as MeetingPlatform;
    } catch {
      setState("error");
      setErrorMessage("Invalid state parameter");
      return;
    }

    if (!platform) {
      setState("error");
      setErrorMessage("Missing platform in state");
      return;
    }

    const redirectUri = `${window.location.origin}/fieldflow/settings/integrations/callback`;

    connectPlatform.mutate(
      {
        platform,
        authCode: code,
        redirectUri,
      },
      {
        onSuccess: () => {
          setState("success");
          if (window.opener) {
            window.opener.postMessage(
              { type: "PLATFORM_CONNECTED", platform },
              window.location.origin,
            );
            window.close();
          }
        },
        onError: (err) => {
          setState("error");
          setErrorMessage(err instanceof Error ? err.message : "Failed to connect platform");
        },
      },
    );
  }, [searchParams, connectPlatform]);

  const handleClose = () => {
    if (window.opener) {
      window.close();
    } else {
      router.push("/fieldflow/settings/integrations");
    }
  };

  const platformNames: Record<string, string> = {
    zoom: "Zoom",
    teams: "Microsoft Teams",
    google_meet: "Google Meet",
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-8 text-center">
          {state === "connecting" && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Connecting Platform
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                Please wait while we connect your meeting platform...
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
                Platform Connected
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Your meeting platform has been successfully connected. You can close this window.
              </p>
              <button
                onClick={handleClose}
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
                onClick={handleClose}
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

export default function PlatformOAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      }
    >
      <PlatformOAuthCallbackContent />
    </Suspense>
  );
}
