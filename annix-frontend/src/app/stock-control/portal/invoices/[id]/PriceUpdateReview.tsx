"use client";

import { keys } from "es-toolkit/compat";
import { useState } from "react";
import type { PriceChangeSummary } from "@/app/lib/api/stockControlApi";

interface ItemEdits {
  quantity?: string;
  unitPrice?: string;
  description?: string;
}

interface PriceUpdateReviewProps {
  priceSummary: PriceChangeSummary;
  onApprove: () => void;
  canAdjustPrice?: boolean;
  onAdjustItem?: (
    itemId: number,
    updates: { quantity?: number; unitPrice?: number; extractedDescription?: string },
  ) => Promise<void>;
}

export default function PriceUpdateReview(props: PriceUpdateReviewProps) {
  const { priceSummary, onApprove, canAdjustPrice, onAdjustItem } = props;
  const { items, totalOldValue, totalNewValue } = priceSummary;
  const [editingItems, setEditingItems] = useState<Record<number, ItemEdits>>({});
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  const totalChangePercent =
    totalOldValue > 0 ? ((totalNewValue - totalOldValue) / totalOldValue) * 100 : 0;

  const itemsNeedingApproval = items.filter((item) => item.needsApproval);
  const hasSignificantChanges = itemsNeedingApproval.length > 0;

  const startEditing = (item: PriceChangeSummary["items"][0]) => {
    setEditingItems((prev) => ({
      ...prev,
      [item.id]: {
        quantity: String(item.quantity),
        unitPrice: String(item.newPrice),
        description: item.stockItemName,
      },
    }));
  };

  const cancelEditing = (itemId: number) => {
    setEditingItems((prev) => {
      const { [itemId]: _, ...rest } = prev;
      return rest;
    });
  };

  const updateEditField = (itemId: number, field: keyof ItemEdits, value: string) => {
    setEditingItems((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value },
    }));
  };

  const saveItem = async (itemId: number, originalItem: PriceChangeSummary["items"][0]) => {
    if (!onAdjustItem) return;
    const edits = editingItems[itemId];
    if (!edits) return;

    const updates: { quantity?: number; unitPrice?: number; extractedDescription?: string } = {};
    const newQty = Number(edits.quantity);
    const newPrice = Number(edits.unitPrice);

    if (newQty !== originalItem.quantity) {
      updates.quantity = newQty;
    }
    if (newPrice !== originalItem.newPrice) {
      updates.unitPrice = newPrice;
    }
    if (edits.description !== undefined && edits.description !== originalItem.stockItemName) {
      updates.extractedDescription = edits.description;
    }

    if (keys(updates).length === 0) {
      cancelEditing(itemId);
      return;
    }

    setSavingIds((prev) => new Set([...prev, itemId]));
    try {
      await onAdjustItem(itemId, updates);
      cancelEditing(itemId);
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  if (items.length === 0) {
    return <div className="text-center py-4 text-gray-500 text-sm">No price updates to review</div>;
  }

  return (
    <div className="space-y-4">
      {items.length === 1 ? (
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Previous Unit Price</p>
            <p className="text-lg font-semibold text-gray-900">
              R{items[0].oldPrice.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">New Unit Price</p>
            <p className="text-lg font-semibold text-gray-900">
              R{items[0].newPrice.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">{items.length} items with price updates</p>
        </div>
      )}

      <div className="text-center">
        <span
          className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
            totalChangePercent > 0 ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
          }`}
        >
          {totalChangePercent > 0 ? "+" : ""}
          {totalChangePercent.toFixed(1)}% overall change
        </span>
      </div>

      {hasSignificantChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-yellow-500 mt-0.5 mr-2 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-yellow-800">
                {itemsNeedingApproval.length} item{itemsNeedingApproval.length > 1 ? "s" : ""} with
                changes over 20%
              </p>
              <p className="text-xs text-yellow-600 mt-1">Manager approval required</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-h-48 overflow-y-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-2 py-1 text-left text-gray-500 font-medium">Item</th>
              <th className="px-2 py-1 text-right text-gray-500 font-medium">Qty</th>
              <th className="px-2 py-1 text-right text-gray-500 font-medium">Unit</th>
              <th className="px-2 py-1 text-right text-gray-500 font-medium">Total</th>
              <th className="px-2 py-1 text-right text-gray-500 font-medium">%</th>
              {canAdjustPrice && (
                <th className="px-2 py-1 text-center text-gray-500 font-medium w-16" />
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => {
              const edits = editingItems[item.id];
              const isEditingRow = edits !== undefined;
              const rawQuantity = edits.quantity;
              const rawNewPrice = item.newPrice;
              const description = edits.description;
              const quantity = item.quantity;
              const newPrice = item.newPrice;
              const changePercent = item.changePercent;
              const unitPrice = edits.unitPrice;
              const displayQty = isEditingRow ? Number(rawQuantity || 0) : Number(quantity || 0);
              const displayPrice = isEditingRow ? Number(unitPrice || 0) : Number(rawNewPrice || 0);
              const lineTotal = displayQty * displayPrice;
              const isRowSaving = savingIds.has(item.id);

              return (
                <tr key={item.id} className={item.needsApproval ? "bg-yellow-50" : ""}>
                  <td className="px-2 py-2 text-gray-900 max-w-[140px]" title={item.stockItemName}>
                    {isEditingRow ? (
                      <input
                        type="text"
                        value={description || ""}
                        onChange={(e) => updateEditField(item.id, "description", e.target.value)}
                        className="w-full px-1 py-0.5 text-xs border border-teal-300 rounded focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                        title="Edit item description to correct matching"
                      />
                    ) : (
                      <span className="truncate block">{item.stockItemName}</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-right text-gray-500">
                    {isEditingRow ? (
                      <input
                        type="number"
                        value={edits.quantity}
                        onChange={(e) => updateEditField(item.id, "quantity", e.target.value)}
                        className="w-14 px-1 py-0.5 text-xs border border-teal-300 rounded text-right focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                        min={0}
                        step="1"
                      />
                    ) : (
                      Number(quantity || 0)
                    )}
                  </td>
                  <td className="px-2 py-2 text-right text-gray-900 font-medium">
                    {isEditingRow ? (
                      <input
                        type="number"
                        value={edits.unitPrice}
                        onChange={(e) => updateEditField(item.id, "unitPrice", e.target.value)}
                        className="w-20 px-1 py-0.5 text-xs border border-teal-300 rounded text-right focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                        min={0}
                        step="0.01"
                        autoFocus
                      />
                    ) : (
                      `R${Number(newPrice || 0).toFixed(2)}`
                    )}
                  </td>
                  <td className="px-2 py-2 text-right text-gray-900 font-medium">
                    R{lineTotal.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                  </td>
                  <td
                    className={`px-2 py-2 text-right font-medium ${
                      item.changePercent > 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {Number(changePercent || 0) > 0 ? "+" : ""}
                    {Number(changePercent || 0).toFixed(1)}%
                  </td>
                  {canAdjustPrice && (
                    <td className="px-2 py-2 text-center">
                      {isEditingRow ? (
                        <div className="flex items-center gap-1 justify-center">
                          <button
                            type="button"
                            onClick={() => saveItem(item.id, item)}
                            disabled={isRowSaving}
                            className="px-1.5 py-0.5 text-[10px] font-medium text-white bg-teal-600 rounded hover:bg-teal-700 disabled:opacity-50"
                          >
                            {isRowSaving ? "..." : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={() => cancelEditing(item.id)}
                            className="px-1.5 py-0.5 text-[10px] text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEditing(item)}
                          className="p-1 text-gray-400 hover:text-teal-600 transition-colors"
                          title="Edit item"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button
        onClick={onApprove}
        className="w-full py-2 px-4 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
      >
        Approve & Apply Price Updates
      </button>
    </div>
  );
}
