"use client";

interface DocumentActionButtonsProps {
  filename: string;
  onView: () => void;
  onDownload: () => void;
  onDelete: () => void;
  isLoading?: boolean;
  canDelete?: boolean;
  deleteDisabledReason?: string;
}

export function DocumentActionButtons({
  filename,
  onView,
  onDownload,
  onDelete,
  isLoading = false,
  canDelete = true,
  deleteDisabledReason,
}: DocumentActionButtonsProps) {
  const deleteDisabled = isLoading || !canDelete;
  const deleteTooltip =
    !canDelete && deleteDisabledReason ? deleteDisabledReason : `Delete ${filename}`;

  return (
    <div className="flex items-center gap-2 justify-end">
      <div className="relative group">
        <button
          onClick={onView}
          disabled={isLoading}
          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded disabled:opacity-50"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        </button>
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs !text-white bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg">
          View {filename}
        </span>
      </div>

      <div className="relative group">
        <button
          onClick={onDownload}
          disabled={isLoading}
          className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded disabled:opacity-50"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
        </button>
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs !text-white bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg">
          Download {filename}
        </span>
      </div>

      <div className="relative group">
        <button
          onClick={onDelete}
          disabled={deleteDisabled}
          className={`p-1.5 rounded ${
            deleteDisabled
              ? "text-gray-400 cursor-not-allowed"
              : "text-red-600 hover:text-red-800 hover:bg-red-50"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs !text-white bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg">
          {deleteTooltip}
        </span>
      </div>
    </div>
  );
}
