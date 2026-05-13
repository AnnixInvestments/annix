import { memo } from "react";

const InternalLiningGalvanizedAutoNoticeInner = () => (
  <div className="bg-green-50 border-2 border-green-500 rounded-lg p-2 mb-2">
    <div className="flex items-center gap-1.5 mb-1">
      <svg
        className="w-4 h-4 text-green-600"
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
          clipRule="evenodd"
        />
      </svg>
      <h4 className="text-xs font-bold text-green-800">Internal: Hot-Dip Galvanized (Auto-set)</h4>
    </div>
    <div className="bg-white rounded p-2 border border-green-300">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-green-600 font-medium">Process:</span>{" "}
          <span className="text-green-800">ISO 1461</span>
        </div>
        <div>
          <span className="text-green-600 font-medium">Thickness:</span>{" "}
          <span className="text-green-800">45-85 μm</span>
        </div>
      </div>
    </div>
  </div>
);

export const InternalLiningGalvanizedAutoNotice = memo(InternalLiningGalvanizedAutoNoticeInner);
