'use client';

import React from 'react';

interface ValidationMismatch {
  field: string;
  expected: string;
  extracted: string;
  similarity?: number;
}

interface DocumentIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: 'vat' | 'registration';
  issueType: 'mismatch' | 'ocr_failed';
  mismatches?: ValidationMismatch[];
  onGoBackToReview: () => void;
  onProceedWithManualReview: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  vatNumber: 'VAT Number',
  registrationNumber: 'Registration Number',
  companyName: 'Company Name',
  streetAddress: 'Street Address',
  city: 'City',
  provinceState: 'Province',
  postalCode: 'Postal Code',
};

export default function DocumentIssueModal({
  isOpen,
  onClose,
  documentType,
  issueType,
  mismatches = [],
  onGoBackToReview,
  onProceedWithManualReview,
}: DocumentIssueModalProps) {
  if (!isOpen) return null;

  const documentLabel = documentType === 'vat' ? 'VAT Registration' : 'Company Registration';
  const isMismatch = issueType === 'mismatch';
  const isOcrFailed = issueType === 'ocr_failed';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isOcrFailed ? 'bg-red-100' : 'bg-yellow-100'}`}>
              <svg
                className={`w-6 h-6 ${isOcrFailed ? 'text-red-600' : 'text-yellow-600'}`}
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
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">
                {isOcrFailed ? 'Document Verification Failed' : 'Document Information Mismatch'}
              </h2>
              <p className="text-sm text-gray-600">
                {isOcrFailed
                  ? `We could not automatically verify your ${documentLabel} document`
                  : `The information in your ${documentLabel} document doesn't match what you entered`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* OCR Failed Message */}
          {isOcrFailed && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex gap-3">
                <svg
                  className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="text-sm text-red-800">
                  <p className="font-medium mb-2">Unable to Read Document</p>
                  <p className="mb-2">
                    Our system couldn't automatically extract information from your document. This could be because:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>The document is unclear or low quality</li>
                    <li>The document format is not supported</li>
                    <li>The text in the document is not readable</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Mismatches Table */}
          {isMismatch && mismatches.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Mismatched Information</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Field
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        You Entered
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Found in Document
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {mismatches.map((mismatch, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {FIELD_LABELS[mismatch.field] || mismatch.field}
                          {mismatch.similarity !== undefined && (
                            <div className="text-xs text-gray-500 mt-1">
                              {mismatch.similarity}% match
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div className="font-mono bg-red-50 border border-red-200 rounded px-2 py-1 inline-block">
                            {mismatch.expected || <span className="text-gray-400 italic">Not provided</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div className="font-mono bg-green-50 border border-green-200 rounded px-2 py-1 inline-block">
                            {mismatch.extracted}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Your Options */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex gap-3">
              <svg
                className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
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
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-2">You have two options:</p>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="font-bold">1.</span>
                    <div>
                      <p className="font-medium">Review and correct your information</p>
                      <p className="text-xs mt-1">
                        Go back to Step 1 and ensure the information you entered matches your documents exactly.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold">2.</span>
                    <div>
                      <p className="font-medium">Proceed with manual verification</p>
                      <p className="text-xs mt-1">
                        Continue registration, but your account will have limited functionality until our team manually verifies your documents (typically within 24-48 hours).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Security Note */}
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex gap-3">
              <svg
                className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Why do we verify documents?</p>
                <p>
                  We verify your documents to ensure the {documentLabel.toLowerCase()} certificate belongs to
                  your company and to prevent fraudulent registrations. This protects both you and our platform.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={onGoBackToReview}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-colors font-semibold shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 17l-5-5m0 0l5-5m-5 5h12"
                />
              </svg>
              Go Back and Review My Information
            </button>
            <button
              onClick={onProceedWithManualReview}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 border-2 border-orange-400 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 hover:border-orange-500 transition-colors font-semibold"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Proceed with Manual Verification (Limited Access)
            </button>
          </div>

          {/* Additional Help Text */}
          <div className="mt-4 text-center text-sm text-gray-600">
            <p>
              Need help?{' '}
              <a href="mailto:support@annix.co.za" className="text-blue-600 hover:text-blue-700 font-medium">
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
