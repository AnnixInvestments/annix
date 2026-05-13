import { memo } from "react";

interface SteelPipesConfirmButtonProps {
  disabled: boolean;
  onConfirm: () => void;
}

const SteelPipesConfirmButtonInner = (props: SteelPipesConfirmButtonProps) => (
  <div className="mt-4 flex justify-end" data-field="steelPipesConfirmation">
    <button
      type="button"
      onClick={props.onConfirm}
      disabled={props.disabled}
      className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Confirm Steel Pipe Specifications
    </button>
  </div>
);

export const SteelPipesConfirmButton = memo(SteelPipesConfirmButtonInner);
