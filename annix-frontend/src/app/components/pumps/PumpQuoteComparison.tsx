"use client";

import { useMemo, useState } from "react";
import {
  comparePumpQuotes,
  PumpComparisonResult,
  PumpQuote,
} from "@product-data/pumps/pumpComparison";

interface PumpQuoteComparisonProps {
  quotes: PumpQuote[];
  onSelectQuote?: (quote: PumpQuote) => void;
  selectedQuoteId?: number;
}

function formatCurrency(value: number, currency = "ZAR"): string {
  const prefix = currency === "ZAR" ? "R" : currency;
  return `${prefix} ${value.toLocaleString("en-ZA", { minimumFractionDigits: 0 })}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function PumpQuoteComparison({
  quotes,
  onSelectQuote,
  selectedQuoteId,
}: PumpQuoteComparisonProps) {
  const [sortBy, setSortBy] = useState<"price" | "score" | "date">("price");

  const comparison = useMemo<PumpComparisonResult>(() => {
    return comparePumpQuotes(quotes);
  }, [quotes]);

  const sortedQuotes = useMemo(() => {
    const sorted = [...quotes];
    if (sortBy === "price") {
      sorted.sort((a, b) => a.totalPrice - b.totalPrice);
    } else if (sortBy === "score") {
      sorted.sort((a, b) => {
        const scoreA =
          comparison.overallScores.find((s) => s.supplierId === a.supplierId)?.score ?? 0;
        const scoreB =
          comparison.overallScores.find((s) => s.supplierId === b.supplierId)?.score ?? 0;
        return scoreB - scoreA;
      });
    } else if (sortBy === "date") {
      sorted.sort((a, b) => new Date(b.quoteDate).getTime() - new Date(a.quoteDate).getTime());
    }
    return sorted;
  }, [quotes, sortBy, comparison.overallScores]);

  if (quotes.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <svg
          className="mx-auto h-12 w-12 text-yellow-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-yellow-800">No quotes to compare</h3>
        <p className="mt-1 text-sm text-yellow-600">
          Request quotes from suppliers to enable comparison
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-700">
            {formatCurrency(comparison.priceComparison.lowestPrice)}
          </div>
          <div className="text-sm text-green-600">Lowest Price</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-700">
            {formatCurrency(comparison.priceComparison.highestPrice)}
          </div>
          <div className="text-sm text-red-600">Highest Price</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-700">
            {formatCurrency(comparison.priceComparison.averagePrice)}
          </div>
          <div className="text-sm text-blue-600">Average Price</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-700">
            {comparison.priceComparison.priceSpreadPercent.toFixed(1)}%
          </div>
          <div className="text-sm text-purple-600">Price Spread</div>
        </div>
      </div>

      {comparison.recommendations.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <svg
              className="h-5 w-5 text-blue-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Recommendations</h3>
              <ul className="mt-2 text-sm text-blue-700 list-disc list-inside space-y-1">
                {comparison.recommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Quote Comparison</h3>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "price" | "score" | "date")}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="price">Price</option>
            <option value="score">Score</option>
            <option value="date">Date</option>
          </select>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                {comparison.specificationComparison.map((metric) => (
                  <th
                    key={metric.name}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {metric.name}
                  </th>
                ))}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quote Date
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedQuotes.map((quote, idx) => {
                const isBestPrice = quote.totalPrice === comparison.priceComparison.lowestPrice;
                const scoreInfo = comparison.overallScores.find(
                  (s) => s.supplierId === quote.supplierId,
                );
                const isSelected = selectedQuoteId === quote.supplierId;

                return (
                  <tr
                    key={quote.supplierId}
                    className={`${isBestPrice ? "bg-green-50" : ""} ${isSelected ? "ring-2 ring-inset ring-blue-500" : ""} hover:bg-gray-50`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {quote.supplierName}
                          </div>
                          {quote.warrantyMonths && (
                            <div className="text-xs text-gray-500">
                              {quote.warrantyMonths}mo warranty
                            </div>
                          )}
                        </div>
                        {isBestPrice && (
                          <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                            Best
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">
                        {formatCurrency(quote.totalPrice, quote.currency)}
                      </div>
                      {quote.leadTimeWeeks && (
                        <div className="text-xs text-gray-500">
                          {quote.leadTimeWeeks} weeks lead time
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${scoreInfo?.score ?? 0}%` }}
                          />
                        </div>
                        <span className="ml-2 text-sm text-gray-600">{scoreInfo?.score ?? 0}</span>
                      </div>
                    </td>
                    {comparison.specificationComparison.map((metric) => {
                      const quoteIdx = quotes.findIndex((q) => q.supplierId === quote.supplierId);
                      const value = metric.values[quoteIdx];
                      const isBest = metric.bestIndex === quoteIdx;

                      return (
                        <td key={metric.name} className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`text-sm ${isBest ? "font-bold text-green-700" : "text-gray-900"}`}
                          >
                            {value !== null ? `${value} ${metric.unit}` : "-"}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(quote.quoteDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {onSelectQuote && (
                        <button
                          onClick={() => onSelectQuote(quote)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Select
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {comparison.specificationComparison.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Specification Comparison</h3>
          <div className="space-y-4">
            {comparison.specificationComparison.map((metric) => (
              <div key={metric.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{metric.name}</span>
                  <span className="text-xs text-gray-500">
                    {metric.comparison === "higher"
                      ? "Higher is better"
                      : metric.comparison === "lower"
                        ? "Lower is better"
                        : "Equal is ideal"}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  {quotes.map((quote, idx) => {
                    const value = metric.values[idx];
                    const isBest = metric.bestIndex === idx;
                    const numericValues = metric.values.filter(
                      (v): v is number => typeof v === "number",
                    );
                    const maxVal = numericValues.length > 0 ? Math.max(...numericValues) : 1;
                    const pct =
                      typeof value === "number" && maxVal > 0 ? (value / maxVal) * 100 : 0;

                    return (
                      <div key={quote.supplierId} className="flex-1">
                        <div className="text-xs text-gray-500 mb-1">{quote.supplierName}</div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isBest ? "bg-green-500" : "bg-blue-400"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span
                            className={`text-sm ${isBest ? "font-bold text-green-700" : "text-gray-600"}`}
                          >
                            {value !== null ? `${value}` : "-"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PumpQuoteComparison;
