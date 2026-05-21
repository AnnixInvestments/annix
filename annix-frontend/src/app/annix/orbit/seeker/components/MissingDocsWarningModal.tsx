"use client";

import { createPortal } from "react-dom";

export interface MissingDocsWarningModalProps {
  isOpen: boolean;
  missingQualifications: boolean;
  missingCertificates: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function MissingDocsWarningModal(props: MissingDocsWarningModalProps) {
  if (!props.isOpen) return null;

  const missingItems = [
    props.missingQualifications ? "qualifications" : null,
    props.missingCertificates ? "certificates" : null,
  ].filter((item): item is string => item !== null);
  const missingList = missingItems.join(" and ");

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-black/10 backdrop-blur-md"
        onClick={props.onCancel}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-10 h-10 bg-amber-100 rounded-full flex-shrink-0">
            <svg
              className="w-5 h-5 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0L3.16 16.25A2 2 0 005 19z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">Match accuracy may be reduced</h2>
            <p className="text-sm text-gray-600 mt-2">
              You have not uploaded any {missingList}. Job matches will still work, but they will be
              less accurate without this information. You can add these documents at any time from
              this page.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={props.onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium"
          >
            Add documents
          </button>
          <button
            type="button"
            onClick={props.onConfirm}
            className="px-4 py-2 bg-[#323288] text-white rounded-lg hover:bg-[#252560] text-sm font-medium"
          >
            Continue anyway
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
