"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { NixClarificationDto, PdfPageImage } from "../api";
import { nixApi } from "../api";

interface PendingDocument {
  file: File;
  id: string;
}

interface NixClarificationPopupProps {
  clarification: NixClarificationDto | null;
  allClarifications: NixClarificationDto[];
  totalClarifications: number;
  currentIndex: number;
  pendingDocuments: PendingDocument[];
  onSubmit: (clarificationId: number, response: string) => void;
  onSubmitBatch: (responses: Array<{ clarificationId: number; response: string }>) => void;
  onSkip: (clarificationId: number) => void;
  onClose: () => void;
}

const SIMILAR_FIELD_GROUPS: Record<string, string[]> = {
  material: ["material", "extractedMaterial", "materialGrade", "parsedMaterialGrade"],
  schedule: ["schedule", "wallThickness", "parsedWallThickness", "parsedSchedule"],
  coating: ["coating", "externalCoating", "parsedExternalCoating"],
  lining: ["lining", "internalLining", "parsedLining"],
  standard: ["standard", "parsedStandard"],
  flangeConfig: ["flangeConfig", "extractedFlangeConfig"],
};

const extractFieldType = (clarification: NixClarificationDto): string | null => {
  const questionLower = clarification.question.toLowerCase();
  const ctx = clarification.context;
  const missingFields = ctx.missingFields ?? [];

  if (
    questionLower.includes("material") ||
    questionLower.includes("steel") ||
    questionLower.includes("alloy") ||
    missingFields.some((f) => SIMILAR_FIELD_GROUPS.material.includes(f))
  ) {
    return "material";
  }

  if (
    questionLower.includes("schedule") ||
    questionLower.includes("wall thickness") ||
    missingFields.some((f) => SIMILAR_FIELD_GROUPS.schedule.includes(f))
  ) {
    return "schedule";
  }

  if (
    questionLower.includes("coating") ||
    missingFields.some((f) => SIMILAR_FIELD_GROUPS.coating.includes(f))
  ) {
    return "coating";
  }

  if (
    questionLower.includes("lining") ||
    missingFields.some((f) => SIMILAR_FIELD_GROUPS.lining.includes(f))
  ) {
    return "lining";
  }

  if (
    questionLower.includes("standard") ||
    questionLower.includes("specification") ||
    missingFields.some((f) => SIMILAR_FIELD_GROUPS.standard.includes(f))
  ) {
    return "standard";
  }

  if (
    questionLower.includes("flange") ||
    missingFields.some((f) => SIMILAR_FIELD_GROUPS.flangeConfig.includes(f))
  ) {
    return "flangeConfig";
  }

  return null;
};

const findSimilarClarifications = (
  currentClarification: NixClarificationDto,
  allClarifications: NixClarificationDto[],
  currentIndex: number,
): NixClarificationDto[] => {
  const fieldType = extractFieldType(currentClarification);
  if (!fieldType) return [];

  return allClarifications.filter((c, idx) => {
    if (idx <= currentIndex) return false;
    const otherFieldType = extractFieldType(c);
    return otherFieldType === fieldType;
  });
};

export default function NixClarificationPopup({
  clarification,
  allClarifications,
  totalClarifications,
  currentIndex,
  pendingDocuments,
  onSubmit,
  onSubmitBatch,
  onSkip,
  onClose,
}: NixClarificationPopupProps) {
  const [response, setResponse] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applyToSimilar, setApplyToSimilar] = useState(true);
  const [pages, setPages] = useState<PdfPageImage[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [baseScale, setBaseScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const similarClarifications = clarification
    ? findSimilarClarifications(clarification, allClarifications, currentIndex)
    : [];

  const hasSimilarQuestions = similarClarifications.length > 0;

  const loadDocument = useCallback(async () => {
    if (pendingDocuments.length === 0) return;

    setIsLoadingDocument(true);
    setDocumentError(null);

    try {
      const doc = pendingDocuments[0];
      const result = await nixApi.documentPages(doc.file, 1.5);
      setPages(result.pages);
      setCurrentPage(1);
    } catch (err) {
      setDocumentError(err instanceof Error ? err.message : "Failed to load document");
    } finally {
      setIsLoadingDocument(false);
    }
  }, [pendingDocuments]);

  useEffect(() => {
    if (pendingDocuments.length > 0 && pages.length === 0) {
      loadDocument();
    }
  }, [pendingDocuments, pages.length, loadDocument]);

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current || pages.length === 0) return;

      const containerWidth = containerRef.current.clientWidth - 32;
      const containerHeight = containerRef.current.clientHeight - 80;
      const page = pages[currentPage - 1];

      if (page) {
        const scaleX = containerWidth / page.width;
        const scaleY = containerHeight / page.height;
        setBaseScale(Math.min(scaleX, scaleY, 1));
      }
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [pages, currentPage]);

  if (!clarification) return null;

  const handleSubmit = async () => {
    if (!response.trim()) return;
    setIsSubmitting(true);

    if (applyToSimilar && similarClarifications.length > 0) {
      const batchResponses = [
        { clarificationId: clarification.id, response: response.trim() },
        ...similarClarifications.map((c) => ({
          clarificationId: c.id,
          response: response.trim(),
        })),
      ];
      await onSubmitBatch(batchResponses);
    } else {
      await onSubmit(clarification.id, response.trim());
    }

    setResponse("");
    setIsSubmitting(false);
  };

  const handleSkip = async () => {
    setIsSubmitting(true);
    await onSkip(clarification.id);
    setResponse("");
    setIsSubmitting(false);
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    const confirmResponse = "Confirmed - correct as extracted";

    if (applyToSimilar && similarClarifications.length > 0) {
      const batchResponses = [
        { clarificationId: clarification.id, response: confirmResponse },
        ...similarClarifications.map((c) => ({
          clarificationId: c.id,
          response: confirmResponse,
        })),
      ];
      await onSubmitBatch(batchResponses);
    } else {
      await onSubmit(clarification.id, confirmResponse);
    }

    setResponse("");
    setIsSubmitting(false);
  };

  const ctx = clarification.context;
  const isSpecHeader = ctx.isSpecificationHeader;
  const scale = baseScale * zoomLevel;
  const currentPageData = pages[currentPage - 1];
  const hasDocument = pendingDocuments.length > 0;

  const ZOOM_MIN = 0.5;
  const ZOOM_MAX = 3;
  const ZOOM_STEP = 0.25;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        className={`relative bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex ${
          hasDocument ? "w-full max-w-7xl h-[90vh]" : "max-w-2xl w-full max-h-[90vh]"
        }`}
      >
        {hasDocument && (
          <div
            ref={containerRef}
            className="w-1/2 bg-gray-100 border-r border-gray-200 flex flex-col"
          >
            <div className="px-4 py-2 border-b border-gray-200 bg-white flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Source Document</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(z - ZOOM_STEP, ZOOM_MIN))}
                  disabled={zoomLevel <= ZOOM_MIN}
                  className="p-1 hover:bg-gray-100 rounded disabled:opacity-40"
                  title="Zoom out"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
                    />
                  </svg>
                </button>
                <span className="text-xs text-gray-500 min-w-[40px] text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(z + ZOOM_STEP, ZOOM_MAX))}
                  disabled={zoomLevel >= ZOOM_MAX}
                  className="p-1 hover:bg-gray-100 rounded disabled:opacity-40"
                  title="Zoom in"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {isLoadingDocument ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Loading document...</p>
                  </div>
                </div>
              ) : documentError ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-red-600">
                    <p className="text-sm">{documentError}</p>
                    <button
                      onClick={loadDocument}
                      className="mt-2 text-xs text-orange-600 hover:underline"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              ) : currentPageData ? (
                <div className="flex flex-col items-center">
                  <div className="shadow-lg rounded overflow-hidden bg-white">
                    <img
                      src={`data:image/png;base64,${currentPageData.imageData}`}
                      alt={`Page ${currentPage}`}
                      style={{
                        width: currentPageData.width * scale,
                        height: currentPageData.height * scale,
                      }}
                      draggable={false}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            {pages.length > 1 && (
              <div className="px-4 py-2 border-t border-gray-200 bg-white flex items-center justify-center gap-4">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-xs text-gray-600">
                  Page {currentPage} of {pages.length}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(pages.length, p + 1))}
                  disabled={currentPage === pages.length}
                  className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        <div className={`flex flex-col ${hasDocument ? "w-1/2" : "w-full"}`}>
          <div
            className="px-4 py-2 flex items-center justify-between flex-shrink-0"
            style={{ backgroundColor: "#323288" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-orange-400 flex-shrink-0">
                <Image
                  src="/nix-avatar.png"
                  alt="Nix"
                  width={40}
                  height={40}
                  className="object-cover object-top scale-125"
                />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">
                  {isSpecHeader ? "Nix found a specification header" : "Nix needs your help"}
                </h3>
                <p className="text-white/70 text-xs">
                  Question {currentIndex + 1} of {totalClarifications}
                  {hasSimilarQuestions && applyToSimilar && (
                    <span className="ml-2 text-orange-300">
                      (+{similarClarifications.length} similar)
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="px-4 py-3 overflow-y-auto flex-1 min-h-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {isSpecHeader && ctx.cellRef && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                  Specification {ctx.cellRef}
                </span>
              )}
              {!isSpecHeader && ctx.rowNumber && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                  Row {ctx.rowNumber}
                </span>
              )}
              {ctx.itemNumber && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                  {ctx.itemNumber}
                </span>
              )}
              {ctx.itemType && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs capitalize">
                  {ctx.itemType}
                </span>
              )}
            </div>

            {ctx.itemDescription && !isSpecHeader && (
              <div className="mb-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-800 text-xs font-mono line-clamp-2">
                  {ctx.itemDescription}
                </p>
              </div>
            )}

            <p className="text-gray-800 text-sm mb-3 whitespace-pre-line">
              {clarification.question}
            </p>

            {!isSpecHeader && (ctx.extractedMaterial || ctx.extractedDiameter) && (
              <div className="mb-3 p-2 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {ctx.extractedMaterial && (
                    <span>
                      <span className="text-gray-500">Material:</span>{" "}
                      <span className="font-medium">{ctx.extractedMaterial}</span>
                    </span>
                  )}
                  {ctx.extractedDiameter && (
                    <span>
                      <span className="text-gray-500">Dia:</span>{" "}
                      <span className="font-medium">{ctx.extractedDiameter}mm</span>
                    </span>
                  )}
                  {ctx.extractedLength && (
                    <span>
                      <span className="text-gray-500">Len:</span>{" "}
                      <span className="font-medium">{ctx.extractedLength}mm</span>
                    </span>
                  )}
                  {ctx.extractedAngle && (
                    <span>
                      <span className="text-gray-500">Angle:</span>{" "}
                      <span className="font-medium">{ctx.extractedAngle}°</span>
                    </span>
                  )}
                  {ctx.extractedQuantity && (
                    <span>
                      <span className="text-gray-500">Qty:</span>{" "}
                      <span className="font-medium">{ctx.extractedQuantity}</span>
                    </span>
                  )}
                </div>
              </div>
            )}

            {hasSimilarQuestions && (
              <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyToSimilar}
                    onChange={(e) => setApplyToSimilar(e.target.checked)}
                    className="mt-0.5 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs text-blue-800">
                    <strong>Apply to {similarClarifications.length} similar question(s)</strong>
                    <br />
                    <span className="text-blue-600">
                      Other items are asking the same type of question. Your answer will be applied
                      to all of them.
                    </span>
                  </span>
                </label>
              </div>
            )}

            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder={
                isSpecHeader
                  ? "Provide the missing specification details..."
                  : "Type your answer..."
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none text-sm"
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          <div className="px-4 py-3 border-t border-gray-200 flex-shrink-0 bg-white">
            <div className="flex gap-2">
              <button
                onClick={handleSkip}
                disabled={isSubmitting}
                className="flex-1 py-2 px-3 rounded-lg font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50 text-sm"
              >
                Skip
              </button>
              <button
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="flex-1 py-2 px-3 rounded-lg font-medium text-white transition-colors disabled:opacity-50 hover:opacity-90 text-sm bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? "Confirming..." : "Yes, Correct"}
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !response.trim()}
                className="flex-1 py-2 px-3 rounded-lg font-medium text-white transition-colors disabled:opacity-50 hover:opacity-90 text-sm"
                style={{ backgroundColor: "#FFA500" }}
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>

          <div className="h-1 flex-shrink-0" style={{ backgroundColor: "#FFA500" }} />
        </div>
      </div>
    </div>
  );
}
