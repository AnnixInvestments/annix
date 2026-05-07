"use client";

import React from "react";
import { DocumentDropzone, type PendingDocument } from "./DocumentDropzone";

export type DocumentBucketTone = "blue" | "purple" | "indigo" | "teal";

const toneStyles: Record<
  DocumentBucketTone,
  {
    container: string;
    iconBg: string;
    confirmButton: string;
    divider: string;
  }
> = {
  blue: {
    container: "from-blue-50 to-cyan-50 border-blue-200",
    iconBg: "bg-blue-600",
    confirmButton: "bg-blue-600 hover:bg-blue-700",
    divider: "border-blue-200",
  },
  purple: {
    container: "from-purple-50 to-indigo-50 border-purple-200",
    iconBg: "bg-purple-600",
    confirmButton: "bg-purple-600 hover:bg-purple-700",
    divider: "border-purple-200",
  },
  indigo: {
    container: "from-indigo-50 to-blue-50 border-indigo-200",
    iconBg: "bg-indigo-600",
    confirmButton: "bg-indigo-600 hover:bg-indigo-700",
    divider: "border-indigo-200",
  },
  teal: {
    container: "from-teal-50 to-emerald-50 border-teal-200",
    iconBg: "bg-teal-600",
    confirmButton: "bg-teal-600 hover:bg-teal-700",
    divider: "border-teal-200",
  },
};

const documentIcon = (
  <svg
    className="w-4 h-4 text-white"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

export interface DocumentBucketProps {
  id: string;
  title: string;
  subtitle?: string;
  tone?: DocumentBucketTone;
  icon?: React.ReactNode;
  documents: PendingDocument[];
  onAddDocument: (file: File) => void;
  onRemoveDocument: (id: string) => void;
  isConfirmed: boolean;
  onConfirm: () => void;
  onUnconfirm: () => void;
  onConfirmEmpty?: () => void;
  isProcessing?: boolean;
  processingLabel?: string;
  confirmLabel?: string;
  maxDocuments?: number;
  maxFileSizeMB?: number;
}

export function DocumentBucket(props: DocumentBucketProps) {
  const {
    title,
    subtitle,
    tone = "blue",
    icon,
    documents,
    onAddDocument,
    onRemoveDocument,
    isConfirmed,
    onConfirm,
    onUnconfirm,
    onConfirmEmpty,
    isProcessing = false,
    processingLabel = "Processing...",
    confirmLabel = "Confirm",
    maxDocuments = 10,
    maxFileSizeMB = 50,
  } = props;

  const styles = toneStyles[tone];
  const fileCount = documents.length;

  const handleConfirmClick = () => {
    if (fileCount === 0) {
      if (onConfirmEmpty) onConfirmEmpty();
      return;
    }
    onConfirm();
  };

  return (
    <div className={`bg-gradient-to-r ${styles.container} rounded-lg p-3 border`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 ${styles.iconBg} rounded`}>{icon ?? documentIcon}</div>
        <div>
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          {subtitle && <p className="text-xs text-gray-600">{subtitle}</p>}
        </div>
      </div>

      {!isConfirmed ? (
        <>
          <DocumentDropzone
            documents={documents}
            onAddDocument={onAddDocument}
            onRemoveDocument={onRemoveDocument}
            maxDocuments={maxDocuments}
            maxFileSizeMB={maxFileSizeMB}
          />

          <div className={`mt-3 pt-2 border-t ${styles.divider}`}>
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleConfirmClick}
              className={`px-4 py-2 ${styles.confirmButton} text-white rounded-lg font-semibold flex items-center gap-2 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isProcessing ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {processingLabel}
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {confirmLabel}
                </>
              )}
            </button>
          </div>
        </>
      ) : (
        <div className="bg-green-50 border border-green-400 rounded-lg p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Confirmed ({fileCount} file{fileCount !== 1 ? "s" : ""})
            </div>
            <button
              type="button"
              onClick={onUnconfirm}
              className="text-blue-600 hover:text-blue-800 text-xs font-medium underline"
            >
              Edit
            </button>
          </div>
          {fileCount > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {documents.map((doc) => {
                const name = doc.file.name;
                const truncated = name.length > 20 ? `${name.substring(0, 20)}...` : name;
                return (
                  <span
                    key={doc.id}
                    className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded flex items-center gap-1"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                    {truncated}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
