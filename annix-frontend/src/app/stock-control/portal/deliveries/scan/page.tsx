"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useToast } from "@/app/components/Toast";
import type {
  AnalyzedDeliveryNoteData,
  AnalyzedDeliveryNoteResult,
} from "@/app/lib/api/stockControlApi";
import {
  useAcceptAnalyzedDeliveryNote,
  useAcceptAnalyzedInvoice,
  useAnalyzeDeliveryNotePhoto,
  useSavePendingDeliveryNote,
} from "@/app/lib/query/hooks";
import { DeliveryNoteConfirmationModal } from "@/app/stock-control/components/DeliveryNoteConfirmationModal";

const isInvoiceDocument = (docType: AnalyzedDeliveryNoteData["documentType"]): boolean =>
  docType === "SUPPLIER_INVOICE" || docType === "TAX_INVOICE";

export default function ScanDeliveryNotePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const analyzeMutation = useAnalyzeDeliveryNotePhoto();
  const acceptDnMutation = useAcceptAnalyzedDeliveryNote();
  const acceptInvoiceMutation = useAcceptAnalyzedInvoice();
  const savePendingMutation = useSavePendingDeliveryNote();

  const isAnalyzing = analyzeMutation.isPending;
  const aLoading = acceptDnMutation.isPending;
  const bLoading = acceptInvoiceMutation.isPending;
  const cLoading = savePendingMutation.isPending;
  const isSubmitting = aLoading || bLoading || cLoading;

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzedDeliveryNoteResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const processFile = (file: File) => {
    setSelectedFile(file);
    setResult(null);
    setShowConfirmModal(false);

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
        showToast("Please drop an image or PDF file", "error");
      }
    }
  };

  const handleAnalyze = () => {
    if (!selectedFile) {
      showToast("Please select a file first", "error");
      return;
    }

    analyzeMutation.mutate(selectedFile, {
      onSuccess: (analysisResult) => {
        setResult(analysisResult);

        if (isInvoiceDocument(analysisResult.data.documentType)) {
          showToast("Invoice detected — accepting automatically", "info");
          acceptInvoiceMutation.mutate(
            { file: selectedFile, analyzedData: analysisResult.data },
            {
              onSuccess: (invoice) => {
                const invNum = invoice.invoiceNumber;
                showToast(`Invoice ${invNum ? invNum : ""} created successfully`, "success");
                router.push("/stock-control/portal/invoices");
              },
              onError: (err) => {
                showToast(err instanceof Error ? err.message : "Failed to create invoice", "error");
              },
            },
          );
        } else {
          setShowConfirmModal(true);
          showToast("Delivery note analyzed — review the data below", "success");
        }
      },
      onError: (err) => {
        showToast(err instanceof Error ? err.message : "Failed to analyze delivery note", "error");
      },
    });
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setShowConfirmModal(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleConfirmAndAddToStock = (editedData: AnalyzedDeliveryNoteData) => {
    if (!selectedFile) return;
    acceptDnMutation.mutate(
      { file: selectedFile, analyzedData: editedData, documentType: "SUPPLIER_DELIVERY" },
      {
        onSuccess: (deliveryNote) => {
          const dnNum = deliveryNote.deliveryNumber;
          showToast(`Delivery note ${dnNum ? dnNum : ""} created and stock updated`, "success");
          router.push("/stock-control/portal/deliveries");
        },
        onError: (err) => {
          showToast(err instanceof Error ? err.message : "Failed to create record", "error");
        },
      },
    );
  };

  const handleSaveForReview = (editedData: AnalyzedDeliveryNoteData) => {
    if (!selectedFile) return;
    savePendingMutation.mutate(
      { file: selectedFile, analyzedData: editedData as unknown as Record<string, unknown> },
      {
        onSuccess: (deliveryNote) => {
          const dnNum = deliveryNote.deliveryNumber;
          showToast(`Delivery note ${dnNum ? dnNum : ""} saved for review`, "success");
          router.push("/stock-control/portal/deliveries");
        },
        onError: (err) => {
          showToast(err instanceof Error ? err.message : "Failed to save delivery note", "error");
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 text-sm text-gray-500">
        <Link href="/stock-control/portal/deliveries" className="hover:text-teal-600">
          Delivery Notes
        </Link>
        <span>/</span>
        <span className="text-gray-900">Scan & Analyze</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scan Delivery Note</h1>
          <p className="mt-1 text-sm text-gray-500">
            Take a photo or upload an image/PDF of a delivery note to extract information
          </p>
        </div>
      </div>

      <div
        className="bg-white shadow rounded-lg p-6"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <h2 className="text-lg font-medium text-gray-900 mb-4">Upload Document</h2>

        {isDragOver && (
          <div className="mb-4 p-6 border-2 border-dashed border-teal-500 bg-teal-50 rounded-lg text-center">
            <svg
              className="mx-auto h-10 w-10 text-teal-600"
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
            <p className="mt-2 text-sm font-medium text-teal-700">Drop file here</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1 inline-flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              Take Photo
            </button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 inline-flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Upload File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/heic,image/heif,image/webp,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {selectedFile && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <svg
                    className="w-8 h-8 text-gray-400"
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
                  <div>
                    <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {previewUrl && (
                <div className="mt-3">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-64 rounded-lg border border-gray-200 object-contain mx-auto"
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!selectedFile || isAnalyzing}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  Analyzing...
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
                  Analyze Document
                </>
              )}
            </button>
          </div>

          {result && !showConfirmModal && (
            <div className="border-t pt-4 text-xs text-gray-400">
              Processed in {result.processingTimeMs}ms
              {result.tokensUsed && ` | ${result.tokensUsed} tokens`}
            </div>
          )}
        </div>
      </div>

      {showConfirmModal && result && (
        <DeliveryNoteConfirmationModal
          analyzedData={result.data}
          onClose={() => setShowConfirmModal(false)}
          onConfirmAndAddToStock={handleConfirmAndAddToStock}
          onSaveForReview={handleSaveForReview}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
