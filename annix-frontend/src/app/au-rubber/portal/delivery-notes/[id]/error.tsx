"use client";

import { useEffect } from "react";

export default function DeliveryNoteDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("DeliveryNote detail error:", error);
  }, [error]);

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
        <button
          onClick={reset}
          className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
