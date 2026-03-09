"use client";

import { useEffect } from "react";
import { attemptChunkErrorRecovery, isChunkLoadError } from "@/app/lib/chunkErrorRecovery";

export default function StockControlPortalError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { error, reset } = props;

  useEffect(() => {
    console.error("Stock Control portal error:", error);

    if (isChunkLoadError(error)) {
      attemptChunkErrorRecovery();
    }
  }, [error]);

  if (isChunkLoadError(error)) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center max-w-xl px-4">
          <div className="text-yellow-600 text-lg font-semibold mb-2">Update Available</div>
          <p className="text-gray-600 mb-4">
            A new version of the app has been deployed. Please reload the page to continue.
          </p>
          <button
            onClick={() => window.location.reload()}
            type="button"
            className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 text-sm font-medium"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-96">
      <div className="text-center max-w-xl px-4">
        <div className="text-red-500 text-lg font-semibold mb-2">Something went wrong</div>
        <p className="text-gray-600 mb-2">{error.message}</p>
        {error.stack && (
          <pre className="text-xs text-left bg-gray-100 p-3 rounded overflow-auto max-h-48 mb-4">
            {error.stack}
          </pre>
        )}
        <div className="flex gap-3 justify-center mt-6">
          <a
            href="/stock-control/portal/dashboard"
            className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 text-sm font-medium"
          >
            Back to Dashboard
          </a>
          <button
            onClick={reset}
            type="button"
            className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 text-sm font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
