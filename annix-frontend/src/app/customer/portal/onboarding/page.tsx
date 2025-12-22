'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  customerOnboardingApi,
  customerDocumentApi,
  OnboardingStatus,
  CustomerDocument,
} from '@/app/lib/api/customerApi';
import { useCustomerAuth } from '@/app/context/CustomerAuthContext';

const DOCUMENT_TYPES = [
  { value: 'registration_cert', label: 'Company Registration Certificate (CIPC)', required: true },
  { value: 'tax_clearance', label: 'Tax Clearance Certificate (SARS)', required: true },
  { value: 'bee_cert', label: 'BEE/B-BBEE Certificate', required: true },
  { value: 'insurance', label: 'Insurance Certificate', required: true },
  { value: 'proof_of_address', label: 'Proof of Address', required: true },
  { value: 'other', label: 'Other Supporting Documents', required: false },
];

type Step = 'status' | 'company' | 'documents' | 'review';

export default function CustomerOnboardingPage() {
  const router = useRouter();
  const { profile, refreshProfile } = useCustomerAuth();

  const [currentStep, setCurrentStep] = useState<Step>('status');
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
  const [documents, setDocuments] = useState<CustomerDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Company form data
  const [companyData, setCompanyData] = useState({
    legalName: '',
    tradingName: '',
    registrationNumber: '',
    vatNumber: '',
    streetAddress: '',
    city: '',
    provinceState: '',
    postalCode: '',
    country: 'South Africa',
    primaryPhone: '',
  });

  // Document upload state
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    loadOnboardingData();
  }, []);

  const loadOnboardingData = async () => {
    try {
      setIsLoading(true);
      const [status, docs] = await Promise.all([
        customerOnboardingApi.getStatus(),
        customerDocumentApi.getDocuments(),
      ]);
      setOnboardingStatus(status);
      setDocuments(docs);

      // Determine initial step based on status
      if (status.status === 'approved') {
        router.push('/customer/portal/dashboard');
        return;
      } else if (status.status === 'submitted' || status.status === 'under_review') {
        setCurrentStep('status');
      } else if (status.status === 'rejected') {
        setCurrentStep('status');
      } else if (!status.companyDetailsComplete) {
        setCurrentStep('company');
      } else if (!status.documentsComplete) {
        setCurrentStep('documents');
      } else {
        setCurrentStep('review');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load onboarding data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompanyChange = (field: string, value: string) => {
    setCompanyData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveCompany = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      await customerOnboardingApi.updateCompanyDetails(companyData);
      await loadOnboardingData();
      setCurrentStep('documents');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save company details');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, documentType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
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

    try {
      setUploadingDoc(documentType);
      setUploadError(null);
      await customerDocumentApi.uploadDocument(file, documentType);
      await loadOnboardingData();
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Failed to upload document');
    } finally {
      setUploadingDoc(null);
      e.target.value = '';
    }
  };

  const handleDeleteDocument = async (id: number) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await customerDocumentApi.deleteDocument(id);
      await loadOnboardingData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete document');
    }
  };

  const handleSubmitOnboarding = async () => {
    if (!confirm('Are you sure you want to submit your onboarding for review? You will not be able to make changes until the review is complete.')) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await customerOnboardingApi.submit();
      await loadOnboardingData();
      await refreshProfile();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit onboarding');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDocumentForType = (type: string) => {
    return documents.find((d) => d.documentType === type);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
      submitted: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Submitted' },
      under_review: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Under Review' },
      approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
    };
    const badge = badges[status] || badges.draft;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const getValidationStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Pending Review' },
      valid: { bg: 'bg-green-100', text: 'text-green-700', label: 'Valid' },
      invalid: { bg: 'bg-red-100', text: 'text-red-700', label: 'Invalid' },
      failed: { bg: 'bg-red-100', text: 'text-red-700', label: 'Failed' },
      manual_review: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Manual Review' },
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading onboarding status...</p>
        </div>
      </div>
    );
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {(['company', 'documents', 'review'] as const).map((step, index) => (
        <React.Fragment key={step}>
          <button
            onClick={() => {
              if (onboardingStatus?.status === 'draft' || onboardingStatus?.status === 'rejected') {
                setCurrentStep(step);
              }
            }}
            disabled={onboardingStatus?.status !== 'draft' && onboardingStatus?.status !== 'rejected'}
            className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
              currentStep === step
                ? 'border-blue-600 bg-blue-600 text-white'
                : step === 'company' && onboardingStatus?.companyDetailsComplete
                ? 'border-green-500 bg-green-500 text-white'
                : step === 'documents' && onboardingStatus?.documentsComplete
                ? 'border-green-500 bg-green-500 text-white'
                : 'border-gray-300 text-gray-500'
            } ${
              onboardingStatus?.status === 'draft' || onboardingStatus?.status === 'rejected'
                ? 'cursor-pointer hover:opacity-80'
                : 'cursor-not-allowed'
            }`}
          >
            {(step === 'company' && onboardingStatus?.companyDetailsComplete) ||
            (step === 'documents' && onboardingStatus?.documentsComplete) ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              index + 1
            )}
          </button>
          {index < 2 && (
            <div
              className={`w-20 h-1 ${
                (step === 'company' && onboardingStatus?.companyDetailsComplete) ||
                (step === 'documents' && onboardingStatus?.documentsComplete)
                  ? 'bg-green-500'
                  : 'bg-gray-300'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderStatusPage = () => (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Onboarding Status</h2>
          {onboardingStatus && getStatusBadge(onboardingStatus.status)}
        </div>

        {onboardingStatus?.status === 'rejected' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-medium text-red-800 mb-2">Action Required</h3>
            <p className="text-red-700 mb-2">
              <strong>Reason:</strong> {onboardingStatus.rejectionReason}
            </p>
            {onboardingStatus.remediationSteps && (
              <p className="text-red-700">
                <strong>Steps to fix:</strong> {onboardingStatus.remediationSteps}
              </p>
            )}
            <button
              onClick={() => setCurrentStep('company')}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Update Application
            </button>
          </div>
        )}

        {(onboardingStatus?.status === 'submitted' || onboardingStatus?.status === 'under_review') && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="text-lg font-medium text-blue-800">Application Under Review</h3>
                <p className="mt-1 text-blue-700">
                  Your onboarding application has been submitted and is being reviewed by our team.
                  We&apos;ll notify you via email once a decision has been made.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Company Details</span>
              {onboardingStatus?.companyDetailsComplete ? (
                <span className="text-green-600 flex items-center">
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Complete
                </span>
              ) : (
                <span className="text-yellow-600">Incomplete</span>
              )}
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Documents</span>
              {onboardingStatus?.documentsComplete ? (
                <span className="text-green-600 flex items-center">
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Complete
                </span>
              ) : (
                <span className="text-yellow-600">Incomplete</span>
              )}
            </div>
          </div>
        </div>

        {onboardingStatus?.status === 'draft' && (
          <div className="mt-6">
            <button
              onClick={() => setCurrentStep('company')}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Continue Onboarding
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderCompanyStep = () => (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Company Information</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Legal Company Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={companyData.legalName}
            onChange={(e) => handleCompanyChange('legalName', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Trading Name</label>
          <input
            type="text"
            value={companyData.tradingName}
            onChange={(e) => handleCompanyChange('tradingName', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Registration Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={companyData.registrationNumber}
            onChange={(e) => handleCompanyChange('registrationNumber', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">VAT Number</label>
          <input
            type="text"
            value={companyData.vatNumber}
            onChange={(e) => handleCompanyChange('vatNumber', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Primary Phone <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={companyData.primaryPhone}
            onChange={(e) => handleCompanyChange('primaryPhone', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Street Address <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={companyData.streetAddress}
            onChange={(e) => handleCompanyChange('streetAddress', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            City <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={companyData.city}
            onChange={(e) => handleCompanyChange('city', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Province/State <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={companyData.provinceState}
            onChange={(e) => handleCompanyChange('provinceState', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Postal Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={companyData.postalCode}
            onChange={(e) => handleCompanyChange('postalCode', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Country <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={companyData.country}
            onChange={(e) => handleCompanyChange('country', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex justify-between mt-8">
        <button
          onClick={() => setCurrentStep('status')}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={handleSaveCompany}
          disabled={isSubmitting}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isSubmitting ? 'Saving...' : 'Save & Continue'}
        </button>
      </div>
    </div>
  );

  const renderDocumentsStep = () => (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Required Documents</h2>
      <p className="text-gray-600 mb-6">
        Please upload the following documents. All required documents must be uploaded before submitting.
      </p>

      {uploadError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{uploadError}</p>
        </div>
      )}

      <div className="space-y-4">
        {DOCUMENT_TYPES.map((docType) => {
          const uploadedDoc = getDocumentForType(docType.value);
          return (
            <div key={docType.value} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">
                    {docType.label}
                    {docType.required && <span className="text-red-500 ml-1">*</span>}
                  </h3>
                  {uploadedDoc && (
                    <div className="mt-1 flex items-center text-sm text-gray-600">
                      <span className="mr-2">{uploadedDoc.fileName}</span>
                      {getValidationStatusBadge(uploadedDoc.validationStatus)}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {uploadedDoc ? (
                    <>
                      <a
                        href={customerDocumentApi.getDownloadUrl(uploadedDoc.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                      >
                        View
                      </a>
                      <button
                        onClick={() => handleDeleteDocument(uploadedDoc.id)}
                        className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <label className="cursor-pointer">
                      <span
                        className={`px-4 py-2 text-sm font-medium rounded-md ${
                          uploadingDoc === docType.value
                            ? 'bg-gray-200 text-gray-500'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      >
                        {uploadingDoc === docType.value ? 'Uploading...' : 'Upload'}
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileUpload(e, docType.value)}
                        disabled={uploadingDoc !== null}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between mt-8">
        <button
          onClick={() => setCurrentStep('company')}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={() => setCurrentStep('review')}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Continue to Review
        </button>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Review & Submit</h2>

      <div className="space-y-6">
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-gray-900">Company Details</h3>
            {onboardingStatus?.companyDetailsComplete ? (
              <span className="text-green-600">Complete</span>
            ) : (
              <span className="text-red-600">Incomplete</span>
            )}
          </div>
          {!onboardingStatus?.companyDetailsComplete && (
            <button
              onClick={() => setCurrentStep('company')}
              className="text-sm text-blue-600 hover:underline"
            >
              Complete company details
            </button>
          )}
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-gray-900">Documents</h3>
            {onboardingStatus?.documentsComplete ? (
              <span className="text-green-600">Complete</span>
            ) : (
              <span className="text-red-600">Incomplete</span>
            )}
          </div>
          <div className="mt-2 space-y-1">
            {onboardingStatus?.requiredDocuments.map((doc) => (
              <div key={doc.type} className="flex items-center text-sm">
                {doc.uploaded ? (
                  <svg className="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <span className={doc.uploaded ? 'text-gray-700' : 'text-red-600'}>{doc.label}</span>
              </div>
            ))}
          </div>
          {!onboardingStatus?.documentsComplete && (
            <button
              onClick={() => setCurrentStep('documents')}
              className="mt-2 text-sm text-blue-600 hover:underline"
            >
              Upload missing documents
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex justify-between mt-8">
        <button
          onClick={() => setCurrentStep('documents')}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={handleSubmitOnboarding}
          disabled={
            isSubmitting ||
            !onboardingStatus?.companyDetailsComplete ||
            !onboardingStatus?.documentsComplete
          }
          className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Submitting...' : 'Submit for Review'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Customer Onboarding</h1>
        <p className="text-gray-600">Complete your registration to access all features</p>
      </div>

      {currentStep !== 'status' && renderStepIndicator()}

      {currentStep === 'status' && renderStatusPage()}
      {currentStep === 'company' && renderCompanyStep()}
      {currentStep === 'documents' && renderDocumentsStep()}
      {currentStep === 'review' && renderReviewStep()}
    </div>
  );
}
