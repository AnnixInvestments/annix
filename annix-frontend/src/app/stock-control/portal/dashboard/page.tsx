"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type {
  DashboardStats,
  RecentActivity,
  SohSummary,
  StockItem,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";
import { useStockControlBranding } from "../../context/StockControlBrandingContext";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";

function formatZAR(value: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(value);
}

function movementTypeBadge(type: string): string {
  const colors: Record<string, string> = {
    delivery: "bg-green-100 text-green-800",
    allocation: "bg-blue-100 text-blue-800",
    adjustment: "bg-amber-100 text-amber-800",
    return: "bg-purple-100 text-purple-800",
  };
  return colors[type.toLowerCase()] || "bg-gray-100 text-gray-800";
}

export default function StockControlDashboard() {
  const { colors, heroImageUrl } = useStockControlBranding();
  const { user } = useStockControlAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [sohSummary, setSohSummary] = useState<SohSummary[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [reorderAlerts, setReorderAlerts] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [statsData, sohData, activityData, alertsData] = await Promise.all([
          stockControlApiClient.dashboardStats(),
          stockControlApiClient.sohSummary(),
          stockControlApiClient.recentActivity(),
          stockControlApiClient.reorderAlerts(),
        ]);
        setStats(statsData);
        setSohSummary(Array.isArray(sohData) ? sohData : []);
        setRecentActivity(Array.isArray(activityData) ? activityData : []);
        setReorderAlerts(Array.isArray(alertsData) ? alertsData : []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load dashboard data"));
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
          <p className="text-gray-600">{error.message}</p>
        </div>
      </div>
    );
  }

  const maxSohQuantity = sohSummary.reduce((max, s) => Math.max(max, s.totalQuantity), 0);

  return (
    <div className="space-y-6">
      {heroImageUrl ? (
        <div
          className="relative rounded-xl overflow-hidden shadow-lg"
          style={{ minHeight: 180 }}
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImageUrl})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/30" />
          <div className="relative px-8 py-10">
            <h1 className="text-3xl font-bold text-white">
              Welcome back, {user?.name?.split(" ")[0] ?? "there"}
            </h1>
            <p className="mt-2 text-white/80 text-sm">
              Overview of inventory, jobs, and recent activity
            </p>
          </div>
        </div>
      ) : (
        <div
          className="relative rounded-xl overflow-hidden shadow-lg"
          style={{ backgroundColor: colors.background, minHeight: 140 }}
        >
          <div className="relative px-8 py-8">
            <h1 className="text-2xl font-bold text-white">
              Welcome back, {user?.name?.split(" ")[0] ?? "there"}
            </h1>
            <p className="mt-1 text-white/80 text-sm">
              Overview of inventory, jobs, and recent activity
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/stock-control/portal/inventory"
          className="bg-white overflow-hidden shadow rounded-lg hover:ring-2 hover:ring-teal-500 transition-all"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-md bg-teal-500 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
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
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Items</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats?.totalItems ?? 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </Link>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-md bg-emerald-500 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Value</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {formatZAR(stats?.totalValue ?? 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-md bg-amber-500 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Low Stock</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {stats?.lowStockCount ?? 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <Link
          href="/stock-control/portal/job-cards"
          className="bg-white overflow-hidden shadow rounded-lg hover:ring-2 hover:ring-teal-500 transition-all"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-md bg-blue-500 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Jobs</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats?.activeJobs ?? 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {sohSummary.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">SOH by Category</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {sohSummary.map((item) => (
                <div key={item.category} className="flex items-center">
                  <div className="w-32 text-sm font-medium text-gray-700 truncate">
                    {item.category}
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-teal-500 h-4 rounded-full transition-all"
                        style={{
                          width:
                            maxSohQuantity > 0
                              ? `${(item.totalQuantity / maxSohQuantity) * 100}%`
                              : "0%",
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="w-20 text-sm text-gray-600 text-right">{item.totalQuantity}</div>
                  <div className="w-28 text-sm text-gray-500 text-right">
                    {formatZAR(item.totalValue)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {reorderAlerts.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Reorder Alerts</h3>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
              {reorderAlerts.length} items
            </span>
          </div>
          <div className="divide-y divide-gray-200">
            {reorderAlerts.map((item) => (
              <div
                key={item.id}
                className="px-4 py-3 sm:px-6 flex items-center justify-between bg-amber-50"
              >
                <div>
                  <Link
                    href={`/stock-control/portal/inventory/${item.id}`}
                    className="text-sm font-medium text-teal-700 hover:text-teal-900"
                  >
                    {item.name}
                  </Link>
                  <p className="text-xs text-gray-500">{item.sku}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-red-600">
                    SOH: {item.quantity} / Min: {item.minStockLevel}
                  </p>
                  <p className="text-xs text-gray-500">{item.category}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Activity</h3>
        </div>
        {recentActivity.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No recent activity</h3>
            <p className="mt-1 text-sm text-gray-500">Stock movements will appear here.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Date
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Item
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Type
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Qty
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  By
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentActivity.slice(0, 10).map((activity) => (
                <tr key={activity.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateZA(activity.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{activity.itemName}</div>
                    <div className="text-xs text-gray-500">{activity.itemSku}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${movementTypeBadge(activity.movementType)}`}
                    >
                      {activity.movementType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {activity.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {activity.createdBy || "System"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {activity.notes || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
