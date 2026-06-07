"use client";

import { useCallback, useRef, useState } from "react";
import { ConfirmModal } from "@/app/components/modals/ConfirmModal";

export type AlertVariant = "success" | "error" | "info" | "warning";

export interface AlertOptions {
  message: string;
  title?: string;
  confirmLabel?: string;
  variant?: AlertVariant;
}

interface AlertState extends AlertOptions {
  resolve: () => void;
}

const DEFAULT_TITLES: Record<AlertVariant, string> = {
  success: "Success",
  error: "Something went wrong",
  warning: "Heads up",
  info: "Notice",
};

export function useAlert() {
  const [state, setState] = useState<AlertState | null>(null);
  const resolveRef = useRef<(() => void) | null>(null);

  const alert = useCallback((options: AlertOptions): Promise<void> => {
    return new Promise<void>((resolve) => {
      resolveRef.current = resolve;
      setState({ ...options, resolve });
    });
  }, []);

  const handleAcknowledge = useCallback(() => {
    resolveRef.current?.();
    resolveRef.current = null;
    setState(null);
  }, []);

  const rawTitle = state?.title;
  const rawMessage = state?.message;
  const rawConfirmLabel = state?.confirmLabel;
  const rawVariant = state?.variant;
  const variant = rawVariant || "info";
  const fallbackTitle = DEFAULT_TITLES[variant];
  const title = rawTitle || fallbackTitle;

  const AlertDialog = (
    <ConfirmModal
      isOpen={state !== null}
      title={title}
      message={rawMessage || ""}
      confirmLabel={rawConfirmLabel || "OK"}
      variant={variant}
      hideCancel
      onConfirm={handleAcknowledge}
      onCancel={handleAcknowledge}
    />
  );

  return { alert, AlertDialog };
}
