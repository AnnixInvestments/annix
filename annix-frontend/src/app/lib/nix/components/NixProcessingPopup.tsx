'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import AmixLogo from '@/app/components/AmixLogo';

interface NixProcessingPopupProps {
  isVisible: boolean;
  progress: number;
  statusMessage: string;
  estimatedTimeRemaining?: number;
}

export default function NixProcessingPopup({
  isVisible,
  progress,
  statusMessage,
  estimatedTimeRemaining,
}: NixProcessingPopupProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.ceil(seconds)} seconds`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.ceil(seconds % 60);
    return secs > 0 ? `${mins}m ${secs}s` : `${mins} minute${mins > 1 ? 's' : ''}`;
  };

  return (
    <div className="fixed inset-x-0 top-16 bottom-16 z-[9999] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
      />

      <div className="relative bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in duration-300">
        <div
          className="px-4 py-3 flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#323288' }}
        >
          <AmixLogo size="md" showText useSignatureFont />
        </div>

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
                Nix is Reading Your Document{dots}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {statusMessage}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #FFA500 0%, #FF8C00 50%, #FFA500 100%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 2s infinite linear',
                }}
              />
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                  animation: 'shimmer 1.5s infinite',
                }}
              />
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600 font-medium">{Math.round(progress)}% complete</span>
              {estimatedTimeRemaining !== undefined && estimatedTimeRemaining > 0 && (
                <span className="text-gray-500">
                  ~{formatTime(estimatedTimeRemaining)} remaining
                </span>
              )}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Extracting pipe specifications and items...</span>
          </div>
        </div>

        <div
          className="h-1 flex-shrink-0"
          style={{ backgroundColor: '#FFA500' }}
        />
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
}
