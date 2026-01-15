'use client';

import React, { useState } from 'react';
import Image from 'next/image';

export interface NixClarification {
  id: number;
  question: string;
  context: {
    rowNumber?: number;
    itemNumber?: string;
    itemDescription?: string;
    itemType?: string;
    extractedMaterial?: string | null;
    extractedDiameter?: number | null;
    extractedLength?: number | null;
    extractedAngle?: number | null;
    extractedFlangeConfig?: string | null;
    extractedQuantity?: number;
    confidence?: number;
    clarificationReason?: string | null;
  };
}

interface NixClarificationPopupProps {
  clarification: NixClarification | null;
  totalClarifications: number;
  currentIndex: number;
  onSubmit: (clarificationId: number, response: string) => void;
  onSkip: (clarificationId: number) => void;
  onClose: () => void;
}

export default function NixClarificationPopup({
  clarification,
  totalClarifications,
  currentIndex,
  onSubmit,
  onSkip,
  onClose,
}: NixClarificationPopupProps) {
  const [response, setResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!clarification) return null;

  const handleSubmit = async () => {
    if (!response.trim()) return;
    setIsSubmitting(true);
    await onSubmit(clarification.id, response.trim());
    setResponse('');
    setIsSubmitting(false);
  };

  const handleSkip = async () => {
    setIsSubmitting(true);
    await onSkip(clarification.id);
    setResponse('');
    setIsSubmitting(false);
  };

  const ctx = clarification.context;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden animate-in fade-in zoom-in duration-300">
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ backgroundColor: '#323288' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-orange-400">
              <Image
                src="/nix-avatar.png"
                alt="Nix"
                width={48}
                height={48}
                className="object-cover object-top scale-125"
              />
            </div>
            <div>
              <h3 className="text-white font-semibold">Nix needs your help</h3>
              <p className="text-white/70 text-sm">
                Question {currentIndex + 1} of {totalClarifications}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">
          {ctx.rowNumber && (
            <div className="mb-3 flex items-center gap-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">
                Row {ctx.rowNumber}
              </span>
              {ctx.itemNumber && (
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                  {ctx.itemNumber}
                </span>
              )}
              {ctx.itemType && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm capitalize">
                  {ctx.itemType}
                </span>
              )}
            </div>
          )}

          {ctx.itemDescription && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-500 mb-1">From document:</p>
              <p className="text-gray-800 text-sm font-mono">
                {ctx.itemDescription}
              </p>
            </div>
          )}

          <div className="mb-4">
            <p className="text-gray-800 whitespace-pre-wrap">
              {clarification.question.split('\n').map((line, i) => (
                <span key={i}>
                  {line}
                  <br />
                </span>
              ))}
            </p>
          </div>

          {(ctx.extractedMaterial || ctx.extractedDiameter) && (
            <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm text-orange-700 font-medium mb-2">What I extracted:</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {ctx.extractedMaterial && (
                  <div>
                    <span className="text-gray-500">Material:</span>{' '}
                    <span className="font-medium">{ctx.extractedMaterial}</span>
                  </div>
                )}
                {ctx.extractedDiameter && (
                  <div>
                    <span className="text-gray-500">Diameter:</span>{' '}
                    <span className="font-medium">{ctx.extractedDiameter}mm</span>
                  </div>
                )}
                {ctx.extractedLength && (
                  <div>
                    <span className="text-gray-500">Length:</span>{' '}
                    <span className="font-medium">{ctx.extractedLength}mm</span>
                  </div>
                )}
                {ctx.extractedAngle && (
                  <div>
                    <span className="text-gray-500">Angle:</span>{' '}
                    <span className="font-medium">{ctx.extractedAngle}deg</span>
                  </div>
                )}
                {ctx.extractedQuantity && (
                  <div>
                    <span className="text-gray-500">Quantity:</span>{' '}
                    <span className="font-medium">{ctx.extractedQuantity}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your response:
            </label>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Type your answer here to help Nix understand..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-lg font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Skip this one
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !response.trim()}
              className="flex-1 py-3 px-4 rounded-lg font-medium text-white transition-colors disabled:opacity-50 hover:opacity-90"
              style={{ backgroundColor: '#FFA500' }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Answer'}
            </button>
          </div>

          <p className="mt-3 text-xs text-gray-400 text-center">
            Your answers help Nix learn and improve for future extractions
          </p>
        </div>

        <div className="h-1" style={{ backgroundColor: '#FFA500' }} />
      </div>
    </div>
  );
}
