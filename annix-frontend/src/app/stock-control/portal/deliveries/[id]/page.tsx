"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import type { DeliveryNote } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";

export default function DeliveryDetailPage() {
  const params = useParams();
  const deliveryId = Number(params.id);

  const [delivery, setDelivery] = useState<DeliveryNote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await stockControlApiClient.deliveryNoteById(deliveryId);
      setDelivery(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load delivery note"));
    } finally {
      setIsLoading(false);
    }
  }, [deliveryId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading delivery note...</p>
        </div>
      </div>
    );
  }

  if (error || !delivery) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
          <p className="text-gray-600">{error?.message || "Delivery note not found"}</p>
          <Link href="/stock-control/portal/deliveries" className="mt-4 inline-block text-teal-600 hover:text-teal-800">
            Back to Deliveries
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link
          href="/stock-control/portal/deliveries"
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery {delivery.deliveryNumber}</h1>
          <p className="mt-1 text-sm text-gray-500">From {delivery.supplierName}</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Delivery Details</h3>
        </div>
        <div className="px-4 py-5 sm:px-6">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-6">
            <div>
              <dt className="text-sm font-medium text-gray-500">Delivery Number</dt>
              <dd className="mt-1 text-sm text-gray-900">{delivery.deliveryNumber}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Supplier</dt>
              <dd className="mt-1 text-sm text-gray-900">{delivery.supplierName}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Received Date</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDateZA(delivery.receivedDate)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Received By</dt>
              <dd className="mt-1 text-sm text-gray-900">{delivery.receivedBy || "-"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDateZA(delivery.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Items Count</dt>
              <dd className="mt-1 text-sm text-gray-900">{delivery.items?.length ?? 0}</dd>
            </div>
            {delivery.notes && (
              <div className="col-span-2">
                <dt className="text-sm font-medium text-gray-500">Notes</dt>
                <dd className="mt-1 text-sm text-gray-900">{delivery.notes}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {delivery.photoUrl && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Photo</h3>
          </div>
          <div className="p-4">
            <img
              src={delivery.photoUrl}
              alt={`Delivery ${delivery.deliveryNumber}`}
              className="max-w-md rounded-lg object-cover"
            />
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Delivered Items</h3>
        </div>
        {(!delivery.items || delivery.items.length === 0) ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No items</h3>
            <p className="mt-1 text-sm text-gray-500">This delivery note has no items.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty Received</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {delivery.items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.stockItem ? (
                      <Link
                        href={`/stock-control/portal/inventory/${item.stockItem.id}`}
                        className="text-teal-700 hover:text-teal-900"
                      >
                        {item.stockItem.name}
                      </Link>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    {item.stockItem?.sku || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                    {item.quantityReceived}
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
