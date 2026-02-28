"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type {
  InvoiceClarification,
  PriceChangeSummary,
  StockItem,
  SupplierInvoice,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";
import InvoiceClarificationPopup from "./InvoiceClarificationPopup";
import PriceUpdateReview from "./PriceUpdateReview";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800",
  processing: "bg-blue-100 text-blue-800",
  needs_clarification: "bg-yellow-100 text-yellow-800",
  awaiting_approval: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  needs_clarification: "Needs Clarification",
  awaiting_approval: "Awaiting Approval",
  completed: "Completed",
  failed: "Failed",
};

const MATCH_STATUS_COLORS: Record<string, string> = {
  matched: "bg-green-100 text-green-800",
  unmatched: "bg-red-100 text-red-800",
  clarification_needed: "bg-yellow-100 text-yellow-800",
  manually_matched: "bg-blue-100 text-blue-800",
  new_item_created: "bg-purple-100 text-purple-800",
};

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = Number(params.id);

  const [invoice, setInvoice] = useState<SupplierInvoice | null>(null);
  const [clarifications, setClarifications] = useState<InvoiceClarification[]>([]);
  const [priceSummary, setPriceSummary] = useState<PriceChangeSummary | null>(null);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [currentClarificationIndex, setCurrentClarificationIndex] = useState(0);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const fetchInvoice = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await stockControlApiClient.supplierInvoiceById(invoiceId);
      setInvoice(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load invoice"));
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId]);

  const fetchClarifications = useCallback(async () => {
    try {
      const data = await stockControlApiClient.invoiceClarifications(invoiceId);
      setClarifications(data);
      setCurrentClarificationIndex(0);
    } catch (err) {
      console.error("Failed to load clarifications:", err);
    }
  }, [invoiceId]);

  const fetchPriceSummary = useCallback(async () => {
    try {
      const data = await stockControlApiClient.invoicePriceSummary(invoiceId);
      setPriceSummary(data);
    } catch (err) {
      console.error("Failed to load price summary:", err);
    }
  }, [invoiceId]);

  const fetchStockItems = useCallback(async () => {
    try {
      const result = await stockControlApiClient.stockItems({ limit: "1000" });
      setStockItems(result.items);
    } catch (err) {
      console.error("Failed to load stock items:", err);
    }
  }, []);

  useEffect(() => {
    fetchInvoice();
    fetchClarifications();
    fetchPriceSummary();
    fetchStockItems();
  }, [fetchInvoice, fetchClarifications, fetchPriceSummary, fetchStockItems]);

  const handleClarificationSubmit = async (
    clarificationId: number,
    response: {
      selectedStockItemId?: number;
      createNewItem?: {
        sku: string;
        name: string;
        description?: string;
        category?: string;
        unitOfMeasure?: string;
      };
      skipPriceUpdate?: boolean;
      confirmed?: boolean;
    },
  ) => {
    try {
      await stockControlApiClient.submitInvoiceClarification(invoiceId, clarificationId, response);
      await fetchClarifications();
      await fetchInvoice();
      await fetchPriceSummary();

      if (currentClarificationIndex < clarifications.length - 1) {
        setCurrentClarificationIndex((prev) => prev + 1);
      }
    } catch (err) {
      console.error("Failed to submit clarification:", err);
    }
  };

  const handleClarificationSkip = async (clarificationId: number) => {
    try {
      await stockControlApiClient.skipInvoiceClarification(invoiceId, clarificationId);
      await fetchClarifications();
      await fetchInvoice();

      if (currentClarificationIndex < clarifications.length - 1) {
        setCurrentClarificationIndex((prev) => prev + 1);
      }
    } catch (err) {
      console.error("Failed to skip clarification:", err);
    }
  };

  const handleApprove = async () => {
    try {
      setIsApproving(true);
      await stockControlApiClient.approveInvoice(invoiceId);
      await fetchInvoice();
      setShowApprovalModal(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to approve invoice"));
    } finally {
      setIsApproving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Invoice</div>
          <p className="text-gray-600">{error?.message || "Invoice not found"}</p>
          <Link
            href="/stock-control/portal/invoices"
            className="mt-4 inline-block text-teal-600 hover:text-teal-800"
          >
            Back to Invoices
          </Link>
        </div>
      </div>
    );
  }

  const currentClarification = clarifications[currentClarificationIndex];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/stock-control/portal/invoices" className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{invoice.invoiceNumber}</h1>
            <p className="mt-1 text-sm text-gray-600">{invoice.supplierName}</p>
          </div>
        </div>
        <span
          className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${STATUS_COLORS[invoice.extractionStatus] || "bg-gray-100 text-gray-800"}`}
        >
          {STATUS_LABELS[invoice.extractionStatus] || invoice.extractionStatus}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Invoice Details</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Invoice Number</dt>
                <dd className="mt-1 text-sm text-gray-900">{invoice.invoiceNumber}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Supplier</dt>
                <dd className="mt-1 text-sm text-gray-900">{invoice.supplierName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Invoice Date</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {invoice.invoiceDate ? formatDateZA(invoice.invoiceDate) : "-"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {invoice.totalAmount
                    ? `R${Number(invoice.totalAmount).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`
                    : "-"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">VAT Amount</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {invoice.vatAmount
                    ? `R${Number(invoice.vatAmount).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`
                    : "-"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Delivery Note</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <Link
                    href={`/stock-control/portal/deliveries/${invoice.deliveryNoteId}`}
                    className="text-teal-600 hover:text-teal-800"
                  >
                    {invoice.deliveryNote?.deliveryNumber || `DN-${invoice.deliveryNoteId}`}
                  </Link>
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Line Items</h2>
            </div>
            {invoice.items && invoice.items.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qty
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Matched Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoice.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.lineNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div>{item.extractedDescription}</div>
                        {item.extractedSku && (
                          <div className="text-xs text-gray-500">SKU: {item.extractedSku}</div>
                        )}
                        {(item.isPartA || item.isPartB) && (
                          <span
                            className={`inline-flex mt-1 px-2 py-0.5 text-xs rounded-full ${item.isPartA ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800"}`}
                          >
                            {item.isPartA ? "Part A" : "Part B"}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {item.unitPrice
                          ? `R${Number(item.unitPrice).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.stockItem ? (
                          <div>
                            <div>{item.stockItem.name}</div>
                            <div className="text-xs text-gray-500">{item.stockItem.sku}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${MATCH_STATUS_COLORS[item.matchStatus] || "bg-gray-100 text-gray-800"}`}
                        >
                          {item.matchStatus.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">No line items extracted yet</div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {invoice.scanUrl && (
            <div className="bg-white shadow rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Invoice Scan</h3>
              <a href={invoice.scanUrl} target="_blank" rel="noopener noreferrer">
                <img
                  src={invoice.scanUrl}
                  alt="Invoice scan"
                  className="w-full rounded-lg border border-gray-200 hover:opacity-80 transition-opacity"
                />
              </a>
            </div>
          )}

          {invoice.extractionStatus === "awaiting_approval" && priceSummary && (
            <div className="bg-white shadow rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Price Updates</h3>
              <PriceUpdateReview
                priceSummary={priceSummary}
                onApprove={() => setShowApprovalModal(true)}
              />
            </div>
          )}

          {invoice.extractionStatus === "completed" && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 text-green-500 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-green-800">Invoice Processed</h3>
                  <p className="text-xs text-green-600 mt-1">
                    Approved on {invoice.approvedAt ? formatDateZA(invoice.approvedAt) : "-"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {currentClarification && (
        <InvoiceClarificationPopup
          clarification={currentClarification}
          totalClarifications={clarifications.length}
          currentIndex={currentClarificationIndex}
          stockItems={stockItems}
          onSubmit={handleClarificationSubmit}
          onSkip={handleClarificationSkip}
          onClose={() => {}}
        />
      )}

      {showApprovalModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => setShowApprovalModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Approval</h3>
              <p className="text-sm text-gray-600 mb-6">
                This will apply all price updates to the matched stock items. This action cannot be
                undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  disabled={isApproving}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 disabled:bg-gray-400"
                >
                  {isApproving ? "Approving..." : "Approve & Update Prices"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
