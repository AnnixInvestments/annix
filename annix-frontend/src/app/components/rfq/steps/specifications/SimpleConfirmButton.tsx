import { memo } from "react";

interface SimpleConfirmButtonProps {
  label: string;
  variant?: "default" | "compact";
  wrapperClassName?: string;
  onConfirm: () => void;
}

const SimpleConfirmButtonInner = (props: SimpleConfirmButtonProps) => {
  const isCompact = props.variant === "compact";
  const rawWrapperClassName = props.wrapperClassName;
  const wrapperClass = rawWrapperClassName || (isCompact ? "mt-2" : "mt-4");
  const buttonClass = isCompact
    ? "px-3 py-1.5 bg-green-600 text-white font-medium rounded text-xs hover:bg-green-700"
    : "px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm";

  return (
    <div className={wrapperClass}>
      <button type="button" onClick={props.onConfirm} className={buttonClass}>
        {props.label}
      </button>
    </div>
  );
};

export const SimpleConfirmButton = memo(SimpleConfirmButtonInner);
