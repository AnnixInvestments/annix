"use client";

export interface AppUpdateNoticeProps {
  /** Tailwind classes for the reload button — match the host app's brand. */
  brandButtonClass?: string;
}

/**
 * Shown when an `error.tsx` boundary catches a Next.js chunk-load error,
 * which always means a new build is live and the open tab is running stale
 * JavaScript. Matched by `isChunkLoadError` from `lib/chunkErrorRecovery`.
 *
 * Factored out of every per-app error.tsx to keep the message and tone
 * uniform — and so we never have to update copy in seven places.
 */
export function AppUpdateNotice(props: AppUpdateNoticeProps) {
  const brandButtonClass = props.brandButtonClass
    ? props.brandButtonClass
    : "bg-teal-600 hover:bg-teal-700";
  return (
    <div className="flex items-center justify-center min-h-96">
      <div className="text-center max-w-xl px-4">
        <div className="text-yellow-600 text-lg font-semibold mb-2">Update available</div>
        <p className="text-gray-600 mb-4">
          A new version of the app has been deployed. Please reload the page to continue.
        </p>
        <button
          onClick={() => window.location.reload()}
          type="button"
          className={`px-4 py-2 text-white rounded-md text-sm font-medium ${brandButtonClass}`}
        >
          Reload page
        </button>
      </div>
    </div>
  );
}
