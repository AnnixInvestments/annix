"use client";

import { useCallback, useEffect, useState } from "react";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

interface SupplierMapping {
  id: number;
  supplier: string;
  supplierSku: string;
  stockItemId: number;
  stockItemName: string | null;
  stockItemSku: string | null;
  confidence: number;
  confirmationCount: number;
}

export function SupplierMappingsSection() {
  const [mappings, setMappings] = useState<SupplierMapping[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadMappings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await stockControlApiClient.supplierMappings();
      setMappings(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load supplier mappings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMappings();
  }, [loadMappings]);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await stockControlApiClient.deleteSupplierMapping(id);
      setMappings((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete mapping");
    } finally {
      setDeletingId(null);
    }
  };

  const grouped = mappings.reduce<Record<string, SupplierMapping[]>>((acc, m) => {
    const key = m.supplier;
    const existing = acc[key] || [];
    return { ...acc, [key]: [...existing, m] };
  }, {});

  return (
    <div className="lg:col-span-2 bg-white rounded-lg shadow border border-gray-200">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 flex items-center justify-between text-left"
      >
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Supplier SKU Mappings</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Learned mappings from delivery notes to stock items ({mappings.length})
          </p>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-6 pb-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-md px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600" />
              <span className="ml-2 text-sm text-gray-500">Loading mappings...</span>
            </div>
          )}

          {!isLoading && mappings.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No supplier mappings learned yet.</p>
              <p className="text-xs mt-1">
                Mappings are created automatically when delivery items are matched to stock.
              </p>
            </div>
          )}

          {!isLoading && Object.keys(grouped).length > 0 && (
            <div className="space-y-4">
              {Object.entries(grouped)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([supplier, supplierMappings]) => (
                  <div key={supplier}>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">{supplier}</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Supplier SKU
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Maps To
                            </th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                              Uses
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {supplierMappings.map((m) => (
                            <tr key={m.id}>
                              <td className="px-3 py-2 font-mono text-gray-900">{m.supplierSku}</td>
                              <td className="px-3 py-2">
                                <span className="text-gray-900">{m.stockItemName}</span>
                                <span className="text-gray-400 ml-1 text-xs">
                                  ({m.stockItemSku})
                                </span>
                              </td>
                              <td className="px-3 py-2 text-center text-gray-500">
                                {m.confirmationCount}x
                              </td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleDelete(m.id)}
                                  disabled={deletingId === m.id}
                                  className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                                >
                                  {deletingId === m.id ? "Removing..." : "Remove"}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
