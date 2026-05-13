import { memo } from "react";

interface SurfaceProtectionConfirmButtonProps {
  disabled: boolean;
  onConfirm: () => void;
}

const SurfaceProtectionConfirmButtonInner = (props: SurfaceProtectionConfirmButtonProps) => (
  <div className="mt-4 flex justify-end">
    <button
      type="button"
      onClick={props.onConfirm}
      disabled={props.disabled}
      className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Confirm Surface Protection
    </button>
  </div>
);

export const SurfaceProtectionConfirmButton = memo(SurfaceProtectionConfirmButtonInner);
