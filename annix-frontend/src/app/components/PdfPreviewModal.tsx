"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface PdfPreviewState {
  isOpen: boolean;
  url: string | null;
  filename: string | null;
  isLoading: boolean;
}

const INITIAL_STATE: PdfPreviewState = {
  isOpen: false,
  url: null,
  filename: null,
  isLoading: false,
};

export function usePdfPreview() {
  const [state, setState] = useState<PdfPreviewState>(INITIAL_STATE);

  const open = useCallback((urlOrBlob: string | Blob, filename: string) => {
    if (urlOrBlob instanceof Blob) {
      const objectUrl = URL.createObjectURL(urlOrBlob);
      setState({ isOpen: true, url: objectUrl, filename, isLoading: false });
    } else {
      setState({ isOpen: true, url: urlOrBlob, filename, isLoading: false });
    }
  }, []);

  const openWithFetch = useCallback(async (fetchFn: () => Promise<Blob>, filename: string) => {
    setState({ isOpen: true, url: null, filename, isLoading: true });
    try {
      const blob = await fetchFn();
      const objectUrl = URL.createObjectURL(blob);
      setState({ isOpen: true, url: objectUrl, filename, isLoading: false });
    } catch {
      setState(INITIAL_STATE);
    }
  }, []);

  const close = useCallback(() => {
    setState((prev) => {
      if (prev.url?.startsWith("blob:")) {
        URL.revokeObjectURL(prev.url);
      }
      return INITIAL_STATE;
    });
  }, []);

  return { state, open, openWithFetch, close };
}

interface PdfPreviewModalProps {
  state: PdfPreviewState;
  onClose: () => void;
}

export function PdfPreviewModal(props: PdfPreviewModalProps) {
  const { state, onClose } = props;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && state.isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [state.isOpen, onClose]);

  if (!state.isOpen) return null;

  const handleDownload = () => {
    if (!state.url || !state.filename) return;
    const link = document.createElement("a");
    link.href = state.url;
    link.download = state.filename;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInTab = () => {
    if (state.url) {
      window.open(state.url, "_blank");
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-4 sm:inset-8 flex flex-col bg-white rounded-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-800 text-white">
          <span className="text-sm font-medium truncate mr-4">
            {state.filename || "PDF Preview"}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleDownload}
              disabled={!state.url}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 rounded transition-colors disabled:opacity-40"
              title="Download"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download
            </button>
            <button
              type="button"
              onClick={handleOpenInTab}
              disabled={!state.url}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/10 hover:bg-white/20 rounded transition-colors disabled:opacity-40"
              title="Open in new tab"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              New Tab
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded transition-colors ml-2"
              title="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 bg-gray-200">
          {state.isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
                <p className="mt-3 text-sm text-gray-600">Loading PDF...</p>
              </div>
            </div>
          ) : state.url ? (
            <iframe
              src={state.url}
              className="w-full h-full border-0"
              title={state.filename || "PDF Preview"}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              Failed to load PDF
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
