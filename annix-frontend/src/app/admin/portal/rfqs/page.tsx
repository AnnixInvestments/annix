"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  EmptyState,
  ErrorDisplay,
  Icons,
  LoadingSpinner,
  Pagination,
  SearchBar,
  StatCard,
  StatusBadge,
} from "@/app/admin/components";
import { type RfqDraftStatus } from "@/app/lib/api/adminApi";
import { formatDateZA } from "@/app/lib/datetime";
import { useAdminRfqs } from "@/app/lib/query/hooks";

export default function AdminRfqsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RfqDraftStatus | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const rfqQuery = useAdminRfqs({
    search: activeSearch || undefined,
    status: statusFilter || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    limit,
    sortBy: "createdAt",
    sortOrder: "DESC",
  });

  const rfqs = rfqQuery.data?.items ?? [];
  const total = rfqQuery.data?.total ?? 0;
  const totalPages = rfqQuery.data?.totalPages ?? 0;

  const pendingCount = rfqs.filter((r) => r.status.toLowerCase() === "pending").length;
  const quotedCount = rfqs.filter((r) => r.status.toLowerCase() === "quoted").length;
  const acceptedCount = rfqs.filter((r) => r.status.toLowerCase() === "accepted").length;

  const handleSearch = () => {
    setActiveSearch(search);
    setPage(1);
  };

  const handleRowClick = (id: number) => {
    router.push(`/admin/portal/rfqs/${id}`);
  };

  if (rfqQuery.error) {
    return (
      <ErrorDisplay
        title="Error Loading RFQs"
        message={rfqQuery.error.message}
        onRetry={() => rfqQuery.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">RFQ Management</h1>
          <p className="mt-1 text-sm text-gray-600">View all request for quotations (read-only)</p>
        </div>
        <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
          <Icons.Document className="w-4 h-4 mr-2 text-gray-500" />
          Export Report
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <StatCard
          title="Total RFQs"
          value={total}
          icon={<Icons.Document />}
          colorClass="bg-gray-500"
        />
        <StatCard
          title="Pending"
          value={pendingCount}
          icon={<Icons.Clock />}
          colorClass="bg-orange-500"
        />
        <StatCard
          title="Quoted"
          value={quotedCount}
          icon={<Icons.Clipboard />}
          colorClass="bg-blue-500"
        />
        <StatCard
          title="Accepted"
          value={acceptedCount}
          icon={<Icons.CheckCircle />}
          colorClass="bg-green-500"
        />
      </div>

      {/* Search and Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <SearchBar
              value={search}
              onChange={setSearch}
              onSearch={handleSearch}
              placeholder="Search by project name, customer..."
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as RfqDraftStatus | "");
                setPage(1);
              }}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="pending">Pending</option>
              <option value="in_review">In Review</option>
              <option value="quoted">Quoted</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              placeholder="Date From"
            />
          </div>
          <div>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              placeholder="Date To"
            />
          </div>
        </div>
      </div>

      {/* RFQ Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {rfqQuery.isLoading ? (
          <LoadingSpinner message="Loading RFQs..." />
        ) : rfqs.length === 0 ? (
          <EmptyState
            icon={<Icons.NoData />}
            title="No RFQs found"
            description={
              search || statusFilter
                ? "Try adjusting your search or filter"
                : "No RFQs have been submitted yet"
            }
          />
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Project
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Customer
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
                    Deadline
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Created
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Updated
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rfqs.map((rfq) => (
                  <tr
                    key={rfq.id}
                    onClick={() => handleRowClick(rfq.id)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{rfq.projectName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{rfq.customerName}</div>
                      <div className="text-sm text-gray-500">{rfq.customerEmail}</div>
                      {rfq.isUnregistered && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                          Unregistered
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={rfq.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {rfq.itemCount} item{rfq.itemCount !== 1 ? "s" : ""}
                      {rfq.documentCount && rfq.documentCount > 0 && (
                        <span className="ml-2 text-gray-400">
                          ({rfq.documentCount} doc{rfq.documentCount !== 1 ? "s" : ""})
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {rfq.requiredDate ? (
                        <div className="flex items-center">
                          <span
                            className={
                              rfq.isPastDeadline ? "text-red-600 font-medium" : "text-gray-500"
                            }
                          >
                            {formatDateZA(rfq.requiredDate)}
                          </span>
                          {rfq.isPastDeadline && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              CLOSED
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateZA(rfq.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateZA(rfq.updatedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(rfq.id);
                          }}
                          title="View a read-only summary of this RFQ draft"
                          className="inline-flex items-center px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          <svg
                            className="w-4 h-4 mr-1.5"
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
                          View
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/admin/portal/rfqs/${rfq.id}/edit`);
                          }}
                          title="Edit this RFQ draft"
                          className="inline-flex items-center px-3 py-1.5 text-sm text-green-600 hover:text-green-800 hover:bg-green-50 rounded-md transition-colors"
                        >
                          <svg
                            className="w-4 h-4 mr-1.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={limit}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
