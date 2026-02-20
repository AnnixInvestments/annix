"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import { corpId } from "@/app/lib/corpId";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    href: "/stock-control/portal/dashboard",
    label: "Dashboard",
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
    href: "/stock-control/portal/inventory",
    label: "Inventory",
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
  },
  {
    href: "/stock-control/portal/job-cards",
    label: "Job Cards",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
    ),
  },
  {
    href: "/stock-control/portal/deliveries",
    label: "Deliveries",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
        />
      </svg>
    ),
  },
  {
    href: "/stock-control/portal/reports",
    label: "Reports",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
];

export function StockControlSidebar() {
  const pathname = usePathname();
  const { user, logout } = useStockControlAuth();

  const colors = corpId.colors.portal.stockControl;

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

  return (
    <div
      className="w-60 h-screen flex flex-col border-r border-gray-200"
      style={{ backgroundColor: colors.sidebar }}
    >
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
            style={{ backgroundColor: colors.accent }}
          >
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.name ?? "Stock Control"}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.email ?? ""}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <div className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive(item.href)
                  ? "bg-teal-100 text-teal-800"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span className="mr-3">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="p-3 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
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
  );
}
