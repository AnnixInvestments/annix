"use client";

import { Download } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PdfPreviewModal, usePdfPreview } from "@/app/components/PdfPreviewModal";
import type {
  BackgroundStepStatus,
  JobCardLineItem,
  QcItemsReleaseRecord,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

interface ReleaseDocumentGeneratorProps {
  jobCardId: number;
  backgroundSteps: BackgroundStepStatus[];
  onGenerated: () => void;
}

const releasedQuantityForItem = (releases: QcItemsReleaseRecord[], itemCode: string): number => {
  return releases.reduce((total, release) => {
    const matchingItems = release.items.filter((ri) => ri.itemCode === itemCode);
    return total + matchingItems.reduce((sum, ri) => sum + (ri.quantity || 0), 0);
  }, 0);
};

export function ReleaseDocumentGenerator(props: ReleaseDocumentGeneratorProps) {
  const jobCardId = props.jobCardId;
  const backgroundSteps = props.backgroundSteps;
  const onGenerated = props.onGenerated;

  const [lineItems, setLineItems] = useState<JobCardLineItem[]>([]);
  const [existingReleases, setExistingReleases] = useState<QcItemsReleaseRecord[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [releaseQuantities, setReleaseQuantities] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const pdfPreview = usePdfPreview();

  const qaFinalStep = backgroundSteps.find((bg) => bg.stepKey === "qa_final_check");
  const isVisible = qaFinalStep && qaFinalStep.completedAt === null;

  const remainingByIndex = useMemo(() => {
    return lineItems.reduce(
      (acc, li, idx) => {
        const totalQty = li.quantity || 0;
        const alreadyReleased = releasedQuantityForItem(existingReleases, li.itemCode || "");
        const remaining = Math.max(0, totalQty - alreadyReleased);
        return { ...acc, [idx]: { totalQty, alreadyReleased, remaining } };
      },
      {} as Record<number, { totalQty: number; alreadyReleased: number; remaining: number }>,
    );
  }, [lineItems, existingReleases]);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [jobCard, releases] = await Promise.all([
        stockControlApiClient.jobCardById(jobCardId),
        stockControlApiClient.itemsReleasesForJobCard(jobCardId),
      ]);
      const validItems = (jobCard.lineItems || []).filter(
        (li) => !li.itemCode?.startsWith("Sage ") && !li.itemDescription?.startsWith("Sage "),
      );
      setLineItems(validItems);
      setExistingReleases(Array.isArray(releases) ? releases : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load line items");
    } finally {
      setIsLoading(false);
    }
  }, [jobCardId]);

  useEffect(() => {
    if (isVisible) {
      fetchData();
    }
  }, [isVisible, fetchData]);

  useEffect(() => {
    const initialQuantities = lineItems.reduce(
      (acc, li, idx) => {
        const info = remainingByIndex[idx];
        return { ...acc, [idx]: info ? info.remaining : li.quantity || 0 };
      },
      {} as Record<number, number>,
    );
    setReleaseQuantities(initialQuantities);
    setSelectedIndices(new Set());
  }, [lineItems, remainingByIndex]);

  if (!isVisible) {
    return null;
  }

  const allFullyReleased =
    lineItems.length > 0 &&
    lineItems.every((_li, idx) => {
      const info = remainingByIndex[idx];
      return info ? info.remaining <= 0 : false;
    });

  const availableIndices = useMemo(
    () =>
      lineItems.reduce((acc, _li, idx) => {
        const info = remainingByIndex[idx];
        if (info && info.remaining > 0) return [...acc, idx];
        return acc;
      }, [] as number[]),
    [lineItems, remainingByIndex],
  );

  const allAvailableSelected =
    availableIndices.length > 0 && availableIndices.every((idx) => selectedIndices.has(idx));

  const handleToggleAll = () => {
    if (allAvailableSelected) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(availableIndices));
    }
  };

  const handleToggle = (idx: number) => {
    const info = remainingByIndex[idx];
    if (info && info.remaining <= 0) return;
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
    const info = remainingByIndex[idx];
    const maxQty = info ? info.remaining : 0;
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

    const hasZeroQty = Array.from(selectedIndices).some(
      (idx) => (releaseQuantities[idx] || 0) <= 0,
    );
    if (hasZeroQty) {
      setError("All selected items must have a release quantity greater than 0");
      return;
    }

    const quantityOverrides = Array.from(selectedIndices).reduce(
      (acc, idx) => ({
        ...acc,
        [idx]: releaseQuantities[idx] || 0,
      }),
      {} as Record<number, number>,
    );

    try {
      setIsGenerating(true);
      setError(null);
      setSuccess(null);
      const result = await stockControlApiClient.autoGenerateReleaseDocuments(
        jobCardId,
        Array.from(selectedIndices),
        quantityOverrides,
      );
      setSuccess("Release documents generated successfully");
      setSelectedIndices(new Set());
      onGenerated();
      const releases = await stockControlApiClient.itemsReleasesForJobCard(jobCardId);
      setExistingReleases(Array.isArray(releases) ? releases : []);
      if (result.itemsRelease?.id) {
        pdfPreview.openWithFetch(
          () => stockControlApiClient.openItemsReleasePdf(jobCardId, result.itemsRelease.id),
          `items-release-${result.itemsRelease.id}.pdf`,
        );
      }
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
        ) : allFullyReleased ? (
          <div className="rounded-md bg-green-50 border border-green-200 p-4">
            <p className="text-sm font-medium text-green-800 text-center">
              All line items have been fully released
            </p>
            <p className="mt-1 text-xs text-green-600 text-center">
              {existingReleases.length} release(s) generated covering all quantities
            </p>
            {existingReleases.length > 0 && (
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {existingReleases.map((release, idx) => (
                  <button
                    key={release.id}
                    type="button"
                    onClick={() =>
                      pdfPreview.openWithFetch(
                        () => stockControlApiClient.openItemsReleasePdf(jobCardId, release.id),
                        `items-release-${release.id}.pdf`,
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-md bg-white border border-green-300 px-3 py-1.5 text-xs font-medium text-green-800 hover:bg-green-100 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Release {existingReleases.length > 1 ? `#${idx + 1}` : ""} (v
                    {release.version || 1}) PDF
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {existingReleases.length > 0 && (
              <div className="mb-3 rounded-md bg-blue-50 border border-blue-200 p-3">
                <p className="text-xs font-medium text-blue-800 mb-2">
                  Previous releases ({existingReleases.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {existingReleases.map((release, idx) => (
                    <button
                      key={release.id}
                      type="button"
                      onClick={() =>
                        pdfPreview.openWithFetch(
                          () => stockControlApiClient.openItemsReleasePdf(jobCardId, release.id),
                          `items-release-${release.id}.pdf`,
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-md bg-white border border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-100 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Release #{idx + 1} PDF
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="overflow-x-auto rounded-md border border-teal-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-10 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={allAvailableSelected}
                        onChange={handleToggleAll}
                        className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">
                      Item No
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
                      Total Qty
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">
                      Released
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">
                      Remaining
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">
                      Release Qty
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {lineItems.map((li, idx) => {
                    const info = remainingByIndex[idx] || {
                      totalQty: 0,
                      alreadyReleased: 0,
                      remaining: 0,
                    };
                    const isFullyReleased = info.remaining <= 0;
                    const isSelected = selectedIndices.has(idx);
                    const releaseQty = releaseQuantities[idx] || 0;
                    const isPartial = isSelected && releaseQty < info.remaining;
                    return (
                      <tr
                        key={li.id}
                        className={
                          isFullyReleased
                            ? "bg-gray-50 opacity-50"
                            : isSelected
                              ? "cursor-pointer bg-teal-50 hover:bg-gray-50"
                              : "cursor-pointer hover:bg-gray-50"
                        }
                        onClick={() => handleToggle(idx)}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isFullyReleased}
                            onChange={() => handleToggle(idx)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500 disabled:opacity-50"
                          />
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-500">
                          {li.itemNo || "-"}
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
                          {info.totalQty || "-"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-sm">
                          {info.alreadyReleased > 0 ? (
                            <span className="font-medium text-blue-600">
                              {info.alreadyReleased}
                            </span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-sm">
                          {isFullyReleased ? (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                              Done
                            </span>
                          ) : (
                            <span className="font-medium text-gray-900">{info.remaining}</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right">
                          {isFullyReleased ? (
                            <span className="text-sm text-gray-400">-</span>
                          ) : isSelected ? (
                            <input
                              type="number"
                              value={releaseQty}
                              onChange={(e) => handleQuantityChange(idx, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              min={0}
                              max={info.remaining}
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
                {selectedIndices.size} of{" "}
                {lineItems.filter((_li, idx) => (remainingByIndex[idx]?.remaining || 0) > 0).length}{" "}
                available items selected
                {Array.from(selectedIndices).some(
                  (idx) => (releaseQuantities[idx] || 0) < (remainingByIndex[idx]?.remaining || 0),
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
      <PdfPreviewModal state={pdfPreview.state} onClose={pdfPreview.close} />
    </div>
  );
}
