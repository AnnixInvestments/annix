import { memo } from "react";

interface RfqItemActionsButtonsProps {
  /** The full entry being acted on. Passed through to onDuplicate / onCopy. */
  entry: { id: string };
  /** Position in the parent list — needed by onDuplicate to insert next to the current entry. */
  index: number;
  /** Total number of entries. The Remove button only renders when this is > 1 (the last entry stays). */
  entriesCount: number;
  /** Tints the Copy button green for 1.5s after a copy. */
  copiedItemId?: string | null;
  /** Hide the Duplicate button entirely when not provided. */
  onDuplicateEntry?: (entry: { id: string }, index: number) => void;
  /** Hide the Copy button entirely when not provided. */
  onCopyEntry?: (entry: { id: string }) => void;
  onRemoveEntry: (id: string) => void;
  /**
   * Tailwind text + hover colour for the Duplicate button. Different
   * forms use different brand colours (BendForm = purple, FittingForm =
   * teal). Defaults to the BendForm colour scheme for back-compat.
   */
  duplicateButtonColorClass?: string;
}

/**
 * The Duplicate / Copy / Remove-Item row that appears at the bottom of
 * every per-item RFQ form (BendForm, FittingForm — and a candidate to
 * roll out to the other forms too). Extracted from BendForm.tsx
 * (issue #267 Phase 2). Memoised so each item-action row only
 * re-renders when its own data shifts, not when sibling form state
 * elsewhere in the wizard changes.
 *
 * The parent must wrap `onDuplicateEntry` / `onCopyEntry` /
 * `onRemoveEntry` in `useCallback` for `React.memo` to be effective.
 */
const RfqItemActionsButtonsInner = (props: RfqItemActionsButtonsProps) => {
  const { entry, index, entriesCount, copiedItemId, onDuplicateEntry, onCopyEntry, onRemoveEntry } =
    props;
  const rawDuplicateButtonColorClass = props.duplicateButtonColorClass;
  const duplicateButtonColorClass =
    rawDuplicateButtonColorClass ??
    "text-purple-600 hover:text-purple-800 hover:bg-purple-50 border-purple-300";
  return (
    <div className="mt-4 flex justify-end gap-2">
      {onDuplicateEntry && (
        <button
          type="button"
          onClick={() => onDuplicateEntry(entry, index)}
          className={`flex items-center gap-1 px-3 py-2 text-sm font-medium border rounded-md transition-colors ${duplicateButtonColorClass}`}
          title="Duplicate this item"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
            />
          </svg>
          Duplicate
        </button>
      )}
      {onCopyEntry && (
        <button
          type="button"
          onClick={() => onCopyEntry(entry)}
          className={`flex items-center gap-1 px-3 py-2 text-sm font-medium border rounded-md transition-colors ${
            copiedItemId === entry.id
              ? "bg-green-100 text-green-700 border-green-300"
              : "text-gray-600 hover:text-gray-800 hover:bg-gray-50 border-gray-300"
          }`}
          title="Copy item data to clipboard"
        >
          {copiedItemId === entry.id ? (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copy
            </>
          )}
        </button>
      )}
      {entriesCount > 1 && (
        <button
          type="button"
          onClick={() => onRemoveEntry(entry.id)}
          className="flex items-center gap-1 px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 text-sm font-medium border border-red-300 rounded-md transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          Remove Item
        </button>
      )}
    </div>
  );
};

export const RfqItemActionsButtons = memo(RfqItemActionsButtonsInner);
