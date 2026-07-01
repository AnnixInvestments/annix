export function PreviewBanner() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-200">
      <svg
        className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 3h6m-5 0v5L5 18a2 2 0 002 3h10a2 2 0 002-3l-5-10V3"
        />
      </svg>
      <div>
        <p className="text-sm font-semibold">Preview feature</p>
        <p className="mt-0.5 text-sm">
          This page is a preview. The data shown is sample/placeholder and isn&apos;t live yet.
        </p>
      </div>
    </div>
  );
}
