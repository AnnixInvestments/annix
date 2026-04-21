"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useStockControlBranding } from "./StockControlBrandingContext";

interface ErrorModalState {
  title: string;
  message: string;
}

interface ErrorModalContextType {
  showError: (title: string, message: string) => void;
}

const ErrorModalContext = createContext<ErrorModalContextType | undefined>(undefined);

export function useErrorModal() {
  const context = useContext(ErrorModalContext);
  if (context === undefined) {
    throw new Error("useErrorModal must be used within an ErrorModalProvider");
  }
  return context;
}

function ErrorModalDialog(props: { error: ErrorModalState; onClose: () => void }) {
  const { colors, logoUrl } = useStockControlBranding();
  const closeRef = useRef<HTMLButtonElement>(null);
  const onClose = props.onClose;

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="error-modal-title"
    >
      <div
        className="fixed inset-0 bg-black/10 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        <div
          className="px-6 py-4 flex items-center space-x-3"
          style={{ backgroundColor: colors.background }}
        >
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-8 w-8 rounded object-contain bg-white/20" />
          ) : (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <svg
                className="w-5 h-5"
                style={{ color: colors.text }}
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
            </div>
          )}
          <h3
            id="error-modal-title"
            className="text-lg font-semibold"
            style={{ color: colors.text }}
          >
            {props.error.title}
          </h3>
        </div>

        <div className="px-6 py-5">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mt-0.5">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {props.error.message}
            </p>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 flex justify-end">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors"
            style={{
              backgroundColor: colors.background,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = colors.hover;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = colors.background;
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function ErrorModalProvider(props: { children: ReactNode }) {
  const { children } = props;
  const [error, setError] = useState<ErrorModalState | null>(null);

  const showError = useCallback((title: string, message: string) => {
    setError({ title, message });
  }, []);

  const handleClose = useCallback(() => {
    setError(null);
  }, []);

  return (
    <ErrorModalContext.Provider value={{ showError }}>
      {children}
      {error && <ErrorModalDialog error={error} onClose={handleClose} />}
    </ErrorModalContext.Provider>
  );
}
