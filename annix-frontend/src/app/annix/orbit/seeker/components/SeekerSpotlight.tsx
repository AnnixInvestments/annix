"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface SeekerSpotlightProps {
  target: string;
  label: string;
  hasNext?: boolean;
  ctaLabel?: string;
  onDismiss: () => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8;
const TOOLTIP_OFFSET = 12;
const MAX_FIND_ATTEMPTS = 20;

function findTarget(target: string): HTMLElement | null {
  // eslint-disable-next-line no-restricted-syntax -- SSR guard; isUndefined(document) would throw
  if (typeof document === "undefined") {
    return null;
  }
  const tagged = document.querySelector<HTMLElement>(`[data-nix-target="${target}"]`);
  if (tagged) {
    return tagged;
  }
  return document.getElementById(target);
}

export function SeekerSpotlight(props: SeekerSpotlightProps) {
  const { target, label, onDismiss } = props;
  const hasNext = props.hasNext === true;
  const ctaLabelProp = props.ctaLabel;
  const ctaLabel = ctaLabelProp ? ctaLabelProp : hasNext ? "Next" : "Got it";
  const [rect, setRect] = useState<Rect | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const reposition = useCallback(() => {
    const element = elementRef.current;
    if (!element) {
      return;
    }
    const box = element.getBoundingClientRect();
    setRect({
      top: box.top - PADDING,
      left: box.left - PADDING,
      width: box.width + PADDING * 2,
      height: box.height + PADDING * 2,
    });
  }, []);

  // Find the target (retrying briefly in case it just navigated into view).
  useEffect(() => {
    let attempts = 0;
    let cancelled = false;
    elementRef.current = null;
    setRect(null);

    const attempt = () => {
      if (cancelled) {
        return;
      }
      const element = findTarget(target);
      if (element) {
        elementRef.current = element;
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        reposition();
        return;
      }
      attempts += 1;
      if (attempts < MAX_FIND_ATTEMPTS) {
        rafRef.current = window.setTimeout(attempt, 150);
      } else {
        onDismiss();
      }
    };
    attempt();

    return () => {
      cancelled = true;
      if (rafRef.current) {
        clearTimeout(rafRef.current);
      }
    };
  }, [target, reposition, onDismiss]);

  // Keep the spotlight glued to the element while scrolling / resizing.
  useEffect(() => {
    if (!rect) {
      return;
    }
    const onScroll = () => reposition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    const element = elementRef.current;
    const observer = element ? new ResizeObserver(reposition) : null;
    if (element && observer) {
      observer.observe(element);
    }
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      if (observer) {
        observer.disconnect();
      }
    };
  }, [rect, reposition]);

  // eslint-disable-next-line no-restricted-syntax -- SSR guard; isUndefined(document) would throw
  if (typeof document === "undefined" || !rect) {
    return null;
  }

  const tooltipTop = rect.top + rect.height + TOOLTIP_OFFSET;
  const tooltipLeft = Math.max(16, Math.min(rect.left, window.innerWidth - 320));

  return createPortal(
    <>
      <div className="pointer-events-none fixed inset-0 z-[9997]">
        <svg className="absolute inset-0 h-full w-full">
          <defs>
            <mask id="seeker-spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={rect.left}
                y={rect.top}
                width={rect.width}
                height={rect.height}
                rx="10"
                ry="10"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.55)"
            mask="url(#seeker-spotlight-mask)"
          />
        </svg>
        <div
          className="absolute animate-pulse rounded-xl border-2"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            borderColor: "var(--brand-accent, #FF8A00)",
            boxShadow: "0 0 0 4px rgba(255,138,0,0.3)",
          }}
        />
      </div>

      <div
        className="pointer-events-auto fixed z-[9999] max-w-xs rounded-xl border border-black/10 bg-white p-3 shadow-xl"
        style={{ top: tooltipTop, left: tooltipLeft }}
      >
        <div className="flex items-start gap-2">
          <span
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: "var(--brand-accent, #FF8A00)" }}
          >
            N
          </span>
          <p className="text-sm text-gray-700">{label}</p>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-full px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: "var(--brand-navbar, #323288)" }}
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
