import { memo } from "react";

interface ExternalCoatingNonPaintConfirmedProps {
  coatingType: string;
  onEdit: () => void;
}

const ExternalCoatingNonPaintConfirmedInner = (props: ExternalCoatingNonPaintConfirmedProps) => (
  <div className="bg-green-50 border border-green-200 rounded-md p-3">
    <div className="flex items-center justify-between">
      <h4 className="text-sm font-semibold text-green-800 flex items-center gap-1">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        External Coating: <span className="ml-1 text-green-700">{props.coatingType}</span>
      </h4>
      <button
        type="button"
        onClick={props.onEdit}
        className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
      >
        Edit
      </button>
    </div>
  </div>
);

export const ExternalCoatingNonPaintConfirmed = memo(ExternalCoatingNonPaintConfirmedInner);
