"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { FileImportModal } from "@/app/components/modals/FileImportModal";
import {
  type AnalyzedOrderData,
  type AnalyzeOrderFilesResult,
  auRubberApiClient,
  type NewCompanyFromAnalysis,
} from "@/app/lib/api/auRubberApi";
import type { RubberCompanyDto, RubberProductDto } from "@/app/lib/api/rubberPortalApi";
import { useFileUpload } from "@/app/lib/hooks/useFileUpload";
import { type NewCompanyDetails, OrderAnalysisReview } from "./OrderAnalysisReview";
import { PoTrainingModal } from "./PoTrainingModal";

type ImportStep = "upload" | "review" | "train";

const ORDER_ACCEPTED_TYPES =
  ".pdf,application/pdf,.png,.jpg,.jpeg,.gif,.bmp,.webp,.heic,.tiff,image/*,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,.eml,message/rfc822";

interface OrderImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (orderId: number, orderNumber: string) => void;
  companies: RubberCompanyDto[];
  products: RubberProductDto[];
  initialAnalysis?: AnalyzeOrderFilesResult | null;
  initialFiles?: File[];
}

export function OrderImportModal(props: OrderImportModalProps) {
  const { isOpen, onClose, onOrderCreated, companies, products, initialAnalysis, initialFiles } =
    props;
  const [step, setStep] = useState<ImportStep>("upload");
  const [analysisResult, setAnalysisResult] = useState<AnalyzeOrderFilesResult | null>(null);
  const [editedAnalyses, setEditedAnalyses] = useState<AnalyzedOrderData[]>([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [trainingFile, setTrainingFile] = useState<File | null>(null);
  const [newCompanyDetails, setNewCompanyDetails] = useState<NewCompanyDetails | null>(null);

  const fileUpload = useFileUpload({ accept: ORDER_ACCEPTED_TYPES, multiple: true });

  useEffect(() => {
    if (isOpen && initialAnalysis) {
      setStep("review");
      setAnalysisResult(initialAnalysis);
      setEditedAnalyses(initialAnalysis.files);
      setSelectedFileIndex(0);
      if (initialFiles && initialFiles.length > 0) {
        fileUpload.addFiles(initialFiles);
      }
    }
  }, [isOpen, initialAnalysis, initialFiles]);

  const handleAnalyze = async () => {
    if (fileUpload.files.length === 0) {
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await auRubberApiClient.analyzeOrderFiles(fileUpload.files);
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
      const newCompany: NewCompanyFromAnalysis | undefined =
        !analysis.companyId && newCompanyDetails?.name
          ? {
              name: newCompanyDetails.name,
              vatNumber: newCompanyDetails.vatNumber,
              address: newCompanyDetails.address,
              registrationNumber: newCompanyDetails.registrationNumber,
            }
          : undefined;

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
            unitPrice: line.unitPrice,
          })),
          newCompany,
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
    fileUpload.clearFiles();
    setAnalysisResult(null);
    setEditedAnalyses([]);
    setSelectedFileIndex(0);
    setError(null);
    setShowTrainingModal(false);
    setTrainingFile(null);
    setNewCompanyDetails(null);
    onClose();
  };

  const handleBack = () => {
    setStep("upload");
    setAnalysisResult(null);
    setEditedAnalyses([]);
    setSelectedFileIndex(0);
  };

  const handleTrainNix = () => {
    const file = fileUpload.files[selectedFileIndex];
    if (file) {
      setTrainingFile(file);
      setShowTrainingModal(true);
    }
  };

  const handleTrainingComplete = async (templateId: number) => {
    setShowTrainingModal(false);
    setTrainingFile(null);

    if (fileUpload.files.length > 0) {
      setIsAnalyzing(true);
      try {
        const result = await auRubberApiClient.analyzeOrderFiles(fileUpload.files);
        setAnalysisResult(result);
        setEditedAnalyses(result.files);
        setSelectedFileIndex(0);
        setStep("review");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to re-analyze files");
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const shouldShowTrainButton = (analysis: AnalyzedOrderData): boolean => {
    if (analysis.fileType !== "pdf") return false;
    if (analysis.isNewCustomer) return true;
    if (analysis.isNewFormat) return true;
    if (analysis.extractionMethod === "ai" && analysis.confidence < 0.8) return true;
    return false;
  };

  const currentAnalysis = editedAnalyses[selectedFileIndex];
  const combinedError = error || fileUpload.error;

  const footerLeft = (
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
  );

  const footerRight = (
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
          disabled={fileUpload.files.length === 0 || isAnalyzing}
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
          disabled={
            isCreating ||
            !currentAnalysis ||
            currentAnalysis.lines.length === 0 ||
            (!currentAnalysis.companyId && !newCompanyDetails?.name)
          }
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
  );

  return (
    <>
      <FileImportModal
        isOpen={isOpen}
        onClose={handleClose}
        title={step === "upload" ? "Import Order" : "Review Extracted Data"}
        accept={ORDER_ACCEPTED_TYPES}
        multiple={true}
        error={combinedError}
        hideDropzone={step !== "upload"}
        files={fileUpload.files}
        onFilesSelected={fileUpload.addFiles}
        onRemoveFile={fileUpload.removeFile}
        isDragging={fileUpload.isDragging}
        dragProps={fileUpload.dragProps}
        dropzoneLabel="Drag & drop order files here"
        dropzoneSubLabel="or click to browse"
        dropzoneHint="PDF, Excel (.xlsx, .xls), or Email (.eml) files"
        footerLeft={footerLeft}
        footerRight={footerRight}
      >
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

            {shouldShowTrainButton(currentAnalysis) && (
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Sparkles className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-amber-900">Train Nix for Better Extraction</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      {currentAnalysis.isNewCustomer
                        ? "This appears to be from a new customer. Train Nix to recognize their PO format."
                        : currentAnalysis.isNewFormat
                          ? "This is a new document format from this customer. Train Nix on this layout."
                          : "Extraction confidence is low. Training Nix can improve future results."}
                    </p>
                    <button
                      onClick={handleTrainNix}
                      disabled={!currentAnalysis.companyId}
                      className="mt-3 inline-flex items-center px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-100 border border-amber-300 rounded-md hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Sparkles className="w-4 h-4 mr-1.5" />
                      Train Nix
                    </button>
                    {!currentAnalysis.companyId && (
                      <p className="text-xs text-amber-600 mt-2">
                        Select a company above before training
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <OrderAnalysisReview
              analysis={currentAnalysis}
              companies={companies}
              products={products}
              onUpdate={(updated) => handleUpdateAnalysis(selectedFileIndex, updated)}
              onNewCompanyChange={setNewCompanyDetails}
            />
          </div>
        )}
      </FileImportModal>

      {showTrainingModal &&
        trainingFile &&
        currentAnalysis?.companyId &&
        currentAnalysis?.formatHash && (
          <PoTrainingModal
            isOpen={showTrainingModal}
            file={trainingFile}
            companyId={currentAnalysis.companyId}
            formatHash={currentAnalysis.formatHash}
            onClose={() => {
              setShowTrainingModal(false);
              setTrainingFile(null);
            }}
            onTrainingComplete={handleTrainingComplete}
          />
        )}
    </>
  );
}
