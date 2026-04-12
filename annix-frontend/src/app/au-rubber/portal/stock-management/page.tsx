"use client";

import Link from "next/link";

const LINKS = [
  {
    title: "Issue Stock",
    href: "/au-rubber/portal/stock-management/issue-stock",
    description: "Issue consumables, paint, and rubber rolls against job cards or CPOs.",
  },
  {
    title: "Returns",
    href: "/au-rubber/portal/stock-management/returns",
    description: "Return rubber offcuts, paint, or consumables to stock.",
  },
  {
    title: "Stock Take",
    href: "/au-rubber/portal/stock-management/stock-take",
    description: "Month-end stock take with counting, approval, and variance reporting.",
  },
];

export default function AuRubberStockManagementIndex() {
  return (
    <div className="space-y-6 p-3 sm:p-6">
      <header>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Stock Management</h1>
        <p className="mt-1 text-sm text-gray-600">
          Unified inventory management powered by the Stock Management module.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-3">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:border-yellow-400 hover:shadow"
          >
            <div className="font-semibold text-gray-900">{link.title}</div>
            <div className="mt-1 text-xs text-gray-600">{link.description}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
