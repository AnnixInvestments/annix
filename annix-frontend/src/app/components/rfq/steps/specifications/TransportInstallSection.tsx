import { memo } from "react";

/**
 * "Transportation & Installation" section of SpecificationsStep —
 * currently a "Coming Soon" placeholder. Zero closure deps; pure
 * static JSX. Memoised so it doesn't re-render with the rest of
 * SpecificationsStep on unrelated state changes.
 *
 * Extracted from SpecificationsStep.tsx (issue #267 Phase 3).
 */
const TransportInstallSectionInner = () => (
  <div className="space-y-3">
    <div className="flex items-center gap-3 pb-2 border-b border-gray-200">
      <span className="text-2xl">🚚</span>
      <h3 className="text-xl font-bold text-gray-900">Transportation & Installation</h3>
    </div>
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-center gap-3 mb-3">
        <svg
          className="w-6 h-6 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h4 className="text-lg font-semibold text-green-800">Coming Soon</h4>
      </div>
      <p className="text-green-700 text-sm">
        Transportation and installation specifications will be available in a future update. This
        will include delivery requirements, site logistics, installation services, and more.
      </p>
    </div>
  </div>
);

export const TransportInstallSection = memo(TransportInstallSectionInner);
