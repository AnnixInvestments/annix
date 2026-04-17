"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { PdfPreviewModal, usePdfPreview } from "@/app/components/PdfPreviewModal";
import type { CpoReleasableItem, QcItemsReleaseRecord } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { now } from "@/app/lib/datetime";
import { SignaturePad } from "@/app/stock-control/components/SignaturePad";

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
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [pendingItems, setPendingItems] = useState<SelectedItem[]>([]);
  const [signatureName, setSignatureName] = useState("");
  const [signatureDate, setSignatureDate] = useState(now().toFormat("yyyy-MM-dd"));
  const pdfPreview = usePdfPreview();

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [releasable, releases] = await Promise.all([
        stockControlApiClient.releasableItemsForCpo(cpoId),
        stockControlApiClient.itemsReleasesForCpo(cpoId),
      ]);
      const items = releasable.items;
      setReleasableItems(items || []);
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
    const itemCode = item.itemCode;
    const description = item.description;
    const code = (itemCode || "").toLowerCase();
    const desc = (description || "").toLowerCase();
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

  const handleRegenerate = async (release: QcItemsReleaseRecord) => {
    if (
      !confirm(
        `Re-generate release #${release.id}? The old release will be deleted and replaced with a new one containing the same items, using the latest data.`,
      )
    ) {
      return;
    }
    try {
      setError(null);
      const itemsToRegen: SelectedItem[] = [];
      release.items.forEach((ri) => {
        const rawItemCode = ri.itemCode;
        const description = ri.description;
        const matchingReleasable = releasableItems.find((r) => {
          const itemCode = r.itemCode;
          const rawDescription = r.description;
          return (
            (itemCode || "").toLowerCase() === (rawItemCode || "").toLowerCase() &&
            (rawDescription || "").toLowerCase() === (description || "").toLowerCase()
          );
        });
        if (matchingReleasable) {
          let remaining = ri.quantity;
          matchingReleasable.deliveries.forEach((d) => {
            if (remaining <= 0) return;
            const portion = Math.min(remaining, d.quantity);
            if (portion > 0) {
              const itemCode2 = ri.itemCode;
              const description2 = ri.description;
              itemsToRegen.push({
                itemCode: itemCode2 || "",
                description: description2 || "",
                quantity: portion,
                jobCardId: d.jobCardId,
              });
              remaining -= portion;
            }
          });
        }
      });

      await stockControlApiClient.deleteItemsReleaseForCpo(cpoId, release.id);
      await fetchData();

      if (itemsToRegen.length === 0) {
        setError("Could not match items from the old release to current deliveries");
        return;
      }

      setPendingItems(itemsToRegen);
      setShowSignatureModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to re-generate release");
    }
  };

  const handleEdit = async (release: QcItemsReleaseRecord) => {
    if (
      !confirm(
        `Edit release #${release.id}? The old release will be deleted and the items will be loaded into the form above so you can modify quantities or add/remove items.`,
      )
    ) {
      return;
    }
    try {
      setError(null);
      const itemKeys = new Set<string>();
      const quantities: Record<string, number> = {};
      release.items.forEach((ri) => {
        const description = ri.description;
        const itemCode = ri.itemCode;
        const code = (itemCode || "").toLowerCase();
        const desc = (description || "").toLowerCase();
        const key = `${code}||${desc}`;
        const quantitiesKey = quantities[key];
        itemKeys.add(key);
        quantities[key] = (quantitiesKey || 0) + ri.quantity;
      });

      await stockControlApiClient.deleteItemsReleaseForCpo(cpoId, release.id);
      await fetchData();

      setSelectedKeys(itemKeys);
      setReleaseQuantities(quantities);
      window.scrollTo({ top: 0, behavior: "smooth" });
      setSuccess(
        `Loaded ${release.items.length} item(s) from release #${release.id}. Modify quantities below and click Generate.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load release for editing");
    }
  };

  const handleDelete = async (release: QcItemsReleaseRecord) => {
    if (
      !confirm(
        `Delete release #${release.id}? This cannot be undone. The released items will become available again for a new release.`,
      )
    ) {
      return;
    }
    try {
      setError(null);
      await stockControlApiClient.deleteItemsReleaseForCpo(cpoId, release.id);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete release");
    }
  };

  const handleGenerate = () => {
    setError(null);
    setSuccess(null);

    const selectedItems: SelectedItem[] = [];

    releasableItems.forEach((item) => {
      const key = itemKey(item);
      if (!selectedKeys.has(key)) return;

      const rawQty = releaseQuantities[key];
      const targetQty = rawQty || item.remainingToRelease;
      let remaining = targetQty;

      item.deliveries.forEach((delivery) => {
        if (remaining <= 0) return;
        const deliveryPortion = Math.min(remaining, delivery.quantity);
        if (deliveryPortion > 0) {
          const itemCode = item.itemCode;
          const description = item.description;
          selectedItems.push({
            itemCode: itemCode || "",
            description: description || "",
            quantity: deliveryPortion,
            jobCardId: delivery.jobCardId,
          });
          remaining -= deliveryPortion;
        }
      });
    });

    if (selectedItems.length === 0) {
      setError("No items selected for release");
      return;
    }

    setPendingItems(selectedItems);
    setShowSignatureModal(true);
  };

  const handleGenerateWithSignature = async (signatureDataUrl: string) => {
    if (pendingItems.length === 0) return;
    if (!signatureName.trim()) {
      setError("Inspector name is required");
      return;
    }
    try {
      setIsGenerating(true);
      setError(null);
      setShowSignatureModal(false);

      const result = await stockControlApiClient.autoGenerateReleaseDocumentsForCpo(
        cpoId,
        pendingItems,
        {
          name: signatureName.trim(),
          date: signatureDate,
          signature: signatureDataUrl,
        },
      );

      const childCount = result.childReleases.length;
      setSuccess(
        `Release created with ${pendingItems.length} item(s), cascaded to ${childCount} child JC(s)`,
      );
      setSelectedKeys(new Set());
      setReleaseQuantities({});
      setPendingItems([]);
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
        <div className="p-3 sm:p-5">
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
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
                  <th className="px-2 py-2 text-left font-medium text-gray-500">Item No</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500">Item Code</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500">Description</th>
                  <th className="px-2 py-2 text-right font-medium text-gray-500">Ordered</th>
                  <th className="hidden sm:table-cell px-2 py-2 text-right font-medium text-gray-500">
                    Arrived
                  </th>
                  <th className="px-2 py-2 text-right font-medium text-gray-500">Released</th>
                  <th className="px-2 py-2 text-right font-medium text-gray-500">Remaining</th>
                  <th className="px-2 py-2 text-right font-medium text-gray-500">Release Qty</th>
                  <th className="hidden md:table-cell px-2 py-2 text-left font-medium text-gray-500">
                    Deliveries
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {releasableItems.map((item) => {
                  const itemNo = item.itemNo;
                  const itemCode = item.itemCode;
                  const description = item.description;
                  const key = itemKey(item);
                  const isArrived = item.arrivedQty > 0;
                  const hasRemaining = item.remainingToRelease > 0;
                  const canSelect = isArrived && hasRemaining;
                  const isSelected = selectedKeys.has(key);
                  const rawQtyValue = releaseQuantities[key];
                  const qtyValue = rawQtyValue || item.remainingToRelease;

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
                      <td className="px-2 py-2 text-gray-500">{itemNo || "-"}</td>
                      <td className="px-2 py-2 font-mono max-w-[100px] sm:max-w-none truncate">
                        {itemCode || "-"}
                      </td>
                      <td className="px-2 py-2 max-w-[120px] sm:max-w-[200px] truncate">
                        {description || "-"}
                      </td>
                      <td className="px-2 py-2 text-right">{item.orderedQty}</td>
                      <td className="hidden sm:table-cell px-2 py-2 text-right">
                        <span
                          className={isArrived ? "text-green-700 font-medium" : "text-gray-400"}
                        >
                          {item.arrivedQty}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <span
                          className={
                            item.releasedQty > 0 ? "text-purple-700 font-medium" : "text-gray-400"
                          }
                        >
                          {item.releasedQty}
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
                      <td className="hidden md:table-cell px-2 py-2">
                        <div className="flex flex-wrap gap-1">
                          {item.deliveries.map((d) => {
                            const jtNumber = d.jtNumber;
                            const jtLabel = jtNumber || `JC#${d.jobCardId}`;
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
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
                <div
                  key={release.id}
                  className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs py-1"
                >
                  <span className="text-gray-600">
                    Release #{release.id} - {itemCount} item(s), qty {totalQty} - v{release.version}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() =>
                        pdfPreview.openWithFetch(
                          () => stockControlApiClient.openItemsReleasePdfForCpo(cpoId, release.id),
                          `CPO_Release_${release.id}.pdf`,
                        )
                      }
                      className="rounded-md border border-blue-600 px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                    >
                      View PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRegenerate(release)}
                      className="rounded-md border border-teal-600 px-2.5 py-1 text-xs font-medium text-teal-600 hover:bg-teal-50"
                    >
                      Re-Gen
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEdit(release)}
                      className="rounded-md border border-amber-600 px-2.5 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(release)}
                      className="rounded-md border border-red-600 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <PdfPreviewModal state={pdfPreview.state} onClose={pdfPreview.close} />

      {showSignatureModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
          >
            <div
              className="fixed inset-0 bg-black/10 backdrop-blur-md"
              onClick={() => setShowSignatureModal(false)}
              aria-hidden="true"
            />
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Sign Release Document</h3>
              <p className="text-xs text-gray-500 mb-4">
                Releasing {pendingItems.length} item(s). Sign as the QAM to confirm inspection.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Inspector Name
                  </label>
                  <input
                    type="text"
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                    placeholder="Your name"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Inspection Date
                  </label>
                  <input
                    type="date"
                    value={signatureDate}
                    onChange={(e) => setSignatureDate(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Signature</label>
                  <SignaturePad
                    onSave={(dataUrl) => handleGenerateWithSignature(dataUrl)}
                    onCancel={() => setShowSignatureModal(false)}
                  />
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
