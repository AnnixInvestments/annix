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
      setLineItems(jobCard.lineItems || []);
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

  const handleToggleAll = () => {
    if (selectedIndices.size === lineItems.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(lineItems.map((_li, idx) => idx)));
    }
  };

  const handleToggle = (idx: number) => {
    const next = new Set(selectedIndices);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    setSelectedIndices(next);
  };

  const handleGenerate = async () => {
    if (selectedIndices.size === 0) {
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      setSuccess(null);
      await stockControlApiClient.autoGenerateReleaseDocuments(
        jobCardId,
        Array.from(selectedIndices),
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

  const allSelected = lineItems.length > 0 && selectedIndices.size === lineItems.length;

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
          Select line items to include in the release documents. Both the Items Release (QD_PLS_09) and Release Certificate (QD_PLS_10) will be auto-generated with QC measurement data.
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
                    <th className="px-3 py-2 text-left">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={handleToggleAll}
                        className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                    </th>
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
                      Qty
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {lineItems.map((li, idx) => (
                    <tr
                      key={li.id}
                      className={`cursor-pointer hover:bg-gray-50 ${selectedIndices.has(idx) ? "bg-teal-50" : ""}`}
                      onClick={() => handleToggle(idx)}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIndices.has(idx)}
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
                        {li.quantity ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-teal-700">
                {selectedIndices.size} of {lineItems.length} items selected
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
