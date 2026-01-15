'use client';

import React from 'react';
import Image from 'next/image';
import AmixLogo from '../AmixLogo';

interface NixAiPopupProps {
  isVisible: boolean;
  onYes: () => void;
  onNo: () => void;
}

export default function NixAiPopup({ isVisible, onYes, onNo }: NixAiPopupProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center py-16 sm:py-20 md:py-24">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in duration-300 max-h-[calc(100vh-8rem)] sm:max-h-[calc(100vh-10rem)] flex flex-col">
        <div
          className="px-6 py-4 sm:px-8 sm:py-5 flex flex-col items-center flex-shrink-0"
          style={{ backgroundColor: '#323288' }}
        >
          <AmixLogo size="lg" showText useSignatureFont />
        </div>

        <div className="px-6 py-4 sm:px-8 sm:py-5 text-center overflow-y-auto flex-1">
          <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden mb-3 sm:mb-4 shadow-lg border-4 border-orange-400">
            <Image
              src="/nix-avatar.png"
              alt="Nix AI Assistant"
              width={96}
              height={96}
              className="object-cover object-top scale-125"
              priority
            />
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
            Meet Nix - Your AI Assistant
          </h2>

          <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
            Would you like Nix to read your tender documents and drawings to automatically populate the RFQ form for you?
          </p>

          <div className="flex gap-3">
            <button
              onClick={onNo}
              className="flex-1 py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all duration-200 text-sm sm:text-base"
            >
              No, Thanks
            </button>
            <button
              onClick={onYes}
              className="flex-1 py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-semibold text-white transition-all duration-200 hover:opacity-90 hover:shadow-lg active:scale-[0.98] text-sm sm:text-base"
              style={{ backgroundColor: '#FFA500' }}
            >
              Yes, Use Nix
            </button>
          </div>

          <p className="mt-3 sm:mt-4 text-xs text-gray-400">
            Customer can choose to stop using Nix at anytime
          </p>
        </div>

        <div
          className="h-1.5 flex-shrink-0"
          style={{ backgroundColor: '#FFA500' }}
        />
      </div>
    </div>
  );
}
