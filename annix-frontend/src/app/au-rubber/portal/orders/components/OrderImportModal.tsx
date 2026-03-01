"use client";

import { Loader2, Upload, X } from "lucide-react";
import { useState } from "react";
import {
  type AnalyzedOrderData,
  type AnalyzeOrderFilesResult,
  auRubberApiClient,
} from "@/app/lib/api/auRubberApi";
import type { RubberCompanyDto, RubberProductDto } from "@/app/lib/api/rubberPortalApi";
import { FileDropZone } from "../../../components/FileDropZone";
import { OrderAnalysisReview } from "./OrderAnalysisReview";

type ImportStep = "upload" | "review";

interface OrderImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (orderId: number, orderNumber: string) => void;
  companies: RubberCompanyDto[];
  products: RubberProductDto[];
}

export function OrderImportModal({
  isOpen,
  onClose,
  onOrderCreated,
  companies,
  products,
}: OrderImportModalProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeOrderFilesResult | null>(null);
  const [editedAnalyses, setEditedAnalyses] = useState<AnalyzedOrderData[]>([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFilesSelected = (files: File[]) => {
    setSelectedFiles(files);
    setError(null);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    if (selectedFiles.length === 0) {
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await auRubberApiClient.analyzeOrderFiles(selectedFiles);
      setAnalysisResult(result);
      setEditedAnalyses(result.files);
      setSelectedFileIndex(0);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze files");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdateAnalysis = (index: number, updated: AnalyzedOrderData) => {
    setEditedAnalyses((prev) => {
      const newList = [...prev];
      newList[index] = updated;
      return newList;
    });
  };

  const handleCreateOrder = async () => {
    const analysis = editedAnalyses[selectedFileIndex];
    if (!analysis) {
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const result = await auRubberApiClient.createOrderFromAnalysis({
        analysis,
        overrides: {
          companyId: analysis.companyId || undefined,
          poNumber: analysis.poNumber || undefined,
          lines: analysis.lines.map((line) => ({
            productId: line.productId || undefined,
            thickness: line.thickness || undefined,
            width: line.width || undefined,
            length: line.length || undefined,
            quantity: line.quantity || undefined,
          })),
        },
      });

      onOrderCreated(result.orderId, result.orderNumber);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setStep("upload");
    setSelectedFiles([]);
    setAnalysisResult(null);
    setEditedAnalyses([]);
    setSelectedFileIndex(0);
    setError(null);
    onClose();
  };

  const handleBack = () => {
    setStep("upload");
    setAnalysisResult(null);
    setEditedAnalyses([]);
    setSelectedFileIndex(0);
  };

  if (!isOpen) {
    return null;
  }

  const currentAnalysis = editedAnalyses[selectedFileIndex];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={handleClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-medium text-gray-900">
              {step === "upload" ? "Import Order" : "Review Extracted Data"}
            </h3>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-500">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {step === "upload" && (
              <div className="space-y-4">
                <FileDropZone
                  onFilesSelected={handleFilesSelected}
                  accept=".pdf,application/pdf,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,.eml,message/rfc822"
                  multiple={true}
                  disabled={isAnalyzing}
                  className="border-2 border-dashed rounded-lg"
                >
                  <div className="flex flex-col items-center justify-center py-8 px-4">
                    <Upload className="w-12 h-12 mb-3 text-gray-400" />
                    <p className="text-sm font-medium text-gray-700">
                      Drag & drop order files here
                    </p>
                    <p className="text-xs text-gray-500 mt-1">or click to browse</p>
                    <p className="text-xs text-gray-400 mt-2">
                      PDF, Excel (.xlsx, .xls), or Email (.eml) files
                    </p>
                  </div>
                </FileDropZone>

                {selectedFiles.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Selected Files ({selectedFiles.length})
                    </h4>
                    <ul className="divide-y divide-gray-200 border rounded-md">
                      {selectedFiles.map((file, index) => (
                        <li key={index} className="flex items-center justify-between px-3 py-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-900">{file.name}</span>
                            <span className="text-xs text-gray-500">
                              ({(file.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveFile(index)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {step === "review" && currentAnalysis && (
              <div className="space-y-4">
                {editedAnalyses.length > 1 && (
                  <div className="flex space-x-2 overflow-x-auto pb-2">
                    {editedAnalyses.map((analysis, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedFileIndex(index)}
                        className={`px-3 py-1 text-sm rounded-md whitespace-nowrap ${
                          index === selectedFileIndex
                            ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {analysis.filename}
                        {analysis.lines.length > 0 && (
                          <span className="ml-1 text-xs">({analysis.lines.length})</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                <OrderAnalysisReview
                  analysis={currentAnalysis}
                  companies={companies}
                  products={products}
                  onUpdate={(updated) => handleUpdateAnalysis(selectedFileIndex, updated)}
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-4 border-t bg-gray-50">
            <div>
              {step === "review" && (
                <button
                  onClick={handleBack}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Back
                </button>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              {step === "upload" && (
                <button
                  onClick={handleAnalyze}
                  disabled={selectedFiles.length === 0 || isAnalyzing}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    "Analyze Files"
                  )}
                </button>
              )}
              {step === "review" && (
                <button
                  onClick={handleCreateOrder}
                  disabled={isCreating || !currentAnalysis || currentAnalysis.lines.length === 0}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Order"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
