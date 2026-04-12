"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useToast } from "@/app/components/Toast";
import type { AnalyzedDeliveryNoteData, DeliveryNote } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";
import {
  useAcceptAnalyzedDeliveryNote,
  useAnalyzeDeliveryNotePhoto,
  useCustomerDeliveries,
} from "@/app/lib/query/hooks";

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
  const { showToast } = useToast();
  const { data: deliveries = [], isLoading, error } = useCustomerDeliveries();
  const [isDragOver, setIsDragOver] = useState(false);
  const analyzeMutation = useAnalyzeDeliveryNotePhoto();
  const acceptMutation = useAcceptAnalyzedDeliveryNote();
  const [mismatchPopup, setMismatchPopup] = useState<{
    detectedType: string;
    supplierName: string;
  } | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const analyzeIsPending = analyzeMutation.isPending;
  const acceptIsPending = acceptMutation.isPending;
  const isAnalyzing = analyzeIsPending || acceptIsPending;

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const file = e.dataTransfer.files[0];
      if (!file) return;

      const validTypes = ["image/", "application/pdf"];
      if (!validTypes.some((t) => file.type.startsWith(t))) {
        showToast("Please drop an image or PDF file", "error");
        return;
      }

      showToast("Analyzing document...", "info");
      analyzeMutation.mutate(file, {
        onSuccess: (result) => {
          const detectedType = result.data.documentType;
          if (detectedType !== "CUSTOMER_DELIVERY") {
            const fromName = result.data.fromCompany?.name;
            const toName = result.data.toCompany?.name;
            const supplierName = fromName ? fromName : toName ? toName : "Unknown";
            const detectedLabel =
              detectedType === "SUPPLIER_DELIVERY"
                ? "Supplier Delivery Note"
                : detectedType === "SUPPLIER_INVOICE" || detectedType === "TAX_INVOICE"
                  ? "Supplier Invoice"
                  : detectedType;
            setMismatchPopup({
              detectedType: detectedLabel,
              supplierName,
            });
            return;
          }

          acceptMutation.mutate(
            {
              file,
              analyzedData: result.data as AnalyzedDeliveryNoteData,
              documentType: "CUSTOMER_DELIVERY",
            },
            {
              onSuccess: (deliveryNote) => {
                const dnNumber = deliveryNote.deliveryNumber;
                showToast(
                  `Delivery note ${dnNumber ? dnNumber : ""} created successfully`,
                  "success",
                );
              },
              onError: (err) => {
                showToast(
                  err instanceof Error ? err.message : "Failed to create delivery note",
                  "error",
                );
              },
            },
          );
        },
        onError: (err) => {
          showToast(err instanceof Error ? err.message : "Failed to analyze document", "error");
        },
      });
    },
    [showToast, analyzeMutation, acceptMutation],
  );

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
    const errorMsg = error.message;
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
          <p className="text-gray-600">{errorMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="space-y-6 relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {(isDragOver || isAnalyzing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-teal-600/20 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-8 text-center max-w-md mx-4">
            {isAnalyzing ? (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto" />
                <p className="mt-4 text-lg font-medium text-gray-900">Analyzing document...</p>
                <p className="mt-1 text-sm text-gray-500">
                  Nix is extracting information from your document
                </p>
              </>
            ) : (
              <>
                <svg
                  className="mx-auto h-12 w-12 text-teal-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="mt-4 text-lg font-medium text-gray-900">Drop document to analyze</p>
                <p className="mt-1 text-sm text-gray-500">
                  Nix will automatically extract delivery note information
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {mismatchPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-md">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="bg-red-50 px-6 py-4 flex items-center gap-3">
              <svg
                className="h-8 w-8 text-red-500 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <h3 className="text-lg font-semibold text-red-800">Wrong Document Type</h3>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-gray-700">
                Nix detected this document as a{" "}
                <span className="font-semibold text-red-700">{mismatchPopup.detectedType}</span>{" "}
                from <span className="font-semibold">{mismatchPopup.supplierName}</span>.
              </p>
              <p className="mt-3 text-sm text-gray-600">
                This page is for <span className="font-semibold">Customer Delivery Notes</span>{" "}
                (outgoing deliveries to customers). Supplier documents should be uploaded on the{" "}
                <span className="font-semibold text-teal-700">Supplier &gt; Delivery Notes</span>{" "}
                page instead.
              </p>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-3">
              <button
                onClick={() => setMismatchPopup(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
              <Link
                href="/stock-control/portal/deliveries"
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 transition-colors"
              >
                Go to Supplier Delivery Notes
              </Link>
            </div>
          </div>
        </div>
      )}

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
                    {delivery.receivedBy ? delivery.receivedBy : "-"}
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
