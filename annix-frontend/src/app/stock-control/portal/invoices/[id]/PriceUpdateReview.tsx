"use client";

import { useState } from "react";
import type { PriceChangeSummary } from "@/app/lib/api/stockControlApi";

interface PriceUpdateReviewProps {
  priceSummary: PriceChangeSummary;
  onApprove: () => void;
  canAdjustPrice?: boolean;
  onAdjustPrice?: (itemId: number, newPrice: number) => Promise<void>;
}

export default function PriceUpdateReview(props: PriceUpdateReviewProps) {
  const { priceSummary, onApprove, canAdjustPrice, onAdjustPrice } = props;
  const { items, totalOldValue, totalNewValue } = priceSummary;
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const totalChangePercent =
    totalOldValue > 0 ? ((totalNewValue - totalOldValue) / totalOldValue) * 100 : 0;

  const itemsNeedingApproval = items.filter((item) => item.needsApproval);
  const hasSignificantChanges = itemsNeedingApproval.length > 0;

  const startEditingPrice = (itemId: number, currentPrice: number) => {
    setEditingId(itemId);
    setEditPrice(String(currentPrice));
  };

  const cancelEditingPrice = () => {
    setEditingId(null);
    setEditPrice("");
  };

  const savePrice = async (itemId: number) => {
    if (!onAdjustPrice) return;
    setIsSaving(true);
    try {
      await onAdjustPrice(itemId, Number(editPrice));
      setEditingId(null);
      setEditPrice("");
    } finally {
      setIsSaving(false);
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
              const qty = Number(item.quantity || 0);
              const isEditingRow = editingId === item.id;
              const displayPrice = isEditingRow
                ? Number(editPrice || 0)
                : Number(item.newPrice || 0);
              const lineTotal = qty * displayPrice;

              return (
                <tr key={item.id} className={item.needsApproval ? "bg-yellow-50" : ""}>
                  <td
                    className="px-2 py-2 text-gray-900 truncate max-w-[140px]"
                    title={item.stockItemName}
                  >
                    {item.stockItemName}
                  </td>
                  <td className="px-2 py-2 text-right text-gray-500">{qty}</td>
                  <td className="px-2 py-2 text-right text-gray-900 font-medium">
                    {isEditingRow ? (
                      <input
                        type="number"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="w-20 px-1 py-0.5 text-xs border border-teal-300 rounded text-right focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                        min={0}
                        step="0.01"
                        autoFocus
                      />
                    ) : (
                      `R${Number(item.newPrice || 0).toFixed(2)}`
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
                    {Number(item.changePercent || 0) > 0 ? "+" : ""}
                    {Number(item.changePercent || 0).toFixed(1)}%
                  </td>
                  {canAdjustPrice && (
                    <td className="px-2 py-2 text-center">
                      {isEditingRow ? (
                        <div className="flex items-center gap-1 justify-center">
                          <button
                            type="button"
                            onClick={() => savePrice(item.id)}
                            disabled={isSaving}
                            className="px-1.5 py-0.5 text-[10px] font-medium text-white bg-teal-600 rounded hover:bg-teal-700 disabled:opacity-50"
                          >
                            {isSaving ? "..." : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditingPrice}
                            className="px-1.5 py-0.5 text-[10px] text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEditingPrice(item.id, Number(item.newPrice || 0))}
                          className="p-1 text-gray-400 hover:text-teal-600 transition-colors"
                          title="Adjust price"
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
