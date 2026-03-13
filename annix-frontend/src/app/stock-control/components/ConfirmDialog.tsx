"use client";

import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const VARIANT_STYLES = {
  danger: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
  warning: "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500",
  default: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
};

export function ConfirmDialog(props: ConfirmDialogProps) {
  const open = props.open;
  const title = props.title;
  const message = props.message;
  const confirmLabel = props.confirmLabel ?? "Confirm";
  const cancelLabel = props.cancelLabel ?? "Cancel";
  const variant = props.variant ?? "default";
  const loading = props.loading ?? false;
  const onConfirm = props.onConfirm;
  const onCancel = props.onCancel;
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      cancelRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black bg-opacity-50"
          onClick={onCancel}
          aria-hidden="true"
        />
        <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <h3 id="confirm-dialog-title" className="text-lg font-semibold text-gray-900">
            {title}
          </h3>
          <p className="mt-2 text-sm text-gray-600">{message}</p>
          <div className="mt-4 flex justify-end gap-3">
            <button
              ref={cancelRef}
              type="button"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={onCancel}
              disabled={loading}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              className={`rounded-md px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${VARIANT_STYLES[variant]} ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? "..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
