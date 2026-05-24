"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

export interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  hideToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => {
    const rawDuration = toast.duration;
    const timer = setTimeout(() => {
      onClose();
    }, rawDuration || 5000);

    return () => clearTimeout(timer);
  }, [toast.duration, onClose]);

  const accentBorder = {
    success: "border-l-green-500",
    error: "border-l-red-500",
    warning: "border-l-amber-500",
    info: "border-l-[var(--brand-accent,#FF8A00)]",
  }[toast.type];

  const iconClasses = {
    success: "bg-green-100 text-green-600",
    error: "bg-red-100 text-red-600",
    warning: "bg-amber-100 text-amber-600",
    info: "bg-violet-100 text-[var(--brand-accent,#7c3aed)]",
  }[toast.type];

  const icon = {
    success: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  }[toast.type];

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 min-w-[300px] max-w-md rounded-xl border border-gray-200 border-l-4 ${accentBorder} bg-white px-4 py-3 shadow-xl animate-toast-in`}
      role="alert"
    >
      <span
        className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${iconClasses}`}
      >
        {icon}
      </span>
      <p className="flex-1 text-sm font-medium text-gray-900">{toast.message}</p>
      <button
        onClick={onClose}
        aria-label="Dismiss"
        className="flex-shrink-0 text-gray-400 transition-colors hover:text-gray-600"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}

export function ToastProvider(props: { children: React.ReactNode }) {
  const { children } = props;
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "info", duration = 5000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {mounted && (
        <div className="fixed top-4 right-4 z-[10000] flex flex-col items-end space-y-2 pointer-events-none">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onClose={() => hideToast(toast.id)} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
