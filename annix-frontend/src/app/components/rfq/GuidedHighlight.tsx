"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useGuidedMode } from "@/app/lib/hooks/useGuidedMode";

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8;
const TOOLTIP_OFFSET = 12;

const SkipIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polygon points="5 4 15 12 5 20 5 4" />
    <line x1="19" y1="5" x2="19" y2="19" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

interface GuidedHighlightProps {
  onEndGuidance?: () => void;
}

export function GuidedHighlight({ onEndGuidance }: GuidedHighlightProps) {
  const {
    isActive,
    isPaused,
    currentFieldId,
    currentFieldDef,
    tooltipMessage,
    progress,
    endGuidedMode,
    skipCurrentField,
    fieldElement,
  } = useGuidedMode();

  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(
    null,
  );
  const observerRef = useRef<ResizeObserver | null>(null);
  const rafRef = useRef<number | null>(null);

  const updateHighlightPosition = useCallback(() => {
    if (!currentFieldId) {
      setHighlightRect(null);
      setTooltipPosition(null);
      return;
    }

    const element = fieldElement(currentFieldId);
    if (!element) {
      setHighlightRect(null);
      setTooltipPosition(null);
      return;
    }

    const rect = element.getBoundingClientRect();
    const newRect: HighlightRect = {
      top: rect.top - PADDING,
      left: rect.left - PADDING,
      width: rect.width + PADDING * 2,
      height: rect.height + PADDING * 2,
    };
    setHighlightRect(newRect);

    const tooltipTop = newRect.top + newRect.height + TOOLTIP_OFFSET;
    const tooltipLeft = Math.max(16, Math.min(newRect.left, window.innerWidth - 320));
    setTooltipPosition({ top: tooltipTop, left: tooltipLeft });
  }, [currentFieldId, fieldElement]);

  useEffect(() => {
    if (!isActive || isPaused || !currentFieldId) {
      setHighlightRect(null);
      setTooltipPosition(null);
      return;
    }

    updateHighlightPosition();

    const handleScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateHighlightPosition);
    };

    const handleResize = () => {
      updateHighlightPosition();
    };

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);

    const element = fieldElement(currentFieldId);
    if (element) {
      observerRef.current = new ResizeObserver(updateHighlightPosition);
      observerRef.current.observe(element);
    }

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [isActive, isPaused, currentFieldId, fieldElement, updateHighlightPosition]);

  const handleEndGuidance = useCallback(() => {
    endGuidedMode();
    onEndGuidance?.();
  }, [endGuidedMode, onEndGuidance]);

  const handleSkip = useCallback(() => {
    skipCurrentField();
  }, [skipCurrentField]);

  if (!isActive || isPaused || !highlightRect) {
    return null;
  }

  const overlayContent = (
    <>
      <div className="fixed inset-0 z-40 pointer-events-none">
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <mask id="guided-highlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={highlightRect.left}
                y={highlightRect.top}
                width={highlightRect.width}
                height={highlightRect.height}
                rx="8"
                ry="8"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.5)"
            mask="url(#guided-highlight-mask)"
          />
        </svg>

        <div
          className="absolute border-2 border-orange-500 rounded-lg shadow-[0_0_0_4px_rgba(249,115,22,0.3)] animate-pulse pointer-events-none"
          style={{
            top: highlightRect.top,
            left: highlightRect.left,
            width: highlightRect.width,
            height: highlightRect.height,
          }}
        />
      </div>

      {tooltipPosition && (currentFieldDef || tooltipMessage) ? (
        <div
          className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-w-sm pointer-events-auto"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
          }}
        >
          <div className="p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">N</span>
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                  {currentFieldDef?.label ?? "Field Guidance"}
                </h4>
              </div>
              <button
                onClick={handleEndGuidance}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                aria-label="End guidance"
              >
                <XIcon className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {tooltipMessage ?? currentFieldDef?.helpText}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">{progress}%</span>
              </div>

              {currentFieldDef && !currentFieldDef.required ? (
                <button
                  onClick={handleSkip}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded transition-colors"
                >
                  <SkipIcon className="w-3 h-3" />
                  Skip
                </button>
              ) : null}
            </div>
          </div>

          <div
            className="absolute -top-2 left-6 w-4 h-4 bg-white dark:bg-gray-800 border-l border-t border-gray-200 dark:border-gray-700 transform rotate-45"
            style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
          />
        </div>
      ) : null}
    </>
  );

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(overlayContent, document.body);
}
