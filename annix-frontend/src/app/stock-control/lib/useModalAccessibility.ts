import { useEffect, useRef } from "react";

export function useModalAccessibility(isOpen: boolean, onClose: () => void) {
  const focusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      focusRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  return focusRef;
}
