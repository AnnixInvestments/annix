"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuRubberAuth } from "@/app/context/AuRubberAuthContext";
import { useAuRubberBranding } from "@/app/context/AuRubberBrandingContext";
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
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    label: "Documents",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    items: [
      {
        href: "/au-rubber/portal/supplier-cocs",
        label: "Supplier CoCs",
        permission: PAGE_PERMISSIONS["/au-rubber/portal/supplier-cocs"],
      },
      {
        href: "/au-rubber/portal/quality-tracking",
        label: "Quality Tracking",
        permission: PAGE_PERMISSIONS["/au-rubber/portal/quality-tracking"],
      },
      {
        href: "/au-rubber/portal/delivery-notes",
        label: "Delivery Notes",
        permission: PAGE_PERMISSIONS["/au-rubber/portal/delivery-notes"],
      },
      {
        href: "/au-rubber/portal/roll-stock",
        label: "Roll Stock",
        permission: PAGE_PERMISSIONS["/au-rubber/portal/roll-stock"],
      },
      {
        href: "/au-rubber/portal/au-cocs",
        label: "AU Certificates",
        permission: PAGE_PERMISSIONS["/au-rubber/portal/au-cocs"],
      },
    ],
  },
  {
    label: "Stock Control",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
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
    ],
  },
  {
    label: "Prices",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
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
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

export function AuSidebar() {
  const pathname = usePathname();
  const { user, logout, hasPermission, isAdmin } = useAuRubberAuth();
  const { colors } = useAuRubberBranding();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["Products"]));
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const canAccessItem = (permission: string | undefined): boolean => {
    if (isAdmin) {
      return true;
    }
    if (!permission) {
      return true;
    }
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

  const toggleSection = (label: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(label)) {
      newExpanded.delete(label);
    } else {
      newExpanded.add(label);
    }
    setExpandedSections(newExpanded);
  };

  const isActive = (href: string) => {
    if (href === "/au-rubber/portal/dashboard") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
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
    <div
      className="w-60 h-screen flex flex-col border-r border-gray-200"
      style={{ backgroundColor: colors.sidebar }}
    >
      <div className="p-4 border-b border-gray-200 relative">
        <button
          onClick={() => setAccountMenuOpen(!accountMenuOpen)}
          className="w-full flex items-center space-x-3 hover:bg-gray-50 rounded-lg p-1 -m-1 transition-colors"
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
            style={{ backgroundColor: colors.accent }}
          >
            {userInitials}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-gray-900 truncate">{fullName}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email || ""}</p>
          </div>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${accountMenuOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {accountMenuOpen && (
          <div className="absolute left-4 right-4 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
            <Link
              href="/au-rubber/portal/settings"
              onClick={() => setAccountMenuOpen(false)}
              className={`flex items-center px-3 py-2 text-sm font-medium transition-colors ${
                isActive("/au-rubber/portal/settings")
                  ? "bg-yellow-100 text-yellow-800"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Settings
            </Link>
            {isAdmin && (
              <Link
                href="/au-rubber/portal/rbac"
                onClick={() => setAccountMenuOpen(false)}
                className={`flex items-center px-3 py-2 text-sm font-medium transition-colors ${
                  isActive("/au-rubber/portal/rbac")
                    ? "bg-yellow-100 text-yellow-800"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                RBAC
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Logout
            </button>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <div className="space-y-1">
          {filteredSingleNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive(item.href)
                  ? "bg-yellow-100 text-yellow-800"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span className="mr-3">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>

        <div className="mt-4 space-y-1">
          {filteredNavSections.map((section) => (
            <div key={section.label}>
              <button
                onClick={() => toggleSection(section.label)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center">
                  <span className="mr-3">{section.icon}</span>
                  {section.label}
                </div>
                <svg
                  className={`w-4 h-4 transition-transform ${expandedSections.has(section.label) ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {expandedSections.has(section.label) && (
                <div className="ml-8 mt-1 space-y-1">
                  {section.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
                        isActive(item.href)
                          ? "bg-yellow-100 text-yellow-800"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
}
