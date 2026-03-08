"use client";

import { useEffect } from "react";

export default function DeliveryNoteDetailError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { error, reset } = props;
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
        <div className="flex gap-3 justify-center mt-6">
          <a
            href="/au-rubber/portal/delivery-notes"
            className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 text-sm font-medium"
          >
            Back to Delivery Notes
          </a>
          <button
            onClick={reset}
            type="button"
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
