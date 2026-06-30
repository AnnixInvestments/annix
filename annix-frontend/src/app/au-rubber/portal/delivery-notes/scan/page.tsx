"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Breadcrumb } from "@/app/au-rubber/components/Breadcrumb";
import { useExtractionProgress } from "@/app/components/ExtractionProgressModal";
import { useToast } from "@/app/components/Toast";
import { useCoreAwareHref } from "@/app/core/portal/lib/coreAwareHref";
import { toastError } from "@/app/lib/api/apiError";
import { type AnalyzedDeliveryNoteResult, auRubberApiClient } from "@/app/lib/api/auRubberApi";
import { DeliveryNoteAnalysisReview } from "../components/DeliveryNoteAnalysisReview";

type ReviewedDeliveryNoteData = AnalyzedDeliveryNoteResult["data"];

export default function ScanDeliveryNotePage() {
  const router = useRouter();
  const coreHref = useCoreAwareHref();
  const { showToast } = useToast();
  const { showExtraction, hideExtraction } = useExtractionProgress();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzedDeliveryNoteResult | null>(null);
  const [reviewedData, setReviewedData] = useState<ReviewedDeliveryNoteData | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
      setReviewedData(null);

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
      showExtraction({
        brand: "au-rubber",
        label: "Analyzing delivery note…",
        estimatedDurationMs: 30000,
      });
      const analysisResult = await auRubberApiClient.analyzeDeliveryNotePhoto(selectedFile);
      setResult(analysisResult);
      setReviewedData(analysisResult.data);
      showToast("Delivery note analyzed — review and correct before creating", "success");
    } catch (err) {
      toastError(showToast, err, "Failed to analyze delivery note");
    } finally {
      hideExtraction();
      setIsAnalyzing(false);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setReviewedData(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleAccept = async () => {
    if (!reviewedData || !selectedFile) return;

    try {
      setIsAccepting(true);
      const deliveryNote = await auRubberApiClient.acceptAnalyzedDeliveryNote(
        selectedFile,
        reviewedData,
      );
      const deliveryNoteId = Number(deliveryNote.id);
      if (!Number.isFinite(deliveryNoteId) || deliveryNoteId <= 0) {
        throw new Error("Delivery note was created but no ID was returned");
      }
      showToast("Delivery note created successfully", "success");
      router.push(coreHref(`/au-rubber/portal/delivery-notes/${deliveryNoteId}`));
    } catch (err) {
      toastError(showToast, err, "Failed to create delivery note");
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Delivery Notes", href: "/au-rubber/portal/delivery-notes" },
          { label: "Scan & Analyze" },
        ]}
      />

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
                className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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

        {result && reviewedData && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="mb-4">
              <h2 className="text-lg font-medium text-gray-900">Review &amp; Correct</h2>
              <p className="mt-1 text-sm text-gray-500">
                Check the AI-extracted values and fix anything wrong before creating the delivery
                note.
              </p>
            </div>

            <div className="space-y-6">
              <DeliveryNoteAnalysisReview data={reviewedData} onChange={setReviewedData} />

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
                      Accept &amp; Create Delivery Note
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
