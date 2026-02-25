"use client";

interface UserNavigationBarProps {
  currentIndex: number;
  totalUsers: number;
  onPrevious: () => void;
  onNext: () => void;
}

export function UserNavigationBar({
  currentIndex,
  totalUsers,
  onPrevious,
  onNext,
}: UserNavigationBarProps) {
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < totalUsers - 1;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onPrevious}
        disabled={!canGoPrevious}
        className="p-1 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Previous user"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <span className="text-sm text-gray-500 dark:text-gray-400 tabular-nums min-w-[60px] text-center">
        {totalUsers > 0 ? `${currentIndex + 1} of ${totalUsers}` : "0 of 0"}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={!canGoNext}
        className="p-1 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Next user"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
