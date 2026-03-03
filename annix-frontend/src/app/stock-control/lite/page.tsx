"use client";

import Link from "next/link";

interface MenuItemProps {
  href: string;
  title: string;
  description: string;
  icon: string;
}

function MenuItem({ href, title, description, icon }: MenuItemProps) {
  return (
    <Link
      href={href}
      className="block bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border-l-4 border-teal-600"
    >
      <div className="flex items-start space-x-4">
        <span className="text-3xl">{icon}</span>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
      </div>
    </Link>
  );
}

export default function LiteHomePage() {
  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Stock Control Menu</h1>

      <div className="space-y-4">
        <MenuItem
          href="/stock-control/lite/issue-stock"
          title="Issue Stock"
          description="Issue items from inventory to a job card"
          icon="📦"
        />

        <MenuItem
          href="/stock-control/lite/receive-delivery"
          title="Receive Delivery"
          description="Record incoming stock deliveries"
          icon="🚚"
        />

        <MenuItem
          href="/stock-control/lite/inventory"
          title="Search Inventory"
          description="Browse and search stock items"
          icon="🔍"
        />
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Lite Mode</strong> is designed for older devices. For full features including QR
          scanning, use the{" "}
          <Link href="/stock-control/portal" className="underline">
            main portal
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
