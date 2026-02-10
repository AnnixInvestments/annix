"use client";

import type { ColumnDef, PaginationState, SortingState } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ErrorDisplay, Icons, StatCard, StatusBadge } from "@/app/admin/components";
import { DataTable, DataTableToolbar } from "@/app/components/ui/DataTable";
import type { AdminRfqListItem, RfqDraftStatus } from "@/app/lib/api/adminApi";
import { formatDateZA } from "@/app/lib/datetime";
import { useAdminRfqs } from "@/app/lib/query/hooks";

export default function AdminRfqsPage() {
  const router = useRouter();
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 });
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
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
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    sortBy: sorting[0]?.id ?? "createdAt",
    sortOrder: sorting[0] ? (sorting[0].desc ? "DESC" : "ASC") : "DESC",
  });

  const rfqs = rfqQuery.data?.items ?? [];
  const total = rfqQuery.data?.total ?? 0;

  const pendingCount = rfqs.filter((r) => r.status.toLowerCase() === "pending").length;
  const quotedCount = rfqs.filter((r) => r.status.toLowerCase() === "quoted").length;
  const acceptedCount = rfqs.filter((r) => r.status.toLowerCase() === "accepted").length;

  const handleSearch = () => {
    setActiveSearch(search);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const columns = useMemo<ColumnDef<AdminRfqListItem, any>[]>(
    () => [
      {
        id: "projectName",
        accessorKey: "projectName",
        header: "Project",
        enableSorting: true,
        cell: ({ getValue }) => (
          <div className="text-sm font-medium text-gray-900">{getValue() as string}</div>
        ),
      },
      {
        id: "customer",
        accessorKey: "customerName",
        header: "Customer",
        enableSorting: true,
        cell: ({ row }) => (
          <div>
            <div className="text-sm text-gray-900">{row.original.customerName}</div>
            <div className="text-sm text-gray-500">{row.original.customerEmail}</div>
            {row.original.isUnregistered && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                Unregistered
              </span>
            )}
          </div>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        enableSorting: true,
        cell: ({ getValue }) => <StatusBadge status={getValue() as string} />,
      },
      {
        id: "itemCount",
        accessorKey: "itemCount",
        header: "Items",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-sm text-gray-500">
            {row.original.itemCount} item{row.original.itemCount !== 1 ? "s" : ""}
            {row.original.documentCount && row.original.documentCount > 0 && (
              <span className="ml-2 text-gray-400">
                ({row.original.documentCount} doc{row.original.documentCount !== 1 ? "s" : ""})
              </span>
            )}
          </span>
        ),
      },
      {
        id: "requiredDate",
        accessorKey: "requiredDate",
        header: "Deadline",
        enableSorting: true,
        cell: ({ row }) =>
          row.original.requiredDate ? (
            <div className="flex items-center">
              <span
                className={`text-sm ${row.original.isPastDeadline ? "text-red-600 font-medium" : "text-gray-500"}`}
              >
                {formatDateZA(row.original.requiredDate)}
              </span>
              {row.original.isPastDeadline && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                  CLOSED
                </span>
              )}
            </div>
          ) : (
            <span className="text-gray-400 text-sm">-</span>
          ),
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: "Created",
        enableSorting: true,
        cell: ({ getValue }) => (
          <span className="text-sm text-gray-500">{formatDateZA(getValue() as string)}</span>
        ),
      },
      {
        id: "updatedAt",
        accessorKey: "updatedAt",
        header: "Updated",
        enableSorting: true,
        cell: ({ getValue }) => (
          <span className="text-sm text-gray-500">{formatDateZA(getValue() as string)}</span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        size: 140,
        cell: ({ row }) => (
          <div className="flex items-center justify-end space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/admin/portal/rfqs/${row.original.id}`);
              }}
              title="View a read-only summary of this RFQ draft"
              className="inline-flex items-center px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                router.push(`/admin/portal/rfqs/${row.original.id}/edit`);
              }}
              title="Edit this RFQ draft"
              className="inline-flex items-center px-3 py-1.5 text-sm text-green-600 hover:text-green-800 hover:bg-green-50 rounded-md transition-colors"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        ),
      },
    ],
    [router],
  );

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
            <DataTableToolbar
              search={search}
              onSearchChange={setSearch}
              onSearch={handleSearch}
              searchPlaceholder="Search by project name, customer..."
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as RfqDraftStatus | "");
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
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
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
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
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
              className="block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              placeholder="Date To"
            />
          </div>
        </div>
      </div>

      {/* RFQ Table */}
      <DataTable
        columns={columns}
        data={rfqs}
        totalRows={total}
        pagination={pagination}
        onPaginationChange={(updater) => {
          setPagination(typeof updater === "function" ? updater(pagination) : updater);
        }}
        sorting={sorting}
        onSortingChange={(updater) => {
          setSorting(typeof updater === "function" ? updater(sorting) : updater);
        }}
        isLoading={rfqQuery.isLoading}
        onRowClick={(row) => router.push(`/admin/portal/rfqs/${row.id}`)}
        emptyMessage={
          search || statusFilter ? "No RFQs match your search" : "No RFQs have been submitted yet"
        }
      />
    </div>
  );
}
