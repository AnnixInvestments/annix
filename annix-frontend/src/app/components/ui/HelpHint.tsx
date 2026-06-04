"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function HelpHint(props: { label: string; text: string }) {
  const label = props.label;
  const text = props.text;
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const visible = open || hovered;

  useEffect(() => {
    if (!visible) return;

    const reposition = () => {
      const element = triggerRef.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const rawViewport = globalThis.innerWidth;
      const viewportWidth = rawViewport || 1024;
      const desiredLeft = Math.min(rect.left, viewportWidth - 240);
      const left = Math.max(8, desiredLeft);
      setCoords({ top: rect.bottom + 6, left });
    };

    reposition();

    const handlePointer = (event: MouseEvent) => {
      const element = triggerRef.current;
      if (element && !element.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [visible]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`What is "${label}"?`}
        onClick={() => setOpen((value) => !value)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 align-middle text-[10px] font-bold leading-none text-gray-400 transition-colors hover:border-violet-400 hover:text-violet-600"
      >
        ?
      </button>
      {visible && coords
        ? createPortal(
            <span
              role="tooltip"
              style={{ top: coords.top, left: coords.left }}
              className="fixed z-[9999] w-56 max-w-[calc(100vw-1rem)] rounded-lg bg-slate-800 px-3 py-2 text-left text-xs font-normal normal-case leading-snug text-white shadow-lg"
            >
              {text}
            </span>,
            document.body,
          )
        : null}
    </>
  );
}
