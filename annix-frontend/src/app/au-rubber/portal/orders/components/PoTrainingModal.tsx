"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  auRubberApiClient,
  type PdfPageImage,
  type RegionCoordinates,
  type TemplateRegionDto,
} from "@/app/lib/api/auRubberApi";

interface PoTrainingModalProps {
  isOpen: boolean;
  file: File;
  companyId: number;
  formatHash: string;
  onClose: () => void;
  onTrainingComplete: (templateId: number) => void;
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
}

type DrawingPhase = "label" | "value" | null;

const fieldLabels: Record<string, string> = {
  poNumber: "PO Number",
  orderDate: "Order Date",
  deliveryDate: "Delivery Date",
  lineItemsTable: "Line Items Table",
};

const fieldsToTrain = ["poNumber", "orderDate", "deliveryDate", "lineItemsTable"];

export function PoTrainingModal({
  isOpen,
  file,
  companyId,
  formatHash,
  onClose,
  onTrainingComplete,
}: PoTrainingModalProps) {
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
  const [templateName, setTemplateName] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadDocumentPages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await auRubberApiClient.orderDocumentPages(file);
      if (response.pages.length === 0) {
        setError("Unable to convert this PDF for training.");
      } else {
        setPages(response.pages);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load document";
      setError(`Unable to load document for training: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [file]);

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
    if (isOpen && file) {
      loadDocumentPages();
    }
  }, [isOpen, file, loadDocumentPages]);

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
      setTemplateName("");
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

  const handleExtractBoth = async () => {
    if (!valueRegion || !selectedField) return;

    setExtracting(true);
    try {
      if (labelRegion) {
        const labelResult = await auRubberApiClient.extractOrderRegion(
          file,
          labelRegion,
          `${selectedField}_label`,
        );
        setLabelText(labelResult.text);
      }

      const valueResult = await auRubberApiClient.extractOrderRegion(
        file,
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

  const handleAccept = () => {
    if (!valueRegion || !selectedField || extractedText === null) return;

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
      },
    ]);

    const nextField = fieldsToTrain.find(
      (f) => f !== selectedField && !trainedRegions.some((r) => r.fieldName === f && r.saved),
    );

    if (nextField) {
      setSelectedField(nextField);
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
      (f) => f !== selectedField && !trainedRegions.some((r) => r.fieldName === f && r.saved),
    );

    if (nextField) {
      setSelectedField(nextField);
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

  const handleSaveTemplate = async () => {
    if (trainedRegions.filter((r) => r.saved).length === 0) {
      setError("Please train at least one field before saving");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const regions: TemplateRegionDto[] = trainedRegions
        .filter((r) => r.saved)
        .map((r) => ({
          fieldName: r.fieldName,
          regionCoordinates: r.valueCoordinates,
          labelCoordinates: r.labelCoordinates,
          labelText: r.labelText,
          sampleValue: r.extractedText,
          confidenceThreshold: 0.7,
        }));

      const result = await auRubberApiClient.savePoTemplate({
        companyId,
        formatHash,
        templateName: templateName || undefined,
        regions,
      });

      onTrainingComplete(result.templateId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setSaving(false);
    }
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

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="flex items-center justify-center min-h-screen">
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] flex flex-col mx-4">
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-yellow-600 to-amber-600">
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
                <h2 className="text-lg font-semibold text-white">Train Nix - PO Template</h2>
                <p className="text-sm text-white/80">
                  Draw bounding boxes to teach Nix where to find PO fields
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-white/80">
                Progress: {trainedCount} / {fieldsToTrain.length} fields
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
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-600 mx-auto" />
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
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
                    <p className="text-sm text-gray-600 mb-4">{error}</p>
                    <button
                      onClick={loadDocumentPages}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
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
                  Click a field, then draw boxes:{" "}
                  <span className="text-purple-600 font-medium">LABEL</span> (optional) and{" "}
                  <span className="text-green-600 font-medium">VALUE</span>.
                </p>
              </div>

              <div className="flex-1 overflow-auto p-4">
                <div className="space-y-2">
                  {fieldsToTrain.map((fieldName) => {
                    const trained = trainedRegions.find((r) => r.fieldName === fieldName);
                    const isSelected = selectedField === fieldName;

                    return (
                      <button
                        key={fieldName}
                        onClick={() => {
                          setSelectedField(fieldName);
                          setDrawingPhase("label");
                          setLabelRegion(null);
                          setValueRegion(null);
                          setLabelText(null);
                          setExtractedText(null);
                        }}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          isSelected
                            ? "border-yellow-500 bg-yellow-50 ring-2 ring-yellow-200"
                            : trained?.saved
                              ? "border-green-300 bg-green-50"
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">
                            {fieldLabels[fieldName] || fieldName}
                          </span>
                          {trained?.saved ? (
                            <span className="text-green-600">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </span>
                          ) : isSelected ? (
                            <span className="text-yellow-600 text-xs font-medium">SELECTED</span>
                          ) : null}
                        </div>
                        {trained?.saved && (
                          <div className="mt-1 text-sm text-green-600">
                            <div>
                              Value: {trained.extractedText.substring(0, 50)}
                              {trained.extractedText.length > 50 ? "..." : ""} (
                              {Math.round(trained.confidence * 100)}%)
                            </div>
                          </div>
                        )}
                        {fieldName === "lineItemsTable" && (
                          <div className="mt-1 text-xs text-gray-500">
                            Draw a box around the entire order table
                          </div>
                        )}
                      </button>
                    );
                  })}
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
                          Draw a box around the field label (e.g., &quot;PO Number:&quot;)
                        </p>
                      </div>
                      <button
                        onClick={handleSkipLabel}
                        className="w-full py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                      >
                        Skip label - Draw value only
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
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDrawingPhase("value")}
                          className="flex-1 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                        >
                          Next - Draw Value
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
                          Label box: Set
                        </div>
                      )}
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800 font-medium">Step 2: Draw VALUE box</p>
                        <p className="text-xs text-green-600 mt-1">
                          Draw a box around the actual value
                        </p>
                      </div>
                    </div>
                  )}

                  {valueRegion && extractedText === null && (
                    <div className="space-y-3">
                      {labelRegion && (
                        <div className="p-2 bg-purple-50 border border-purple-200 rounded text-xs text-purple-700">
                          Label box: Set
                        </div>
                      )}
                      <div className="p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                        Value box: Set
                      </div>
                      <button
                        onClick={handleExtractBoth}
                        disabled={extracting}
                        className="w-full py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
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
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
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
                          className="flex-1 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                        >
                          Accept & Save
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

              {trainedCount > 0 && !selectedField && (
                <div className="p-4 bg-gray-50 border-t">
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Template Name (optional)
                    </label>
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="e.g., Standard PO Format"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t p-4 bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {trainedCount === fieldsToTrain.length
                  ? "All fields trained! Save the template to use for future orders."
                  : `${fieldsToTrain.length - trainedCount} field(s) remaining`}
              </div>
              <div className="flex gap-3">
                <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:text-gray-900">
                  Cancel
                </button>
                <button
                  onClick={handleSaveTemplate}
                  disabled={trainedCount === 0 || saving}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Template"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
