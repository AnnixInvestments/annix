import { memo, type ReactNode } from "react";

interface ConfirmedLiningBadgeProps {
  content: ReactNode;
  tone: "intense" | "subtle";
  onEdit: () => void;
  editButtonClassName?: string;
}

const ConfirmedLiningBadgeInner = (props: ConfirmedLiningBadgeProps) => {
  const containerClass =
    props.tone === "intense"
      ? "bg-green-100 border border-green-400 rounded-md p-2 flex items-center justify-between"
      : "bg-green-50 border border-green-200 rounded-md p-3";

  const wrapperClass = props.tone === "subtle" ? "flex items-center justify-between" : null;
  const rawEditButtonClassName = props.editButtonClassName;
  const editButtonClass =
    rawEditButtonClassName ||
    "px-2 py-1 bg-gray-500 text-white font-medium rounded text-xs hover:bg-gray-600";

  const body = (
    <>
      <div className="flex items-center gap-2 text-xs text-green-800">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        {props.content}
      </div>
      <button type="button" onClick={props.onEdit} className={editButtonClass}>
        Edit
      </button>
    </>
  );

  if (wrapperClass) {
    return (
      <div className={containerClass}>
        <div className={wrapperClass}>{body}</div>
      </div>
    );
  }
  return <div className={containerClass}>{body}</div>;
};

export const ConfirmedLiningBadge = memo(ConfirmedLiningBadgeInner);
