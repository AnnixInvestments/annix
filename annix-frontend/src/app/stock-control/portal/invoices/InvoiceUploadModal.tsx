"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "@/app/components/Toast";
import type { AnalyzedDeliveryNoteResult, DeliveryNote } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

interface InvoiceUploadModalProps {
  deliveryNotes: DeliveryNote[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function InvoiceUploadModal(props: InvoiceUploadModalProps) {
  const { deliveryNotes, onClose, onSuccess } = props;
  const router = useRouter();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [form, setForm] = useState({
    deliveryNoteId: 0,
    invoiceNumber: "",
    supplierName: "",
    invoiceDate: "",
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzedDeliveryNoteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const processFile = (file: File) => {
    setSelectedFile(file);
    setAnalysisResult(null);
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      const validTypes = ["image/", "application/pdf"];
      if (validTypes.some((t) => file.type.startsWith(t))) {
        processFile(file);
      } else {
        setError("Please drop an image or PDF file");
      }
    }
  };

  const handleDeliveryNoteChange = (deliveryNoteId: number) => {
    const deliveryNote = deliveryNotes.find((dn) => dn.id === deliveryNoteId);
    setForm({
      ...form,
      deliveryNoteId,
      supplierName: deliveryNote?.supplierName || form.supplierName,
    });
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError("Please select a file first");
      return;
    }

    try {
      setIsAnalyzing(true);
      setError(null);
      const result = await stockControlApiClient.analyzeDeliveryNotePhoto(selectedFile);
      setAnalysisResult(result);

      const { data } = result;
      setForm((prev) => ({
        ...prev,
        invoiceNumber: data.invoiceNumber || prev.invoiceNumber,
        supplierName: data.fromCompany?.name || prev.supplierName,
        invoiceDate: data.deliveryDate || prev.invoiceDate,
      }));

      showToast("Document analyzed - fields auto-filled", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze document");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleQuickAccept = async () => {
    if (!selectedFile || !analysisResult) return;

    try {
      setIsUploading(true);
      setError(null);
      const invoice = await stockControlApiClient.acceptAnalyzedInvoice(
        selectedFile,
        analysisResult.data,
      );

      if (form.deliveryNoteId && invoice.id) {
        await stockControlApiClient.linkInvoiceToDeliveryNote(invoice.id, form.deliveryNoteId);
      }

      showToast(`Invoice ${invoice.invoiceNumber || ""} created successfully`, "success");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invoice");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      setError("Please select an invoice scan to upload");
      return;
    }
    if (!form.invoiceNumber) {
      setError("Please enter an invoice number");
      return;
    }
    if (!form.deliveryNoteId && !form.supplierName) {
      setError("Please enter a supplier name when no delivery note is selected");
      return;
    }

    try {
      setIsUploading(true);
      setError(null);

      const invoice = await stockControlApiClient.createSupplierInvoice({
        deliveryNoteId: form.deliveryNoteId || null,
        invoiceNumber: form.invoiceNumber,
        supplierName: form.supplierName,
        invoiceDate: form.invoiceDate || undefined,
      });

      const updatedInvoice = await stockControlApiClient.uploadInvoiceScan(
        invoice.id,
        selectedFile,
      );

      if (
        updatedInvoice.extractionStatus === "needs_clarification" ||
        updatedInvoice.extractionStatus === "awaiting_approval"
      ) {
        router.push(`/stock-control/portal/invoices/${updatedInvoice.id}`);
      } else {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload invoice");
    } finally {
      setIsUploading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div
          className="fixed inset-0 bg-black/10 backdrop-blur-md transition-opacity"
          onClick={onClose}
        />
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Upload Supplier Invoice</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Scan <span className="text-red-500">*</span>
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md cursor-pointer transition-colors ${
                  isDragOver
                    ? "border-teal-500 bg-teal-50"
                    : previewUrl
                      ? "border-teal-500 bg-teal-50"
                      : "border-gray-300 hover:border-teal-500"
                }`}
              >
                {previewUrl ? (
                  <div className="text-center">
                    <img
                      src={previewUrl}
                      alt="Invoice preview"
                      className="mx-auto h-32 object-contain mb-2"
                    />
                    <p className="text-sm text-gray-600">{selectedFile?.name}</p>
                    <p className="text-xs text-teal-600 mt-1">Click or drop to change</p>
                  </div>
                ) : selectedFile ? (
                  <div className="text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-teal-500"
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
                    <p className="text-sm text-gray-600 mt-2">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                    <p className="text-xs text-teal-600 mt-1">Click or drop to change</p>
                  </div>
                ) : (
                  <div className="space-y-1 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium text-teal-600 hover:text-teal-500">
                        Upload a file
                      </span>{" "}
                      or drag and drop
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {selectedFile && (
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
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
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Nix is analyzing...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                    Analyze with Nix (auto-fill fields)
                  </>
                )}
              </button>
            )}

            {analysisResult && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      Document analyzed successfully
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Fields auto-filled below. Review and adjust if needed, or quick-accept.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleQuickAccept}
                    disabled={isUploading}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  >
                    <svg
                      className="w-3.5 h-3.5 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Quick Accept
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Note</label>
              <select
                value={form.deliveryNoteId}
                onChange={(e) => handleDeliveryNoteChange(parseInt(e.target.value, 10) || 0)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
              >
                <option value={0}>No delivery note (upload unlinked)</option>
                {deliveryNotes.map((dn) => (
                  <option key={dn.id} value={dn.id}>
                    {dn.deliveryNumber} - {dn.supplierName}
                  </option>
                ))}
              </select>
              {!form.deliveryNoteId && (
                <p className="mt-1 text-xs text-amber-600">
                  Invoice will be uploaded as unlinked. You can link it to a delivery note later.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.invoiceNumber}
                  onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                  placeholder="INV-12345"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
                <input
                  type="date"
                  value={form.invoiceDate}
                  onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier Name{!form.deliveryNoteId && <span className="text-red-500"> *</span>}
              </label>
              <input
                type="text"
                value={form.supplierName}
                onChange={(e) => setForm({ ...form, supplierName: e.target.value })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                placeholder={
                  form.deliveryNoteId ? "Auto-filled from delivery note" : "Enter supplier name"
                }
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={
                isUploading ||
                !selectedFile ||
                !form.invoiceNumber ||
                (!form.deliveryNoteId && !form.supplierName)
              }
              className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
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
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Processing...
                </span>
              ) : (
                "Upload & Extract"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
