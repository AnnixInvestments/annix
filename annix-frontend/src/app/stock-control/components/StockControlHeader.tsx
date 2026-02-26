"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import { useStockControlBranding } from "../context/StockControlBrandingContext";
import { NotificationBell } from "./NotificationBell";
import { OfflineIndicator } from "./OfflineIndicator";
import { SyncStatus } from "./SyncStatus";

interface StockControlHeaderProps {
  onSearch?: (query: string) => void;
  lowStockCount?: number;
  onMenuToggle?: () => void;
  showMenuButton?: boolean;
}

export function StockControlHeader({
  onSearch,
  lowStockCount = 0,
  onMenuToggle,
  showMenuButton = false,
}: StockControlHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { colors, logoUrl } = useStockControlBranding();
  const { user, logout } = useStockControlAuth();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    onSearch?.(e.target.value);
  };

  const handleLogout = async () => {
    setShowDropdown(false);
    await logout();
    window.location.href = "/stock-control/login";
  };

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "SC";

  const isAdmin = user?.role === "admin";

  return (
    <header
      className="h-14 sm:h-16 flex items-center justify-between px-3 sm:px-6 shadow-md pt-[env(safe-area-inset-top)]"
      style={{ backgroundColor: colors.background }}
    >
      <div className="flex items-center">
        {showMenuButton && (
          <button
            onClick={onMenuToggle}
            className="mr-3 p-2 text-white hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        )}
        {logoUrl ? (
          <div className="h-10 px-2 flex items-center bg-white rounded-md">
            <img src={logoUrl} alt="Company logo" className="h-8 w-auto object-contain" />
          </div>
        ) : (
          <div className="text-2xl font-bold" style={{ color: colors.accent }}>
            ASCA
          </div>
        )}
        <span className="ml-2 text-white text-lg font-medium hidden sm:inline">Stock Control</span>
      </div>

      <div className="hidden sm:block flex-1 max-w-xl mx-4 lg:mx-8">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search inventory, job cards..."
            className="w-full pl-10 pr-4 py-2 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:bg-opacity-20"
          />
        </div>
      </div>

      <div className="flex items-center space-x-1 sm:space-x-3">
        <SyncStatus />
        <OfflineIndicator />
        <ThemeToggle
          className="p-2 text-white hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors"
          iconClassName="w-5 h-5 text-white"
        />
        <NotificationBell />

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center justify-center w-9 h-9 rounded-full text-white font-semibold text-sm hover:ring-2 hover:ring-teal-300 transition-all"
            style={{ backgroundColor: colors.accent }}
          >
            {userInitials}
          </button>

          {showDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
                <div className="py-1">
                  {isAdmin && (
                    <Link
                      href="/stock-control/portal/settings"
                      onClick={() => setShowDropdown(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <span className="flex items-center">
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        Account Settings
                      </span>
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <span className="flex items-center">
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      Logout
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
