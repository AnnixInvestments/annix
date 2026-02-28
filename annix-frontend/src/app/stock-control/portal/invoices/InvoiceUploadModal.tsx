"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { DeliveryNote } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";

interface InvoiceUploadModalProps {
  deliveryNotes: DeliveryNote[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function InvoiceUploadModal({
  deliveryNotes,
  onClose,
  onSuccess,
}: InvoiceUploadModalProps) {
  const router = useRouter();
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
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
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

  const handleSubmit = async () => {
    if (!selectedFile) {
      setError("Please select an invoice scan to upload");
      return;
    }
    if (!form.deliveryNoteId) {
      setError("Please select a delivery note");
      return;
    }
    if (!form.invoiceNumber) {
      setError("Please enter an invoice number");
      return;
    }

    try {
      setIsUploading(true);
      setError(null);

      const invoice = await stockControlApiClient.createSupplierInvoice({
        deliveryNoteId: form.deliveryNoteId,
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
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
                Delivery Note <span className="text-red-500">*</span>
              </label>
              <select
                value={form.deliveryNoteId}
                onChange={(e) => handleDeliveryNoteChange(parseInt(e.target.value, 10) || 0)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
              >
                <option value={0}>Select delivery note...</option>
                {deliveryNotes.map((dn) => (
                  <option key={dn.id} value={dn.id}>
                    {dn.deliveryNumber} - {dn.supplierName}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Invoice must be linked to an existing delivery note
              </p>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
              <input
                type="text"
                value={form.supplierName}
                onChange={(e) => setForm({ ...form, supplierName: e.target.value })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                placeholder="Auto-filled from delivery note"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Scan <span className="text-red-500">*</span>
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md cursor-pointer hover:border-teal-500 transition-colors ${
                  previewUrl ? "border-teal-500 bg-teal-50" : "border-gray-300"
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
                    <p className="text-xs text-teal-600 mt-1">Click to change</p>
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
              disabled={isUploading || !selectedFile || !form.deliveryNoteId || !form.invoiceNumber}
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
    </div>
  );
}
