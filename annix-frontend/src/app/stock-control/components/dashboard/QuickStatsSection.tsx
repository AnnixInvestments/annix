"use client";

import Link from "next/link";
import type { DashboardStats } from "@/app/lib/api/stockControlApi";

interface QuickStatsSectionProps {
  stats: DashboardStats;
}

export function QuickStatsSection({ stats }: QuickStatsSectionProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <Link
        href="/stock-control/portal/inventory"
        className="bg-white shadow-sm border border-gray-200 rounded-lg p-3 sm:p-4 hover:ring-2 hover:ring-teal-500 transition-all"
      >
        <p className="text-xs font-medium text-gray-500">Items</p>
        <p className="text-xl sm:text-2xl font-semibold text-gray-900">{stats.totalItems}</p>
      </Link>
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-3 sm:p-4">
        <p className="text-xs font-medium text-gray-500">Stock Value</p>
        <p className="text-lg sm:text-2xl font-semibold text-gray-900 truncate">
          {new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(
            stats.totalValue,
          )}
        </p>
      </div>
      <Link
        href="/stock-control/portal/job-cards"
        className="bg-white shadow-sm border border-gray-200 rounded-lg p-3 sm:p-4 hover:ring-2 hover:ring-teal-500 transition-all"
      >
        <p className="text-xs font-medium text-gray-500">Active Jobs</p>
        <p className="text-xl sm:text-2xl font-semibold text-gray-900">{stats.activeJobs}</p>
      </Link>
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-3 sm:p-4">
        <p className="text-xs font-medium text-gray-500">Low Stock</p>
        <p
          className={`text-xl sm:text-2xl font-semibold ${stats.lowStockCount > 0 ? "text-amber-600" : "text-gray-900"}`}
        >
          {stats.lowStockCount}
        </p>
      </div>
    </div>
  );
}
