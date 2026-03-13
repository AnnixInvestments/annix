"use client";

import Link from "next/link";

interface QuickLinksSectionProps {
  navItemVisible: (navKey: string) => boolean;
}

function InventoryIcon() {
  return (
    <svg
      className="w-6 h-6 mx-auto text-gray-400 mb-2"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </svg>
  );
}

function StaffIcon() {
  return (
    <svg
      className="w-6 h-6 mx-auto text-gray-400 mb-2"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function ReportsIcon() {
  return (
    <svg
      className="w-6 h-6 mx-auto text-gray-400 mb-2"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      className="w-6 h-6 mx-auto text-gray-400 mb-2"
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
  );
}

const LINK_CLASS =
  "bg-white shadow-sm border border-gray-200 rounded-lg p-4 hover:ring-2 hover:ring-teal-500 transition-all text-center";

export function QuickLinksSection({ navItemVisible }: QuickLinksSectionProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {navItemVisible("inventory-stock") && (
        <Link href="/stock-control/portal/inventory" className={LINK_CLASS}>
          <InventoryIcon />
          <p className="text-sm font-medium text-gray-700">Inventory</p>
        </Link>
      )}
      {navItemVisible("staff") && (
        <Link href="/stock-control/portal/staff" className={LINK_CLASS}>
          <StaffIcon />
          <p className="text-sm font-medium text-gray-700">Staff</p>
        </Link>
      )}
      {navItemVisible("reports") && (
        <Link href="/stock-control/portal/reports" className={LINK_CLASS}>
          <ReportsIcon />
          <p className="text-sm font-medium text-gray-700">Reports</p>
        </Link>
      )}
      {navItemVisible("settings") && (
        <Link href="/stock-control/portal/settings" className={LINK_CLASS}>
          <SettingsIcon />
          <p className="text-sm font-medium text-gray-700">Settings</p>
        </Link>
      )}
    </div>
  );
}
