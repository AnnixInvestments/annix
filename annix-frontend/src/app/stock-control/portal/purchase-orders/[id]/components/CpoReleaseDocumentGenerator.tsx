"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PdfPreviewModal, usePdfPreview } from "@/app/components/PdfPreviewModal";
import type { CpoReleasableItem, QcItemsReleaseRecord } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

interface CpoReleaseDocumentGeneratorProps {
  cpoId: number;
}

interface SelectedItem {
  itemCode: string;
  description: string;
  quantity: number;
  jobCardId: number;
}

export function CpoReleaseDocumentGenerator(props: CpoReleaseDocumentGeneratorProps) {
  const cpoId = props.cpoId;

  const [releasableItems, setReleasableItems] = useState<CpoReleasableItem[]>([]);
  const [existingReleases, setExistingReleases] = useState<QcItemsReleaseRecord[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [releaseQuantities, setReleaseQuantities] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const pdfPreview = usePdfPreview();

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [releasable, releases] = await Promise.all([
        stockControlApiClient.releasableItemsForCpo(cpoId),
        stockControlApiClient.itemsReleasesForCpo(cpoId),
      ]);
      setReleasableItems(releasable.items || []);
      setExistingReleases(Array.isArray(releases) ? releases : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load releasable items");
    } finally {
      setIsLoading(false);
    }
  }, [cpoId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const itemKey = (item: CpoReleasableItem): string => {
    const code = (item.itemCode || "").toLowerCase();
    const desc = (item.description || "").toLowerCase();
    return `${code}||${desc}`;
  };

  const selectableItems = useMemo(() => {
    return releasableItems.filter((item) => item.arrivedQty > 0 && item.remainingToRelease > 0);
  }, [releasableItems]);

  const handleToggle = (item: CpoReleasableItem) => {
    const key = itemKey(item);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedKeys.size === selectableItems.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(selectableItems.map(itemKey)));
    }
  };

  const handleQuantityChange = (item: CpoReleasableItem, value: string) => {
    const key = itemKey(item);
    const num = parseInt(value, 10);
    if (Number.isNaN(num) || num < 0) return;
    const clamped = Math.min(num, item.remainingToRelease);
    setReleaseQuantities((prev) => ({ ...prev, [key]: clamped }));
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      setSuccess(null);

      const selectedItems: SelectedItem[] = [];

      releasableItems.forEach((item) => {
        const key = itemKey(item);
        if (!selectedKeys.has(key)) return;

        const qty = releaseQuantities[key] || item.remainingToRelease;

        item.deliveries.forEach((delivery) => {
          const deliveryPortion = Math.min(qty, delivery.quantity);
          if (deliveryPortion > 0) {
            selectedItems.push({
              itemCode: item.itemCode || "",
              description: item.description || "",
              quantity: deliveryPortion,
              jobCardId: delivery.jobCardId,
            });
          }
        });
      });

      if (selectedItems.length === 0) {
        setError("No items selected for release");
        return;
      }

      const result = await stockControlApiClient.autoGenerateReleaseDocumentsForCpo(
        cpoId,
        selectedItems,
      );

      const childCount = result.childReleases.length;
      setSuccess(
        `Release created with ${selectedItems.length} item(s), cascaded to ${childCount} child JC(s)`,
      );
      setSelectedKeys(new Set());
      setReleaseQuantities({});
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate release documents");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
        <h3 className="text-sm font-semibold text-gray-900">CPO Release Document Generator</h3>
        {existingReleases.length > 0 && (
          <span className="text-xs text-gray-500">
            {existingReleases.length} release(s) created
          </span>
        )}
      </div>

      {error && (
        <div className="mx-5 mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="mx-5 mt-3 rounded-md bg-green-50 p-3 text-sm text-green-700">
          {success}
          <button onClick={() => setSuccess(null)} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="py-8 text-center text-sm text-gray-500">Loading releasable items...</div>
      ) : releasableItems.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-gray-500">No items found on child job cards</p>
          <p className="mt-1 text-xs text-gray-400">
            Items will appear here once child JCs are linked and have line items
          </p>
        </div>
      ) : (
        <div className="p-5">
          <table className="w-full divide-y divide-gray-200 text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-2 py-2 text-left">
                  <input
                    type="checkbox"
                    checked={
                      selectedKeys.size === selectableItems.length && selectableItems.length > 0
                    }
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-2 py-2 text-left font-medium text-gray-500">Item Code</th>
                <th className="px-2 py-2 text-left font-medium text-gray-500">Description</th>
                <th className="px-2 py-2 text-right font-medium text-gray-500">Ordered</th>
                <th className="px-2 py-2 text-right font-medium text-gray-500">Arrived</th>
                <th className="px-2 py-2 text-right font-medium text-gray-500">Remaining</th>
                <th className="px-2 py-2 text-right font-medium text-gray-500">Release Qty</th>
                <th className="px-2 py-2 text-left font-medium text-gray-500">Deliveries</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {releasableItems.map((item) => {
                const key = itemKey(item);
                const isArrived = item.arrivedQty > 0;
                const hasRemaining = item.remainingToRelease > 0;
                const canSelect = isArrived && hasRemaining;
                const isSelected = selectedKeys.has(key);
                const qtyValue = releaseQuantities[key] || item.remainingToRelease;

                return (
                  <tr
                    key={key}
                    className={canSelect ? "hover:bg-gray-50" : "bg-gray-50 opacity-60"}
                  >
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={!canSelect}
                        onChange={() => handleToggle(item)}
                        className="rounded border-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </td>
                    <td className="px-2 py-2 font-mono">{item.itemCode || "-"}</td>
                    <td className="px-2 py-2 max-w-[200px] truncate">{item.description || "-"}</td>
                    <td className="px-2 py-2 text-right">{item.orderedQty}</td>
                    <td className="px-2 py-2 text-right">
                      <span className={isArrived ? "text-green-700 font-medium" : "text-gray-400"}>
                        {item.arrivedQty}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <span
                        className={hasRemaining ? "text-blue-700 font-medium" : "text-gray-400"}
                      >
                        {item.remainingToRelease}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right">
                      {canSelect && isSelected ? (
                        <input
                          type="number"
                          value={qtyValue}
                          min={1}
                          max={item.remainingToRelease}
                          onChange={(e) => handleQuantityChange(item, e.target.value)}
                          className="w-16 rounded border border-gray-300 px-1 py-0.5 text-right text-xs"
                        />
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-1">
                        {item.deliveries.map((d) => {
                          const jtLabel = d.jtNumber || `JC#${d.jobCardId}`;
                          return (
                            <span
                              key={d.jobCardId}
                              className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700"
                            >
                              {jtLabel}: {d.quantity}
                            </span>
                          );
                        })}
                        {item.deliveries.length === 0 && (
                          <span className="text-[10px] text-gray-400 italic">Not arrived</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {selectedKeys.size} of {selectableItems.length} available item(s) selected
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || selectedKeys.size === 0}
              className="rounded-md bg-teal-600 px-4 py-2 text-xs font-medium text-white hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isGenerating ? "Generating..." : "Generate Release Documents"}
            </button>
          </div>
        </div>
      )}

      {existingReleases.length > 0 && (
        <div className="border-t border-gray-200 px-5 py-3">
          <h4 className="mb-2 text-xs font-semibold text-gray-700">Previous CPO Releases</h4>
          <div className="space-y-1">
            {existingReleases.map((release) => {
              const itemCount = release.items.length;
              const totalQty = release.totalQuantity;
              return (
                <div key={release.id} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">
                    Release #{release.id} - {itemCount} item(s), qty {totalQty} - v{release.version}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      pdfPreview.openWithFetch(
                        () => stockControlApiClient.openItemsReleasePdfForCpo(cpoId, release.id),
                        `CPO_Release_${release.id}.pdf`,
                      )
                    }
                    className="text-blue-600 hover:text-blue-800"
                  >
                    PDF
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <PdfPreviewModal state={pdfPreview.state} onClose={pdfPreview.close} />
    </div>
  );
}
