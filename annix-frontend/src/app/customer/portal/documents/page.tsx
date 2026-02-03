'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  customerDocumentApi,
  customerOnboardingApi,
  CustomerDocument,
  OnboardingStatus,
} from '@/app/lib/api/customerApi';
import { DocumentPreviewModal, PreviewModalState, initialPreviewState } from '@/app/components/DocumentPreviewModal';
import { DocumentActionButtons } from '@/app/components/DocumentActionButtons';
import { formatDateZA } from '@/app/lib/datetime';

const DOCUMENT_TYPES = [
  { value: 'registration_cert', label: 'Company Registration Certificate (CIPC)' },
  { value: 'tax_clearance', label: 'Tax Clearance Certificate (SARS)' },
  { value: 'bee_cert', label: 'BEE/B-BBEE Certificate' },
  { value: 'insurance', label: 'Insurance Certificate' },
  { value: 'proof_of_address', label: 'Proof of Address' },
  { value: 'other', label: 'Other' },
];

export default function CustomerDocumentsPage() {
  const [documents, setDocuments] = useState<CustomerDocument[]>([]);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedType, setSelectedType] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewModal, setPreviewModal] = useState<PreviewModalState>(initialPreviewState);

  const hasRejectedDocuments = documents.some(d => d.validationStatus === 'invalid');
  const canUpload = onboardingStatus?.status === 'draft' || onboardingStatus?.status === 'rejected' || hasRejectedDocuments;
  const canDeleteDocument = (doc: CustomerDocument) => {
    return onboardingStatus?.status === 'draft' || onboardingStatus?.status === 'rejected' || doc.validationStatus === 'invalid';
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [docs, status] = await Promise.all([
        customerDocumentApi.getDocuments(),
        customerOnboardingApi.getStatus(),
      ]);
      setDocuments(docs);
      setOnboardingStatus(status);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];

    if (file.size > maxSize) {
      setUploadError('File size must be less than 10MB');
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      setUploadError('Only PDF, JPG, and PNG files are allowed');
      return;
    }

    setSelectedFile(file);
    setUploadError(null);
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedType) {
      setUploadError('Please select a file and document type');
      return;
    }

    try {
      setUploadingDoc(true);
      setUploadError(null);
      await customerDocumentApi.uploadDocument(selectedFile, selectedType, expiryDate || undefined);
      await loadData();
      setShowUploadModal(false);
      resetUploadForm();
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Failed to upload document');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await customerDocumentApi.deleteDocument(id);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete document');
    }
  };

  const handleDownload = async (doc: CustomerDocument) => {
    try {
      setError(null);
      await customerDocumentApi.downloadDocument(doc.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to download document');
    }
  };

  const handlePreview = async (doc: CustomerDocument) => {
    try {
      setError(null);
      setPreviewModal({ ...initialPreviewState, isOpen: true, isLoading: true, filename: doc.fileName });
      const { url, mimeType, filename } = await customerDocumentApi.previewDocument(doc.id);
      setPreviewModal({ isOpen: true, url, mimeType, filename, isLoading: false });
    } catch (e) {
      setPreviewModal(initialPreviewState);
      setError(e instanceof Error ? e.message : 'Failed to preview document');
    }
  };

  const closePreview = () => {
    if (previewModal.url) {
      URL.revokeObjectURL(previewModal.url);
    }
    setPreviewModal(initialPreviewState);
  };

  const resetUploadForm = () => {
    setSelectedFile(null);
    setSelectedType('');
    setExpiryDate('');
    setUploadError(null);
    setReuploadDocType(null);
  };

  const getDocumentTypeLabel = (type: string) => {
    return DOCUMENT_TYPES.find((t) => t.value === type)?.label || type;
  };

  const getValidationStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Pending Review' },
      valid: { bg: 'bg-green-100', text: 'text-green-700', label: 'Valid' },
      invalid: { bg: 'bg-red-100', text: 'text-red-700', label: 'Invalid' },
      failed: { bg: 'bg-red-100', text: 'text-red-700', label: 'Failed' },
      manual_review: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Under Review' },
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return formatDateZA(dateString);
  };

  const [reuploadDocType, setReuploadDocType] = useState<string | null>(null);

  const rejectedDocuments = documents.filter(d => d.validationStatus === 'invalid');

  const handleReupload = (docType: string) => {
    setReuploadDocType(docType);
    setSelectedType(docType);
    setShowUploadModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {rejectedDocuments.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-800">Action Required - Documents Rejected</h3>
              <p className="text-sm text-red-700 mt-1">
                {rejectedDocuments.length === 1
                  ? 'One of your documents has been rejected and needs to be re-uploaded.'
                  : `${rejectedDocuments.length} documents have been rejected and need to be re-uploaded.`}
              </p>
              <p className="text-sm text-red-700 mt-2">
                Please review the rejection reasons below, then either delete and re-upload the document with correct information,
                or <Link href="/customer/portal/company" className="font-semibold underline hover:text-red-900">review your company profile</Link> to ensure all details are accurate.
              </p>
              <div className="mt-3 space-y-2">
                {rejectedDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-red-200">
                    <div>
                      <span className="font-medium text-gray-900">{getDocumentTypeLabel(doc.documentType)}</span>
                      {doc.validationNotes && (
                        <p className="text-sm text-red-600 mt-1">Reason: {doc.validationNotes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="px-3 py-1.5 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => handleReupload(doc.documentType)}
                        className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
                      >
                        Re-upload
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-3">
                <Link
                  href="/customer/portal/company"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Review Company Profile
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600">Manage your uploaded documents</p>
        </div>
        <div className="relative group">
          <button
            onClick={() => setShowUploadModal(true)}
            disabled={!canUpload}
            className={`px-4 py-2 rounded-md flex items-center ${
              canUpload
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload Document
          </button>
          {!canUpload && (
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              Documents can only be uploaded when onboarding is in draft or rejected status
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {documents.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <svg
            className="w-16 h-16 text-gray-300 mx-auto mb-4"
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents</h3>
          <p className="text-gray-600 mb-4">
            You haven&apos;t uploaded any documents yet. Click the button above to upload your first document.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Document
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uploaded
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td className="px-6 py-4 max-w-xs">
                    <div>
                      <div className="font-medium text-gray-900 truncate" title={doc.fileName}>{doc.fileName}</div>
                      <div className="text-sm text-gray-500">{formatFileSize(doc.fileSize)}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {getDocumentTypeLabel(doc.documentType)}
                  </td>
                  <td className="px-6 py-4">
                    {getValidationStatusBadge(doc.validationStatus)}
                    {doc.validationNotes && (
                      <p className="mt-1 text-xs text-gray-500">{doc.validationNotes}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {formatDate(doc.uploadedAt)}
                    {doc.expiryDate && (
                      <div className="text-xs text-gray-500">
                        Expires: {formatDate(doc.expiryDate)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {doc.validationStatus === 'invalid' && (
                        <button
                          onClick={() => handleReupload(doc.documentType)}
                          className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 transition-colors"
                        >
                          Re-upload
                        </button>
                      )}
                      <DocumentActionButtons
                        filename={doc.fileName}
                        onView={() => handlePreview(doc)}
                        onDownload={() => handleDownload(doc)}
                        onDelete={() => handleDelete(doc.id)}
                        canDelete={canDeleteDocument(doc)}
                        deleteDisabledReason={doc.validationStatus === 'invalid' ? undefined : 'Cannot delete when onboarding is under review'}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black/10 backdrop-blur-sm"
              onClick={() => {
                setShowUploadModal(false);
                resetUploadForm();
              }}
            />

            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Document</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Select type...</option>
                    {DOCUMENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    File <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileSelect}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="mt-1 text-xs text-gray-500">PDF, JPG, or PNG. Max 10MB.</p>
                  {selectedFile && (
                    <p className="mt-1 text-sm text-gray-700">
                      Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date (optional)
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                {uploadError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-700">{uploadError}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    resetUploadForm();
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploadingDoc || !selectedFile || !selectedType}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {uploadingDoc ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <DocumentPreviewModal state={previewModal} onClose={closePreview} />
    </div>
  );
}
