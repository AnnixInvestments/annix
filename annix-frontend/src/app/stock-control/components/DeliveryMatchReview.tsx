"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

interface ProposedMatch {
  id: number;
  sku: string;
  name: string;
  quantity: number;
  category: string | null;
  score: number;
  matchType: string;
}

interface MatchPreview {
  description: string;
  sku: string;
  quantity: number;
  proposedMatch: ProposedMatch | null;
  isNew: boolean;
}

interface Override {
  description: string;
  matchedItemId: number | null;
}

interface Props {
  deliveryId: number;
  onConfirm: (overrides: Override[]) => void;
  onCancel: () => void;
}

function matchLabel(matchType: string): string {
  const labels: Record<string, string> = {
    learned: "Learned",
    exact_sku: "Exact SKU",
    normalised_sku: "Normalised SKU",
    fuzzy_same_supplier: "Same Supplier",
    fuzzy_high_confidence: "High Confidence",
  };
  const label = labels[matchType];
  return label || matchType;
}

function matchColor(score: number): string {
  if (score >= 0.9) return "text-green-700 bg-green-50 border-green-200";
  if (score >= 0.7) return "text-teal-700 bg-teal-50 border-teal-200";
  return "text-amber-700 bg-amber-50 border-amber-200";
}

export function DeliveryMatchReview(props: Props) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchPreview[]>([]);
  const [overrides, setOverrides] = useState<Map<string, number | null>>(new Map());

  useState(() => {
    stockControlApiClient
      .previewDeliveryStockMatches(props.deliveryId)
      .then((result) => {
        setMatches(result);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load match preview");
        setIsLoading(false);
      });
  });

  const handleConfirm = () => {
    const finalOverrides: Override[] = [...overrides.entries()].map(
      ([description, matchedItemId]) => ({ description, matchedItemId }),
    );
    props.onConfirm(finalOverrides);
  };

  const handleClearOverride = (description: string) => {
    const next = new Map(overrides);
    next.delete(description);
    setOverrides(next);
  };

  const handleSetNewItem = (description: string) => {
    const next = new Map(overrides);
    next.set(description, null);
    setOverrides(next);
  };

  const matchedCount = matches.filter((m) => !m.isNew).length;
  const newCount = matches.filter((m) => m.isNew).length;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-black/10 backdrop-blur-md"
        onClick={props.onCancel}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">Review Stock Matches</h3>
          <p className="text-sm text-gray-500 mt-1">
            {isLoading
              ? "Analyzing delivery items..."
              : `${matchedCount} matched to existing stock, ${newCount} will create new items`}
          </p>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
              <span className="ml-3 text-gray-600">Analyzing matches...</span>
            </div>
          )}

          {!isLoading && matches.length === 0 && (
            <div className="text-center py-12 text-gray-500">No extracted items to review.</div>
          )}

          {!isLoading && matches.length > 0 && (
            <div className="space-y-3">
              {matches.map((match, idx) => {
                const hasOverride = overrides.has(match.description);
                const overrideValue = overrides.get(match.description);
                const isOverriddenToNew = hasOverride && overrideValue === null;
                const effectiveIsNew = isOverriddenToNew || (!hasOverride && match.isNew);

                return (
                  <div
                    key={idx}
                    className={`border rounded-lg p-4 ${
                      effectiveIsNew
                        ? "border-amber-200 bg-amber-50/30"
                        : "border-green-200 bg-green-50/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {match.description}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          SKU: {match.sku} | Qty: {match.quantity}
                        </p>
                      </div>

                      {effectiveIsNew ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                            New Item
                          </span>
                          {hasOverride && (
                            <button
                              type="button"
                              onClick={() => handleClearOverride(match.description)}
                              className="text-xs text-teal-600 hover:text-teal-800 underline"
                            >
                              Undo
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 shrink-0">
                          {match.proposedMatch && (
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">
                                {match.proposedMatch.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-gray-500">
                                  SKU: {match.proposedMatch.sku} | Stock:{" "}
                                  {match.proposedMatch.quantity}
                                </span>
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${matchColor(match.proposedMatch.score)}`}
                                >
                                  {matchLabel(match.proposedMatch.matchType)}{" "}
                                  {Math.round(match.proposedMatch.score * 100)}%
                                </span>
                              </div>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => handleSetNewItem(match.description)}
                            className="text-xs text-amber-600 hover:text-amber-800 underline whitespace-nowrap"
                          >
                            Create New
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center shrink-0">
          <div className="text-sm text-gray-500">
            {overrides.size > 0 && `${overrides.size} override${overrides.size === 1 ? "" : "s"}`}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={props.onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:opacity-50"
            >
              Confirm & Add to Stock
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
