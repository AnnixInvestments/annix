'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  adminApiClient,
  FieldComparisonResult,
  PdfPageImage,
  RegionCoordinates,
} from '@/app/lib/api/adminApi';

interface NixTrainingModalProps {
  isOpen: boolean;
  documentId: number;
  entityType: 'customer' | 'supplier';
  documentType: 'vat' | 'registration' | 'bee';
  fieldComparison: FieldComparisonResult[];
  onClose: () => void;
  onTrainingComplete: () => void;
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
  coordinates: RegionCoordinates;
  extractedText: string;
  confidence: number;
  saved: boolean;
}

const fieldLabels: Record<string, string> = {
  companyName: 'Company Name',
  registrationNumber: 'Registration No.',
  vatNumber: 'VAT Number',
  streetAddress: 'Street Address',
  city: 'City',
  provinceState: 'Province',
  postalCode: 'Postal Code',
  beeLevel: 'BEE Level',
};

export function NixTrainingModal({
  isOpen,
  documentId,
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
  const [drawingState, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });
  const [drawnRegion, setDrawnRegion] = useState<RegionCoordinates | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [extractionConfidence, setExtractionConfidence] = useState<number>(0);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [trainedRegions, setTrainedRegions] = useState<TrainedRegion[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const mismatchedFields = fieldComparison.filter((f) => !f.matches);

  const loadDocumentPages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminApiClient.documentPagesForTraining(entityType, documentId);
      setPages(response.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [entityType, documentId]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || pages.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentPageData = pages[currentPage - 1];
    if (!currentPageData) return;

    canvas.width = currentPageData.width * scale;
    canvas.height = currentPageData.height * scale;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    trainedRegions
      .filter((r) => r.coordinates.pageNumber === currentPage)
      .forEach((region) => {
        ctx.strokeStyle = region.saved ? '#22c55e' : '#f59e0b';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.strokeRect(
          region.coordinates.x * scale,
          region.coordinates.y * scale,
          region.coordinates.width * scale,
          region.coordinates.height * scale,
        );

        ctx.fillStyle = region.saved ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)';
        ctx.fillRect(
          region.coordinates.x * scale,
          region.coordinates.y * scale,
          region.coordinates.width * scale,
          region.coordinates.height * scale,
        );

        ctx.fillStyle = region.saved ? '#22c55e' : '#f59e0b';
        ctx.font = '12px sans-serif';
        ctx.fillText(
          fieldLabels[region.fieldName] || region.fieldName,
          region.coordinates.x * scale + 4,
          region.coordinates.y * scale - 4,
        );
      });

    if (drawnRegion && drawnRegion.pageNumber === currentPage) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        drawnRegion.x * scale,
        drawnRegion.y * scale,
        drawnRegion.width * scale,
        drawnRegion.height * scale,
      );

      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.fillRect(
        drawnRegion.x * scale,
        drawnRegion.y * scale,
        drawnRegion.width * scale,
        drawnRegion.height * scale,
      );
    }

    if (drawingState.isDrawing) {
      const x = Math.min(drawingState.startX, drawingState.currentX);
      const y = Math.min(drawingState.startY, drawingState.currentY);
      const width = Math.abs(drawingState.currentX - drawingState.startX);
      const height = Math.abs(drawingState.currentY - drawingState.startY);

      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x, y, width, height);

      ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
      ctx.fillRect(x, y, width, height);
    }
  }, [currentPage, scale, drawnRegion, drawingState, pages, trainedRegions]);

  useEffect(() => {
    if (isOpen && documentId) {
      loadDocumentPages();
    }
  }, [isOpen, documentId, loadDocumentPages]);

  useEffect(() => {
    if (!isOpen) {
      setPages([]);
      setCurrentPage(1);
      setScale(1.0);
      setSelectedField(null);
      setDrawnRegion(null);
      setExtractedText(null);
      setTrainedRegions([]);
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedField) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setDrawingState({
      isDrawing: true,
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
    });

    setDrawnRegion(null);
    setExtractedText(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawingState.isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setDrawingState((prev) => ({
      ...prev,
      currentX: x,
      currentY: y,
    }));
  };

  const handleMouseUp = () => {
    if (!drawingState.isDrawing) return;

    const x = Math.min(drawingState.startX, drawingState.currentX) / scale;
    const y = Math.min(drawingState.startY, drawingState.currentY) / scale;
    const width = Math.abs(drawingState.currentX - drawingState.startX) / scale;
    const height = Math.abs(drawingState.currentY - drawingState.startY) / scale;

    if (width > 10 && height > 10) {
      setDrawnRegion({
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
        pageNumber: currentPage,
      });
    }

    setDrawingState({
      isDrawing: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
    });
  };

  const handleExtract = async () => {
    if (!drawnRegion || !selectedField) return;

    setExtracting(true);
    try {
      const result = await adminApiClient.extractFromRegion(
        entityType,
        documentId,
        drawnRegion,
        selectedField,
      );
      setExtractedText(result.text);
      setExtractionConfidence(result.confidence);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extraction failed');
    } finally {
      setExtracting(false);
    }
  };

  const handleAccept = async () => {
    if (!drawnRegion || !selectedField || extractedText === null) return;

    setSaving(true);
    try {
      await adminApiClient.saveExtractionRegion({
        documentCategory: documentType,
        fieldName: selectedField,
        regionCoordinates: drawnRegion,
        sampleValue: extractedText,
      });

      setTrainedRegions((prev) => [
        ...prev.filter((r) => r.fieldName !== selectedField),
        {
          fieldName: selectedField,
          coordinates: drawnRegion,
          extractedText,
          confidence: extractionConfidence,
          saved: true,
        },
      ]);

      const nextField = mismatchedFields.find(
        (f) => f.field !== selectedField && !trainedRegions.some((r) => r.fieldName === f.field && r.saved),
      );

      if (nextField) {
        setSelectedField(nextField.field);
      } else {
        setSelectedField(null);
      }

      setDrawnRegion(null);
      setExtractedText(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save region');
    } finally {
      setSaving(false);
    }
  };

  const handleRetry = () => {
    setDrawnRegion(null);
    setExtractedText(null);
  };

  const handleSkip = () => {
    const nextField = mismatchedFields.find(
      (f) => f.field !== selectedField && !trainedRegions.some((r) => r.fieldName === f.field && r.saved),
    );

    if (nextField) {
      setSelectedField(nextField.field);
    } else {
      setSelectedField(null);
    }

    setDrawnRegion(null);
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
  const totalMismatched = mismatchedFields.length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="flex items-center justify-center min-h-screen">
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] flex flex-col mx-4">
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
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
                Progress: {trainedCount} / {totalMismatched} fields
              </div>
              <button onClick={onClose} className="text-white/80 hover:text-white p-1">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-red-600">
                    <p>{error}</p>
                    <button
                      onClick={loadDocumentPages}
                      className="mt-2 text-blue-600 hover:text-blue-800"
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
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <span className="text-sm">{currentPage} / {pages.length}</span>
                      <button
                        onClick={goToNextPage}
                        disabled={currentPage >= pages.length}
                        className="p-1 hover:bg-gray-700 rounded disabled:opacity-40"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={zoomOut}
                        disabled={scale <= 0.5}
                        className="p-1 hover:bg-gray-700 rounded disabled:opacity-40"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      </button>
                      <span className="text-sm min-w-[50px] text-center">{Math.round(scale * 100)}%</span>
                      <button
                        onClick={zoomIn}
                        disabled={scale >= 3.0}
                        className="p-1 hover:bg-gray-700 rounded disabled:opacity-40"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>

                    {selectedField && (
                      <div className="text-sm bg-blue-500 px-3 py-1 rounded">
                        Drawing: {fieldLabels[selectedField] || selectedField}
                      </div>
                    )}
                  </div>

                  <div
                    ref={containerRef}
                    className="flex-1 overflow-auto p-4 flex justify-center"
                  >
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
                        className={`shadow-lg ${selectedField ? 'cursor-crosshair' : 'cursor-default'}`}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="w-1/3 flex flex-col overflow-hidden">
              <div className="p-4 border-b bg-gray-50">
                <h3 className="font-medium text-gray-900 mb-2">Fields to Train</h3>
                <p className="text-sm text-gray-600">
                  Click a field below, then draw a box around it on the document.
                </p>
              </div>

              <div className="flex-1 overflow-auto p-4">
                <div className="space-y-2">
                  {mismatchedFields.map((field) => {
                    const trained = trainedRegions.find((r) => r.fieldName === field.field);
                    const isSelected = selectedField === field.field;

                    return (
                      <button
                        key={field.field}
                        onClick={() => {
                          setSelectedField(field.field);
                          setDrawnRegion(null);
                          setExtractedText(null);
                        }}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                            : trained?.saved
                            ? 'border-green-300 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">
                            {fieldLabels[field.field] || field.field}
                          </span>
                          {trained?.saved ? (
                            <span className="text-green-600">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </span>
                          ) : isSelected ? (
                            <span className="text-blue-600 text-xs font-medium">SELECTED</span>
                          ) : null}
                        </div>
                        <div className="mt-1 text-sm">
                          <div className="text-gray-500">Expected: {field.expected ?? '-'}</div>
                          <div className="text-gray-500">Extracted: {field.extracted ?? '-'}</div>
                          {trained?.saved && (
                            <div className="text-green-600 mt-1">
                              Trained: {trained.extractedText} ({Math.round(trained.confidence * 100)}%)
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedField && drawnRegion && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-2">
                      Region Selected for {fieldLabels[selectedField] || selectedField}
                    </h4>

                    {extractedText === null ? (
                      <button
                        onClick={handleExtract}
                        disabled={extracting}
                        className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        {extracting ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Extracting...
                          </span>
                        ) : (
                          'Extract Text from Region'
                        )}
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm text-gray-600 mb-1">Extracted Text:</div>
                          <div className="p-2 bg-white rounded border font-mono text-sm">
                            {extractedText || '(empty)'}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Confidence: {Math.round(extractionConfidence * 100)}%
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={handleAccept}
                            disabled={saving}
                            className="flex-1 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                          >
                            {saving ? 'Saving...' : 'Accept'}
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
          </div>

          <div className="border-t p-4 bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {trainedCount === totalMismatched
                  ? 'All fields trained! Future documents will use these learned regions.'
                  : `${totalMismatched - trainedCount} field(s) remaining`}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFinish}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {trainedCount > 0 ? 'Finish Training' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
