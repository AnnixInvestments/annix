"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useToast } from "@/app/components/Toast";
import type { SupplierInvoice } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";
import {
  useDeleteInvoice,
  useDeliveryNotes,
  useInvalidateInvoices,
  useInvoices,
} from "@/app/lib/query/hooks";
import { useViewAs } from "@/app/stock-control/context/ViewAsContext";
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

const statusLabel = (invoice: SupplierInvoice): string => {
  if (invoice.extractionStatus === "pending" && invoice.scanUrl) {
    return "Pending Extraction";
  }
  if (invoice.extractionStatus === "pending") {
    return "Pending Scan";
  }
  return STATUS_LABELS[invoice.extractionStatus] || invoice.extractionStatus;
};

export default function InvoicesPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { effectiveRole } = useViewAs();
  const { data: invoices = [], isLoading, error } = useInvoices();
  const { data: deliveryNotes = [] } = useDeliveryNotes();
  const deleteInvoiceMutation = useDeleteInvoice();
  const invalidateInvoices = useInvalidateInvoices();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SupplierInvoice | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAutoLinking, setIsAutoLinking] = useState(false);
  const [isReExtractingAll, setIsReExtractingAll] = useState(false);

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

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
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

      try {
        setIsAnalyzing(true);
        showToast("Analyzing document...", "info");
        const result = await stockControlApiClient.analyzeDeliveryNotePhoto(file);
        const invoice = await stockControlApiClient.acceptAnalyzedInvoice(file, result.data);
        showToast(`Invoice ${invoice.invoiceNumber || ""} created successfully`, "success");
        invalidateInvoices();
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to analyze document", "error");
      } finally {
        setIsAnalyzing(false);
      }
    },
    [showToast, invalidateInvoices],
  );

  const handleInvoiceCreated = () => {
    setShowUploadModal(false);
    invalidateInvoices();
  };

  const handleReExtract = async (invoiceId: number) => {
    try {
      showToast("Re-extracting invoice...", "info");
      await stockControlApiClient.reExtractInvoice(invoiceId);
      showToast("Extraction triggered successfully", "success");
      invalidateInvoices();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to re-extract", "error");
    }
  };

  const handleReExtractAllFailed = async () => {
    try {
      setIsReExtractingAll(true);
      showToast("Re-extracting all failed invoices...", "info");
      const result = await stockControlApiClient.reExtractAllFailed();
      if (result.triggered > 0) {
        showToast(`Re-extracted ${result.triggered} invoice(s) successfully`, "success");
      } else {
        showToast("No failed invoices with scans to re-extract", "info");
      }
      if (result.failed.length > 0) {
        showToast(`${result.failed.length} invoice(s) failed again`, "error");
      }
      invalidateInvoices();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Bulk re-extract failed", "error");
    } finally {
      setIsReExtractingAll(false);
    }
  };

  const handleAutoLink = async () => {
    try {
      setIsAutoLinking(true);
      const result = await stockControlApiClient.autoLinkInvoices();
      if (result.linked > 0) {
        showToast(`Auto-linked ${result.linked} invoice(s) to delivery notes`, "success");
        invalidateInvoices();
      } else {
        showToast("No matching delivery notes found for unlinked invoices", "info");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Auto-link failed", "error");
    } finally {
      setIsAutoLinking(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      await deleteInvoiceMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete invoice");
    }
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
                  Nix is extracting invoice information from your document
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
                <p className="mt-4 text-lg font-medium text-gray-900">Drop invoice to analyze</p>
                <p className="mt-1 text-sm text-gray-500">
                  Nix will automatically extract invoice information
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supplier Invoices</h1>
          <p className="mt-1 text-sm text-gray-600">
            Upload and process supplier invoices with AI extraction
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {invoices.some((inv) => inv.extractionStatus === "failed" && inv.scanUrl) && (
            <button
              onClick={handleReExtractAllFailed}
              disabled={isReExtractingAll}
              className="inline-flex items-center px-4 py-2 border border-red-400 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
            >
              {isReExtractingAll ? (
                <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : (
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              )}
              {isReExtractingAll ? "Re-extracting..." : "Re-extract All Failed"}
            </button>
          )}
          {invoices.some((inv) => !inv.deliveryNoteId) && (
            <button
              onClick={handleAutoLink}
              disabled={isAutoLinking}
              className="inline-flex items-center px-4 py-2 border border-amber-500 rounded-md shadow-sm text-sm font-medium text-amber-700 bg-white hover:bg-amber-50 disabled:opacity-50"
            >
              {isAutoLinking ? (
                <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : (
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
              )}
              {isAutoLinking ? "Linking..." : "Auto-Link"}
            </button>
          )}
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

      <div className="bg-white shadow rounded-lg overflow-x-auto">
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
                  className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Invoice Number
                </th>
                <th
                  scope="col"
                  className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Supplier
                </th>
                <th
                  scope="col"
                  className="hidden md:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Delivery Note
                </th>
                <th
                  scope="col"
                  className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Date
                </th>
                <th
                  scope="col"
                  className="hidden sm:table-cell px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Amount
                </th>
                <th
                  scope="col"
                  className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                ></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/stock-control/portal/invoices/${invoice.id}`)}
                >
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-teal-700">
                      {invoice.invoiceNumber}
                    </span>
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.supplierName}
                  </td>
                  <td className="hidden md:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {invoice.deliveryNoteId ? (
                      (() => {
                        const dn = invoice.deliveryNote;
                        return dn ? dn.deliveryNumber : `DN-${invoice.deliveryNoteId}`;
                      })()
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                        Unlinked
                      </span>
                    )}
                  </td>
                  <td className="hidden sm:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {invoice.invoiceDate ? formatDateZA(invoice.invoiceDate) : "-"}
                  </td>
                  <td className="hidden sm:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {invoice.totalAmount
                      ? `R${Number(invoice.totalAmount).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`
                      : "-"}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[invoice.extractionStatus] || "bg-gray-100 text-gray-800"}`}
                    >
                      {statusLabel(invoice)}
                    </span>
                    {invoice.exportedToSageAt && (
                      <span className="ml-1 inline-flex px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                        Exported
                      </span>
                    )}
                    {invoice.scanUrl &&
                      (invoice.extractionStatus === "pending" ||
                        invoice.extractionStatus === "failed") && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReExtract(invoice.id);
                          }}
                          className="ml-2 inline-flex items-center px-2 py-0.5 text-xs font-medium text-teal-700 bg-teal-50 rounded-full hover:bg-teal-100 transition-colors"
                          title="Re-extract invoice data from scan"
                        >
                          Re-extract
                        </button>
                      )}
                  </td>
                  {(effectiveRole === "manager" || effectiveRole === "admin") && (
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(invoice);
                          setDeleteError(null);
                        }}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete invoice"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </td>
                  )}
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
          onSuccess={() => invalidateInvoices()}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/10 backdrop-blur-md"
              onClick={() => setDeleteTarget(null)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">Delete Invoice</h3>
              </div>
              <p className="text-sm text-gray-500 mb-2">
                Are you sure you want to delete invoice{" "}
                <span className="font-medium text-gray-900">{deleteTarget.invoiceNumber}</span>?
              </p>
              <p className="text-sm text-gray-500 mb-4">This action cannot be undone.</p>
              {deleteError && <p className="text-sm text-red-600 mb-4">{deleteError}</p>}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleteInvoiceMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleteInvoiceMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteInvoiceMutation.isPending ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
