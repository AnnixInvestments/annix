"use client";

import { useCallback, useEffect, useState } from "react";
import { StockManagementApiClient } from "../api/stockManagementApi";
import {
  useStockManagementConfig,
  useStockManagementFeature,
} from "../provider/useStockManagementConfig";

interface VarianceArchiveRow {
  productId: number;
  productSku: string;
  productName: string;
  stockTakeCount: number;
  shortageCount: number;
  overageCount: number;
  totalVarianceQty: number;
  totalVarianceValueR: number;
  lastSeenAt: string | null;
}

export function VarianceArchivePage() {
  const config = useStockManagementConfig();
  const isEnabled = useStockManagementFeature("VARIANCE_REPORTING");
  const [client] = useState(() => new StockManagementApiClient({ baseUrl: config.apiBaseUrl }));
  const [rows, setRows] = useState<VarianceArchiveRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sinceMonths, setSinceMonths] = useState(12);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await client.stockTakeVarianceArchive(sinceMonths);
      setRows(result);
    } catch (err) {
      console.error("Failed to load variance archive", err);
    } finally {
      setIsLoading(false);
    }
  }, [client, sinceMonths]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!isEnabled) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-2">Variance Archive</h1>
        <p className="text-sm text-gray-600">{config.label("feature.upgradePrompt.body")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Variance Archive</h1>
          <p className="mt-1 text-sm text-gray-600">
            Top products by absolute variance value across recent stock takes — use this to spot
            recurring shortages or overages and tighten the process
          </p>
        </div>
        <select
          value={sinceMonths}
          onChange={(e) => setSinceMonths(Number(e.target.value))}
          className="border border-gray-300 rounded px-3 py-2 text-sm"
        >
          <option value={3}>Last 3 months</option>
          <option value={6}>Last 6 months</option>
          <option value={12}>Last 12 months</option>
          <option value={24}>Last 24 months</option>
        </select>
      </header>

      {isLoading ? (
        <div className="p-6 text-center text-sm text-gray-500">
          {config.label("common.loading")}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  SKU
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Product
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                  Stock Takes
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                  Shortages
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                  Overages
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                  Total Variance Qty
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                  Total Variance R
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Last Seen
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                    No variances in the selected period
                  </td>
                </tr>
              )}
              {rows.map((row) => {
                const valueClass =
                  row.totalVarianceValueR < 0
                    ? "text-red-700 font-mono"
                    : row.totalVarianceValueR > 0
                      ? "text-green-700 font-mono"
                      : "text-gray-500 font-mono";
                return (
                  <tr key={row.productId}>
                    <td className="px-4 py-3 font-mono text-xs">{row.productSku}</td>
                    <td className="px-4 py-3 text-sm">{row.productName}</td>
                    <td className="px-4 py-3 text-right text-xs">{row.stockTakeCount}</td>
                    <td className="px-4 py-3 text-right text-xs text-red-700">
                      {row.shortageCount}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-green-700">
                      {row.overageCount}
                    </td>
                    <td className="px-4 py-3 text-right text-xs font-mono">
                      {row.totalVarianceQty.toFixed(2)}
                    </td>
                    <td className={`px-4 py-3 text-right text-xs ${valueClass}`}>
                      R {row.totalVarianceValueR.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {row.lastSeenAt ? new Date(row.lastSeenAt).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default VarianceArchivePage;
