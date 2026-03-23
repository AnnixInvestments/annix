"use client";

import { useCallback, useEffect, useState } from "react";
import type { BackgroundStepStatus, JobCardLineItem } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

interface ReleaseDocumentGeneratorProps {
  jobCardId: number;
  backgroundSteps: BackgroundStepStatus[];
  onGenerated: () => void;
}

export function ReleaseDocumentGenerator(props: ReleaseDocumentGeneratorProps) {
  const jobCardId = props.jobCardId;
  const backgroundSteps = props.backgroundSteps;
  const onGenerated = props.onGenerated;

  const [lineItems, setLineItems] = useState<JobCardLineItem[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [releaseQuantities, setReleaseQuantities] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const qaFinalStep = backgroundSteps.find((bg) => bg.stepKey === "qa_final_check");
  const isVisible = qaFinalStep && qaFinalStep.completedAt === null;

  const fetchLineItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const jobCard = await stockControlApiClient.jobCardById(jobCardId);
      const validItems = (jobCard.lineItems || []).filter(
        (li) => !li.itemCode?.startsWith("Sage ") && !li.itemDescription?.startsWith("Sage "),
      );
      setLineItems(validItems);
      const initialQuantities = validItems.reduce(
        (acc, li, idx) => ({ ...acc, [idx]: li.quantity || 0 }),
        {} as Record<number, number>,
      );
      setReleaseQuantities(initialQuantities);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load line items");
    } finally {
      setIsLoading(false);
    }
  }, [jobCardId]);

  useEffect(() => {
    if (isVisible) {
      fetchLineItems();
    }
  }, [isVisible, fetchLineItems]);

  if (!isVisible) {
    return null;
  }

  const handleToggle = (idx: number) => {
    const next = new Set(selectedIndices);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    setSelectedIndices(next);
  };

  const handleQuantityChange = (idx: number, value: string) => {
    const parsed = Number.parseFloat(value);
    const maxQty = lineItems[idx]?.quantity || 0;
    if (Number.isNaN(parsed) || parsed < 0) {
      setReleaseQuantities({ ...releaseQuantities, [idx]: 0 });
    } else if (parsed > maxQty) {
      setReleaseQuantities({ ...releaseQuantities, [idx]: maxQty });
    } else {
      setReleaseQuantities({ ...releaseQuantities, [idx]: parsed });
    }
  };

  const handleGenerate = async () => {
    if (selectedIndices.size === 0) {
      return;
    }

    const quantityOverrides = Array.from(selectedIndices).reduce(
      (acc, idx) => ({
        ...acc,
        [idx]: releaseQuantities[idx] || lineItems[idx]?.quantity || 0,
      }),
      {} as Record<number, number>,
    );

    try {
      setIsGenerating(true);
      setError(null);
      setSuccess(null);
      await stockControlApiClient.autoGenerateReleaseDocuments(
        jobCardId,
        Array.from(selectedIndices),
        quantityOverrides,
      );
      setSuccess("Release documents generated successfully");
      setSelectedIndices(new Set());
      onGenerated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate release documents");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="rounded-lg border border-teal-200 bg-teal-50 shadow-sm">
      <div className="flex items-center justify-between border-b border-teal-200 px-5 py-3">
        <h3 className="text-sm font-semibold text-teal-900">Release Document Generator</h3>
        <span className="inline-flex items-center rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-medium text-teal-800">
          QA Final Check
        </span>
      </div>

      <div className="px-5 py-4">
        {error && (
          <div className="mb-3 rounded-md bg-red-50 p-2 text-sm text-red-700">
            {error}
            <button onClick={() => setError(null)} className="ml-2 font-medium underline">
              Dismiss
            </button>
          </div>
        )}

        {success && (
          <div className="mb-3 rounded-md bg-green-50 p-2 text-sm text-green-700">
            {success}
            <button onClick={() => setSuccess(null)} className="ml-2 font-medium underline">
              Dismiss
            </button>
          </div>
        )}

        <p className="mb-3 text-sm text-teal-800">
          Select line items to include in the release documents. Both the Items Release (QD_PLS_09)
          and Release Certificate (QD_PLS_10) will be auto-generated with QC measurement data.
          Adjust quantities for partial releases.
        </p>

        {isLoading ? (
          <div className="py-4 text-center text-sm text-gray-500">Loading line items...</div>
        ) : lineItems.length === 0 ? (
          <div className="py-4 text-center text-sm text-gray-500">No line items found</div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-md border border-teal-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-10 px-3 py-2" />
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                      Item Code
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                      Description
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                      JT No
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">
                      Total Qty
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">
                      Release Qty
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {lineItems.map((li, idx) => {
                    const isSelected = selectedIndices.has(idx);
                    const releaseQty = releaseQuantities[idx] || 0;
                    const isPartial = isSelected && releaseQty < (li.quantity || 0);
                    return (
                      <tr
                        key={li.id}
                        className={`cursor-pointer hover:bg-gray-50 ${isSelected ? "bg-teal-50" : ""}`}
                        onClick={() => handleToggle(idx)}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggle(idx)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                          />
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-sm font-medium text-gray-900">
                          {li.itemCode || "-"}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-600">
                          {li.itemDescription || "-"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-500">
                          {li.jtNo || "-"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-sm text-gray-600">
                          {li.quantity || "-"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right">
                          {isSelected ? (
                            <input
                              type="number"
                              value={releaseQty}
                              onChange={(e) => handleQuantityChange(idx, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              min={0}
                              max={li.quantity || 0}
                              step="any"
                              className={`w-20 rounded border px-2 py-1 text-right text-sm ${isPartial ? "border-amber-400 bg-amber-50 text-amber-800" : "border-gray-300 text-gray-900"}`}
                            />
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-teal-700">
                {selectedIndices.size} of {lineItems.length} items selected
                {Array.from(selectedIndices).some(
                  (idx) => (releaseQuantities[idx] || 0) < (lineItems[idx]?.quantity || 0),
                ) && (
                  <span className="ml-2 text-xs text-amber-600 font-medium">(partial release)</span>
                )}
              </span>
              <button
                onClick={handleGenerate}
                disabled={selectedIndices.size === 0 || isGenerating}
                className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGenerating ? "Generating..." : "Generate Release Documents"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
