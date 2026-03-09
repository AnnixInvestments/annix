"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { DeliveryNote, SupplierInvoice } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";
import InvoiceUploadModal from "./InvoiceUploadModal";
import SageExportModal from "./SageExportModal";

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

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const fetchInvoices = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await stockControlApiClient.supplierInvoices();
      setInvoices(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load invoices"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchDeliveryNotes = useCallback(async () => {
    try {
      const data = await stockControlApiClient.deliveryNotes();
      setDeliveryNotes(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load delivery notes"));
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
    fetchDeliveryNotes();
  }, [fetchInvoices, fetchDeliveryNotes]);

  const handleInvoiceCreated = () => {
    setShowUploadModal(false);
    fetchInvoices();
  };

  if (isLoading && invoices.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoices...</p>
        </div>
      </div>
    );
  }

  if (error && invoices.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900">Supplier Invoices</h1>
          <p className="mt-1 text-sm text-gray-600">
            Upload and process supplier invoices with AI extraction
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowExportModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Export to Sage
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            Upload Invoice
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {invoices.length === 0 ? (
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices</h3>
            <p className="mt-1 text-sm text-gray-500">Upload an invoice to get started.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Invoice Number
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Supplier
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Delivery Note
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Date
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Amount
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/stock-control/portal/invoices/${invoice.id}`}
                      className="text-sm font-medium text-teal-700 hover:text-teal-900"
                    >
                      {invoice.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.supplierName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {invoice.deliveryNoteId ? (
                      invoice.deliveryNote?.deliveryNumber || `DN-${invoice.deliveryNoteId}`
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                        Unlinked
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {invoice.invoiceDate ? formatDateZA(invoice.invoiceDate) : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {invoice.totalAmount
                      ? `R${Number(invoice.totalAmount).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`
                      : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[invoice.extractionStatus] || "bg-gray-100 text-gray-800"}`}
                    >
                      {STATUS_LABELS[invoice.extractionStatus] || invoice.extractionStatus}
                    </span>
                    {invoice.exportedToSageAt && (
                      <span className="ml-1 inline-flex px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                        Exported
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!window.confirm(`Delete invoice ${invoice.invoiceNumber}?`)) return;
                        try {
                          await stockControlApiClient.deleteInvoice(invoice.id);
                          fetchInvoices();
                        } catch (err) {
                          alert(err instanceof Error ? err.message : "Failed to delete");
                        }
                      }}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete invoice"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showUploadModal && (
        <InvoiceUploadModal
          deliveryNotes={deliveryNotes}
          onClose={() => setShowUploadModal(false)}
          onSuccess={handleInvoiceCreated}
        />
      )}

      {showExportModal && (
        <SageExportModal
          onClose={() => setShowExportModal(false)}
          onSuccess={() => fetchInvoices()}
        />
      )}
    </div>
  );
}
