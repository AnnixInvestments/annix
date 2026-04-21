"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { extractErrorMessage } from "@/app/lib/api/apiError";
import type { StockItem } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

interface DuplicateGroup {
  canonicalItem: StockItem;
  duplicates: Array<{
    item: StockItem;
    score: number;
    matchType: string;
  }>;
  totalQuantity: number;
}

interface MergeConfirmState {
  group: DuplicateGroup;
  targetId: number;
}

interface Props {
  onMergeComplete: () => void;
}

export function InventoryDuplicatesPanel(props: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [mergeConfirm, setMergeConfirm] = useState<MergeConfirmState | null>(null);
  const [mergeResults, setMergeResults] = useState<string[]>([]);

  const handleDetect = async () => {
    setIsLoading(true);
    setError(null);
    setMergeResults([]);
    try {
      const result = await stockControlApiClient.detectDuplicates();
      setGroups(result);
      setIsOpen(true);
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to detect duplicates"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleMerge = async (group: DuplicateGroup, targetId: number) => {
    setIsMerging(true);
    setError(null);
    try {
      const sourceIds = [group.canonicalItem, ...group.duplicates.map((d) => d.item)]
        .filter((item) => item.id !== targetId)
        .map((item) => item.id);

      const result = await stockControlApiClient.mergeItems(targetId, sourceIds);
      const msg = `Merged ${result.mergedCount} items into "${result.targetItem.name}" (total qty: ${result.targetItem.quantity})`;
      setMergeResults((prev) => [...prev, msg]);
      setGroups((prev) => prev.filter((g) => g.canonicalItem.id !== group.canonicalItem.id));
      setMergeConfirm(null);
      props.onMergeComplete();
    } catch (err) {
      setError(extractErrorMessage(err, "Merge failed"));
    } finally {
      setIsMerging(false);
    }
  };

  const scoreLabel = (score: number) => {
    if (score >= 0.9) return "Very High";
    if (score >= 0.7) return "High";
    if (score >= 0.5) return "Medium";
    return "Low";
  };

  const scoreColor = (score: number) => {
    if (score >= 0.9) return "text-green-700 bg-green-50";
    if (score >= 0.7) return "text-teal-700 bg-teal-50";
    if (score >= 0.5) return "text-amber-700 bg-amber-50";
    return "text-red-700 bg-red-50";
  };

  return (
    <>
      <button
        type="button"
        onClick={handleDetect}
        disabled={isLoading}
        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <span className="animate-spin inline-block h-4 w-4 border-2 border-amber-600 border-t-transparent rounded-full mr-2" />
            Scanning...
          </>
        ) : (
          "Find Duplicates"
        )}
      </button>

      {error && !isOpen && <span className="text-sm text-red-600 ml-2">{error}</span>}

      {isOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
          >
            <div
              className="fixed inset-0 bg-black/10 backdrop-blur-md"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] flex flex-col">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Duplicate Stock Items</h3>
                  <p className="text-sm text-gray-500">
                    {groups.length === 0
                      ? "No duplicates detected"
                      : `${groups.length} group${groups.length === 1 ? "" : "s"} of potential duplicates found`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  &times;
                </button>
              </div>

              <div className="px-6 py-4 overflow-y-auto flex-1">
                {error && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-md px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {mergeResults.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {mergeResults.map((msg, i) => (
                      <div
                        key={i}
                        className="bg-green-50 border border-green-200 rounded-md px-4 py-3 text-sm text-green-700"
                      >
                        {msg}
                      </div>
                    ))}
                  </div>
                )}

                {groups.length === 0 && !isLoading && (
                  <div className="text-center py-12 text-gray-500">
                    <p className="text-lg font-medium">No duplicates found</p>
                    <p className="mt-1 text-sm">All stock items have unique names and SKUs.</p>
                  </div>
                )}

                <div className="space-y-6">
                  {groups.map((group) => {
                    const allItems = [group.canonicalItem, ...group.duplicates.map((d) => d.item)];
                    const rawCategory = group.canonicalItem.category;

                    return (
                      <div
                        key={group.canonicalItem.id}
                        className="border border-gray-200 rounded-lg overflow-hidden"
                      >
                        <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                          <div>
                            <span className="font-medium text-gray-900">
                              {group.duplicates.length + 1} items
                            </span>
                            <span className="text-gray-500 ml-2">
                              Total qty: {group.totalQuantity}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setMergeConfirm({
                                group,
                                targetId: group.canonicalItem.id,
                              })
                            }
                            className="px-3 py-1.5 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700"
                          >
                            Merge Group
                          </button>
                        </div>

                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                SKU
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Name
                              </th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                Qty
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Category
                              </th>
                              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                                Match
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            <tr className="bg-teal-50/30">
                              <td className="px-4 py-2 text-sm font-mono text-gray-900">
                                {group.canonicalItem.sku}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900 font-medium">
                                {group.canonicalItem.name}
                              </td>
                              <td className="px-4 py-2 text-sm text-right font-semibold text-gray-900">
                                {group.canonicalItem.quantity}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-500">
                                {rawCategory || "-"}
                              </td>
                              <td className="px-4 py-2 text-center">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-50 text-teal-700">
                                  Primary
                                </span>
                              </td>
                            </tr>
                            {group.duplicates.map((dup) => {
                              const category = dup.item.category;
                              return (
                                <tr key={dup.item.id}>
                                  <td className="px-4 py-2 text-sm font-mono text-gray-900">
                                    {dup.item.sku}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-900">
                                    {dup.item.name}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-right font-semibold text-gray-900">
                                    {dup.item.quantity}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-500">
                                    {category || "-"}
                                  </td>
                                  <td className="px-4 py-2 text-center">
                                    <span
                                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${scoreColor(dup.score)}`}
                                    >
                                      {scoreLabel(dup.score)} ({Math.round(dup.score * 100)}%)
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {mergeConfirm &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
          >
            <div
              className="fixed inset-0 bg-black/10 backdrop-blur-md"
              onClick={() => setMergeConfirm(null)}
              aria-hidden="true"
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Confirm Merge</h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                <p className="text-sm text-gray-700">
                  Select the target item to keep. All other items will be merged into it — their
                  quantities will be added and their history transferred.
                </p>

                <div className="space-y-2">
                  {[
                    mergeConfirm.group.canonicalItem,
                    ...mergeConfirm.group.duplicates.map((d) => d.item),
                  ].map((item) => {
                    const isSelected = mergeConfirm.targetId === item.id;
                    return (
                      <label
                        key={item.id}
                        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected
                            ? "border-teal-500 bg-teal-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="mergeTarget"
                          checked={isSelected}
                          onChange={() => setMergeConfirm({ ...mergeConfirm, targetId: item.id })}
                          className="h-4 w-4 text-teal-600"
                        />
                        <div className="ml-3 flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                          <p className="text-xs text-gray-500">
                            SKU: {item.sku} | Qty: {item.quantity}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setMergeConfirm(null)}
                  disabled={isMerging}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleMerge(mergeConfirm.group, mergeConfirm.targetId)}
                  disabled={isMerging}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:opacity-50"
                >
                  {isMerging ? "Merging..." : "Merge Items"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
