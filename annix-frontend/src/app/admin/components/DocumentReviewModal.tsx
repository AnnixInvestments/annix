'use client';

import { useEffect, useState } from 'react';
import { DocumentReviewData, FieldComparisonResult, DocumentPreviewImages } from '@/app/lib/api/adminApi';
import { NixTrainingModal } from './NixTrainingModal';

interface DocumentReviewModalProps {
  isOpen: boolean;
  data: DocumentReviewData | null;
  isLoading: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onReVerify: () => void;
  isSubmitting: boolean;
  fetchPreviewImages?: (documentId: number) => Promise<DocumentPreviewImages>;
  entityType?: 'customer' | 'supplier';
}

function DownloadButton({ presignedUrl, fileName }: { presignedUrl: string; fileName: string }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch(presignedUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      window.open(presignedUrl, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {downloading ? (
        <>
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Downloading...
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download PDF
        </>
      )}
    </button>
  );
}

function XfaWarningBanner({ presignedUrl, fileName }: { presignedUrl: string; fileName: string }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch(presignedUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      window.open(presignedUrl, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-amber-800">Dynamic PDF (XFA Format)</h4>
          <p className="text-sm text-amber-700 mt-1">
            This document uses Adobe&apos;s XFA format which cannot be displayed in web browsers.
            The preview above shows a placeholder page, not the actual document content.
          </p>
          <p className="text-sm text-amber-700 mt-2">
            <strong>To view this document:</strong> Download and open it in Adobe Acrobat Reader.
          </p>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-md hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Downloading...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download PDF for Adobe Reader
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function MatchIndicator({ matches, similarity }: { matches: boolean; similarity: number }) {
  if (matches) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        Match
      </span>
    );
  }

  const color = similarity >= 70 ? 'yellow' : 'red';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-${color}-100 text-${color}-800`}>
      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
      {similarity}%
    </span>
  );
}

function FieldComparisonRow({ comparison }: { comparison: FieldComparisonResult }) {
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

  return (
    <tr className={comparison.matches ? 'bg-white' : 'bg-red-50'}>
      <td className="px-4 py-3 text-sm font-medium text-gray-900">
        {fieldLabels[comparison.field] || comparison.field}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {comparison.expected ?? '-'}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {comparison.extracted ?? '-'}
      </td>
      <td className="px-4 py-3">
        <MatchIndicator matches={comparison.matches} similarity={comparison.similarity} />
      </td>
    </tr>
  );
}

function ImagePreviewViewer({
  pages,
  presignedUrl
}: {
  pages: string[];
  presignedUrl: string;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);

  const goToPrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const goToNextPage = () => {
    if (currentPage < pages.length) setCurrentPage(currentPage + 1);
  };

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3.0));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between bg-gray-800 text-white px-3 py-2 rounded-t-lg">
        <div className="flex items-center space-x-2">
          <button
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
            className="p-1 hover:bg-gray-700 rounded disabled:opacity-40 disabled:cursor-not-allowed"
            title="Previous page"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm">
            {currentPage} / {pages.length}
          </span>
          <button
            onClick={goToNextPage}
            disabled={currentPage >= pages.length}
            className="p-1 hover:bg-gray-700 rounded disabled:opacity-40 disabled:cursor-not-allowed"
            title="Next page"
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
            className="p-1 hover:bg-gray-700 rounded disabled:opacity-40 disabled:cursor-not-allowed"
            title="Zoom out"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <span className="text-sm min-w-[50px] text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={zoomIn}
            disabled={scale >= 3.0}
            className="p-1 hover:bg-gray-700 rounded disabled:opacity-40 disabled:cursor-not-allowed"
            title="Zoom in"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        <a
          href={presignedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 hover:bg-gray-700 rounded"
          title="Open original in new tab"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      <div className="flex-1 overflow-auto bg-gray-200 flex justify-center p-4">
        <img
          src={pages[currentPage - 1]}
          alt={`Page ${currentPage}`}
          className="shadow-lg"
          style={{
            maxWidth: '100%',
            height: 'auto',
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
          }}
        />
      </div>
    </div>
  );
}

export function DocumentReviewModal({
  isOpen,
  data,
  isLoading,
  onClose,
  onApprove,
  onReject,
  onReVerify,
  isSubmitting,
  fetchPreviewImages,
  entityType = 'customer',
}: DocumentReviewModalProps) {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[] | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [showTrainingModal, setShowTrainingModal] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setRejectReason('');
      setShowRejectForm(false);
      setPreviewImages(null);
      setPreviewError(null);
      setShowTrainingModal(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && data && data.mimeType === 'application/pdf' && fetchPreviewImages && !previewImages && !loadingPreview) {
      setLoadingPreview(true);
      setPreviewError(null);
      fetchPreviewImages(data.documentId)
        .then((result) => {
          setPreviewImages(result.pages);
        })
        .catch((err) => {
          console.error('Failed to load preview images:', err);
          setPreviewError('Failed to load document preview');
        })
        .finally(() => {
          setLoadingPreview(false);
        });
    }
  }, [isOpen, data, fetchPreviewImages, previewImages, loadingPreview]);

  const handleReject = () => {
    if (rejectReason.trim()) {
      onReject(rejectReason);
    }
  };

  if (!isOpen) return null;

  const confidenceColor = (confidence: number | null) => {
    if (confidence === null) return 'gray';
    if (confidence >= 0.8) return 'green';
    if (confidence >= 0.6) return 'yellow';
    return 'red';
  };

  const isLikelyXfaPdf = data?.mimeType === 'application/pdf' &&
    data?.fieldComparison?.every(f => !f.extracted || f.extracted === '-') &&
    !loadingPreview;

  const renderDocumentPreview = () => {
    if (!data) return null;

    if (data.mimeType?.startsWith('image/')) {
      return (
        <img
          src={data.presignedUrl}
          alt={data.fileName}
          className="max-w-full object-contain"
        />
      );
    }

    if (data.mimeType === 'application/pdf') {
      if (loadingPreview) {
        return (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
              <p className="mt-3 text-sm text-gray-600">Converting PDF to images...</p>
            </div>
          </div>
        );
      }

      if (previewError) {
        return (
          <div className="flex flex-col items-center justify-center h-64">
            <p className="text-sm text-red-600 mb-3">{previewError}</p>
            <a
              href={data.presignedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              Open PDF in new tab
            </a>
          </div>
        );
      }

      if (previewImages && previewImages.length > 0) {
        return (
          <ImagePreviewViewer pages={previewImages} presignedUrl={data.presignedUrl} />
        );
      }

      return (
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-sm text-gray-600 mb-3">PDF preview not available</p>
          <a
            href={data.presignedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
          >
            Open PDF in new tab
          </a>
        </div>
      );
    }

    return (
      <div className="text-center text-gray-600 py-8">
        <p>Preview not available</p>
        <a
          href={data.presignedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 mt-2 inline-block"
        >
          Download document
        </a>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Document Review
              </h2>
              {data && (
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  data.validationStatus === 'valid'
                    ? 'bg-green-100 text-green-800'
                    : data.validationStatus === 'manual_review'
                    ? 'bg-yellow-100 text-yellow-800'
                    : data.validationStatus === 'invalid'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {data.validationStatus}
                </span>
              )}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-hidden flex">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
                  <p className="mt-4 text-gray-600">Loading document...</p>
                </div>
              </div>
            ) : data ? (
              <>
                <div className={`${isLikelyXfaPdf ? 'w-2/5' : 'w-1/2'} border-r overflow-auto bg-gray-100 p-4 flex flex-col`}>
                  <div className="text-sm text-gray-500 mb-2">
                    {data.fileName} ({data.mimeType})
                  </div>
                  <div className="flex-1 min-h-0">
                    {renderDocumentPreview()}
                  </div>
                  {isLikelyXfaPdf && (!previewImages || previewImages.length === 0) && (
                    <div className="mt-4 flex-shrink-0">
                      <XfaWarningBanner presignedUrl={data.presignedUrl} fileName={data.fileName} />
                    </div>
                  )}
                  {data.mimeType === 'application/pdf' && previewImages && previewImages.length > 0 && (
                    <div className="mt-4 flex-shrink-0">
                      <DownloadButton presignedUrl={data.presignedUrl} fileName={data.fileName} />
                    </div>
                  )}
                </div>

                <div className={`${isLikelyXfaPdf ? 'w-3/5' : 'w-1/2'} overflow-auto p-4`}>
                  <div className="space-y-4">
                    {isLikelyXfaPdf && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <div className="flex items-start gap-3">
                          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <h4 className="text-sm font-semibold text-blue-800">Manual Verification Required</h4>
                            <p className="text-sm text-blue-700 mt-1">
                              This appears to be a dynamic PDF that could not be automatically processed.
                              Please download the document using the button on the left, open it in Adobe Reader,
                              and manually verify the information matches the expected values below.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">
                        {isLikelyXfaPdf ? 'Expected Values (Manual Check)' : 'Verification Results'}
                      </h3>
                      {data.verificationConfidence !== null && !isLikelyXfaPdf && (
                        <span className={`px-3 py-1 rounded-full text-sm font-medium bg-${confidenceColor(data.verificationConfidence)}-100 text-${confidenceColor(data.verificationConfidence)}-800`}>
                          {Math.round(data.verificationConfidence * 100)}% confidence
                        </span>
                      )}
                    </div>

                    {data.ocrFailed && !isLikelyXfaPdf && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-800">OCR processing failed for this document.</p>
                      </div>
                    )}

                    {data.validationNotes && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <p className="text-sm text-gray-700 font-medium mb-1">Notes:</p>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{data.validationNotes}</p>
                      </div>
                    )}

                    <div className="border rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Field</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Expected</th>
                            {!isLikelyXfaPdf && (
                              <>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Extracted</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {data.fieldComparison.map((comparison) => (
                            isLikelyXfaPdf ? (
                              <tr key={comparison.field} className="bg-white">
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                  {{
                                    companyName: 'Company Name',
                                    registrationNumber: 'Registration No.',
                                    vatNumber: 'VAT Number',
                                    streetAddress: 'Street Address',
                                    city: 'City',
                                    provinceState: 'Province',
                                    postalCode: 'Postal Code',
                                    beeLevel: 'BEE Level',
                                  }[comparison.field] || comparison.field}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                                  {comparison.expected ?? '-'}
                                </td>
                              </tr>
                            ) : (
                              <FieldComparisonRow key={comparison.field} comparison={comparison} />
                            )
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {isLikelyXfaPdf && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-gray-800 mb-2">Verification Checklist</h4>
                        <ul className="space-y-2 text-sm text-gray-600">
                          <li className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 rounded border border-gray-300 bg-white mt-0.5"></span>
                            <span>Company name on document matches expected value</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 rounded border border-gray-300 bg-white mt-0.5"></span>
                            <span>VAT number on document matches expected value</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 rounded border border-gray-300 bg-white mt-0.5"></span>
                            <span>Document appears genuine and unaltered</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 rounded border border-gray-300 bg-white mt-0.5"></span>
                            <span>Document is current and not expired</span>
                          </li>
                        </ul>
                      </div>
                    )}

                    {data.reviewedBy && (
                      <div className="text-sm text-gray-500">
                        Reviewed by {data.reviewedBy} on {data.reviewedAt ? new Date(data.reviewedAt).toLocaleString() : 'N/A'}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-600">No document data available</p>
              </div>
            )}
          </div>

          {data && !isLoading && (
            <div className="border-t p-4 bg-gray-50">
              {showRejectForm ? (
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rejection Reason
                    </label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={2}
                      placeholder="Enter reason for rejection..."
                    />
                  </div>
                  <button
                    onClick={handleReject}
                    disabled={!rejectReason.trim() || isSubmitting}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Rejecting...' : 'Confirm Reject'}
                  </button>
                  <button
                    onClick={() => setShowRejectForm(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div className="flex gap-3">
                    <button
                      onClick={onReVerify}
                      disabled={isSubmitting}
                      className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50"
                    >
                      Re-verify Document
                    </button>
                    {data.fieldComparison.some((f) => !f.matches) && (
                      <button
                        onClick={() => setShowTrainingModal(true)}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        Train Nix
                      </button>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowRejectForm(true)}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={onApprove}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Approving...' : 'Approve Document'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {data && showTrainingModal && (
            <NixTrainingModal
              isOpen={showTrainingModal}
              documentId={data.documentId}
              entityType={entityType}
              documentType={data.documentType as 'vat' | 'registration' | 'bee'}
              fieldComparison={data.fieldComparison}
              onClose={() => setShowTrainingModal(false)}
              onTrainingComplete={() => {
                setShowTrainingModal(false);
                onReVerify();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
