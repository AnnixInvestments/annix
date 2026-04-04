"use client";

import { useCallback, useEffect, useRef } from "react";
import { useDisclosure } from "@/app/lib/hooks/useDisclosure";

interface WidgetVisibilityToggleProps {
  allWidgets: { key: string; label: string }[];
  hiddenWidgets: string[];
  onToggle: (widgetKey: string) => void;
}

export function WidgetVisibilityToggle({
  allWidgets,
  hiddenWidgets,
  onToggle,
}: WidgetVisibilityToggleProps) {
  const { isOpen, close, toggle } = useDisclosure();
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        close();
      }
    },
    [close],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
    return undefined;
  }, [isOpen, handleClickOutside]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={toggle}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
          />
        </svg>
        Customise
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="px-4 py-3 border-b border-gray-200">
            <p className="text-sm font-medium text-gray-900">Dashboard Widgets</p>
            <p className="text-xs text-gray-500 mt-0.5">Toggle widgets on or off</p>
          </div>
          <div className="py-2">
            {allWidgets.map((widget) => {
              const isHidden = hiddenWidgets.includes(widget.key);
              return (
                <button
                  key={widget.key}
                  type="button"
                  onClick={() => onToggle(widget.key)}
                  className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                >
                  <span className={isHidden ? "text-gray-400" : "text-gray-700"}>
                    {widget.label}
                  </span>
                  <div
                    className={`relative w-9 h-5 rounded-full transition-colors ${isHidden ? "bg-gray-300" : "bg-teal-500"}`}
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isHidden ? "left-0.5" : "left-4"}`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
