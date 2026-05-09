"use client";

import { toPairs as entries, isArray, keys } from "es-toolkit/compat";
import type { NixExtractionSummary } from "@/app/lib/query/hooks";
import { ItemRow } from "./ItemRow";
import { MineInferenceBadge } from "./MineInferenceBadge";
import { SpecificationCard } from "./SpecificationCard";
import type { SpecLookup } from "./useSpecLookup";

/**
 * Renders one extracted document inside a draft session: the file
 * name + status + actions header, the extracted-items table (if
 * any), and the specification clauses block (if any). Pure
 * presentation — the host wires the action callbacks to its own
 * Nix API + PDF preview modal.
 */
export function ExtractionCard(props: {
  extraction: NixExtractionSummary;
  specLookup: SpecLookup;
  onViewOriginal: (extraction: NixExtractionSummary) => void;
  onJumpToPage: (extraction: NixExtractionSummary, page: number) => void;
  onJumpToSpec: (extractionId: number, page: number | null, searchHint: string | null) => void;
  onRetry: (extraction: NixExtractionSummary) => void;
  onItemSaved: () => void;
  retryingId: number | null;
  showSpecifications?: boolean;
}) {
  const {
    extraction,
    specLookup,
    onViewOriginal,
    onJumpToPage,
    onJumpToSpec,
    onRetry,
    onItemSaved,
    retryingId,
    showSpecifications,
  } = props;
  const rawItems = extraction.extractedItems;
  const items = (rawItems ? rawItems : []) as Array<Record<string, unknown>>;
  const rawData = extraction.extractedData;
  const data = (rawData ? rawData : {}) as Record<string, unknown>;
  const rawSpecs = data.specifications;
  const specifications = (rawSpecs ? rawSpecs : {}) as Record<string, unknown>;
  const specKeys = keys(specifications);
  const isRetrying = retryingId === extraction.id;
  const canRetry = Boolean(extraction.storagePath) && !isRetrying;

  // Role-tone colour: blue rail/header for drawings, purple for specs, gray
  // for everything else. The rail is the visual cue tying every clause /
  // item row to its source file even when the user has scrolled past the
  // file's header — the entire card has a 4px coloured rail down the left.
  const role = extraction.documentRole;
  let railClass = "bg-gray-300";
  let railTintClass = "bg-gray-50";
  let railHeaderTintClass = "bg-gray-100";
  if (role === "drawing") {
    railClass = "bg-blue-500";
    railTintClass = "bg-blue-50/40";
    railHeaderTintClass = "bg-blue-50";
  } else if (role === "specification") {
    railClass = "bg-purple-500";
    railTintClass = "bg-purple-50/40";
    railHeaderTintClass = "bg-purple-50";
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex">
      {/* Left rail — keeps the visual link between header and any deep
          stack of clauses below it, even on long specs. */}
      <div className={`w-1 flex-shrink-0 ${railClass}`} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <div
          className={`flex items-start justify-between gap-3 px-3 py-2 ${railHeaderTintClass} border-b border-gray-200`}
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {extraction.documentName}
            </p>
            <p className="text-xs text-gray-500">
              Status: {extraction.status} • {items.length} item{items.length === 1 ? "" : "s"}
              {extraction.storagePath && " • saved to S3"}
            </p>
            <MineInferenceBadge extraction={extraction} />
          </div>
          <div className="flex items-center gap-3 whitespace-nowrap">
            <button
              type="button"
              onClick={() => onRetry(extraction)}
              disabled={!canRetry}
              className="text-xs text-orange-600 hover:text-orange-800 underline disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed"
              title={
                extraction.storagePath
                  ? "Re-run extraction against the stored source"
                  : "No stored source — re-upload the file from the upload page"
              }
            >
              {isRetrying ? "Retrying..." : "Retry"}
            </button>
            <button
              type="button"
              onClick={() => onViewOriginal(extraction)}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              View original
            </button>
          </div>
        </div>

        {items.length > 0 && (
          <div className="overflow-x-auto px-3 py-2">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="py-1 pr-3 font-medium">Mark / #</th>
                  <th className="py-1 pr-3 font-medium">Description</th>
                  <th className="py-1 pr-3 font-medium">Qty</th>
                  <th className="py-1 pr-3 font-medium">Dimensions</th>
                  <th className="py-1 pr-3 font-medium">Linings / Codes</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <ItemRow
                    key={idx}
                    item={item}
                    index={idx}
                    extractionId={extraction.id}
                    specLookup={specLookup}
                    onSaved={onItemSaved}
                    onJumpToSpec={onJumpToSpec}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showSpecifications && specKeys.length > 0 && (
          <div className={`px-3 py-3 ${railTintClass}`}>
            <div className="flex items-baseline gap-2 mb-2">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                Specification clauses
              </h4>
              <span className="text-[10px] text-gray-500 truncate">
                from {extraction.documentName}
              </span>
            </div>
            <div className="space-y-2">
              {entries(specifications).map(([clauseKey, clauseValue]) => (
                <SpecificationCard
                  key={clauseKey}
                  clauseKey={clauseKey}
                  value={clauseValue}
                  kind={specLookup.kindFor(clauseKey)}
                  onJumpToPage={(page) => onJumpToPage(extraction, page)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Re-export of isArray retained so callers don't need a separate import for
// the typeof-array check elsewhere in their code paths.
export { isArray };
