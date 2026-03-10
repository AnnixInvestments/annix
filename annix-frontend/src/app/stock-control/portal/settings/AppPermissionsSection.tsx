"use client";

import { useCallback, useEffect, useState } from "react";

type PermissionState = "granted" | "denied" | "prompt" | "unsupported";

function usePermissionState(name: string): PermissionState {
  const [state, setState] = useState<PermissionState>("prompt");

  useEffect(() => {
    if (!navigator.permissions) {
      setState("unsupported");
      return;
    }

    let mounted = true;
    navigator.permissions
      .query({ name: name as PermissionName })
      .then((status) => {
        if (mounted) setState(status.state as PermissionState);
        status.onchange = () => {
          if (mounted) setState(status.state as PermissionState);
        };
      })
      .catch(() => {
        if (mounted) setState("unsupported");
      });

    return () => {
      mounted = false;
    };
  }, [name]);

  return state;
}

export function AppPermissionsSection() {
  const cameraState = usePermissionState("camera");
  const [requesting, setRequesting] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const requestCamera = useCallback(async () => {
    setRequesting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch {
      setShowInstructions(true);
    } finally {
      setRequesting(false);
    }
  }, []);

  const statusColor =
    cameraState === "granted"
      ? "bg-green-100 text-green-800"
      : cameraState === "denied"
        ? "bg-red-100 text-red-800"
        : "bg-yellow-100 text-yellow-800";

  const statusLabel =
    cameraState === "granted"
      ? "Allowed"
      : cameraState === "denied"
        ? "Blocked"
        : cameraState === "unsupported"
          ? "Not Available"
          : "Not Set";

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">App Permissions</h2>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Camera</p>
              <p className="text-xs text-gray-500">
                Required for taking photos of stock allocations
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${statusColor}`}>
              {statusLabel}
            </span>
            {cameraState !== "granted" && cameraState !== "unsupported" && (
              <button
                onClick={requestCamera}
                disabled={requesting}
                className="px-3 py-1.5 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {requesting ? "Requesting..." : "Request Access"}
              </button>
            )}
          </div>
        </div>

        {cameraState === "denied" && (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
            <div className="flex">
              <svg
                className="h-5 w-5 text-amber-400 flex-shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">Camera access was blocked</h3>
                <div className="mt-2 text-sm text-amber-700">
                  <button
                    onClick={() => setShowInstructions(!showInstructions)}
                    className="font-medium underline hover:text-amber-900"
                  >
                    {showInstructions ? "Hide instructions" : "How to fix this"}
                  </button>
                  {showInstructions && (
                    <ol className="mt-2 list-decimal list-inside space-y-1">
                      <li>Tap the lock icon in the browser address bar</li>
                      <li>Tap &quot;Permissions&quot; or &quot;Site settings&quot;</li>
                      <li>Find &quot;Camera&quot; and change it to &quot;Allow&quot;</li>
                      <li>Reload the app</li>
                    </ol>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showInstructions && cameraState !== "denied" && (
          <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
            <p className="text-sm text-blue-700">
              If the permission prompt did not appear, your browser may have blocked it. Tap the
              lock icon in the address bar, go to &quot;Site settings&quot;, and allow Camera
              access.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
