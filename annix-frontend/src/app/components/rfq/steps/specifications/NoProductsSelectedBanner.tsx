import { memo } from "react";

/**
 * "No Products Selected" warning banner shown at the bottom of
 * SpecificationsStep when none of the seven required-product flags
 * are set. Static JSX; zero closure deps. Memoised.
 *
 * Extracted from SpecificationsStep.tsx (issue #267 Phase 3).
 */
const NoProductsSelectedBannerInner = () => (
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
    <div className="flex items-center gap-3">
      <svg
        className="w-6 h-6 text-yellow-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <div>
        <h4 className="text-lg font-semibold text-yellow-800">No Products Selected</h4>
        <p className="text-yellow-700 text-sm mt-1">
          Please go back to Stage 1 and select at least one product or service type to configure
          specifications.
        </p>
      </div>
    </div>
  </div>
);

export const NoProductsSelectedBanner = memo(NoProductsSelectedBannerInner);
