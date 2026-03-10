"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface ViewSwitcherProps {
  currentRole: string;
  activeView: string;
  onSwitch: (role: string) => void;
}

const ROLE_HIERARCHY: { key: string; label: string }[] = [
  { key: "viewer", label: "Viewer" },
  { key: "storeman", label: "Storeman" },
  { key: "accounts", label: "Accounts" },
  { key: "manager", label: "Manager" },
  { key: "admin", label: "Admin" },
];

function rolesAtOrBelow(role: string): { key: string; label: string }[] {
  const index = ROLE_HIERARCHY.findIndex((r) => r.key === role);
  if (index < 0) {
    return ROLE_HIERARCHY.slice(0, 1);
  }
  return ROLE_HIERARCHY.slice(0, index + 1);
}

function formatRole(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function ViewSwitcher({ currentRole, activeView, onSwitch }: ViewSwitcherProps) {
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

  const isViewingOwnDashboard = activeView === currentRole;

  if (currentRole === "viewer") {
    return null;
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md shadow-sm transition-colors ${
          isViewingOwnDashboard
            ? "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
            : "text-teal-700 bg-teal-50 border border-teal-300 hover:bg-teal-100"
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        {isViewingOwnDashboard ? "View as..." : `Viewing: ${formatRole(activeView)}`}
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="py-1">
            {!isViewingOwnDashboard && (
              <button
                type="button"
                onClick={() => {
                  onSwitch(currentRole);
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
                Reset to my view
              </button>
            )}
            {!isViewingOwnDashboard && <div className="border-t border-gray-200 my-1" />}
            {rolesAtOrBelow(currentRole).map((role) => (
              <button
                key={role.key}
                type="button"
                onClick={() => {
                  onSwitch(role.key);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${
                  activeView === role.key
                    ? "bg-teal-50 text-teal-700 font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span>{role.label}</span>
                <div className="flex items-center gap-1.5">
                  {role.key === currentRole && <span className="text-xs text-gray-400">you</span>}
                  {activeView === role.key && (
                    <svg
                      className="w-4 h-4 text-teal-600"
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
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
