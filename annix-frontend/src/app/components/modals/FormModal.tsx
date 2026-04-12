"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title: string;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  submitDisabled?: boolean;
  error?: string | null;
  maxWidth?: string;
  hideFooter?: boolean;
  headerRight?: ReactNode;
  children: ReactNode;
}

export function FormModal(props: FormModalProps) {
  const propsSubmitLabel = props.submitLabel;
  const submitLabel = propsSubmitLabel ? propsSubmitLabel : "Save";
  const propsCancelLabel = props.cancelLabel;
  const cancelLabel = propsCancelLabel ? propsCancelLabel : "Cancel";
  const propsLoading = props.loading;
  const loading = propsLoading ? propsLoading : false;
  const propsSubmitDisabled = props.submitDisabled;
  const submitDisabled = propsSubmitDisabled ? propsSubmitDisabled : false;
  const propsMaxWidth = props.maxWidth;
  const maxWidth = propsMaxWidth ? propsMaxWidth : "max-w-lg";
  const propsHideFooter = props.hideFooter;
  const hideFooter = propsHideFooter ? propsHideFooter : false;
  const propsError = props.error;
  const error = propsError ? propsError : null;

  const isOpen = props.isOpen;
  const onClose = props.onClose;
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      cancelRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="form-modal-title"
    >
      <div
        className="fixed inset-0 bg-black/10 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative bg-white rounded-lg shadow-xl ${maxWidth} w-full max-h-[90vh] overflow-hidden flex flex-col`}
      >
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 id="form-modal-title" className="text-lg font-semibold text-gray-900">
            {props.title}
          </h2>
          <div className="flex items-center gap-2">
            {props.headerRight}
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
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

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}
          {props.children}
        </div>

        {!hideFooter && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
            <button
              ref={cancelRef}
              type="button"
              onClick={onClose}
              disabled={loading}
              className={`px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={props.onSubmit}
              disabled={loading || submitDisabled}
              className={`px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 ${loading || submitDisabled ? "cursor-not-allowed" : ""}`}
            >
              {loading ? "Saving..." : submitLabel}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
