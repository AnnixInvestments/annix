"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileImportModal } from "@/app/components/modals/FileImportModal";
import { useToast } from "@/app/components/Toast";
import type { AnalyzedDeliveryNoteResult, DeliveryNote } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { useFileUpload } from "@/app/lib/hooks/useFileUpload";

interface InvoiceUploadModalProps {
  deliveryNotes: DeliveryNote[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function InvoiceUploadModal(props: InvoiceUploadModalProps) {
  const { deliveryNotes, onClose, onSuccess } = props;
  const router = useRouter();
  const { showToast } = useToast();
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

  const fileUpload = useFileUpload({ accept: "image/*,.pdf", multiple: false, maxSizeMb: 10 });

  const handleFilesSelected = (files: File[]) => {
    fileUpload.addFiles(files);
    const file = files[0];
    if (!file) return;
    setAnalysisResult(null);
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDeliveryNoteChange = (deliveryNoteId: number) => {
    const deliveryNote = deliveryNotes.find((dn) => dn.id === deliveryNoteId);
    const dnSupplierName = deliveryNote?.supplierName;
    const supplierName = dnSupplierName ? dnSupplierName : form.supplierName;
    setForm({
      ...form,
      deliveryNoteId,
      supplierName,
    });
  };

  const handleAnalyze = async () => {
    const selectedFile = fileUpload.files[0];
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
      const dataInvoiceNumber = data.invoiceNumber;
      const dataCompanyName = data.fromCompany?.name;
      const dataDeliveryDate = data.deliveryDate;
      setForm((prev) => ({
        ...prev,
        invoiceNumber: dataInvoiceNumber ? dataInvoiceNumber : prev.invoiceNumber,
        supplierName: dataCompanyName ? dataCompanyName : prev.supplierName,
        invoiceDate: dataDeliveryDate ? dataDeliveryDate : prev.invoiceDate,
      }));

      showToast("Document analyzed - fields auto-filled", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze document");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleQuickAccept = async () => {
    const selectedFile = fileUpload.files[0];
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

      const rawInvoiceNumber = invoice.invoiceNumber;
      const invoiceNumber = rawInvoiceNumber ? rawInvoiceNumber : "";
      showToast(`Invoice ${invoiceNumber} created successfully`, "success");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invoice");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    const selectedFile = fileUpload.files[0];
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
        deliveryNoteId: form.deliveryNoteId ? form.deliveryNoteId : null,
        invoiceNumber: form.invoiceNumber,
        supplierName: form.supplierName,
        invoiceDate: form.invoiceDate ? form.invoiceDate : undefined,
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

  const selectedFile = fileUpload.files[0];
  const combinedError = error || fileUpload.error;

  return (
    <FileImportModal
      isOpen={true}
      onClose={onClose}
      title="Upload Supplier Invoice"
      accept="image/*,.pdf"
      multiple={false}
      maxSizeMb={10}
      error={combinedError}
      maxWidth="max-w-2xl"
      files={fileUpload.files}
      onFilesSelected={handleFilesSelected}
      onRemoveFile={(index) => {
        fileUpload.removeFile(index);
        setPreviewUrl(null);
        setAnalysisResult(null);
      }}
      isDragging={fileUpload.isDragging}
      dragProps={fileUpload.dragProps}
      hideDropzone={!!selectedFile}
      dropzoneLabel="Upload a file"
      dropzoneSubLabel="or drag and drop"
      dropzoneHint="PNG, JPG, PDF up to 10MB"
      submitLabel="Upload & Extract"
      onSubmit={handleSubmit}
      submitDisabled={(() => {
        const invoiceNum = form.invoiceNumber;
        const dnId = form.deliveryNoteId;
        const supplierName = form.supplierName;
        return isUploading || !selectedFile || !invoiceNum || (!dnId && !supplierName);
      })()}
      loading={isUploading}
    >
      {selectedFile && (
        <div className="space-y-4">
          <div
            onClick={() => {
              fileUpload.clearFiles();
              setPreviewUrl(null);
              setAnalysisResult(null);
            }}
            className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md cursor-pointer border-teal-500 bg-teal-50"
          >
            {previewUrl ? (
              <div className="text-center">
                <img
                  src={previewUrl}
                  alt="Invoice preview"
                  className="mx-auto h-32 object-contain mb-2"
                />
                <p className="text-sm text-gray-600">{selectedFile.name}</p>
                <p className="text-xs text-teal-600 mt-1">Click or drop to change</p>
              </div>
            ) : (
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
                <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                <p className="text-xs text-teal-600 mt-1">Click or drop to change</p>
              </div>
            )}
          </div>

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
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      )}
    </FileImportModal>
  );
}
