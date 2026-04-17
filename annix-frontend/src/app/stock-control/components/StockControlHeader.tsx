"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import {
  ALL_NAV_ITEMS,
  isNavItemAllowedForRole,
  NAV_GROUP_HUB_PATHS,
  NAV_GROUP_ORDER,
} from "../config/navItems";
import { STOCK_CONTROL_VERSION } from "../config/version";
import { useStockControlBranding } from "../context/StockControlBrandingContext";
import { useStockControlRbac } from "../context/StockControlRbacContext";
import { useViewAs } from "../context/ViewAsContext";

import { GlobalSearchModal } from "./GlobalSearchModal";
import { HeaderViewSwitcher } from "./HeaderViewSwitcher";
import { NotificationBell } from "./NotificationBell";
import { OfflineIndicator } from "./OfflineIndicator";
import { SyncStatus } from "./SyncStatus";

export function StockControlHeader() {
  const pathname = usePathname();
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const { colors, logoUrl } = useStockControlBranding();
  const { user, logout } = useStockControlAuth();
  const { rbacConfig } = useStockControlRbac();
  const { effectiveRole, isPreviewActive, companyRoles, viewAsUser } = useViewAs();

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const metaKey = e.metaKey;
      if ((metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

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

  const visibleNavItems = ALL_NAV_ITEMS.filter((item) =>
    isNavItemAllowedForRole(item, effectiveRole, rbacConfig),
  );

  const isActive = (href: string) => {
    if (href === "/stock-control/portal/dashboard") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const isGroupActive = useCallback(
    (groupName: string) => {
      const directItems = visibleNavItems.filter((item) => {
        const group = item.group;
        return !group || group === "hidden";
      });
      const directItemIsActive = directItems.some((item) => {
        const href = item.href;
        if (href === "/stock-control/portal/dashboard") return pathname === href;
        return pathname.startsWith(href);
      });
      if (directItemIsActive) return false;
      const groupItems = visibleNavItems.filter((item) => item.group === groupName);
      const hubPath = NAV_GROUP_HUB_PATHS[groupName];
      const itemIsActive = (href: string) =>
        href === "/stock-control/portal/dashboard" ? pathname === href : pathname.startsWith(href);
      return (
        (hubPath && pathname.startsWith(hubPath)) ||
        groupItems.some((item) => itemIsActive(item.href))
      );
    },
    [visibleNavItems, pathname],
  );

  return (
    <>
      <header
        className="flex flex-col shadow-md pt-[env(safe-area-inset-top)] sticky top-0 z-40"
        style={{ backgroundColor: colors.background }}
      >
        <div className="h-14 sm:h-16 flex items-center px-3 sm:px-6">
          <div className="relative flex items-center shrink-0" ref={mobileNavRef}>
            <button
              type="button"
              className="lg:hidden flex items-center gap-2 p-1.5 -ml-1.5 rounded-md hover:bg-white/10 transition-colors"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              aria-label="Toggle navigation menu"
            >
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {mobileNavOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
              {logoUrl ? (
                <div className="h-8 px-1.5 flex items-center bg-white rounded-md">
                  <img src={logoUrl} alt="Company logo" className="h-6 w-auto object-contain" />
                </div>
              ) : (
                <span className="text-lg font-bold" style={{ color: colors.accent }}>
                  ASCA
                </span>
              )}
            </button>
            <div className="hidden lg:flex items-center">
              {logoUrl ? (
                <div className="h-10 px-2 flex items-center bg-white rounded-md">
                  <img src={logoUrl} alt="Company logo" className="h-8 w-auto object-contain" />
                </div>
              ) : (
                <div className="text-2xl font-bold" style={{ color: colors.accent }}>
                  ASCA
                </div>
              )}
            </div>
            <span className="ml-2 text-white text-lg font-medium hidden sm:inline">
              Stock Control
            </span>
            <span className="ml-1.5 text-white/50 text-xs font-mono hidden sm:inline">
              v{STOCK_CONTROL_VERSION}
            </span>

            {mobileNavOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMobileNavOpen(false)} />
                <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 py-1">
                  {(() => {
                    const directItems = visibleNavItems.filter(
                      (item) => !item.group || item.group === "hidden",
                    );
                    const leadingDirect = directItems.filter(
                      (item) => item.group !== "hidden" && !item.trailing,
                    );
                    const trailingDirect = directItems.filter(
                      (item) => item.group !== "hidden" && item.trailing === true,
                    );
                    const groups = NAV_GROUP_ORDER.map((groupName) => ({
                      name: groupName,
                      hubPath: NAV_GROUP_HUB_PATHS[groupName],
                      items: visibleNavItems.filter((item) => item.group === groupName),
                    })).filter((g) => g.items.length > 0);

                    const renderDirectItem = (item: (typeof directItems)[number]) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileNavOpen(false)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium ${
                          isActive(item.href)
                            ? "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
                            : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                      >
                        <span className="[&>svg]:w-4 [&>svg]:h-4">{item.icon}</span>
                        {item.label}
                      </Link>
                    );

                    return (
                      <>
                        {leadingDirect.map(renderDirectItem)}
                        {leadingDirect.length > 0 && groups.length > 0 && (
                          <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                        )}
                        {groups.map((group) => (
                          <Link
                            key={group.name}
                            href={group.hubPath}
                            onClick={() => setMobileNavOpen(false)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium ${
                              isGroupActive(group.name)
                                ? "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
                                : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                            }`}
                          >
                            {group.name}
                          </Link>
                        ))}
                        {trailingDirect.length > 0 && groups.length > 0 && (
                          <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                        )}
                        {trailingDirect.map(renderDirectItem)}
                      </>
                    );
                  })()}
                </div>
              </>
            )}
          </div>

          {(() => {
            const directItems = visibleNavItems.filter(
              (item) => !item.group || item.group === "hidden",
            );
            const leadingDirect = directItems.filter(
              (item) => item.group !== "hidden" && !item.trailing,
            );
            const trailingDirect = directItems.filter(
              (item) => item.group !== "hidden" && item.trailing === true,
            );
            const groups = NAV_GROUP_ORDER.map((groupName) => ({
              name: groupName,
              hubPath: NAV_GROUP_HUB_PATHS[groupName],
              items: visibleNavItems.filter((item) => item.group === groupName),
            })).filter((g) => g.items.length > 0);

            const renderDirectItem = (item: (typeof directItems)[number]) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 min-h-[44px] px-3 py-2 text-sm font-medium whitespace-nowrap rounded-md transition-colors ${
                  isActive(item.href)
                    ? "bg-black/20 text-white"
                    : "text-white/70 hover:bg-black/10 hover:text-white"
                }`}
              >
                <span className="[&>svg]:w-4 [&>svg]:h-4">{item.icon}</span>
                {item.label}
              </Link>
            );

            return (
              <nav
                className="hidden lg:flex items-center mx-2 sm:mx-4 overflow-x-auto scrollbar-hide"
                aria-label="Main navigation"
              >
                <div className="flex items-center gap-1">
                  {leadingDirect.map(renderDirectItem)}
                  {groups.map((group) => (
                    <Link
                      key={group.name}
                      href={group.hubPath}
                      className={`min-h-[44px] px-3 py-2 text-sm font-medium whitespace-nowrap rounded-md transition-colors flex items-center ${
                        isGroupActive(group.name)
                          ? "bg-black/20 text-white"
                          : "text-white/70 hover:bg-black/10 hover:text-white"
                      }`}
                    >
                      {group.name}
                    </Link>
                  ))}
                  {trailingDirect.map(renderDirectItem)}
                </div>
              </nav>
            );
          })()}

          <div className="flex items-center space-x-1 sm:space-x-3 ml-auto shrink-0">
            {isAdmin && <HeaderViewSwitcher />}
            <button
              onClick={openSearch}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg text-white/70 hover:bg-opacity-20 hover:text-white transition-colors"
              aria-label="Search"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <span className="hidden xl:inline">Search...</span>
              <kbd className="hidden xl:inline-flex items-center px-1.5 py-0.5 text-xs bg-white/10 rounded font-mono">
                {typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent)
                  ? "⌘"
                  : "Ctrl+"}
                K
              </kbd>
            </button>
            <SyncStatus />
            <OfflineIndicator />
            <ThemeToggle
              className="p-2 text-white hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors"
              iconClassName="w-5 h-5 text-white"
            />
            <NotificationBell />
            <Link
              href="/stock-control/portal/inspections"
              className="p-2 text-white hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors"
              title="Inspection Calendar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </Link>

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
                        <>
                          <Link
                            href="/stock-control/portal/company-profile"
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
                                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                />
                              </svg>
                              Company Profile
                            </span>
                          </Link>
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
                              Settings
                            </span>
                          </Link>
                        </>
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
        </div>
      </header>

      {isPreviewActive &&
        (() => {
          const viewAsName = viewAsUser?.name;
          const roleMatch = companyRoles.find((r) => r.key === effectiveRole);
          const roleLabel = roleMatch?.label;
          const displayRole = roleLabel || effectiveRole;
          return (
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 flex items-center justify-center gap-2">
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
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              <span className="text-xs font-medium text-amber-700">
                Previewing as {viewAsName} ({displayRole}) — pages, actions, and workflow reflect
                this user&apos;s view
              </span>
            </div>
          );
        })()}

      <GlobalSearchModal isOpen={searchOpen} onClose={closeSearch} />
    </>
  );
}
