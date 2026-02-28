"use client";

import type { PriceChangeSummary } from "@/app/lib/api/stockControlApi";

interface PriceUpdateReviewProps {
  priceSummary: PriceChangeSummary;
  onApprove: () => void;
}

export default function PriceUpdateReview({ priceSummary, onApprove }: PriceUpdateReviewProps) {
  const { items, totalOldValue, totalNewValue } = priceSummary;
  const totalChangePercent =
    totalOldValue > 0 ? ((totalNewValue - totalOldValue) / totalOldValue) * 100 : 0;

  const itemsNeedingApproval = items.filter((item) => item.needsApproval);
  const hasSignificantChanges = itemsNeedingApproval.length > 0;

  if (items.length === 0) {
    return <div className="text-center py-4 text-gray-500 text-sm">No price updates to review</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">Previous Total</p>
          <p className="text-lg font-semibold text-gray-900">
            R{totalOldValue.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">New Total</p>
          <p className="text-lg font-semibold text-gray-900">
            R{totalNewValue.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

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
              <th className="px-2 py-1 text-right text-gray-500 font-medium">Old</th>
              <th className="px-2 py-1 text-right text-gray-500 font-medium">New</th>
              <th className="px-2 py-1 text-right text-gray-500 font-medium">%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => (
              <tr key={item.id} className={item.needsApproval ? "bg-yellow-50" : ""}>
                <td
                  className="px-2 py-2 text-gray-900 truncate max-w-[120px]"
                  title={item.stockItemName}
                >
                  {item.stockItemName}
                </td>
                <td className="px-2 py-2 text-right text-gray-500">R{item.oldPrice.toFixed(2)}</td>
                <td className="px-2 py-2 text-right text-gray-900 font-medium">
                  R{item.newPrice.toFixed(2)}
                </td>
                <td
                  className={`px-2 py-2 text-right font-medium ${
                    item.changePercent > 0 ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {item.changePercent > 0 ? "+" : ""}
                  {item.changePercent.toFixed(1)}%
                </td>
              </tr>
            ))}
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
