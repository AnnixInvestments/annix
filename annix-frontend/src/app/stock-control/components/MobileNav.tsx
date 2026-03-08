"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import { ALL_NAV_ITEMS } from "../config/navItems";
import { useStockControlBranding } from "../context/StockControlBrandingContext";
import { useStockControlRbac } from "../context/StockControlRbacContext";
import { useNotificationCount } from "../hooks/useNotificationCount";
import { RbacConfigPanel } from "./RbacConfigPanel";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNav(props: MobileNavProps) {
  const { isOpen, onClose } = props;
  const pathname = usePathname();
  const { user, logout } = useStockControlAuth();
  const { colors } = useStockControlBranding();
  const { count: notificationCount } = useNotificationCount();
  const { rbacConfig } = useStockControlRbac();
  const [rbacPanelOpen, setRbacPanelOpen] = useState(false);

  const visibleNavItems = ALL_NAV_ITEMS.filter((item) => {
    const allowedRoles = rbacConfig[item.key] ?? item.defaultRoles;
    return user?.role ? allowedRoles.includes(user.role) : false;
  });

  const isActive = (href: string) => {
    if (href === "/stock-control/portal/dashboard") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
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

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      <div
        className={`fixed top-0 left-0 h-full w-72 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ backgroundColor: colors.sidebar }}
      >
        <div className="flex flex-col h-full pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                style={{ backgroundColor: colors.accent }}
              >
                {userInitials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: colors.sidebarText }}>
                  {user ? user.name : "Stock Control"}
                </p>
                <p className="text-xs truncate" style={{ color: colors.sidebarText, opacity: 0.6 }}>
                  {user ? user.email : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {user?.role === "admin" && (
                <button
                  onClick={() => setRbacPanelOpen(true)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: colors.sidebarText }}
                  title="Configure menu visibility"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                    />
                  </svg>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-lg transition-colors"
                style={{ color: colors.sidebarText }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-3">
            <div className="space-y-1">
              {visibleNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors"
                  style={
                    isActive(item.href)
                      ? { backgroundColor: colors.sidebarActive, color: "#FFFFFF" }
                      : { color: colors.sidebarText }
                  }
                >
                  <span className="mr-3">{item.icon}</span>
                  {item.label}
                  {item.href === "/stock-control/portal/notifications" && notificationCount > 0 && (
                    <span className="ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full">
                      {notificationCount > 9 ? "9+" : notificationCount}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </nav>

          <div className="p-3 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors"
              style={{ color: colors.sidebarText }}
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
        </div>
      </div>

      <RbacConfigPanel isOpen={rbacPanelOpen} onClose={() => setRbacPanelOpen(false)} />
    </>
  );
}
