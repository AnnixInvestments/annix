"use client";

import Image from "next/image";
import AmixLogo from "@/app/components/AmixLogo";

interface NixAiPopupProps {
  isVisible: boolean;
  onYes: () => void;
  onNo: () => void;
}

export default function NixAiPopup({ isVisible, onYes, onNo }: NixAiPopupProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-x-0 top-16 bottom-16 z-[9999] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
      />

      <div className="relative bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in duration-300">
        <div
          className="px-4 py-3 flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "#323288" }}
        >
          <AmixLogo size="md" showText useSignatureFont />
        </div>

        <div className="px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 flex-shrink-0 rounded-full overflow-hidden shadow-lg border-3 border-orange-400">
              <Image
                src="/nix-avatar.png"
                alt="Nix AI Assistant"
                width={64}
                height={64}
                className="object-cover object-top scale-125"
                priority
              />
            </div>

            <div className="flex-1 text-left">
              <h2 className="text-base sm:text-lg font-bold text-gray-900">
                Meet Nix - Your AI Assistant
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Would you like Nix to read your tender documents and automatically populate the RFQ?
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={onNo}
              className="flex-1 py-2.5 px-4 rounded-lg font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all duration-200 text-sm"
            >
              No, Thanks
            </button>
            <button
              onClick={onYes}
              className="flex-1 py-2.5 px-4 rounded-lg font-semibold text-white transition-all duration-200 hover:opacity-90 hover:shadow-lg active:scale-[0.98] text-sm"
              style={{ backgroundColor: "#FFA500" }}
            >
              Yes, Use Nix
            </button>
          </div>

          <p className="mt-2 text-xs text-gray-400 text-center">
            You can stop using Nix at anytime
          </p>
        </div>

        <div className="h-1 flex-shrink-0" style={{ backgroundColor: "#FFA500" }} />
      </div>
    </div>
  );
}
