"use client";

import { useCallback, useRef, useState } from "react";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

const VARIANT_STYLES = {
  danger: {
    icon: "text-red-600",
    iconBg: "bg-red-100",
    button: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
  },
  warning: {
    icon: "text-yellow-600",
    iconBg: "bg-yellow-100",
    button: "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500",
  },
  default: {
    icon: "text-teal-600",
    iconBg: "bg-teal-100",
    button: "bg-teal-600 hover:bg-teal-700 focus:ring-teal-500",
  },
};

export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({ ...options, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true);
    resolveRef.current = null;
    setState(null);
  }, []);

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false);
    resolveRef.current = null;
    setState(null);
  }, []);

  const ConfirmDialog = state
    ? (() => {
        const styles = VARIANT_STYLES[state.variant ?? "default"];
        return (
          <div
            className="fixed inset-0 z-[9999] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
          >
            <div className="flex min-h-full items-center justify-center p-4">
              <div
                className="fixed inset-0 bg-black bg-opacity-50"
                onClick={handleCancel}
                aria-hidden="true"
              />
              <div className="relative w-full max-w-md rounded-lg bg-white shadow-xl overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start space-x-4">
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-full ${styles.iconBg} flex items-center justify-center`}
                    >
                      {(state.variant ?? "default") === "danger" && (
                        <svg
                          className={`w-6 h-6 ${styles.icon}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      )}
                      {state.variant === "warning" && (
                        <svg
                          className={`w-6 h-6 ${styles.icon}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                      )}
                      {(state.variant ?? "default") === "default" && (
                        <svg
                          className={`w-6 h-6 ${styles.icon}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
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
                      <h3 id="confirm-dialog-title" className="text-lg font-semibold text-gray-900">
                        {state.title}
                      </h3>
                      <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">
                        {state.message}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
                  <button
                    type="button"
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                    onClick={handleCancel}
                  >
                    {state.cancelLabel ?? "Cancel"}
                  </button>
                  <button
                    type="button"
                    className={`rounded-md px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${styles.button}`}
                    onClick={handleConfirm}
                  >
                    {state.confirmLabel ?? "Confirm"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()
    : null;

  return { confirm, ConfirmDialog };
}
