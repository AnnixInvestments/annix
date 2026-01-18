'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import AmixLogo from '@/app/components/AmixLogo';
import {
  nixApi,
  PdfPageImage,
  RegionCoordinates,
  RegistrationDocumentType,
} from '../api';

interface NixDocumentAnnotatorProps {
  isVisible: boolean;
  file: File | null;
  documentType: RegistrationDocumentType;
  missingFields: Array<{ fieldName: string; label: string }>;
  onFieldExtracted: (fieldName: string, value: string) => void;
  onComplete: () => void;
  onClose: () => void;
}

interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

const DOCUMENT_TYPE_LABELS: Record<RegistrationDocumentType, string> = {
  vat: 'VAT Certificate',
  registration: 'Company Registration',
  bee: 'BEE Certificate',
};

export default function NixDocumentAnnotator({
  isVisible,
  file,
  documentType,
  missingFields,
  onFieldExtracted,
  onComplete,
  onClose,
}: NixDocumentAnnotatorProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [pages, setPages] = useState<PdfPageImage[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selection, setSelection] = useState<SelectionBox | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentField = missingFields[currentFieldIndex];

  const loadDocument = useCallback(async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await nixApi.documentPages(file, 2.0);
      setPages(response.pages);
      setCurrentPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setIsLoading(false);
    }
  }, [file]);

  useEffect(() => {
    if (isVisible && file) {
      loadDocument();
    }
  }, [isVisible, file, loadDocument]);

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current || pages.length === 0) return;

      const containerWidth = containerRef.current.clientWidth - 48;
      const containerHeight = containerRef.current.clientHeight - 200;
      const page = pages[currentPage - 1];

      if (page) {
        const scaleX = containerWidth / page.width;
        const scaleY = containerHeight / page.height;
        setScale(Math.min(scaleX, scaleY, 1));
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [pages, currentPage]);

  useEffect(() => {
    if (!canvasRef.current || pages.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const page = pages[currentPage - 1];
    canvas.width = page.width * scale;
    canvas.height = page.height * scale;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (selection) {
      ctx.fillStyle = 'rgba(255, 165, 0, 0.3)';
      ctx.strokeStyle = '#FFA500';
      ctx.lineWidth = 2;

      const x = Math.min(selection.startX, selection.endX) * scale;
      const y = Math.min(selection.startY, selection.endY) * scale;
      const width = Math.abs(selection.endX - selection.startX) * scale;
      const height = Math.abs(selection.endY - selection.startY) * scale;

      ctx.fillRect(x, y, width, height);
      ctx.strokeRect(x, y, width, height);
    }
  }, [selection, pages, currentPage, scale]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    setIsDrawing(true);
    setSelection({ startX: x, startY: y, endX: x, endY: y });
    setExtractedText(null);
  }, [scale]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    setSelection(prev => prev ? { ...prev, endX: x, endY: y } : null);
  }, [isDrawing, scale]);

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const handleExtract = async () => {
    if (!file || !selection || !currentField) return;

    const x = Math.min(selection.startX, selection.endX);
    const y = Math.min(selection.startY, selection.endY);
    const width = Math.abs(selection.endX - selection.startX);
    const height = Math.abs(selection.endY - selection.startY);

    if (width < 10 || height < 10) {
      setError('Selection is too small. Please draw a larger box around the text.');
      return;
    }

    setIsExtracting(true);
    setError(null);

    const regionCoordinates: RegionCoordinates = {
      x,
      y,
      width,
      height,
      pageNumber: currentPage,
    };

    try {
      const result = await nixApi.extractFromRegion(file, regionCoordinates, currentField.fieldName);
      setExtractedText(result.text);

      if (result.text && result.confidence > 0.3) {
        await nixApi.saveExtractionRegion({
          documentCategory: documentType,
          fieldName: currentField.fieldName,
          regionCoordinates,
          sampleValue: result.text,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract text');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAcceptValue = () => {
    if (!extractedText || !currentField) return;

    onFieldExtracted(currentField.fieldName, extractedText);

    if (currentFieldIndex < missingFields.length - 1) {
      setCurrentFieldIndex(prev => prev + 1);
      setSelection(null);
      setExtractedText(null);
    } else {
      onComplete();
    }
  };

  const handleSkipField = () => {
    if (currentFieldIndex < missingFields.length - 1) {
      setCurrentFieldIndex(prev => prev + 1);
      setSelection(null);
      setExtractedText(null);
    } else {
      onComplete();
    }
  };

  if (!isVisible) return null;

  const currentPageData = pages[currentPage - 1];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
      />

      <div
        ref={containerRef}
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300"
      >
        <div
          className="px-4 py-3 flex items-center justify-between flex-shrink-0"
          style={{ backgroundColor: '#323288' }}
        >
          <AmixLogo size="md" showText useSignatureFont />
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-4">
          <div className="w-14 h-14 flex-shrink-0 rounded-full overflow-hidden shadow-lg border-3 border-orange-400 relative">
            <Image
              src="/nix-avatar.png"
              alt="Nix AI Assistant"
              width={56}
              height={56}
              className="object-cover object-top scale-125"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-orange-400/20 to-transparent" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">
              Help Me Find: {currentField?.label || 'Information'}
            </h2>
            <p className="text-sm text-gray-600">
              Draw a box around the {currentField?.label || 'field'} in your {DOCUMENT_TYPE_LABELS[documentType]}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500">
                Field {currentFieldIndex + 1} of {missingFields.length}
              </span>
              <div className="flex-1 h-1 bg-gray-200 rounded-full max-w-[200px]">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all duration-300"
                  style={{ width: `${((currentFieldIndex + 1) / missingFields.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-gray-100">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading document...</p>
              </div>
            </div>
          ) : error && pages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <p className="text-gray-900 font-medium mb-2">{error}</p>
                <button
                  onClick={loadDocument}
                  className="text-orange-600 hover:text-orange-700 text-sm font-medium"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : currentPageData ? (
            <div className="flex flex-col items-center">
              <div className="relative inline-block shadow-xl rounded-lg overflow-hidden bg-white">
                <img
                  ref={imageRef}
                  src={`data:image/png;base64,${currentPageData.imageData}`}
                  alt={`Page ${currentPage}`}
                  style={{
                    width: currentPageData.width * scale,
                    height: currentPageData.height * scale,
                  }}
                  draggable={false}
                />
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 cursor-crosshair"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                />
              </div>

              {pages.length > 1 && (
                <div className="flex items-center gap-4 mt-4">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous Page
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {pages.length}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(pages.length, p + 1))}
                    disabled={currentPage === pages.length}
                    className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next Page
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-white">
          {error && pages.length > 0 && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {extractedText !== null && (
            <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-800 mb-1">Extracted Text:</p>
              <p className="text-green-700 font-mono">{extractedText || '(empty)'}</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            {selection && !extractedText && (
              <button
                onClick={handleExtract}
                disabled={isExtracting}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isExtracting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Extract Text from Selection
                  </>
                )}
              </button>
            )}

            {extractedText !== null && (
              <>
                <button
                  onClick={handleAcceptValue}
                  disabled={!extractedText}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Use This Value
                </button>
                <button
                  onClick={() => {
                    setSelection(null);
                    setExtractedText(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Try Different Area
                </button>
              </>
            )}

            {!selection && !extractedText && (
              <p className="flex-1 text-center text-gray-500 text-sm">
                Click and drag on the document to select the area containing the {currentField?.label || 'information'}
              </p>
            )}

            <button
              onClick={handleSkipField}
              className="px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors text-sm"
            >
              Skip This Field
            </button>
          </div>
        </div>

        <div
          className="h-1 flex-shrink-0"
          style={{ backgroundColor: '#FFA500' }}
        />
      </div>
    </div>
  );
}
