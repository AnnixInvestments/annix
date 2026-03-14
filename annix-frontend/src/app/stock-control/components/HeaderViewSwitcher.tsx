"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useViewAs } from "../context/ViewAsContext";

const ROLE_OPTIONS: { key: string; label: string }[] = [
  { key: "viewer", label: "Viewer" },
  { key: "storeman", label: "Storeman" },
  { key: "accounts", label: "Accounts" },
  { key: "manager", label: "Manager" },
];

export function HeaderViewSwitcher() {
  const { viewAsRole, setViewAsRole, isPreviewActive } = useViewAs();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
    return undefined;
  }, [isOpen, handleClickOutside]);

  const activeLabel = ROLE_OPTIONS.find((r) => r.key === viewAsRole)?.label || null;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
          isPreviewActive
            ? "text-amber-900 bg-amber-100 hover:bg-amber-200"
            : "text-white/70 bg-white/10 hover:bg-white/20 hover:text-white"
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
        <span className="hidden sm:inline">
          {isPreviewActive ? `Viewing: ${activeLabel}` : "View as..."}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="py-1">
            {isPreviewActive && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setViewAsRole(null);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-teal-700 hover:bg-teal-50 transition-colors font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                    />
                  </svg>
                  Back to Admin
                </button>
                <div className="border-t border-gray-200 my-1" />
              </>
            )}
            {ROLE_OPTIONS.map((role) => (
              <button
                key={role.key}
                type="button"
                onClick={() => {
                  setViewAsRole(role.key);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                  viewAsRole === role.key
                    ? "bg-amber-50 text-amber-700 font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span>{role.label}</span>
                {viewAsRole === role.key && (
                  <svg
                    className="w-4 h-4 text-amber-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
