"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export type ConfirmModalVariant = "danger" | "warning" | "info" | "default";

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmModalVariant;
  cancelFocusRingClass?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const VARIANT_STYLES = {
  danger: {
    icon: "text-red-600",
    iconBg: "bg-red-100",
    button: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
  },
  warning: {
    icon: "text-amber-600",
    iconBg: "bg-amber-100",
    button: "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500",
  },
  info: {
    icon: "text-blue-600",
    iconBg: "bg-blue-100",
    button: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
  },
  default: {
    icon: "text-blue-600",
    iconBg: "bg-blue-100",
    button: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
  },
};

export function ConfirmModal(props: ConfirmModalProps) {
  const confirmLabel = props.confirmLabel ?? "Confirm";
  const cancelLabel = props.cancelLabel ?? "Cancel";
  const variant = props.variant ?? "danger";
  const cancelFocusRingClass = props.cancelFocusRingClass ?? "focus:ring-blue-500";
  const loading = props.loading ?? false;
  const cancelRef = useRef<HTMLButtonElement>(null);

  const isOpen = props.isOpen;
  const onCancel = props.onCancel;

  useEffect(() => {
    if (isOpen) {
      cancelRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const styles = VARIANT_STYLES[variant];

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className="fixed inset-0 bg-black/10 backdrop-blur-md"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
        <div className="p-6">
          <div className="flex items-start space-x-4">
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-full ${styles.iconBg} flex items-center justify-center`}
            >
              {variant === "danger" && (
                <svg
                  className={`w-6 h-6 ${styles.icon}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              )}
              {variant === "warning" && (
                <svg
                  className={`w-6 h-6 ${styles.icon}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              )}
              {(variant === "info" || variant === "default") && (
                <svg
                  className={`w-6 h-6 ${styles.icon}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <h3 id="confirm-modal-title" className="text-lg font-medium text-gray-900">
                {props.title}
              </h3>
              <p className="mt-2 text-sm text-gray-500 whitespace-pre-line">{props.message}</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 ${cancelFocusRingClass} ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={props.onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${styles.button} ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {loading ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
