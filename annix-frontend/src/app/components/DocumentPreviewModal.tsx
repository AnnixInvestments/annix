'use client';

import { useEffect } from 'react';

export interface PreviewModalState {
  isOpen: boolean;
  url: string | null;
  mimeType: string | null;
  filename: string | null;
  isLoading: boolean;
}

export const initialPreviewState: PreviewModalState = {
  isOpen: false,
  url: null,
  mimeType: null,
  filename: null,
  isLoading: false,
};

interface DocumentPreviewModalProps {
  state: PreviewModalState;
  onClose: () => void;
}

export function DocumentPreviewModal({ state, onClose }: DocumentPreviewModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state.isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [state.isOpen, onClose]);

  if (!state.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div
          className="fixed inset-0 bg-black/10 backdrop-blur-sm"
          onClick={onClose}
        />

        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900 truncate">
              {state.filename || 'Document Preview'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-auto p-4 min-h-[400px] flex items-center justify-center bg-gray-100">
            {state.isLoading ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading document...</p>
              </div>
            ) : state.url && state.mimeType?.startsWith('image/') ? (
              <img
                src={state.url}
                alt={state.filename || 'Document'}
                className="max-w-full max-h-[70vh] object-contain"
              />
            ) : state.url && state.mimeType === 'application/pdf' ? (
              <iframe
                src={state.url}
                className="w-full h-[70vh]"
                title={state.filename || 'PDF Document'}
              />
            ) : (
              <div className="text-center text-gray-600">
                <p>Preview not available for this file type.</p>
                <p className="text-sm mt-2">Please download the file to view it.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
