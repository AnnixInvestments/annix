"use client";

import { createPortal } from "react-dom";

interface SourceFileModalProps {
  isOpen: boolean;
  sourceFileUrl: string | null;
  sourceFileName: string | null;
  onClose: () => void;
}

export function SourceFileModal(props: SourceFileModalProps) {
  const isOpen = props.isOpen;
  const sourceFileUrl = props.sourceFileUrl;
  const sourceFileName = props.sourceFileName;
  const onClose = props.onClose;

  if (!isOpen || !sourceFileUrl) return null;

  const title = sourceFileName || "Source File";
  const downloadName = sourceFileName || "source-file";
  const extension = (sourceFileName || "").toLowerCase();

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-black/10 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Original Job Card — {title}</h3>
          <div className="flex items-center gap-3">
            <a
              href={sourceFileUrl}
              download={downloadName}
              className="px-3 py-1.5 text-sm font-medium rounded-md bg-teal-600 text-white hover:bg-teal-700"
            >
              Download
            </a>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
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
        <div className="flex-1 overflow-auto p-2">
          {extension.endsWith(".pdf") ? (
            <iframe
              src={sourceFileUrl}
              className="w-full h-[75vh] border-0 rounded"
              title="Original Job Card"
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <svg
                className="w-16 h-16 mb-4 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-sm mb-4">Preview not available for this file type</p>
              <a
                href={sourceFileUrl}
                download={downloadName}
                className="px-4 py-2 text-sm font-medium rounded-md bg-teal-600 text-white hover:bg-teal-700"
              >
                Download File
              </a>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
