"use client";

import {
  RUBBER_ORDER_STATUS,
  statusColor,
  statusLabel,
} from "@annix/product-data/rubber/orderStatus";
import Link from "next/link";
import { useEffect, useState } from "react";
import { auRubberApiClient } from "@/app/lib/api/auRubberApi";
import type {
  RubberCompanyDto,
  RubberOrderDto,
  RubberProductDto,
} from "@/app/lib/api/rubberPortalApi";
import { formatDateZA } from "@/app/lib/datetime";

interface StatusCount {
  status: number;
  label: string;
  count: number;
}

const ORDERS_PER_PAGE = 5;

export default function AuRubberDashboard() {
  const [orders, setOrders] = useState<RubberOrderDto[]>([]);
  const [companies, setCompanies] = useState<RubberCompanyDto[]>([]);
  const [products, setProducts] = useState<RubberProductDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [ordersData, companiesData, productsData] = await Promise.all([
          auRubberApiClient.orders(),
          auRubberApiClient.companies(),
          auRubberApiClient.products(),
        ]);
        setOrders(Array.isArray(ordersData) ? ordersData : []);
        setCompanies(Array.isArray(companiesData) ? companiesData : []);
        setProducts(Array.isArray(productsData) ? productsData : []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load data"));
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const ordersByStatus: StatusCount[] = Object.entries(RUBBER_ORDER_STATUS).map(([key, value]) => ({
    status: value,
    label: statusLabel(value),
    count: orders.filter((o) => o.status === value).length,
  }));

  const totalPages = Math.ceil(orders.length / ORDERS_PER_PAGE);
  const paginatedOrders = orders.slice(
    currentPage * ORDERS_PER_PAGE,
    (currentPage + 1) * ORDERS_PER_PAGE,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading rubber lining data...</p>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AU Rubber Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage rubber products, companies, and orders
          </p>
        </div>
        <Link
          href="/au-rubber/portal/orders"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Order
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/au-rubber/portal/orders"
          className="bg-white overflow-hidden shadow rounded-lg hover:ring-2 hover:ring-yellow-500 transition-all"
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
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Orders</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{orders.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </Link>

        <Link
          href="/au-rubber/portal/companies"
          className="bg-white overflow-hidden shadow rounded-lg hover:ring-2 hover:ring-green-500 transition-all"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-md bg-green-500 flex items-center justify-center">
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
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Companies</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{companies.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </Link>

        <Link
          href="/au-rubber/portal/products"
          className="bg-white overflow-hidden shadow rounded-lg hover:ring-2 hover:ring-purple-500 transition-all"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-md bg-purple-500 flex items-center justify-center">
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Products</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{products.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </Link>

        <Link
          href="/au-rubber/portal/codings"
          className="bg-white overflow-hidden shadow rounded-lg hover:ring-2 hover:ring-orange-500 transition-all"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-md bg-orange-500 flex items-center justify-center">
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
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Product Codings</dt>
                  <dd className="text-sm text-gray-600">Compounds, Colours, Types...</dd>
                </dl>
              </div>
            </div>
          </div>
        </Link>

        <Link
          href="/au-rubber/portal/pricing-tiers"
          className="bg-white overflow-hidden shadow rounded-lg hover:ring-2 hover:ring-yellow-500 transition-all"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-md bg-yellow-500 flex items-center justify-center">
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Pricing Tiers</dt>
                  <dd className="text-sm text-gray-600">Company pricing levels</dd>
                </dl>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {ordersByStatus.some((s) => s.count > 0) && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Orders by Status</h3>
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-3">
              {ordersByStatus
                .filter((s) => s.count > 0)
                .map((s) => (
                  <Link
                    key={s.status}
                    href={`/au-rubber/portal/orders?status=${s.status}`}
                    className={`px-3 py-2 rounded-lg ${statusColor(s.status)} hover:opacity-80 transition-opacity`}
                  >
                    <span className="font-semibold">{s.count}</span>
                    <span className="ml-1">{s.label}</span>
                  </Link>
                ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Orders</h3>
        </div>
        {orders.length === 0 ? (
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No orders</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new order.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Order Number
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Company
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Items
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/au-rubber/portal/orders/${order.id}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.companyName || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor(order.status)}`}
                    >
                      {order.statusLabel}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.items.length}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateZA(order.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {orders.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <Link
              href="/au-rubber/portal/orders"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View all orders &rarr;
            </Link>
            {totalPages > 1 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:text-gray-300 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <span className="text-sm text-gray-600">
                  Page {currentPage + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage >= totalPages - 1}
                  className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:text-gray-300 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
