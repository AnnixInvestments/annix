"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect } from "react";
import { queryClient } from "./queryClient";

const DEVTOOLS_BTN_POSITION_KEY = "tsqd-btn-position";

function useDraggableDevtoolsButton() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    let cleanupDrag: (() => void) | null = null;

    const attachDrag = (btn: HTMLElement) => {
      const saved = localStorage.getItem(DEVTOOLS_BTN_POSITION_KEY);
      if (saved) {
        try {
          const { x, y } = JSON.parse(saved);
          btn.style.setProperty("left", `${x}px`, "important");
          btn.style.setProperty("top", `${y}px`, "important");
          btn.style.setProperty("bottom", "auto", "important");
          btn.style.setProperty("right", "auto", "important");
        } catch {
          // ignore corrupt storage
        }
      }

      let dragging = false;
      let startX = 0;
      let startY = 0;
      let origX = 0;
      let origY = 0;

      const onDown = (e: PointerEvent) => {
        dragging = false;
        startX = e.clientX;
        startY = e.clientY;
        const rect = btn.getBoundingClientRect();
        origX = rect.left;
        origY = rect.top;
        document.addEventListener("pointermove", onMove);
        document.addEventListener("pointerup", onUp);
      };

      const onMove = (e: PointerEvent) => {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (!dragging && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
          dragging = true;
        }
        if (dragging) {
          const x = Math.max(0, Math.min(window.innerWidth - 50, origX + dx));
          const y = Math.max(0, Math.min(window.innerHeight - 50, origY + dy));
          btn.style.setProperty("left", `${x}px`, "important");
          btn.style.setProperty("top", `${y}px`, "important");
          btn.style.setProperty("bottom", "auto", "important");
          btn.style.setProperty("right", "auto", "important");
        }
      };

      const onUp = () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        if (dragging) {
          const rect = btn.getBoundingClientRect();
          localStorage.setItem(
            DEVTOOLS_BTN_POSITION_KEY,
            JSON.stringify({ x: rect.left, y: rect.top }),
          );
          const preventClick = (e: Event) => {
            e.stopPropagation();
            e.stopImmediatePropagation();
            e.preventDefault();
          };
          btn.addEventListener("click", preventClick, { capture: true, once: true });
        }
        dragging = false;
      };

      btn.addEventListener("pointerdown", onDown);

      return () => {
        btn.removeEventListener("pointerdown", onDown);
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
      };
    };

    const observer = new MutationObserver(() => {
      const btn = document.querySelector(".tsqd-open-btn-container") as HTMLElement | null;
      if (btn && !btn.dataset.draggable) {
        btn.dataset.draggable = "true";
        cleanupDrag?.();
        cleanupDrag = attachDrag(btn);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    const btn = document.querySelector(".tsqd-open-btn-container") as HTMLElement | null;
    if (btn && !btn.dataset.draggable) {
      btn.dataset.draggable = "true";
      cleanupDrag = attachDrag(btn);
    }

    return () => {
      observer.disconnect();
      cleanupDrag?.();
    };
  }, []);
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const client = queryClient();
  useDraggableDevtoolsButton();

  return (
    <QueryClientProvider client={client}>
      {children}
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
