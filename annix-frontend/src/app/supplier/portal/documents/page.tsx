'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supplierPortalApi, SupplierDocumentDto, OnboardingStatusResponse, SupplierCompanyDto } from '@/app/lib/api/supplierApi';
import { DocumentPreviewModal, PreviewModalState, initialPreviewState } from '@/app/components/DocumentPreviewModal';
import { DocumentActionButtons } from '@/app/components/DocumentActionButtons';
import { formatDateZA } from '@/app/lib/datetime';
import { log } from '@/app/lib/logger';
import { nixApi, RegistrationDocumentType, RegistrationVerificationResult } from '@/app/lib/nix/api';
import NixRegistrationVerifier from '@/app/lib/nix/components/NixRegistrationVerifier';

const documentTypes = [
  { value: 'registration_cert', label: 'Company Registration Certificate (CIPC)', required: true, nixType: 'registration' as RegistrationDocumentType },
  { value: 'tax_clearance', label: 'Tax Clearance Certificate (SARS)', required: true, nixType: 'vat' as RegistrationDocumentType },
  { value: 'bee_cert', label: 'BEE/B-BBEE Certificate', required: true, nixType: 'bee' as RegistrationDocumentType },
  { value: 'iso_cert', label: 'ISO Certification', required: false, nixType: null },
  { value: 'insurance', label: 'Insurance Certificate', required: false, nixType: null },
  { value: 'other', label: 'Other Document', required: false, nixType: null },
];

export default function SupplierDocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<SupplierDocumentDto[]>([]);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatusResponse | null>(null);
  const [companyDetails, setCompanyDetails] = useState<SupplierCompanyDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewModal, setPreviewModal] = useState<PreviewModalState>(initialPreviewState);

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<RegistrationVerificationResult | null>(null);
  const [showNixVerifier, setShowNixVerifier] = useState(false);

  const fetchData = async () => {
    try {
      const [docs, status, profile] = await Promise.all([
        supplierPortalApi.getDocuments(),
        supplierPortalApi.getOnboardingStatus(),
        supplierPortalApi.getProfile(),
      ]);
      setDocuments(docs);
      setOnboardingStatus(status);
      setCompanyDetails(profile.company);
    } catch (err) {
      log.error('Failed to fetch data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchDocuments = async () => {
    try {
      const docs = await supplierPortalApi.getDocuments();
      setDocuments(docs);
    } catch (err) {
      log.error('Failed to fetch documents:', err);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedType) return;

    setError(null);
    setSuccess(null);
    setPendingFile(file);

    const docTypeConfig = documentTypes.find(dt => dt.value === selectedType);
    const nixType = docTypeConfig?.nixType;

    if (nixType && companyDetails) {
      setIsVerifying(true);
      setShowNixVerifier(true);
      setVerificationResult(null);

      try {
        const expectedData = {
          companyName: companyDetails.legalName || '',
          registrationNumber: companyDetails.registrationNumber || '',
          vatNumber: companyDetails.vatNumber || '',
          streetAddress: companyDetails.streetAddress || '',
          city: companyDetails.city || '',
          provinceState: companyDetails.provinceState || '',
          postalCode: companyDetails.postalCode || '',
          beeLevel: companyDetails.beeLevel,
          beeExpiryDate: companyDetails.beeCertificateExpiry || undefined,
        };

        const result = await nixApi.verifyRegistrationDocument(file, nixType, expectedData);
        setVerificationResult(result);
        setIsVerifying(false);
      } catch (err) {
        log.error('Nix verification failed:', err);
        setIsVerifying(false);
        setVerificationResult(null);
        await proceedWithUpload(file, null);
      }
    } else {
      await proceedWithUpload(file, null);
    }
  };

  const proceedWithUpload = async (file: File, result: RegistrationVerificationResult | null) => {
    setIsUploading(true);
    setShowNixVerifier(false);

    try {
      const verificationData = result ? {
        success: result.success,
        overallConfidence: result.overallConfidence,
        allFieldsMatch: result.allFieldsMatch,
        extractedData: result.extractedData as unknown as Record<string, unknown>,
        fieldResults: result.fieldResults,
      } : undefined;

      await supplierPortalApi.uploadDocument(file, selectedType, expiryDate || undefined, verificationData);
      setSuccess(`${file.name} uploaded successfully`);
      await fetchDocuments();
      resetUploadState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const resetUploadState = () => {
    setSelectedType('');
    setExpiryDate('');
    setPendingFile(null);
    setVerificationResult(null);
    setShowNixVerifier(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleNixProceed = () => {
    if (pendingFile) {
      proceedWithUpload(pendingFile, verificationResult);
    }
  };

  const handleNixCancel = () => {
    resetUploadState();
  };

  const handleNixApplyCorrections = (corrections: Array<{ field: string; value: string | number }>) => {
    log.info('Applying corrections is not supported in document upload - corrections should be made to company profile');
  };

  const handleFieldLearned = (fieldName: string, value: string) => {
    log.info(`Nix learned field ${fieldName}: ${value}`);
    if (verificationResult) {
      const updatedFieldResults = verificationResult.fieldResults.map(field =>
        field.field === fieldName
          ? { ...field, extracted: value, match: true }
          : field
      );
      setVerificationResult({
        ...verificationResult,
        fieldResults: updatedFieldResults,
        extractedData: {
          ...verificationResult.extractedData,
          [fieldName]: value,
        },
      });
    }
  };

  const handleDelete = async (documentId: number) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await supplierPortalApi.deleteDocument(documentId);
      setSuccess('Document deleted successfully');
      await fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handlePreview = async (doc: SupplierDocumentDto) => {
    setPreviewModal({ ...initialPreviewState, isOpen: true, isLoading: true, filename: doc.fileName });
    try {
      const { url, mimeType, filename } = await supplierPortalApi.previewDocument(doc.id);
      setPreviewModal({ isOpen: true, url, mimeType, filename, isLoading: false });
    } catch (err) {
      setPreviewModal(initialPreviewState);
      setError(err instanceof Error ? err.message : 'Failed to preview document');
    }
  };

  const handleDownload = async (doc: SupplierDocumentDto) => {
    try {
      await supplierPortalApi.downloadDocument(doc.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download document');
    }
  };

  const closePreviewModal = () => {
    if (previewModal.url) {
      URL.revokeObjectURL(previewModal.url);
    }
    setPreviewModal(initialPreviewState);
  };

  const handleSubmitOnboarding = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await supplierPortalApi.submitOnboarding();
      setSuccess('Application submitted successfully! Redirecting to dashboard...');
      setTimeout(() => router.push('/supplier/portal/dashboard'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      valid: 'bg-green-100 text-green-800',
      invalid: 'bg-red-100 text-red-800',
      failed: 'bg-red-100 text-red-800',
      manual_review: 'bg-blue-100 text-blue-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDocumentLabel = (type: string) => {
    return documentTypes.find((t) => t.value === type)?.label || type;
  };

  // Check which required documents are missing
  const uploadedTypes = documents.map((d) => d.documentType);
  const missingRequired = documentTypes.filter(
    (t) => t.required && !uploadedTypes.includes(t.value)
  );

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <p className="mt-1 text-gray-600">
          Upload and manage your compliance documents
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Missing Documents Warning */}
      {missingRequired.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-yellow-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Missing Required Documents</h3>
              <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
                {missingRequired.map((doc) => (
                  <li key={doc.value}>{doc.label}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Upload Form */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Upload Document</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select type...</option>
              {documentTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label} {type.required ? '*' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expiry Date (optional)
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              max="2099-12-31"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              disabled={!selectedType || isUploading || isVerifying}
              accept=".pdf,.jpg,.jpeg,.png"
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
            />
          </div>
        </div>
        {isUploading && (
          <div className="mt-4 flex items-center text-sm text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            Uploading...
          </div>
        )}
        <p className="mt-2 text-xs text-gray-500">
          Accepted formats: PDF, JPG, PNG. Maximum file size: 10MB.
        </p>
      </div>

      {/* Nix Verification Results */}
      {showNixVerifier && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <NixRegistrationVerifier
            isVisible={showNixVerifier}
            isProcessing={isVerifying}
            verificationResult={verificationResult}
            documentType={documentTypes.find(dt => dt.value === selectedType)?.nixType || 'registration'}
            file={pendingFile}
            onApplyCorrections={handleNixApplyCorrections}
            onProceedWithMismatch={handleNixProceed}
            onRetryUpload={handleNixCancel}
            onClose={handleNixCancel}
            onFieldLearned={handleFieldLearned}
          />
          {verificationResult && !isVerifying && (
            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={handleNixCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleNixProceed}
                disabled={isUploading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isUploading ? 'Uploading...' : 'Proceed with Upload'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Documents List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Uploaded Documents</h2>
        </div>
        {documents.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <p className="mt-2">No documents uploaded yet</p>
          </div>
        ) : (
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
                  Size
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm text-gray-900">{doc.fileName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">{getDocumentLabel(doc.documentType)}</span>
                    {doc.isRequired && (
                      <span className="ml-1 text-red-500">*</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(doc.validationStatus)}`}>
                      {doc.validationStatus.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    {doc.validationNotes && (
                      <p className="text-xs text-gray-500 mt-1">{doc.validationNotes}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatFileSize(doc.fileSize)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateZA(doc.uploadedAt)}
                    {doc.expiryDate && (
                      <p className="text-xs text-gray-400">
                        Expires: {formatDateZA(doc.expiryDate)}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <DocumentActionButtons
                      filename={doc.fileName}
                      onView={() => handlePreview(doc)}
                      onDownload={() => handleDownload(doc)}
                      onDelete={() => handleDelete(doc.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <DocumentPreviewModal state={previewModal} onClose={closePreviewModal} />

      {/* Complete Onboarding Button - shows when all required documents are uploaded */}
      {missingRequired.length === 0 &&
       onboardingStatus?.status === 'draft' &&
       onboardingStatus?.companyDetailsComplete && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Ready to Submit</h3>
              <p className="text-sm text-gray-600 mt-1">
                All required documents have been uploaded. You can now submit your application for review.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSubmitOnboarding}
              disabled={isSubmitting}
              className="px-6 py-3 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Complete Onboarding
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Show message if company details incomplete */}
      {missingRequired.length === 0 &&
       onboardingStatus?.status === 'draft' &&
       !onboardingStatus?.companyDetailsComplete && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm text-amber-800 font-medium">Company Details Incomplete</p>
              <p className="text-sm text-amber-700 mt-1">
                Please complete your company details in the{' '}
                <a href="/supplier/portal/onboarding" className="underline font-medium">
                  Onboarding section
                </a>{' '}
                before submitting your application.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
