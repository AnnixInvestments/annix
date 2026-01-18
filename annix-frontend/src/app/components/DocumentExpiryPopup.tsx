'use client';

import { useState, useEffect } from 'react';
import { useDocumentExpiryCheck, ExpiringDocument } from '../hooks/useDocumentExpiryCheck';
import { formatDateZA } from '../lib/datetime';

interface DocumentExpiryPopupProps {
  userType: 'customer' | 'supplier';
  onUploadDocument?: (documentType: string) => void;
}

const documentTypeLabels: Record<string, string> = {
  registration_cert: 'Company Registration Certificate',
  vat_cert: 'VAT Certificate',
  tax_clearance: 'Tax Clearance Certificate',
  bee_cert: 'BEE Certificate',
  insurance: 'Insurance Certificate',
  proof_of_address: 'Proof of Address',
  iso_cert: 'ISO Certification',
  other: 'Other Document',
};

export function DocumentExpiryPopup({ userType, onUploadDocument }: DocumentExpiryPopupProps) {
  const { expiryResult, hasExpiringDocuments, dismissDocument, dismissAll } = useDocumentExpiryCheck({
    userType,
    enabled: true,
    checkIntervalMs: 300000,
  });

  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (hasExpiringDocuments) {
      setIsExpanded(true);
    }
  }, [hasExpiringDocuments]);

  if (!hasExpiringDocuments || !expiryResult) {
    return null;
  }

  const { expiringSoon, expired } = expiryResult;

  const renderDocument = (doc: ExpiringDocument, isExpired: boolean) => {
    const label = documentTypeLabels[doc.documentType] || doc.documentType;
    const expiryDate = formatDateZA(new Date(doc.expiryDate));

    return (
      <div
        key={doc.id}
        className={`p-3 rounded-lg border ${
          isExpired
            ? 'bg-red-50 border-red-200'
            : 'bg-yellow-50 border-yellow-200'
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className={`font-medium text-sm ${isExpired ? 'text-red-800' : 'text-yellow-800'}`}>
              {label}
            </p>
            <p className={`text-xs mt-1 ${isExpired ? 'text-red-600' : 'text-yellow-600'}`}>
              {isExpired ? (
                <>Expired on {expiryDate}</>
              ) : (
                <>Expires in {doc.daysUntilExpiry} day{doc.daysUntilExpiry !== 1 ? 's' : ''} ({expiryDate})</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-2">
            {onUploadDocument && (
              <button
                onClick={() => onUploadDocument(doc.documentType)}
                className={`px-2 py-1 text-xs font-medium rounded ${
                  isExpired
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-yellow-600 text-white hover:bg-yellow-700'
                }`}
              >
                Upload New
              </button>
            )}
            <button
              onClick={() => dismissDocument(doc.id)}
              className="text-gray-400 hover:text-gray-600"
              title="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        <div
          className={`px-4 py-3 flex items-center justify-between cursor-pointer ${
            expired.length > 0 ? 'bg-red-600' : 'bg-yellow-500'
          }`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="font-medium text-white">
              {expired.length > 0
                ? `${expired.length} Document${expired.length !== 1 ? 's' : ''} Expired`
                : `${expiringSoon.length} Document${expiringSoon.length !== 1 ? 's' : ''} Expiring Soon`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                dismissAll();
              }}
              className="text-white/80 hover:text-white text-xs"
            >
              Dismiss All
            </button>
            <svg
              className={`w-5 h-5 text-white transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {isExpanded && (
          <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
            {expired.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">
                  Expired - Action Required
                </p>
                {expired.map((doc) => renderDocument(doc, true))}
              </div>
            )}

            {expiringSoon.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-yellow-600 uppercase tracking-wide">
                  Expiring Within 30 Days
                </p>
                {expiringSoon.map((doc) => renderDocument(doc, false))}
              </div>
            )}

            <p className="text-xs text-gray-500 text-center pt-2">
              Please upload updated documents to maintain your account status.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
