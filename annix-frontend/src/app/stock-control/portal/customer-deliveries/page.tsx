"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { DeliveryNote } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";

function itemsCount(delivery: DeliveryNote): { count: number; isExtracted: boolean } {
  const linkedCount = delivery.items ? delivery.items.length : 0;
  if (linkedCount > 0) {
    return { count: linkedCount, isExtracted: false };
  }
  const extractedData = delivery.extractedData as { lineItems?: unknown[] } | null;
  const extractedCount = extractedData?.lineItems ? extractedData.lineItems.length : 0;
  return { count: extractedCount, isExtracted: extractedCount > 0 };
}

export default function CustomerDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<DeliveryNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDeliveries = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await stockControlApiClient.deliveryNotes();
      const customerDeliveries = (Array.isArray(data) ? data : []).filter((dn) => {
        const extracted = dn.extractedData as { documentType?: string } | null;
        return extracted?.documentType === "CUSTOMER_DELIVERY";
      });
      setDeliveries(customerDeliveries);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load customer delivery notes"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  if (isLoading && deliveries.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading customer delivery notes...</p>
        </div>
      </div>
    );
  }

  if (error && deliveries.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
          <p className="text-gray-600">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Delivery Notes</h1>
          <p className="mt-1 text-sm text-gray-600">Track outgoing deliveries to customers</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/stock-control/portal/deliveries/scan"
            className="inline-flex items-center px-4 py-2 border border-teal-600 rounded-md shadow-sm text-sm font-medium text-teal-700 bg-white hover:bg-teal-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Scan & Analyze
          </Link>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        {deliveries.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No customer delivery notes</h3>
            <p className="mt-1 text-sm text-gray-500">
              Scan a customer delivery note to get started.
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Delivery Number
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Customer
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Date
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Received By
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Items
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deliveries.map((delivery) => (
                <tr key={delivery.id} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/stock-control/portal/deliveries/${delivery.id}`}
                      className="text-sm font-medium text-teal-700 hover:text-teal-900"
                    >
                      {delivery.deliveryNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {delivery.supplierName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateZA(delivery.receivedDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {delivery.receivedBy || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {(() => {
                      const { count, isExtracted } = itemsCount(delivery);
                      if (isExtracted) {
                        return (
                          <span
                            className="text-yellow-600"
                            title="Extracted items (not yet linked to inventory)"
                          >
                            {count}*
                          </span>
                        );
                      }
                      return count;
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
