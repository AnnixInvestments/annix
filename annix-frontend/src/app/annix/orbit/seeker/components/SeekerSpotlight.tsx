"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface SeekerSpotlightProps {
  target: string;
  label: string;
  hasNext?: boolean;
  ctaLabel?: string;
  onDismiss: () => void;
  onLost?: () => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8;
const TOOLTIP_OFFSET = 12;
const FALLBACK_AFTER_ATTEMPTS = 10;
const SLOW_AFTER_ATTEMPTS = 40;

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
  const onLost = props.onLost;
  const hasNext = props.hasNext === true;
  const ctaLabelProp = props.ctaLabel;
  const ctaLabel = ctaLabelProp ? ctaLabelProp : hasNext ? "Next" : "Got it";
  const [rect, setRect] = useState<Rect | null>(null);
  const [fallback, setFallback] = useState(false);
  const [found, setFound] = useState(false);
  const [recheckNonce, setRecheckNonce] = useState(0);
  const elementRef = useRef<HTMLElement | null>(null);
  const scrolledRef = useRef(false);
  const everFoundRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  const reposition = useCallback(() => {
    const element = elementRef.current;
    if (!element) {
      return;
    }
    const base = element.getBoundingClientRect();
    let top = base.top;
    let left = base.left;
    let right = base.right;
    let bottom = base.bottom;
    // Grow the box to enclose an open pop-out panel (e.g. a dropdown's option
    // list) so the highlight expands with the opened menu. Only absolutely- or
    // fixed-positioned descendants count — the panel's own box is correctly
    // clamped to its scroll height, whereas its inner rows report their full
    // unclipped positions and would stretch the box while scrolling.
    element.querySelectorAll("*").forEach((node) => {
      const position = window.getComputedStyle(node).position;
      if (position !== "absolute" && position !== "fixed") {
        return;
      }
      const r = node.getBoundingClientRect();
      const w = r.width;
      const h = r.height;
      if (w === 0 || h === 0) {
        return;
      }
      if (r.top < top) {
        top = r.top;
      }
      if (r.left < left) {
        left = r.left;
      }
      if (r.right > right) {
        right = r.right;
      }
      if (r.bottom > bottom) {
        bottom = r.bottom;
      }
    });
    const next: Rect = {
      top: top - PADDING,
      left: left - PADDING,
      width: right - left + PADDING * 2,
      height: bottom - top + PADDING * 2,
    };
    setRect((prev) =>
      prev &&
      prev.top === next.top &&
      prev.left === next.left &&
      prev.width === next.width &&
      prev.height === next.height
        ? prev
        : next,
    );
  }, []);

  // Reset the "have we ever located this target" flag only when the target
  // itself changes — not on a re-search nonce bump.
  useEffect(() => {
    everFoundRef.current = false;
  }, [target]);

  // Watch for the target. The element may render late (an async list just after
  // navigation) or never (a screen variant without it) — so we keep looking and,
  // if it stays missing, fall back to a centred tooltip instead of skipping.
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    elementRef.current = null;
    scrolledRef.current = false;
    setRect(null);
    setFallback(false);
    setFound(false);

    const tick = () => {
      if (cancelled) {
        return;
      }
      const element = findTarget(target);
      if (element) {
        elementRef.current = element;
        if (!scrolledRef.current) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          scrolledRef.current = true;
        }
        reposition();
        setFallback(false);
        setFound(true);
        everFoundRef.current = true;
        return;
      }
      attempts += 1;
      if (attempts >= FALLBACK_AFTER_ATTEMPTS) {
        setFallback(true);
      }
      const delay = attempts < SLOW_AFTER_ATTEMPTS ? 150 : 500;
      timerRef.current = window.setTimeout(tick, delay);
    };
    tick();

    return () => {
      cancelled = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [target, reposition, recheckNonce]);

  // Self-heal: if the spotlit element leaves the DOM (e.g. an action navigated
  // to another screen), don't strand the highlight. If we'd already found it,
  // the step is stale — advance the tour (onLost). Otherwise re-search.
  useEffect(() => {
    if (!found) {
      return;
    }
    const interval = window.setInterval(() => {
      const element = elementRef.current;
      if (element && !element.isConnected) {
        if (everFoundRef.current && onLost) {
          onLost();
        } else {
          setRecheckNonce((nonce) => nonce + 1);
        }
      }
    }, 400);
    return () => clearInterval(interval);
  }, [found, onLost]);

  // Keep the spotlight glued to the element while scrolling / resizing, and grow
  // it when a descendant panel opens (a MutationObserver catches the panel being
  // added/removed — the trigger button's own size doesn't change when it opens).
  useEffect(() => {
    if (!found) {
      return;
    }
    const element = elementRef.current;
    if (!element) {
      return;
    }
    const onScroll = () => reposition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    const resizeObserver = new ResizeObserver(reposition);
    resizeObserver.observe(element);
    const mutationObserver = new MutationObserver(reposition);
    mutationObserver.observe(element, { childList: true, subtree: true });
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [found, reposition]);

  // eslint-disable-next-line no-restricted-syntax -- SSR guard; isUndefined(document) would throw
  if (typeof document === "undefined") {
    return null;
  }
  if (!rect && !fallback) {
    return null;
  }

  const spotlit = rect !== null;
  let tooltipStyle: CSSProperties = { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  if (spotlit) {
    const left = Math.max(16, Math.min(rect.left, window.innerWidth - 320));
    // Prefer above the target (so an open dropdown below the field isn't
    // covered); fall back to below when the target sits near the top.
    const roomAbove = rect.top > 220;
    tooltipStyle = roomAbove
      ? { top: rect.top - TOOLTIP_OFFSET, left, transform: "translateY(-100%)" }
      : { top: rect.top + rect.height + TOOLTIP_OFFSET, left };
  }

  return createPortal(
    <>
      {spotlit ? (
        <div className="pointer-events-none fixed inset-0 z-[10000]">
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
      ) : (
        <div className="pointer-events-none fixed inset-0 z-[10000] bg-black/40" />
      )}

      <div
        className="pointer-events-auto fixed z-[10002] max-w-xs rounded-xl border border-black/10 bg-white p-3 shadow-xl"
        style={tooltipStyle}
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
