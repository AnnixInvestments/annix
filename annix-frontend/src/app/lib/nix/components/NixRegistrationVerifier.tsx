'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import AmixLogo from '@/app/components/AmixLogo';

export type RegistrationDocumentType = 'vat' | 'registration' | 'bee';

export interface FieldVerificationResult {
  field: string;
  expected: string | number | null;
  extracted: string | number | null;
  match: boolean;
  similarity?: number;
  autoCorrectValue?: string | number;
}

export interface ExtractedRegistrationData {
  vatNumber?: string;
  registrationNumber?: string;
  companyName?: string;
  streetAddress?: string;
  city?: string;
  provinceState?: string;
  postalCode?: string;
  beeLevel?: number;
  beeExpiryDate?: string;
  verificationAgency?: string;
  confidence: number;
  fieldsExtracted: string[];
}

export interface AutoCorrection {
  field: string;
  value: string | number;
}

export interface VerificationResult {
  success: boolean;
  documentType: RegistrationDocumentType;
  extractedData: ExtractedRegistrationData;
  fieldResults: FieldVerificationResult[];
  overallConfidence: number;
  allFieldsMatch: boolean;
  autoCorrections: AutoCorrection[];
  warnings: string[];
  ocrMethod: 'pdf-parse' | 'tesseract' | 'ai' | 'none';
  processingTimeMs: number;
  mismatchReport?: string;
}

interface NixRegistrationVerifierProps {
  isVisible: boolean;
  isProcessing: boolean;
  verificationResult: VerificationResult | null;
  documentType: RegistrationDocumentType;
  onApplyCorrections: (corrections: AutoCorrection[]) => void;
  onProceedWithMismatch: () => void;
  onRetryUpload: () => void;
  onClose: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  vatNumber: 'VAT Number',
  registrationNumber: 'Registration Number',
  companyName: 'Company Name',
  streetAddress: 'Street Address',
  city: 'City',
  provinceState: 'Province',
  postalCode: 'Postal Code',
  beeLevel: 'BEE Level',
  beeExpiryDate: 'BEE Expiry Date',
  verificationAgency: 'Verification Agency',
};

const DOCUMENT_TYPE_LABELS: Record<RegistrationDocumentType, string> = {
  vat: 'VAT Certificate',
  registration: 'Company Registration',
  bee: 'BEE Certificate',
};

export default function NixRegistrationVerifier({
  isVisible,
  isProcessing,
  verificationResult,
  documentType,
  onApplyCorrections,
  onProceedWithMismatch,
  onRetryUpload,
  onClose,
}: NixRegistrationVerifierProps) {
  const [dots, setDots] = useState('');
  const [selectedCorrections, setSelectedCorrections] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isVisible || !isProcessing) return;

    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    return () => clearInterval(interval);
  }, [isVisible, isProcessing]);

  useEffect(() => {
    if (verificationResult?.autoCorrections) {
      setSelectedCorrections(new Set(verificationResult.autoCorrections.map(c => c.field)));
    }
  }, [verificationResult]);

  if (!isVisible) return null;

  const toggleCorrection = (field: string) => {
    setSelectedCorrections(prev => {
      const next = new Set(prev);
      if (next.has(field)) {
        next.delete(field);
      } else {
        next.add(field);
      }
      return next;
    });
  };

  const handleApplySelected = () => {
    if (!verificationResult) return;
    const corrections = verificationResult.autoCorrections.filter(c => selectedCorrections.has(c.field));
    onApplyCorrections(corrections);
  };

  const renderProcessing = () => (
    <div className="px-6 py-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 flex-shrink-0 rounded-full overflow-hidden shadow-lg border-3 border-orange-400 relative">
          <Image
            src="/nix-avatar.png"
            alt="Nix AI Assistant"
            width={64}
            height={64}
            className="object-cover object-top scale-125"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-orange-400/20 to-transparent animate-pulse" />
        </div>

        <div className="flex-1 text-left">
          <h2 className="text-lg font-bold text-gray-900">
            Nix is Verifying Your {DOCUMENT_TYPE_LABELS[documentType]}{dots}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Extracting and comparing document information
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: '60%',
              background: 'linear-gradient(90deg, #FFA500 0%, #FF8C00 50%, #FFA500 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 2s infinite linear',
            }}
          />
        </div>
        <p className="text-sm text-gray-500 text-center">Reading document with AI...</p>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );

  const renderSuccess = () => {
    if (!verificationResult) return null;

    return (
      <div className="px-6 py-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 flex-shrink-0 rounded-full overflow-hidden shadow-lg border-3 border-green-400 relative">
            <Image
              src="/nix-avatar.png"
              alt="Nix AI Assistant"
              width={64}
              height={64}
              className="object-cover object-top scale-125"
            />
          </div>
          <div className="flex-1 text-left">
            <h2 className="text-lg font-bold text-green-700">Document Verified Successfully</h2>
            <p className="text-sm text-gray-600 mt-1">
              All fields match your registration information
            </p>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium text-green-800">
                {DOCUMENT_TYPE_LABELS[documentType]} verified
              </p>
              <p className="text-xs text-green-700 mt-1">
                Confidence: {Math.round(verificationResult.overallConfidence * 100)}%
              </p>
            </div>
          </div>
        </div>

        {verificationResult.extractedData.fieldsExtracted.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Extracted Information:</p>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              {verificationResult.fieldResults.map((field) => (
                <div key={field.field} className="flex justify-between text-sm">
                  <span className="text-gray-600">{FIELD_LABELS[field.field] || field.field}:</span>
                  <span className="font-medium text-gray-900">{String(field.extracted)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          Continue
        </button>
      </div>
    );
  };

  const renderMismatch = () => {
    if (!verificationResult) return null;

    const mismatches = verificationResult.fieldResults.filter(f => !f.match);
    const matches = verificationResult.fieldResults.filter(f => f.match);

    return (
      <div className="px-6 py-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 flex-shrink-0 rounded-full overflow-hidden shadow-lg border-3 border-orange-400 relative">
            <Image
              src="/nix-avatar.png"
              alt="Nix AI Assistant"
              width={64}
              height={64}
              className="object-cover object-top scale-125"
            />
          </div>
          <div className="flex-1 text-left">
            <h2 className="text-lg font-bold text-orange-700">Document Review Required</h2>
            <p className="text-sm text-gray-600 mt-1">
              Some information differs from what you entered
            </p>
          </div>
        </div>

        {matches.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Verified Fields
            </p>
            <div className="bg-green-50 rounded-lg p-3 space-y-1">
              {matches.map((field) => (
                <div key={field.field} className="flex justify-between text-sm">
                  <span className="text-green-700">{FIELD_LABELS[field.field] || field.field}:</span>
                  <span className="font-medium text-green-800">{String(field.extracted)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {mismatches.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-orange-700 mb-2 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Differences Found
            </p>
            <div className="space-y-3">
              {mismatches.map((field) => {
                const hasAutoCorrect = verificationResult.autoCorrections.some(c => c.field === field.field);
                const isSelected = selectedCorrections.has(field.field);

                return (
                  <div key={field.field} className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-orange-800">
                        {FIELD_LABELS[field.field] || field.field}
                      </span>
                      {field.similarity !== undefined && (
                        <span className="text-xs text-orange-600">
                          {field.similarity}% similar
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-xs text-gray-500">You entered:</span>
                        <p className="font-medium text-gray-700">{String(field.expected) || '-'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Document shows:</span>
                        <p className="font-medium text-orange-700">{String(field.extracted) || 'Not found'}</p>
                      </div>
                    </div>
                    {hasAutoCorrect && (
                      <label className="flex items-center gap-2 mt-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleCorrection(field.field)}
                          className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                        />
                        <span className="text-xs text-orange-700">
                          Update my form with document value
                        </span>
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {verificationResult.warnings.length > 0 && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm font-medium text-yellow-800 mb-1">Warnings:</p>
            {verificationResult.warnings.map((warning, i) => (
              <p key={i} className="text-xs text-yellow-700">• {warning}</p>
            ))}
          </div>
        )}

        <div className="space-y-2">
          {selectedCorrections.size > 0 && (
            <button
              onClick={handleApplySelected}
              className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
            >
              Apply {selectedCorrections.size} Correction{selectedCorrections.size !== 1 ? 's' : ''} & Continue
            </button>
          )}
          <button
            onClick={onProceedWithMismatch}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            {selectedCorrections.size > 0 ? 'Continue Without Changes' : 'Proceed Anyway (Manual Review Required)'}
          </button>
          <button
            onClick={onRetryUpload}
            className="w-full px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors text-sm"
          >
            Upload a Different Document
          </button>
        </div>
      </div>
    );
  };

  const renderError = () => (
    <div className="px-6 py-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 flex-shrink-0 rounded-full overflow-hidden shadow-lg border-3 border-red-400 relative">
          <Image
            src="/nix-avatar.png"
            alt="Nix AI Assistant"
            width={64}
            height={64}
            className="object-cover object-top scale-125"
          />
        </div>
        <div className="flex-1 text-left">
          <h2 className="text-lg font-bold text-red-700">Unable to Read Document</h2>
          <p className="text-sm text-gray-600 mt-1">
            The document could not be processed
          </p>
        </div>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-red-700">
          {verificationResult?.warnings.join('. ') || 'Document extraction failed. Please ensure the document is clear and readable.'}
        </p>
      </div>

      <div className="space-y-2">
        <button
          onClick={onRetryUpload}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Try Another Document
        </button>
        <button
          onClick={onProceedWithMismatch}
          className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
        >
          Proceed Anyway (Manual Review Required)
        </button>
      </div>
    </div>
  );

  const renderContent = () => {
    if (isProcessing) return renderProcessing();
    if (!verificationResult) return renderProcessing();
    if (!verificationResult.success) return renderError();
    if (verificationResult.allFieldsMatch) return renderSuccess();
    return renderMismatch();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
      />

      <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-300">
        <div
          className="px-4 py-3 flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#323288' }}
        >
          <AmixLogo size="md" showText useSignatureFont />
        </div>

        {renderContent()}

        <div
          className="h-1 flex-shrink-0"
          style={{ backgroundColor: '#FFA500' }}
        />
      </div>
    </div>
  );
}
