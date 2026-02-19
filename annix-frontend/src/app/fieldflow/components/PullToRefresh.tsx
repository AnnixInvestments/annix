"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
  threshold?: number;
  className?: string;
}

export function PullToRefresh({
  children,
  onRefresh,
  disabled = false,
  threshold = 80,
  className = "",
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const startY = useRef(0);
  const currentY = useRef(0);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (disabled || isRefreshing) return;

      const container = containerRef.current;
      if (!container || container.scrollTop > 0) return;

      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    },
    [disabled, isRefreshing],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isPulling || disabled || isRefreshing) return;

      currentY.current = e.touches[0].clientY;
      const distance = Math.max(0, currentY.current - startY.current);

      const dampedDistance = Math.min(distance * 0.5, threshold * 1.5);
      setPullDistance(dampedDistance);

      if (distance > 0) {
        e.preventDefault();
      }
    },
    [isPulling, disabled, isRefreshing, threshold],
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;

    setIsPulling(false);

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold * 0.6);

      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [isPulling, pullDistance, threshold, isRefreshing, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const shouldShowIndicator = pullDistance > 10 || isRefreshing;
  const isReady = pullDistance >= threshold;

  return (
    <div ref={containerRef} className={`relative overflow-auto ${className}`}>
      <div
        className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center transition-opacity duration-200 z-10"
        style={{
          top: Math.max(0, pullDistance - 40),
          opacity: shouldShowIndicator ? 1 : 0,
        }}
      >
        <div
          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
            isReady || isRefreshing
              ? "border-blue-600 bg-blue-50 dark:bg-blue-900/30"
              : "border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800"
          }`}
        >
          {isRefreshing ? (
            <svg className="w-4 h-4 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg
              className={`w-4 h-4 transition-transform ${
                isReady ? "rotate-180 text-blue-600" : "text-gray-400 dark:text-slate-500"
              }`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          )}
        </div>
      </div>

      <div
        className="transition-transform duration-200 ease-out"
        style={{
          transform: `translateY(${pullDistance}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
