"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { useAuRubberAuth } from "@/app/context/AuRubberAuthContext";
import { useAuRubberBranding } from "@/app/context/AuRubberBrandingContext";
import { auRubberApiClient } from "@/app/lib/api/auRubberApi";
import { PAGE_PERMISSIONS } from "../config/pagePermissions";

interface NavItem {
  href: string;
  label: string;
  permission?: string;
}

interface NavSection {
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
}

interface SingleNavItem extends NavItem {
  icon: React.ReactNode;
}

const navSections: NavSection[] = [
  {
    label: "Products",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
    ),
    items: [
      {
        href: "/au-rubber/portal/products",
        label: "All Products",
        permission: PAGE_PERMISSIONS["/au-rubber/portal/products"],
      },
      {
        href: "/au-rubber/portal/codings",
        label: "Product Codings",
        permission: PAGE_PERMISSIONS["/au-rubber/portal/codings"],
      },
    ],
  },
  {
    label: "Suppliers",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
        />
      </svg>
    ),
    items: [
      {
        href: "/au-rubber/portal/delivery-notes/suppliers",
        label: "Delivery Notes",
        permission: PAGE_PERMISSIONS["/au-rubber/portal/delivery-notes"],
      },
      {
        href: "/au-rubber/portal/tax-invoices/suppliers",
        label: "Tax Invoices",
        permission: PAGE_PERMISSIONS["/au-rubber/portal/tax-invoices"],
      },
      {
        href: "/au-rubber/portal/supplier-cocs",
        label: "Supplier CoCs",
        permission: PAGE_PERMISSIONS["/au-rubber/portal/supplier-cocs"],
      },
    ],
  },
  {
    label: "Customers",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
    items: [
      {
        href: "/au-rubber/portal/delivery-notes/customers",
        label: "Delivery Notes",
        permission: PAGE_PERMISSIONS["/au-rubber/portal/delivery-notes"],
      },
      {
        href: "/au-rubber/portal/tax-invoices/customers",
        label: "Tax Invoices",
        permission: PAGE_PERMISSIONS["/au-rubber/portal/tax-invoices"],
      },
      {
        href: "/au-rubber/portal/au-cocs",
        label: "AU Certificates",
        permission: PAGE_PERMISSIONS["/au-rubber/portal/au-cocs"],
      },
    ],
  },
  {
    label: "Documents",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    ),
    items: [
      {
        href: "/au-rubber/portal/quality-tracking",
        label: "Quality Tracking",
        permission: PAGE_PERMISSIONS["/au-rubber/portal/quality-tracking"],
      },
      {
        href: "/au-rubber/portal/roll-stock",
        label: "Roll Stock",
        permission: PAGE_PERMISSIONS["/au-rubber/portal/roll-stock"],
      },
    ],
  },
  {
    label: "Stock",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
        />
      </svg>
    ),
    items: [
      {
        href: "/au-rubber/portal/compound-stocks",
        label: "Compound Inventory",
        permission: PAGE_PERMISSIONS["/au-rubber/portal/compound-stocks"],
      },
      {
        href: "/au-rubber/portal/compound-orders",
        label: "Compound Orders",
        permission: PAGE_PERMISSIONS["/au-rubber/portal/compound-orders"],
      },
      {
        href: "/au-rubber/portal/productions",
        label: "Production",
        permission: PAGE_PERMISSIONS["/au-rubber/portal/productions"],
      },
      {
        href: "/au-rubber/portal/stock-movements",
        label: "Movement History",
        permission: PAGE_PERMISSIONS["/au-rubber/portal/stock-movements"],
      },
      {
        href: "/au-rubber/portal/stock-locations",
        label: "Stock Locations",
        permission: PAGE_PERMISSIONS["/au-rubber/portal/stock-locations"],
      },
      {
        href: "/au-rubber/portal/purchase-requisitions",
        label: "Purchase Requisitions",
        permission: PAGE_PERMISSIONS["/au-rubber/portal/purchase-requisitions"],
      },
      {
        href: "/au-rubber/portal/other-items",
        label: "Other Items",
        permission: PAGE_PERMISSIONS["/au-rubber/portal/other-items"],
      },
    ],
  },
  {
    label: "Prices",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
        />
      </svg>
    ),
    items: [
      {
        href: "/au-rubber/portal/pricing-tiers",
        label: "Pricing Tiers",
        permission: PAGE_PERMISSIONS["/au-rubber/portal/pricing-tiers"],
      },
      {
        href: "/au-rubber/portal/companies",
        label: "Companies",
        permission: PAGE_PERMISSIONS["/au-rubber/portal/companies"],
      },
    ],
  },
];

const singleNavItems: SingleNavItem[] = [
  {
    href: "/au-rubber/portal/dashboard",
    label: "Dashboard",
    permission: PAGE_PERMISSIONS["/au-rubber/portal/dashboard"],
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    href: "/au-rubber/portal/orders",
    label: "Orders",
    permission: PAGE_PERMISSIONS["/au-rubber/portal/orders"],
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
];

interface AuHeaderProps {
  onSearch?: (query: string) => void;
}

export function AuHeader({ onSearch }: AuHeaderProps) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { colors, branding } = useAuRubberBranding();
  const { user, logout, hasPermission, isAdmin } = useAuRubberAuth();
  const [logoObjectUrl, setLogoObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    let revoked = false;
    if (branding.logoUrl) {
      const proxyUrl = auRubberApiClient.proxyImageUrl(branding.logoUrl);
      const headers = auRubberApiClient.authHeaders();
      fetch(proxyUrl, { headers })
        .then((res) => (res.ok ? res.blob() : null))
        .then((blob) => {
          if (!revoked && blob) {
            setLogoObjectUrl(URL.createObjectURL(blob));
          }
        })
        .catch(() => {
          if (!revoked) setLogoObjectUrl(null);
        });
    } else {
      setLogoObjectUrl(null);
    }
    return () => {
      revoked = true;
      if (logoObjectUrl) URL.revokeObjectURL(logoObjectUrl);
    };
  }, [branding.logoUrl]);

  const canAccessItem = (permission: string | undefined): boolean => {
    if (isAdmin) return true;
    if (!permission) return true;
    return hasPermission(permission);
  };

  const filteredSingleNavItems = useMemo(
    () => singleNavItems.filter((item) => canAccessItem(item.permission)),
    [isAdmin, hasPermission],
  );

  const filteredNavSections = useMemo(
    () =>
      navSections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => canAccessItem(item.permission)),
        }))
        .filter((section) => section.items.length > 0),
    [isAdmin, hasPermission],
  );

  const isActive = (href: string) => {
    if (href === "/au-rubber/portal/dashboard") return pathname === href;
    return pathname.startsWith(href);
  };

  const isSectionActive = (section: NavSection) => {
    return section.items.some((item) => isActive(item.href));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    onSearch?.(e.target.value);
  };

  const handleSectionEnter = (label: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredSection(label);
  };

  const handleSectionLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredSection(null);
    }, 150);
  };

  const handleSectionClick = (label: string) => {
    setHoveredSection(hoveredSection === label ? null : label);
  };

  const handleLogout = async () => {
    setShowUserMenu(false);
    await logout();
    window.location.href = "/au-rubber/login";
  };

  const fullName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.email?.split("@")[0] || "AU Rubber";
  const firstInitial = user?.firstName?.[0] || user?.email?.[0] || "A";
  const lastInitial = user?.lastName?.[0] || user?.email?.[1] || "U";
  const userInitials = `${firstInitial}${lastInitial}`.toUpperCase();

  return (
    <header
      className="relative z-50 flex items-center h-12 px-4 shadow-md"
      style={{ backgroundColor: colors.background }}
    >
      <div className="flex items-center shrink-0">
        {logoObjectUrl ? (
          <img src={logoObjectUrl} alt="Logo" className="h-8 max-w-[100px] object-contain" />
        ) : (
          <div className="text-xl font-bold" style={{ color: colors.accent }}>
            AU
          </div>
        )}
        <span className="ml-2 text-white text-base font-medium hidden sm:inline">Rubber App</span>
      </div>

      <nav className="flex items-center flex-1 ml-4">
        {filteredSingleNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-sm font-medium whitespace-nowrap rounded-md transition-colors ${
              isActive(item.href)
                ? "bg-black/20 text-white"
                : "text-white/70 hover:bg-black/10 hover:text-white"
            }`}
          >
            <span className="[&>svg]:w-4 [&>svg]:h-4">{item.icon}</span>
            {item.label}
          </Link>
        ))}

        {filteredNavSections.map((section) => (
          <div
            key={section.label}
            className="relative flex-1"
            onMouseEnter={() => handleSectionEnter(section.label)}
            onMouseLeave={handleSectionLeave}
          >
            <button
              onClick={() => handleSectionClick(section.label)}
              className={`w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-sm font-medium whitespace-nowrap rounded-md transition-colors ${
                isSectionActive(section) || hoveredSection === section.label
                  ? "bg-black/20 text-white"
                  : "text-white/70 hover:bg-black/10 hover:text-white"
              }`}
            >
              <span className="[&>svg]:w-4 [&>svg]:h-4">{section.icon}</span>
              {section.label}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {hoveredSection === section.label && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setHoveredSection(null)} />
                <div className="absolute left-0 top-full mt-1 w-52 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
                  {section.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block px-4 py-2 text-sm transition-colors ${
                        isActive(item.href)
                          ? "bg-yellow-50 text-yellow-800 font-medium"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                      onClick={() => setHoveredSection(null)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </nav>

      <div className="flex items-center space-x-2 ml-auto shrink-0">
        <div className="hidden sm:block">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
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
              placeholder="Search..."
              className="w-48 lg:w-64 pl-9 pr-3 py-1.5 text-sm bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:bg-opacity-20"
            />
          </div>
        </div>
        <ThemeToggle
          className="p-2 text-white hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors"
          iconClassName="w-5 h-5 text-white"
        />
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center justify-center w-9 h-9 rounded-full text-white font-semibold text-sm hover:ring-2 hover:ring-yellow-400 transition-all"
            style={{ backgroundColor: colors.accent }}
          >
            {userInitials}
          </button>
          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900 truncate">{fullName}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email || ""}</p>
                </div>
                <div className="py-1">
                  <Link
                    href="/au-rubber/portal/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Settings
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/au-rubber/portal/rbac"
                      onClick={() => setShowUserMenu(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      RBAC
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Logout
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
