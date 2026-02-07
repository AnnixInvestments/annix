"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  adminApiClient,
  FieldComparisonResult,
  PdfPageImage,
  RegionCoordinates,
} from "@/app/lib/api/adminApi";

interface NixTrainingModalProps {
  isOpen: boolean;
  documentId: number;
  entityId: number;
  entityType: "customer" | "supplier";
  documentType: string;
  fieldComparison: FieldComparisonResult[];
  onClose: () => void;
  onTrainingComplete: () => void;
}

function normalizeDocumentType(docType: string): string {
  const normalized = docType.toLowerCase().replace("_cert", "");
  return normalized;
}

interface DrawingState {
  isDrawing: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface TrainedRegion {
  fieldName: string;
  labelCoordinates: RegionCoordinates | null;
  valueCoordinates: RegionCoordinates;
  labelText: string | null;
  extractedText: string;
  confidence: number;
  saved: boolean;
  expectedValue: string | number | null;
}

type DrawingPhase = "label" | "value" | null;

function normalizeForComparison(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/\s/g, "");
}

function valuesMatch(
  extracted: string | null,
  expected: string | number | null | undefined,
): boolean {
  if (!extracted || expected === null || expected === undefined) return false;
  const expectedStr = typeof expected === "number" ? String(expected) : expected;
  return normalizeForComparison(extracted) === normalizeForComparison(expectedStr);
}

const fieldLabels: Record<string, string> = {
  companyName: "Company Name",
  registrationNumber: "Registration No.",
  vatNumber: "VAT Number",
  streetAddress: "Street Address",
  city: "City",
  provinceState: "Province",
  postalCode: "Postal Code",
  beeLevel: "BEE Level",
};

const fieldsPerDocumentType: Record<string, string[]> = {
  vat: ["vatNumber", "companyName"],
  vat_cert: ["vatNumber", "companyName"],
  registration: [
    "companyName",
    "registrationNumber",
    "streetAddress",
    "city",
    "provinceState",
    "postalCode",
  ],
  registration_cert: [
    "companyName",
    "registrationNumber",
    "streetAddress",
    "city",
    "provinceState",
    "postalCode",
  ],
  bee: ["beeLevel", "companyName"],
  bee_cert: ["beeLevel", "companyName"],
};

export function NixTrainingModal({
  isOpen,
  documentId,
  entityId,
  entityType,
  documentType,
  fieldComparison,
  onClose,
  onTrainingComplete,
}: NixTrainingModalProps) {
  const [pages, setPages] = useState<PdfPageImage[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [drawingPhase, setDrawingPhase] = useState<DrawingPhase>(null);
  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });
  const [labelRegion, setLabelRegion] = useState<RegionCoordinates | null>(null);
  const [valueRegion, setValueRegion] = useState<RegionCoordinates | null>(null);
  const [labelText, setLabelText] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [extractionConfidence, setExtractionConfidence] = useState<number>(0);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [trainedRegions, setTrainedRegions] = useState<TrainedRegion[]>([]);
  const [customFields, setCustomFields] = useState<string[]>([]);
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const relevantFieldNames =
    fieldsPerDocumentType[documentType] || fieldsPerDocumentType["registration"] || [];
  const allFieldNames = [...relevantFieldNames, ...customFields];

  const fieldsToTrain: FieldComparisonResult[] =
    allFieldNames.length > 0
      ? allFieldNames.map((fieldName) => {
          const existingComparison = fieldComparison.find((f) => f.field === fieldName);
          return (
            existingComparison || {
              field: fieldName,
              expected: null,
              extracted: null,
              matches: false,
              similarity: 0,
            }
          );
        })
      : Object.keys(fieldLabels).map((fieldName) => ({
          field: fieldName,
          expected: null,
          extracted: null,
          matches: false,
          similarity: 0,
        }));

  const loadDocumentPages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminApiClient.documentPagesForTraining(entityType, documentId);
      if (response.pages.length === 0) {
        setError(
          "Unable to convert this PDF for training. The document may have unsupported graphics or formatting.",
        );
      } else {
        setPages(response.pages);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load document";
      setError(
        `Unable to load document for training: ${message}. Try using the document preview instead.`,
      );
    } finally {
      setLoading(false);
    }
  }, [entityType, documentId]);

  const loadCustomFieldDefinitions = useCallback(async () => {
    try {
      const normalizedDocType = normalizeDocumentType(documentType);
      const response = await adminApiClient.customFieldDefinitions(normalizedDocType);
      const existingCustomFields = response.definitions
        .filter((d) => !relevantFieldNames.includes(d.fieldName))
        .map((d) => d.fieldName);
      if (existingCustomFields.length > 0) {
        setCustomFields(existingCustomFields);
      }
    } catch {
      // Ignore errors loading custom field definitions
    }
  }, [documentType, relevantFieldNames]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || pages.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const currentPageData = pages[currentPage - 1];
    if (!currentPageData) return;

    canvas.width = currentPageData.width * scale;
    canvas.height = currentPageData.height * scale;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    trainedRegions
      .filter((r) => r.valueCoordinates.pageNumber === currentPage)
      .forEach((region) => {
        if (region.labelCoordinates && region.labelCoordinates.pageNumber === currentPage) {
          ctx.strokeStyle = region.saved ? "#8b5cf6" : "#a78bfa";
          ctx.lineWidth = 2;
          ctx.setLineDash([]);
          ctx.strokeRect(
            region.labelCoordinates.x * scale,
            region.labelCoordinates.y * scale,
            region.labelCoordinates.width * scale,
            region.labelCoordinates.height * scale,
          );
          ctx.fillStyle = "rgba(139, 92, 246, 0.1)";
          ctx.fillRect(
            region.labelCoordinates.x * scale,
            region.labelCoordinates.y * scale,
            region.labelCoordinates.width * scale,
            region.labelCoordinates.height * scale,
          );
        }

        ctx.strokeStyle = region.saved ? "#22c55e" : "#f59e0b";
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.strokeRect(
          region.valueCoordinates.x * scale,
          region.valueCoordinates.y * scale,
          region.valueCoordinates.width * scale,
          region.valueCoordinates.height * scale,
        );

        ctx.fillStyle = region.saved ? "rgba(34, 197, 94, 0.1)" : "rgba(245, 158, 11, 0.1)";
        ctx.fillRect(
          region.valueCoordinates.x * scale,
          region.valueCoordinates.y * scale,
          region.valueCoordinates.width * scale,
          region.valueCoordinates.height * scale,
        );

        ctx.fillStyle = region.saved ? "#22c55e" : "#f59e0b";
        ctx.font = "12px sans-serif";
        ctx.fillText(
          fieldLabels[region.fieldName] || region.fieldName,
          region.valueCoordinates.x * scale + 4,
          region.valueCoordinates.y * scale - 4,
        );
      });

    if (labelRegion && labelRegion.pageNumber === currentPage) {
      ctx.strokeStyle = "#8b5cf6";
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.strokeRect(
        labelRegion.x * scale,
        labelRegion.y * scale,
        labelRegion.width * scale,
        labelRegion.height * scale,
      );
      ctx.fillStyle = "rgba(139, 92, 246, 0.15)";
      ctx.fillRect(
        labelRegion.x * scale,
        labelRegion.y * scale,
        labelRegion.width * scale,
        labelRegion.height * scale,
      );
      ctx.fillStyle = "#8b5cf6";
      ctx.font = "11px sans-serif";
      ctx.fillText("LABEL", labelRegion.x * scale + 4, labelRegion.y * scale - 4);
    }

    if (valueRegion && valueRegion.pageNumber === currentPage) {
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.strokeRect(
        valueRegion.x * scale,
        valueRegion.y * scale,
        valueRegion.width * scale,
        valueRegion.height * scale,
      );
      ctx.fillStyle = "rgba(34, 197, 94, 0.15)";
      ctx.fillRect(
        valueRegion.x * scale,
        valueRegion.y * scale,
        valueRegion.width * scale,
        valueRegion.height * scale,
      );
      ctx.fillStyle = "#22c55e";
      ctx.font = "11px sans-serif";
      ctx.fillText("VALUE", valueRegion.x * scale + 4, valueRegion.y * scale - 4);
    }

    if (drawingState.isDrawing) {
      const x = Math.min(drawingState.startX, drawingState.currentX);
      const y = Math.min(drawingState.startY, drawingState.currentY);
      const width = Math.abs(drawingState.currentX - drawingState.startX);
      const height = Math.abs(drawingState.currentY - drawingState.startY);

      const isLabelPhase = drawingPhase === "label";
      ctx.strokeStyle = isLabelPhase ? "#8b5cf6" : "#22c55e";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x, y, width, height);

      ctx.fillStyle = isLabelPhase ? "rgba(139, 92, 246, 0.2)" : "rgba(34, 197, 94, 0.2)";
      ctx.fillRect(x, y, width, height);
    }
  }, [
    currentPage,
    scale,
    labelRegion,
    valueRegion,
    drawingPhase,
    drawingState,
    pages,
    trainedRegions,
  ]);

  useEffect(() => {
    if (isOpen && documentId) {
      loadDocumentPages();
      loadCustomFieldDefinitions();
    }
  }, [isOpen, documentId, loadDocumentPages, loadCustomFieldDefinitions]);

  useEffect(() => {
    if (!isOpen) {
      setPages([]);
      setCurrentPage(1);
      setScale(1.0);
      setSelectedField(null);
      setDrawingPhase(null);
      setLabelRegion(null);
      setValueRegion(null);
      setLabelText(null);
      setExtractedText(null);
      setTrainedRegions([]);
      setCustomFields([]);
      setShowAddField(false);
      setNewFieldName("");
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const canvasToImageCoords = (
    clientX: number,
    clientY: number,
    canvas: HTMLCanvasElement,
  ): { x: number; y: number } => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedField || !drawingPhase) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const { x, y } = canvasToImageCoords(e.clientX, e.clientY, canvas);

    setDrawingState({
      isDrawing: true,
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingState.isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const { x, y } = canvasToImageCoords(e.clientX, e.clientY, canvas);

    setDrawingState((prev) => ({
      ...prev,
      currentX: x,
      currentY: y,
    }));
  };

  const handleMouseUp = () => {
    if (!drawingState.isDrawing || !drawingPhase) return;

    const x = Math.min(drawingState.startX, drawingState.currentX) / scale;
    const y = Math.min(drawingState.startY, drawingState.currentY) / scale;
    const width = Math.abs(drawingState.currentX - drawingState.startX) / scale;
    const height = Math.abs(drawingState.currentY - drawingState.startY) / scale;

    if (width > 10 && height > 10) {
      const region: RegionCoordinates = {
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
        pageNumber: currentPage,
      };

      if (drawingPhase === "label") {
        setLabelRegion(region);
        setDrawingPhase("value");
      } else {
        setValueRegion(region);
        setDrawingPhase(null);
      }
    }

    setDrawingState({
      isDrawing: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    });
  };

  const handleExtractLabel = async () => {
    if (!labelRegion || !selectedField) return;

    setExtracting(true);
    try {
      const result = await adminApiClient.extractFromRegion(
        entityType,
        documentId,
        labelRegion,
        `${selectedField}_label`,
      );
      setLabelText(result.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Label extraction failed");
    } finally {
      setExtracting(false);
    }
  };

  const handleExtractValue = async () => {
    if (!valueRegion || !selectedField) return;

    setExtracting(true);
    try {
      const result = await adminApiClient.extractFromRegion(
        entityType,
        documentId,
        valueRegion,
        selectedField,
      );
      setExtractedText(result.text);
      setExtractionConfidence(result.confidence);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Value extraction failed");
    } finally {
      setExtracting(false);
    }
  };

  const handleExtractBoth = async () => {
    if (!valueRegion || !selectedField) return;

    setExtracting(true);
    try {
      if (labelRegion) {
        const labelResult = await adminApiClient.extractFromRegion(
          entityType,
          documentId,
          labelRegion,
          `${selectedField}_label`,
        );
        setLabelText(labelResult.text);
      }

      const valueResult = await adminApiClient.extractFromRegion(
        entityType,
        documentId,
        valueRegion,
        selectedField,
      );
      setExtractedText(valueResult.text);
      setExtractionConfidence(valueResult.confidence);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setExtracting(false);
    }
  };

  const handleAccept = async () => {
    if (!valueRegion || !selectedField || extractedText === null) return;

    const isCustom = customFields.includes(selectedField);
    const normalizedDocType = normalizeDocumentType(documentType);

    setSaving(true);
    try {
      await adminApiClient.saveExtractionRegion({
        documentCategory: normalizedDocType,
        fieldName: selectedField,
        regionCoordinates: valueRegion,
        labelCoordinates: labelRegion ?? undefined,
        labelText: labelText ?? undefined,
        sampleValue: extractedText,
        isCustomField: isCustom,
      });

      if (isCustom) {
        await adminApiClient.saveCustomFieldValue({
          entityType,
          entityId,
          fieldName: selectedField,
          fieldValue: extractedText,
          documentCategory: normalizedDocType,
          extractedFromDocumentId: documentId,
          confidence: extractionConfidence,
        });
      }

      const fieldData = fieldComparison.find((f) => f.field === selectedField);
      setTrainedRegions((prev) => [
        ...prev.filter((r) => r.fieldName !== selectedField),
        {
          fieldName: selectedField,
          labelCoordinates: labelRegion,
          valueCoordinates: valueRegion,
          labelText,
          extractedText,
          confidence: extractionConfidence,
          saved: true,
          expectedValue: fieldData?.expected ?? null,
        },
      ]);

      const nextField = fieldsToTrain.find(
        (f) =>
          f.field !== selectedField &&
          !trainedRegions.some((r) => r.fieldName === f.field && r.saved),
      );

      if (nextField) {
        setSelectedField(nextField.field);
        setDrawingPhase("label");
      } else {
        setSelectedField(null);
        setDrawingPhase(null);
      }

      setLabelRegion(null);
      setValueRegion(null);
      setLabelText(null);
      setExtractedText(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save region");
    } finally {
      setSaving(false);
    }
  };

  const handleRetry = () => {
    setLabelRegion(null);
    setValueRegion(null);
    setLabelText(null);
    setExtractedText(null);
    setDrawingPhase("label");
  };

  const handleSkipLabel = () => {
    setDrawingPhase("value");
  };

  const handleSkip = () => {
    const nextField = fieldsToTrain.find(
      (f) =>
        f.field !== selectedField &&
        !trainedRegions.some((r) => r.fieldName === f.field && r.saved),
    );

    if (nextField) {
      setSelectedField(nextField.field);
      setDrawingPhase("label");
    } else {
      setSelectedField(null);
      setDrawingPhase(null);
    }

    setLabelRegion(null);
    setValueRegion(null);
    setLabelText(null);
    setExtractedText(null);
  };

  const handleFinish = () => {
    onTrainingComplete();
    onClose();
  };

  const goToPrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const goToNextPage = () => {
    if (currentPage < pages.length) setCurrentPage(currentPage + 1);
  };

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3.0));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));

  if (!isOpen) return null;

  const currentPageData = pages[currentPage - 1];
  const trainedCount = trainedRegions.filter((r) => r.saved).length;
  const totalFields = fieldsToTrain.length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="flex items-center justify-center min-h-screen">
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] flex flex-col mx-4">
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <svg
                  className="w-6 h-6 text-white"
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
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Train Nix</h2>
                <p className="text-sm text-white/80">
                  Draw bounding boxes to teach Nix where to find document fields
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-white/80">
                Progress: {trainedCount} / {totalFields} fields
              </div>
              <button onClick={onClose} className="text-white/80 hover:text-white p-1">
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
          </div>

          <div className="flex-1 flex overflow-hidden">
            <div className="w-2/3 border-r flex flex-col bg-gray-100">
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
                    <p className="mt-3 text-sm text-gray-600">Loading document...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center max-w-md">
                    <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-red-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Unable to Load Document
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">{error}</p>
                    <p className="text-xs text-gray-500 mb-4">
                      Some PDFs with complex graphics cannot be processed for training. You can
                      still manually enter field values using the &quot;Add Additional Field&quot;
                      button.
                    </p>
                    <button
                      onClick={loadDocumentPages}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between bg-gray-800 text-white px-3 py-2">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={goToPrevPage}
                        disabled={currentPage <= 1}
                        className="p-1 hover:bg-gray-700 rounded disabled:opacity-40"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                          />
                        </svg>
                      </button>
                      <span className="text-sm">
                        {currentPage} / {pages.length}
                      </span>
                      <button
                        onClick={goToNextPage}
                        disabled={currentPage >= pages.length}
                        className="p-1 hover:bg-gray-700 rounded disabled:opacity-40"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={zoomOut}
                        disabled={scale <= 0.5}
                        className="p-1 hover:bg-gray-700 rounded disabled:opacity-40"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20 12H4"
                          />
                        </svg>
                      </button>
                      <span className="text-sm min-w-[50px] text-center">
                        {Math.round(scale * 100)}%
                      </span>
                      <button
                        onClick={zoomIn}
                        disabled={scale >= 3.0}
                        className="p-1 hover:bg-gray-700 rounded disabled:opacity-40"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                      </button>
                    </div>

                    {selectedField && drawingPhase && (
                      <div
                        className={`text-sm px-3 py-1 rounded ${drawingPhase === "label" ? "bg-purple-500" : "bg-green-500"}`}
                      >
                        Draw {drawingPhase === "label" ? "LABEL" : "VALUE"} for:{" "}
                        {fieldLabels[selectedField] || selectedField}
                      </div>
                    )}
                  </div>

                  <div ref={containerRef} className="flex-1 overflow-auto">
                    <div className="min-h-full min-w-full inline-flex items-start justify-start p-4">
                      <div className="relative inline-block">
                        {currentPageData && (
                          <img
                            ref={imageRef}
                            src={`data:image/png;base64,${currentPageData.imageData}`}
                            alt={`Page ${currentPage}`}
                            className="hidden"
                            onLoad={drawCanvas}
                          />
                        )}
                        <canvas
                          ref={canvasRef}
                          className={`shadow-lg ${drawingPhase ? "cursor-crosshair" : "cursor-default"}`}
                          onMouseDown={handleMouseDown}
                          onMouseMove={handleMouseMove}
                          onMouseUp={handleMouseUp}
                          onMouseLeave={handleMouseUp}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="w-1/3 flex flex-col overflow-hidden">
              <div className="p-4 border-b bg-gray-50">
                <h3 className="font-medium text-gray-900 mb-2">Fields to Train</h3>
                <p className="text-sm text-gray-600">
                  Click a field, then draw two boxes:{" "}
                  <span className="text-purple-600 font-medium">LABEL</span> (optional) and{" "}
                  <span className="text-green-600 font-medium">VALUE</span>.
                </p>
              </div>

              <div className="flex-1 overflow-auto p-4">
                <div className="space-y-2">
                  {fieldsToTrain.map((field) => {
                    const trained = trainedRegions.find((r) => r.fieldName === field.field);
                    const isSelected = selectedField === field.field;
                    const trainedMatchesExpected =
                      trained?.saved && valuesMatch(trained.extractedText, field.expected);
                    const isCustomField = customFields.includes(field.field);

                    return (
                      <button
                        key={field.field}
                        onClick={() => {
                          setSelectedField(field.field);
                          setDrawingPhase("label");
                          setLabelRegion(null);
                          setValueRegion(null);
                          setLabelText(null);
                          setExtractedText(null);
                        }}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          isSelected
                            ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                            : trained?.saved
                              ? trainedMatchesExpected
                                ? "border-green-300 bg-green-50"
                                : "border-amber-300 bg-amber-50"
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`font-medium ${
                              trained?.saved && !trainedMatchesExpected
                                ? "text-amber-900"
                                : "text-gray-900"
                            }`}
                          >
                            {fieldLabels[field.field] || field.field}
                            {isCustomField && (
                              <span className="ml-2 text-xs text-indigo-500 font-normal">
                                (custom)
                              </span>
                            )}
                          </span>
                          {trained?.saved ? (
                            trainedMatchesExpected ? (
                              <span
                                className="text-green-600"
                                title="Extracted value matches expected"
                              >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </span>
                            ) : (
                              <span
                                className="text-amber-600"
                                title="Extracted value differs from expected - document may have different data"
                              >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path
                                    fillRule="evenodd"
                                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </span>
                            )
                          ) : isSelected ? (
                            <span className="text-blue-600 text-xs font-medium">SELECTED</span>
                          ) : null}
                        </div>
                        <div className="mt-1 text-sm">
                          {!isCustomField && (
                            <>
                              <div
                                className={
                                  trained?.saved && !trainedMatchesExpected
                                    ? "text-amber-700"
                                    : "text-gray-500"
                                }
                              >
                                Expected: {field.expected ?? "-"}
                              </div>
                              <div
                                className={
                                  trained?.saved && !trainedMatchesExpected
                                    ? "text-amber-700"
                                    : "text-gray-500"
                                }
                              >
                                Extracted: {field.extracted ?? "-"}
                              </div>
                            </>
                          )}
                          {trained?.saved && (
                            <div
                              className={`mt-1 ${trainedMatchesExpected || isCustomField ? "text-green-600" : "text-amber-600"}`}
                            >
                              <div>
                                Trained: {trained.extractedText} (
                                {Math.round(trained.confidence * 100)}%)
                              </div>
                              {!trainedMatchesExpected && !isCustomField && (
                                <div className="text-xs mt-0.5">
                                  Document value differs from expected
                                </div>
                              )}
                              <div className="text-xs mt-1 text-gray-500 hover:text-blue-600">
                                Click to retrain this field
                              </div>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}

                  {showAddField ? (
                    <div className="p-3 border border-indigo-300 bg-indigo-50 rounded-lg">
                      <div className="text-sm font-medium text-indigo-900 mb-2">
                        Add Custom Field
                      </div>
                      <input
                        type="text"
                        value={newFieldName}
                        onChange={(e) => setNewFieldName(e.target.value)}
                        placeholder="e.g., phoneNumber, email, directorName"
                        className="w-full px-3 py-2 text-sm border border-indigo-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newFieldName.trim()) {
                            const fieldKey = newFieldName.trim().replace(/\s+/g, "");
                            if (!allFieldNames.includes(fieldKey)) {
                              setCustomFields((prev) => [...prev, fieldKey]);
                            }
                            setNewFieldName("");
                            setShowAddField(false);
                          }
                        }}
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => {
                            if (newFieldName.trim()) {
                              const fieldKey = newFieldName.trim().replace(/\s+/g, "");
                              if (!allFieldNames.includes(fieldKey)) {
                                setCustomFields((prev) => [...prev, fieldKey]);
                              }
                              setNewFieldName("");
                              setShowAddField(false);
                            }
                          }}
                          disabled={!newFieldName.trim()}
                          className="flex-1 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                        >
                          Add Field
                        </button>
                        <button
                          onClick={() => {
                            setShowAddField(false);
                            setNewFieldName("");
                          }}
                          className="py-1.5 px-3 text-sm text-gray-600 hover:bg-gray-200 rounded-md"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAddField(true)}
                      className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                        <span className="text-sm font-medium">Add Additional Field</span>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {selectedField && (
                <div className="p-4 bg-gray-50 border-t">
                  <h4 className="font-medium text-gray-900 mb-3">
                    Training: {fieldLabels[selectedField] || selectedField}
                  </h4>

                  {drawingPhase === "label" && !labelRegion && (
                    <div className="space-y-3">
                      <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <p className="text-sm text-purple-800 font-medium">
                          Step 1: Draw LABEL box
                        </p>
                        <p className="text-xs text-purple-600 mt-1">
                          Draw a box around the field label (e.g., &quot;Tax Number:&quot;,
                          &quot;VAT No:&quot;)
                        </p>
                      </div>
                      <button
                        onClick={handleSkipLabel}
                        className="w-full py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                      >
                        Skip label → Draw value only
                      </button>
                    </div>
                  )}

                  {drawingPhase === "label" && labelRegion && (
                    <div className="space-y-3">
                      <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                        <p className="text-sm text-purple-800 font-medium flex items-center gap-2">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Label box drawn
                        </p>
                      </div>
                      <p className="text-xs text-gray-500">
                        Click &quot;Next&quot; to draw the value box, or redraw the label.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDrawingPhase("value")}
                          className="flex-1 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                        >
                          Next → Draw Value
                        </button>
                        <button
                          onClick={() => setLabelRegion(null)}
                          className="py-2 px-3 text-gray-600 hover:bg-gray-200 rounded-md"
                        >
                          Redraw
                        </button>
                      </div>
                    </div>
                  )}

                  {drawingPhase === "value" && !valueRegion && (
                    <div className="space-y-3">
                      {labelRegion && (
                        <div className="p-2 bg-purple-50 border border-purple-200 rounded text-xs text-purple-700">
                          Label box: ✓ Set
                        </div>
                      )}
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800 font-medium">Step 2: Draw VALUE box</p>
                        <p className="text-xs text-green-600 mt-1">
                          Draw a box around the actual value (e.g., &quot;9013884284&quot;)
                        </p>
                      </div>
                    </div>
                  )}

                  {valueRegion && extractedText === null && (
                    <div className="space-y-3">
                      {labelRegion && (
                        <div className="p-2 bg-purple-50 border border-purple-200 rounded text-xs text-purple-700">
                          Label box: ✓ Set
                        </div>
                      )}
                      <div className="p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                        Value box: ✓ Set
                      </div>
                      <button
                        onClick={handleExtractBoth}
                        disabled={extracting}
                        className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        {extracting ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Extracting...
                          </span>
                        ) : (
                          "Extract Text from Regions"
                        )}
                      </button>
                    </div>
                  )}

                  {extractedText !== null && (
                    <div className="space-y-3">
                      {labelText && (
                        <div>
                          <div className="text-xs text-purple-600 mb-1">Label Text:</div>
                          <div className="p-2 bg-purple-50 rounded border border-purple-200 font-mono text-xs">
                            {labelText || "(empty)"}
                          </div>
                        </div>
                      )}
                      <div>
                        <div className="text-sm text-green-700 mb-1">Extracted Value:</div>
                        <input
                          type="text"
                          value={extractedText}
                          onChange={(e) => setExtractedText(e.target.value)}
                          className="w-full p-2 bg-white rounded border border-green-300 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="Enter or correct the value"
                        />
                        <div className="text-xs text-gray-500 mt-1 flex items-center justify-between">
                          <span>Confidence: {Math.round(extractionConfidence * 100)}%</span>
                          <span className="text-green-600">Edit to correct OCR errors</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={handleAccept}
                          disabled={saving}
                          className="flex-1 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                        >
                          {saving ? "Saving..." : "Accept & Save"}
                        </button>
                        <button
                          onClick={handleRetry}
                          className="flex-1 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                        >
                          Retry
                        </button>
                        <button
                          onClick={handleSkip}
                          className="flex-1 py-2 bg-gray-400 text-white rounded-md hover:bg-gray-500"
                        >
                          Skip
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="border-t p-4 bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {(() => {
                  const savedRegions = trainedRegions.filter((r) => r.saved);
                  const matchCount = savedRegions.filter((r) => {
                    const fieldData = fieldComparison.find((f) => f.field === r.fieldName);
                    return valuesMatch(r.extractedText, fieldData?.expected);
                  }).length;
                  const mismatchCount = savedRegions.length - matchCount;

                  if (trainedCount === totalFields) {
                    if (mismatchCount > 0) {
                      return (
                        <span>
                          All fields trained!{" "}
                          <span className="text-green-600">{matchCount} matched</span>
                          {mismatchCount > 0 && (
                            <>
                              ,{" "}
                              <span className="text-amber-600">
                                {mismatchCount} with data discrepancies
                              </span>
                            </>
                          )}
                          . Future documents will use these learned regions.
                        </span>
                      );
                    }
                    return "All fields trained! Future documents will use these learned regions.";
                  }
                  return `${totalFields - trainedCount} field(s) remaining`;
                })()}
              </div>
              <div className="flex gap-3">
                <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:text-gray-900">
                  Cancel
                </button>
                <button
                  onClick={handleFinish}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {trainedCount > 0 ? "Finish Training" : "Close"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
