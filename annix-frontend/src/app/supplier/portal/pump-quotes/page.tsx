"use client";

import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import { useSupplierAuth } from "@/app/context/SupplierAuthContext";
import { formatDateZA, fromISO, now } from "@/app/lib/datetime";

interface PumpQuoteRequest {
  id: number;
  requestNumber: string;
  customerCompany: string;
  customerContact: string;
  requestDate: string;
  requiredDate: string;
  status: "pending" | "quoted" | "accepted" | "declined" | "expired";
  pumpType: string;
  quantity: number;
  flowRate: number;
  totalHead: number;
  application: string;
  priority: "normal" | "urgent";
}

const MOCK_QUOTE_REQUESTS: PumpQuoteRequest[] = [
  {
    id: 1,
    requestNumber: "PQR-2026-001",
    customerCompany: "Mining Corp SA",
    customerContact: "John Smith",
    requestDate: "2026-02-01",
    requiredDate: "2026-02-15",
    status: "pending",
    pumpType: "Slurry Pump",
    quantity: 2,
    flowRate: 200,
    totalHead: 45,
    application: "Mining slurry transfer",
    priority: "urgent",
  },
  {
    id: 2,
    requestNumber: "PQR-2026-002",
    customerCompany: "Water Utilities PTY",
    customerContact: "Sarah Johnson",
    requestDate: "2026-02-03",
    requiredDate: "2026-02-28",
    status: "pending",
    pumpType: "Multistage Centrifugal",
    quantity: 4,
    flowRate: 50,
    totalHead: 120,
    application: "Municipal water boosting",
    priority: "normal",
  },
  {
    id: 3,
    requestNumber: "PQR-2026-003",
    customerCompany: "ChemProcess Industries",
    customerContact: "Mike Peters",
    requestDate: "2026-01-28",
    requiredDate: "2026-02-10",
    status: "quoted",
    pumpType: "API 610 Process Pump",
    quantity: 1,
    flowRate: 150,
    totalHead: 80,
    application: "Chemical process circulation",
    priority: "urgent",
  },
  {
    id: 4,
    requestNumber: "PQR-2026-004",
    customerCompany: "Food & Bev Co",
    customerContact: "Lisa Brown",
    requestDate: "2026-01-25",
    requiredDate: "2026-02-05",
    status: "accepted",
    pumpType: "Sanitary Pump",
    quantity: 3,
    flowRate: 25,
    totalHead: 30,
    application: "Food processing line",
    priority: "normal",
  },
];

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Pending Quote" },
  quoted: { bg: "bg-blue-100", text: "text-blue-800", label: "Quote Submitted" },
  accepted: { bg: "bg-green-100", text: "text-green-800", label: "Accepted" },
  declined: { bg: "bg-red-100", text: "text-red-800", label: "Declined" },
  expired: { bg: "bg-gray-100", text: "text-gray-800", label: "Expired" },
};

export default function SupplierPumpQuotesPage() {
  const { supplier } = useSupplierAuth();
  const { showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRequests = MOCK_QUOTE_REQUESTS.filter((req) => {
    if (statusFilter !== "all" && req.status !== statusFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        req.requestNumber.toLowerCase().includes(query) ||
        req.customerCompany.toLowerCase().includes(query) ||
        req.pumpType.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const daysUntilDeadline = (dateString: string): number => {
    const deadline = fromISO(dateString).startOf("day");
    const today = now().startOf("day");
    return Math.ceil(deadline.diff(today, "days").days);
  };

  const stats = {
    pending: MOCK_QUOTE_REQUESTS.filter((r) => r.status === "pending").length,
    quoted: MOCK_QUOTE_REQUESTS.filter((r) => r.status === "quoted").length,
    accepted: MOCK_QUOTE_REQUESTS.filter((r) => r.status === "accepted").length,
    total: MOCK_QUOTE_REQUESTS.length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pump Quote Requests</h1>
          <p className="mt-1 text-gray-600">Respond to pump quotation requests from customers</p>
        </div>
        <Link
          href="/supplier/portal/dashboard"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Requests</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg
                className="w-6 h-6 text-blue-600"
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
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
              <p className="text-sm text-gray-500">Pending</p>
            </div>
            <div className="p-2 bg-yellow-100 rounded-lg">
              <svg
                className="w-6 h-6 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-blue-700">{stats.quoted}</p>
              <p className="text-sm text-gray-500">Quoted</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-green-700">{stats.accepted}</p>
              <p className="text-sm text-gray-500">Accepted</p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by request number, customer, or pump type..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <svg
                  className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="quoted">Quoted</option>
                <option value="accepted">Accepted</option>
                <option value="declined">Declined</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>
        </div>

        {filteredRequests.length === 0 ? (
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
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No quote requests found</h3>
            <p className="mt-2 text-sm text-gray-500">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredRequests.map((request) => {
              const statusStyle = STATUS_STYLES[request.status];
              const daysLeft = daysUntilDeadline(request.requiredDate);
              const isUrgent = request.priority === "urgent" || daysLeft <= 3;
              const canQuote = request.status === "pending";

              return (
                <div key={request.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}
                        >
                          {statusStyle.label}
                        </span>
                        <h3 className="text-sm font-semibold text-gray-900">
                          {request.requestNumber}
                        </h3>
                        {request.priority === "urgent" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            Urgent
                          </span>
                        )}
                        {canQuote && daysLeft <= 3 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                            {daysLeft === 0 ? "Due Today!" : `${daysLeft} days left`}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Customer:</span>
                          <p className="font-medium text-gray-900">{request.customerCompany}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Pump Type:</span>
                          <p className="font-medium text-gray-900">{request.pumpType}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Qty:</span>
                          <p className="font-medium text-gray-900">{request.quantity}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Due:</span>
                          <p className="font-medium text-gray-900">
                            {formatDateZA(request.requiredDate)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">Specs:</span> {request.flowRate} m³/h @{" "}
                        {request.totalHead}m head
                        <span className="mx-2">|</span>
                        <span className="font-medium">Application:</span> {request.application}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Link
                        href={`/supplier/portal/pump-quotes/${request.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        View Details
                      </Link>
                      {canQuote && (
                        <Link
                          href={`/supplier/portal/pump-quotes/${request.id}/respond`}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                            />
                          </svg>
                          Submit Quote
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
