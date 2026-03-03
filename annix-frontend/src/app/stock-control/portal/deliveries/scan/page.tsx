"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useToast } from "@/app/components/Toast";
import {
  type AnalyzedDeliveryNoteLineItem,
  type AnalyzedDeliveryNoteResult,
  stockControlApiClient,
} from "@/app/lib/api/stockControlApi";

export default function ScanDeliveryNotePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzedDeliveryNoteResult | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);

      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      showToast("Please select a file first", "error");
      return;
    }

    try {
      setIsAnalyzing(true);
      const analysisResult = await stockControlApiClient.analyzeDeliveryNotePhoto(selectedFile);
      setResult(analysisResult);
      showToast("Delivery note analyzed successfully", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to analyze delivery note", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleAccept = async () => {
    if (!result || !selectedFile) return;

    try {
      setIsAccepting(true);
      const deliveryNote = await stockControlApiClient.acceptAnalyzedDeliveryNote(
        selectedFile,
        result.data,
      );
      showToast("Delivery note created successfully", "success");
      router.push(`/stock-control/portal/deliveries/${deliveryNote.id}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to create delivery note", "error");
    } finally {
      setIsAccepting(false);
    }
  };

  const formatLineItem = (item: AnalyzedDeliveryNoteLineItem) => {
    const parts: string[] = [];
    if (item.rollNumber) parts.push(`Roll: ${item.rollNumber}`);
    if (item.batchNumber) parts.push(`Batch: ${item.batchNumber}`);
    if (item.compoundCode) parts.push(`Compound: ${item.compoundCode}`);
    if (item.thicknessMm) parts.push(`${item.thicknessMm}mm`);
    if (item.widthMm) parts.push(`${item.widthMm}mm W`);
    if (item.lengthM) parts.push(`${item.lengthM}m L`);
    if (item.weightKg) parts.push(`${item.weightKg}kg`);
    if (item.color) parts.push(item.color);
    if (item.hardnessShoreA) parts.push(`${item.hardnessShoreA} Shore A`);
    return parts.length > 0 ? parts.join(" | ") : item.description;
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Upload Document</h2>

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
                accept="image/*"
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
                accept="image/*,application/pdf"
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
          </div>
        </div>

        {result && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Extracted Data</h2>
              <span
                className={`px-3 py-1 text-sm font-medium rounded-full ${
                  result.data.documentType === "SUPPLIER_DELIVERY"
                    ? "bg-teal-100 text-teal-800"
                    : "bg-green-100 text-green-800"
                }`}
              >
                {result.data.documentType === "SUPPLIER_DELIVERY"
                  ? "Supplier Delivery"
                  : "Customer Delivery"}
              </span>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {result.data.deliveryNoteNumber && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">DN Number</dt>
                    <dd className="mt-1 text-sm text-gray-900">{result.data.deliveryNoteNumber}</dd>
                  </div>
                )}
                {result.data.deliveryDate && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Date</dt>
                    <dd className="mt-1 text-sm text-gray-900">{result.data.deliveryDate}</dd>
                  </div>
                )}
                {result.data.purchaseOrderNumber && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">PO Number</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {result.data.purchaseOrderNumber}
                    </dd>
                  </div>
                )}
                {result.data.customerReference && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Reference</dt>
                    <dd className="mt-1 text-sm text-gray-900">{result.data.customerReference}</dd>
                  </div>
                )}
              </div>

              {result.data.fromCompany.name && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">From</h3>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="font-medium text-gray-900">{result.data.fromCompany.name}</p>
                    {result.data.fromCompany.address && (
                      <p className="text-sm text-gray-600 mt-1">
                        {result.data.fromCompany.address}
                      </p>
                    )}
                    {result.data.fromCompany.vatNumber && (
                      <p className="text-xs text-gray-500 mt-1">
                        VAT: {result.data.fromCompany.vatNumber}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {result.data.toCompany.name && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">To</h3>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="font-medium text-gray-900">{result.data.toCompany.name}</p>
                    {result.data.toCompany.address && (
                      <p className="text-sm text-gray-600 mt-1">{result.data.toCompany.address}</p>
                    )}
                    {result.data.toCompany.vatNumber && (
                      <p className="text-xs text-gray-500 mt-1">
                        VAT: {result.data.toCompany.vatNumber}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {result.data.lineItems.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Line Items ({result.data.lineItems.length})
                  </h3>
                  <div className="space-y-2">
                    {result.data.lineItems.map((item, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm font-medium text-gray-900">{item.description}</p>
                        <p className="text-xs text-gray-600 mt-1">{formatLineItem(item)}</p>
                        {item.quantity && (
                          <p className="text-xs text-gray-500 mt-1">
                            Qty: {item.quantity} {item.unitOfMeasure || ""}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(result.data.totals.totalWeightKg || result.data.totals.numberOfRolls) && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Totals</h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    {result.data.totals.totalQuantity && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-lg font-semibold text-gray-900">
                          {result.data.totals.totalQuantity}
                        </p>
                        <p className="text-xs text-gray-500">Total Qty</p>
                      </div>
                    )}
                    {result.data.totals.numberOfRolls && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-lg font-semibold text-gray-900">
                          {result.data.totals.numberOfRolls}
                        </p>
                        <p className="text-xs text-gray-500">Rolls</p>
                      </div>
                    )}
                    {result.data.totals.totalWeightKg && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-lg font-semibold text-gray-900">
                          {result.data.totals.totalWeightKg} kg
                        </p>
                        <p className="text-xs text-gray-500">Total Weight</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {result.data.notes && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Notes</h3>
                  <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg">
                    {result.data.notes}
                  </p>
                </div>
              )}

              <div className="border-t pt-4">
                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={isAccepting}
                  className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAccepting ? (
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
                      Creating...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5 mr-2"
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
                      Accept & Create Delivery Note
                    </>
                  )}
                </button>
              </div>

              <div className="border-t pt-4 text-xs text-gray-400">
                Processed in {result.processingTimeMs}ms
                {result.tokensUsed && ` | ${result.tokensUsed} tokens`}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
