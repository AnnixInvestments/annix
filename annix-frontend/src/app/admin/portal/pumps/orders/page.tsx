"use client";

import { PUMPS_MODULE } from "@product-data/pumps";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Breadcrumb } from "../components/Breadcrumb";

type SortColumn = "orderNumber" | "customer" | "serviceType" | "status" | "createdAt";
type SortDirection = "asc" | "desc";

interface MockPumpOrder {
  id: number;
  orderNumber: string;
  customer: string;
  serviceType: string;
  pumpType: string;
  status: "pending" | "quoted" | "approved" | "in_progress" | "completed" | "cancelled";
  totalValue: number;
  createdAt: string;
}

const MOCK_ORDERS: MockPumpOrder[] = [
  {
    id: 1,
    orderNumber: "PMP-2026-001",
    customer: "Sasol Mining",
    serviceType: "new_pump",
    pumpType: "centrifugal_end_suction",
    status: "quoted",
    totalValue: 145000,
    createdAt: "2026-02-01",
  },
  {
    id: 2,
    orderNumber: "PMP-2026-002",
    customer: "Anglo American Platinum",
    serviceType: "spare_parts",
    pumpType: "slurry_pump",
    status: "approved",
    totalValue: 32500,
    createdAt: "2026-02-03",
  },
  {
    id: 3,
    orderNumber: "PMP-2026-003",
    customer: "Eskom Holdings",
    serviceType: "repair_service",
    pumpType: "boiler_feed",
    status: "in_progress",
    totalValue: 78000,
    createdAt: "2026-02-04",
  },
  {
    id: 4,
    orderNumber: "PMP-2026-004",
    customer: "City of Johannesburg",
    serviceType: "new_pump",
    pumpType: "submersible",
    status: "pending",
    totalValue: 0,
    createdAt: "2026-02-05",
  },
  {
    id: 5,
    orderNumber: "PMP-2026-005",
    customer: "Impala Platinum",
    serviceType: "rental",
    pumpType: "dewatering",
    status: "completed",
    totalValue: 15000,
    createdAt: "2026-01-28",
  },
];

const STATUS_COLORS: Record<MockPumpOrder["status"], string> = {
  pending: "bg-yellow-100 text-yellow-800",
  quoted: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  in_progress: "bg-purple-100 text-purple-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<MockPumpOrder["status"], string> = {
  pending: "Pending Quote",
  quoted: "Quoted",
  approved: "Approved",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const ITEMS_PER_PAGE = 10;

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  return (
    <span className="inline-block ml-1">
      {active ? (
        direction === "asc" ? (
          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )
      ) : (
        <svg
          className="w-4 h-4 inline text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      )}
    </span>
  );
}

function formatCurrency(value: number): string {
  return `R ${value.toLocaleString("en-ZA")}`;
}

export default function PumpOrdersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [sortColumn, setSortColumn] = useState<SortColumn>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const filteredOrders = useMemo(() => {
    let orders = [...MOCK_ORDERS];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      orders = orders.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(query) || o.customer.toLowerCase().includes(query),
      );
    }

    if (statusFilter) {
      orders = orders.filter((o) => o.status === statusFilter);
    }

    if (serviceTypeFilter) {
      orders = orders.filter((o) => o.serviceType === serviceTypeFilter);
    }

    orders.sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      if (sortColumn === "orderNumber") {
        return direction * a.orderNumber.localeCompare(b.orderNumber);
      } else if (sortColumn === "customer") {
        return direction * a.customer.localeCompare(b.customer);
      } else if (sortColumn === "serviceType") {
        return direction * a.serviceType.localeCompare(b.serviceType);
      } else if (sortColumn === "status") {
        return direction * a.status.localeCompare(b.status);
      } else if (sortColumn === "createdAt") {
        return direction * a.createdAt.localeCompare(b.createdAt);
      }
      return 0;
    });

    return orders;
  }, [searchQuery, statusFilter, serviceTypeFilter, sortColumn, sortDirection]);

  const paginatedOrders = filteredOrders.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE,
  );

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("");
    setServiceTypeFilter("");
    setCurrentPage(0);
  };

  const serviceTypeLabel = (value: string): string => {
    const category = PUMPS_MODULE.categories.find((c) => c.value === value);
    return category?.label || value;
  };

  const statusCounts = useMemo(() => {
    return Object.keys(STATUS_LABELS).reduce(
      (acc, status) => {
        acc[status as MockPumpOrder["status"]] = MOCK_ORDERS.filter(
          (o) => o.status === status,
        ).length;
        return acc;
      },
      {} as Record<MockPumpOrder["status"], number>,
    );
  }, []);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Orders" }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pump Orders</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage pump quotes, orders, and service requests
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {}}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Export CSV
          </button>
          <button
            onClick={() => {}}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Order
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(STATUS_LABELS).map(([status, label]) => (
          <button
            key={status}
            onClick={() => {
              setStatusFilter(statusFilter === status ? "" : status);
              setCurrentPage(0);
            }}
            className={`p-3 rounded-lg border transition-all ${
              statusFilter === status
                ? "border-blue-500 ring-2 ring-blue-200"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="text-2xl font-bold text-gray-900">
              {statusCounts[status as MockPumpOrder["status"]]}
            </div>
            <div
              className={`text-xs font-medium ${STATUS_COLORS[status as MockPumpOrder["status"]]} px-2 py-0.5 rounded-full inline-block mt-1`}
            >
              {label}
            </div>
          </button>
        ))}
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Search:</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(0);
              }}
              placeholder="Order # or customer"
              className="block w-56 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-gray-400 hover:text-gray-600"
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
            )}
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Service Type:</label>
            <select
              value={serviceTypeFilter}
              onChange={(e) => {
                setServiceTypeFilter(e.target.value);
                setCurrentPage(0);
              }}
              className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
            >
              <option value="">All Types</option>
              {PUMPS_MODULE.categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
          {(searchQuery || statusFilter || serviceTypeFilter) && (
            <button onClick={clearFilters} className="text-sm text-blue-600 hover:text-blue-800">
              Clear all filters
            </button>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {filteredOrders.length === 0 ? (
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
            <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery || statusFilter || serviceTypeFilter
                ? "Try adjusting your filters"
                : "Create your first pump order."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("orderNumber")}
                  >
                    Order Number
                    <SortIcon active={sortColumn === "orderNumber"} direction={sortDirection} />
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("customer")}
                  >
                    Customer
                    <SortIcon active={sortColumn === "customer"} direction={sortDirection} />
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("serviceType")}
                  >
                    Service Type
                    <SortIcon active={sortColumn === "serviceType"} direction={sortDirection} />
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Pump Type
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("status")}
                  >
                    Status
                    <SortIcon active={sortColumn === "status"} direction={sortDirection} />
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Value
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("createdAt")}
                  >
                    Created
                    <SortIcon active={sortColumn === "createdAt"} direction={sortDirection} />
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/admin/portal/pumps/orders/${order.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-900"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.customer}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {serviceTypeLabel(order.serviceType)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.pumpType.replace(/_/g, " ")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[order.status]}`}
                      >
                        {STATUS_LABELS[order.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.totalValue > 0 ? formatCurrency(order.totalValue) : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.createdAt}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/admin/portal/pumps/orders/${order.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {currentPage * ITEMS_PER_PAGE + 1} to{" "}
              {Math.min((currentPage + 1) * ITEMS_PER_PAGE, filteredOrders.length)} of{" "}
              {filteredOrders.length} orders
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:text-gray-300 disabled:cursor-not-allowed border rounded"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage + 1} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:text-gray-300 disabled:cursor-not-allowed border rounded"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <svg
            className="h-5 w-5 text-yellow-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Demo Data</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                This page displays sample data for demonstration purposes. Connect to the pump
                orders API to display real order data from your system.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
