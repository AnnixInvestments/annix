"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { useLayout } from "@/app/context/LayoutContext";
import { corpId, PortalType, portalConfig } from "@/app/lib/corpId";
import { useBranding } from "@/app/lib/query/hooks";
import { BrandNavLockup } from "./BrandNavLockup";
import { BrandNavLogo } from "./BrandNavLogo";
import { useTheme } from "./ThemeProvider";
import { ThemeToggle } from "./ThemeToggle";
import { Tooltip } from "./Tooltip";

export interface NavItem {
  href: string;
  label: string;
  sublabel?: string;
  icon: string;
  roles?: string[];
  featureFlag?: string;
}

export interface UserInfo {
  firstName?: string;
  lastName?: string | null;
  email?: string;
  companyName?: string;
  roles?: string[];
}

export interface PortalToolbarProps {
  portalType: PortalType;
  navItems: NavItem[];
  user: UserInfo | null;
  onLogout: () => void;
  additionalActions?: React.ReactNode;
  statusBadge?: React.ReactNode;
  featureFlags?: Record<string, boolean> | null;
  version?: string;
  hideThemeToggle?: boolean;
}

// Descriptive tooltips for navigation items
const NAV_TOOLTIPS: Record<string, string> = {
  "Admin Portal": "View your portal overview and key metrics",
  "Customer Portal": "View your portal overview and key metrics",
  Customers: "Manage customer accounts and onboarding",
  Suppliers: "Manage supplier accounts and approvals",
  RFQs: "View and manage request for quotations",
  "Admin Users": "Manage administrator accounts and permissions",
  "Secure Docs": "Access encrypted customer documents",
  "Company Profile": "Manage Annix company details and legal information",
  "My RFQs": "View and manage your submitted quotations",
  "New RFQ": "Create a new request for quotation",
  Profile: "View and update your profile settings",
  Company: "Manage your company information",
  Documents: "View and upload your documents",
  Onboarding: "Complete your account setup",
  BOQs: "View and respond to bill of quantities",
  "Submitted BOQs": "View and amend your submitted quotes",
  "Products & Services": "Select the products and services you can offer",
  "Rubber Lining": "Manage rubber lining products and orders",
  "My CV": "Upload, edit, and improve your CV",
  "Work profile": "Add your field, role, skills and certifications to sharpen job matches",
  Credentials: "Manage your licences and certificates",
  "Browse Jobs": "See jobs matched to your CV and apply",
  Applications: "Track the jobs you've applied to",
  Settings: "Manage your account and notification preferences",
  Help: "Step-by-step how-to guides",
};

const getNavTooltip = (label: string): string => {
  const tooltip = NAV_TOOLTIPS[label];
  return tooltip || label;
};

export default function PortalToolbar(props: PortalToolbarProps) {
  const {
    portalType,
    navItems,
    user,
    onLogout,
    additionalActions,
    statusBadge,
    featureFlags,
    version,
  } = props;
  const pathname = usePathname();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const config = portalConfig[portalType];
  const colors = corpId.colors.portal[portalType];
  const { maxWidth } = useLayout();

  // Portals wired to the DB-backed BrandingProvider read --brand-* CSS vars;
  // fallbacks are each portal's static corpId palette so nothing shifts before
  // branding loads (or for portals with no DB branding).
  const isBrandPortal = portalType === "annixOrbit" || portalType === "annixRep";
  const brandPrefix = isBrandPortal ? "brand" : null;
  const brandCode =
    portalType === "annixOrbit" ? "annix-orbit" : portalType === "annixRep" ? "annix-rep" : null;
  const { resolvedTheme } = useTheme();
  // Annix Investments (non-brand) portals follow the theme using the master
  // brand's per-mode toolbar colours; the foreground goes navy on the light
  // toolbar so it stays legible. Brand portals (Orbit/Pulse) keep their fixed
  // brand navbar via CSS vars.
  const masterBrandingQuery = useBranding("annix-investments");
  const masterBrandingData = masterBrandingQuery.data;
  const masterBranding = masterBrandingData ?? null;
  const lightNavbar = !isBrandPortal && resolvedTheme === "light";
  const investToolbarLight = masterBranding ? masterBranding.navbarColorLight : "#F2F4F7";
  const investToolbarDark = masterBranding ? masterBranding.navbarColor : colors.background;
  const navBg = brandPrefix
    ? `var(--${brandPrefix}-navbar, ${colors.background})`
    : lightNavbar
      ? investToolbarLight
      : investToolbarDark;
  const navActive = lightNavbar
    ? "rgba(15, 23, 42, 0.10)"
    : brandPrefix
      ? `var(--${brandPrefix}-navbar-active, ${colors.active})`
      : colors.active;
  const navHover = lightNavbar
    ? "rgba(15, 23, 42, 0.06)"
    : brandPrefix
      ? `var(--${brandPrefix}-navbar-hover, ${colors.hover})`
      : colors.hover;
  const accentColor = brandPrefix
    ? `var(--${brandPrefix}-accent, ${corpId.colors.accent.orange})`
    : corpId.colors.accent.orange;
  const accentColorLight = brandPrefix
    ? `var(--${brandPrefix}-accent-light, ${corpId.colors.accent.orangeLight})`
    : corpId.colors.accent.orangeLight;
  // Foreground for nav links / names / version. Navy on the light navbar so
  // it stays legible; the brand accent (orange) on the dark navbar as before.
  const navForeground = lightNavbar ? "#1a1a40" : accentColor;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [pathname]);

  const userInitials = (() => {
    if (!user) return "??";
    const firstInitial = user.firstName?.charAt(0)?.toUpperCase() || "";
    const lastInitial = user.lastName?.charAt(0)?.toUpperCase() || "";
    return `${firstInitial}${lastInitial}` || "U";
  })();

  const rawRoles = user?.roles;
  const roles = rawRoles ? rawRoles : [];
  const showEeDisclosure =
    portalType === "annixOrbit" && (roles.includes("individual") || roles.includes("student"));
  const eeDisclosureHref = roles.includes("student")
    ? "/annix/orbit/student/ee-attributes"
    : "/annix/orbit/seeker/ee-attributes";

  const visibleNavItems = navItems.filter((item) => {
    const roleCheck = !item.roles || item.roles.some((role) => user?.roles?.includes(role));
    const flagCheck = !item.featureFlag || featureFlags?.[item.featureFlag] === true;
    return roleCheck && flagCheck;
  });

  const isOrbit = portalType === "annixOrbit";
  // In Orbit the wordmark already reads "Annix Orbit", so don't repeat the
  // title text — show only the version chip alongside it.
  const titleText = isOrbit ? "" : config.title;
  const showTitleOrVersion = Boolean(titleText) || Boolean(version);

  return (
    <nav className="shadow-lg sticky top-0 z-50" style={{ backgroundColor: navBg }}>
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <Link href={config.homeHref} className="flex items-center space-x-3">
                {brandCode ? (
                  <BrandNavLogo brand={brandCode} isOrbit={isOrbit} />
                ) : (
                  <BrandNavLockup brand="annix-investments" />
                )}
                {showTitleOrVersion && (
                  <span
                    className="text-lg font-semibold hidden md:block"
                    style={{ color: navForeground }}
                  >
                    {titleText}
                    {version && (
                      <span className="ml-1.5 text-xs font-mono opacity-50">v{version}</span>
                    )}
                  </span>
                )}
              </Link>
            </div>
            {portalType === "admin" && pathname !== "/admin/portal/global-apps" && (
              <Link
                href="/admin/portal/global-apps"
                className="ml-2 sm:ml-3 inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap"
                style={{ color: navForeground, backgroundColor: navActive }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = navHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = navActive;
                }}
                aria-label="Back to main admin hub"
              >
                <svg
                  className="w-5 h-5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                <span className="hidden sm:inline">Main Hub</span>
              </Link>
            )}
            <div className="hidden xl:ml-6 xl:flex xl:items-center xl:space-x-0.5">
              {visibleNavItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Tooltip key={item.href} text={getNavTooltip(item.label)} position="bottom">
                    <Link
                      href={item.href}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap"
                      style={{
                        color: navForeground,
                        backgroundColor: isActive ? navActive : "transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = navHover;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }
                      }}
                    >
                      <svg
                        className="w-5 h-5 mr-1.5 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d={item.icon}
                        />
                      </svg>
                      {item.sublabel ? (
                        <span className="flex flex-col leading-tight">
                          <span className="text-sm font-semibold">{item.label}</span>
                          <span className="text-xs">{item.sublabel}</span>
                        </span>
                      ) : (
                        item.label
                      )}
                    </Link>
                  </Tooltip>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {visibleNavItems.length > 0 && (
              <button
                type="button"
                onClick={() => setIsMobileNavOpen((open) => !open)}
                className="xl:hidden inline-flex items-center justify-center p-2 rounded-md focus:outline-none"
                style={{ color: navForeground }}
                aria-label="Toggle navigation menu"
                aria-expanded={isMobileNavOpen}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMobileNavOpen ? (
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
              </button>
            )}
            {statusBadge}
            {additionalActions}

            {props.hideThemeToggle ? null : <ThemeToggle />}

            <div className="relative" ref={menuRef}>
              <Tooltip text="Account menu and settings" align="end" disabled={isUserMenuOpen}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-3 focus:outline-none"
                >
                  <div className="flex items-center space-x-2">
                    <span
                      className="hidden md:block text-sm font-medium whitespace-nowrap"
                      style={{ color: accentColor }}
                    >
                      {user?.firstName} {user?.lastName}
                    </span>
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-colors"
                      style={{
                        backgroundColor: accentColor,
                        color: corpId.colors.text.onOrange,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = accentColorLight;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = accentColor;
                      }}
                    >
                      {userInitials}
                    </div>
                  </div>
                </button>
              </Tooltip>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                      {user?.companyName && (
                        <p className="text-xs text-gray-500 mt-1">{user.companyName}</p>
                      )}
                      {user?.roles && user.roles.length > 0 && (
                        <div className="mt-1">
                          {user.roles.map((role) => (
                            <span
                              key={role}
                              className="inline-block px-2 py-0.5 text-xs font-medium rounded mr-1"
                              style={{
                                backgroundColor: `${corpId.colors.primary.navy}20`,
                                color: corpId.colors.primary.navy,
                              }}
                            >
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <Link
                      href={
                        portalType === "annixOrbit"
                          ? "/annix/orbit/portal/settings"
                          : `/${portalType}/portal/profile`
                      }
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <div className="flex items-center">
                        <svg
                          className="w-4 h-4 mr-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                        {portalType === "annixOrbit" ? "Settings" : "My Profile"}
                      </div>
                    </Link>

                    {showEeDisclosure && (
                      <Link
                        href={eeDisclosureHref}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <div className="flex items-center">
                          <svg
                            className="w-4 h-4 mr-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 00-3-3.87"
                            />
                          </svg>
                          EE disclosure
                        </div>
                      </Link>
                    )}

                    {portalType === "admin" && (
                      <Link
                        href="/admin/portal/company-profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <div className="flex items-center">
                          <svg
                            className="w-4 h-4 mr-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
                            />
                          </svg>
                          Company Profile
                        </div>
                      </Link>
                    )}

                    {portalType !== "admin" && portalType !== "annixOrbit" && (
                      <Link
                        href={`/${portalType}/portal/company`}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <div className="flex items-center">
                          <svg
                            className="w-4 h-4 mr-3"
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
                          Company Settings
                        </div>
                      </Link>
                    )}

                    {(portalType === "customer" || portalType === "supplier") && (
                      <>
                        <Link
                          href={`/${portalType}/portal/onboarding`}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <div className="flex items-center">
                            <svg
                              className="w-4 h-4 mr-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                              />
                            </svg>
                            Onboarding Status
                          </div>
                        </Link>
                        <Link
                          href={`/${portalType}/portal/documents`}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <div className="flex items-center">
                            <svg
                              className="w-4 h-4 mr-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                              />
                            </svg>
                            My Documents
                          </div>
                        </Link>
                      </>
                    )}

                    <div className="border-t border-gray-100"></div>

                    <Link
                      href="/"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <div className="flex items-center">
                        <svg
                          className="w-4 h-4 mr-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                          />
                        </svg>
                        Back to Main Site
                      </div>
                    </Link>

                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                    >
                      <div className="flex items-center">
                        <svg
                          className="w-4 h-4 mr-3"
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
                        Sign Out
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile/tablet navigation - collapses to a hamburger below xl, where
            the desktop nav can no longer fit all items. Opens a vertical menu
            so nothing is obscured or scrolled off-screen. */}
        {isMobileNavOpen && (
          <div
            className="xl:hidden py-2 border-t"
            style={{ borderColor: corpId.colors.primary.navyLight }}
          >
            <div className="flex flex-col gap-1 px-1">
              {visibleNavItems.map((item) => {
                const href = item.href;
                const isActive = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setIsMobileNavOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors"
                    style={{
                      color: navForeground,
                      backgroundColor: isActive ? navActive : "transparent",
                    }}
                  >
                    <svg
                      className="w-5 h-5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d={item.icon}
                      />
                    </svg>
                    <span className="flex flex-col leading-tight">
                      <span className="text-sm font-medium">{item.label}</span>
                      {item.sublabel && <span className="text-xs opacity-80">{item.sublabel}</span>}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
