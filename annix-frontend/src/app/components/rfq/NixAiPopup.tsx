'use client';

import React from 'react';
import AmixLogo from '../AmixLogo';

interface NixAiPopupProps {
  isVisible: boolean;
  onYes: () => void;
  onNo: () => void;
}

export default function NixAiPopup({ isVisible, onYes, onNo }: NixAiPopupProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in duration-300">
        <div
          className="px-8 py-6 flex flex-col items-center"
          style={{ backgroundColor: '#323288' }}
        >
          <AmixLogo size="lg" showText useSignatureFont />
        </div>

        <div className="px-8 py-6 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-orange-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Meet Nix - Your AI Assistant
          </h2>

          <p className="text-gray-600 mb-6">
            Would you like Nix to read your tender documents and drawings to automatically populate the RFQ form for you?
          </p>

          <div className="flex gap-3">
            <button
              onClick={onNo}
              className="flex-1 py-3 px-6 rounded-lg font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all duration-200"
            >
              No, Thanks
            </button>
            <button
              onClick={onYes}
              className="flex-1 py-3 px-6 rounded-lg font-semibold text-white transition-all duration-200 hover:opacity-90 hover:shadow-lg active:scale-[0.98]"
              style={{ backgroundColor: '#FFA500' }}
            >
              Yes, Use Nix
            </button>
          </div>

          <p className="mt-4 text-xs text-gray-400">
            Customer can choose to stop using Nix at anytime
          </p>
        </div>

        <div
          className="h-1.5"
          style={{ backgroundColor: '#FFA500' }}
        />
      </div>
    </div>
  );
}
