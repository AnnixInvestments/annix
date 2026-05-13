import { memo } from "react";
import { formatLastSaved } from "@/app/lib/hooks/useRfqDraftStorage";

interface DraftAutoSavedBadgeProps {
  /**
   * The Date the unauthenticated draft was last persisted to
   * localStorage. When null/undefined the badge renders nothing.
   */
  lastSaved: Date | null | undefined;
}

/**
 * The "Auto-saved 2 minutes ago" badge that appears in the RFQ wizard
 * header when an unauthenticated customer has a local draft. Pulled
 * out of `StraightPipeRfqOrchestrator.tsx` (issue #267 Phase 2) and
 * memoised so it only re-renders when `lastSaved` actually changes,
 * not on every parent render of the orchestrator.
 *
 * Renders nothing when `lastSaved` is falsy — the parent doesn't have
 * to gate the JSX itself.
 */
const DraftAutoSavedBadgeInner = (props: DraftAutoSavedBadgeProps) => {
  const { lastSaved } = props;
  if (!lastSaved) return null;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-green-100 text-green-700 border border-green-200">
      <svg
        className="w-3 h-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      Auto-saved {formatLastSaved(lastSaved)}
    </span>
  );
};

export const DraftAutoSavedBadge = memo(DraftAutoSavedBadgeInner);
