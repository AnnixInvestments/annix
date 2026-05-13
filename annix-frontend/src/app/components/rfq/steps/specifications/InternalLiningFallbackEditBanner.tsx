import { memo } from "react";

interface InternalLiningFallbackEditBannerProps {
  liningType: string;
  onEdit: () => void;
}

const InternalLiningFallbackEditBannerInner = (props: InternalLiningFallbackEditBannerProps) => (
  <div className="bg-amber-100 border border-amber-400 rounded-md p-2 flex items-center justify-between mt-2">
    <div className="flex items-center gap-2 text-xs text-amber-800">
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
      <span className="font-medium">{props.liningType} — Incomplete Configuration</span>
    </div>
    <button
      type="button"
      onClick={props.onEdit}
      className="px-2 py-1 bg-amber-600 text-white font-medium rounded text-xs hover:bg-amber-700"
    >
      Edit
    </button>
  </div>
);

export const InternalLiningFallbackEditBanner = memo(InternalLiningFallbackEditBannerInner);
