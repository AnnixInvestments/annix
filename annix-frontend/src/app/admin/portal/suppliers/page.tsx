"use client";

import type { ColumnDef, PaginationState, SortingState } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useToast } from "@/app/components/Toast";
import { DataTable } from "@/app/components/ui/DataTable";
import { formatDateZA } from "@/app/lib/datetime";
import { useAdminSuppliers, useInviteSupplier } from "@/app/lib/query/hooks";

function statusBadgeClass(status: string): string {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "suspended":
      return "bg-red-100 text-red-800";
    case "deactivated":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export default function AdminSuppliersPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");

  const suppliersQuery = useAdminSuppliers({
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
    status: statusFilter || undefined,
  });

  const inviteMutation = useInviteSupplier();

  const supplierList = suppliersQuery.data?.items ?? suppliersQuery.data?.suppliers ?? [];
  const total = suppliersQuery.data?.total ?? 0;

  const stats = {
    total,
    active: supplierList.filter((s: any) => s.accountStatus === "active").length,
    pending: supplierList.filter((s: any) => s.accountStatus === "pending").length,
    suspended: supplierList.filter((s: any) => s.accountStatus === "suspended").length,
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;
    inviteMutation.mutate(
      { email: inviteEmail, message: inviteMessage || undefined },
      {
        onSuccess: (response) => {
          if (response.success) {
            showToast(`Invitation sent to ${inviteEmail}`, "success");
            setShowInviteModal(false);
            setInviteEmail("");
            setInviteMessage("");
          } else {
            showToast("Failed to send invitation", "error");
          }
        },
        onError: (err) => {
          showToast(`Error: ${err.message}`, "error");
        },
      },
    );
  };

  const columns = useMemo<ColumnDef<any, any>[]>(
    () => [
      {
        id: "name",
        accessorKey: "firstName",
        header: "Supplier",
        enableSorting: false,
        cell: ({ row }: { row: any }) => (
          <div className="flex items-center">
            <div className="flex-shrink-0 h-10 w-10">
              <div className="h-10 w-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-semibold">
                {row.original.firstName?.[0] || "S"}
                {row.original.lastName?.[0] || "P"}
              </div>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-900">
                {row.original.firstName} {row.original.lastName}
              </div>
              <div className="text-sm text-gray-500">{row.original.email}</div>
            </div>
          </div>
        ),
      },
      {
        id: "companyName",
        accessorKey: "companyName",
        header: "Company",
        enableSorting: true,
        cell: ({ getValue }: { getValue: () => any }) => (
          <div className="text-sm text-gray-900">{getValue() || "N/A"}</div>
        ),
      },
      {
        id: "accountStatus",
        accessorKey: "accountStatus",
        header: "Status",
        enableSorting: true,
        cell: ({ getValue }: { getValue: () => any }) => {
          const status = getValue() as string;
          return (
            <span
              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusBadgeClass(status)}`}
            >
              {status}
            </span>
          );
        },
      },
      {
        id: "onboardingStatus",
        accessorKey: "onboardingStatus",
        header: "Onboarding",
        enableSorting: false,
        cell: ({ getValue }: { getValue: () => any }) => {
          const status = getValue() as string;
          return (
            <span
              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusBadgeClass(status)}`}
            >
              {status || "N/A"}
            </span>
          );
        },
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: "Registered",
        enableSorting: true,
        cell: ({ getValue }: { getValue: () => any }) => (
          <span className="text-sm text-gray-500">
            {getValue() ? formatDateZA(getValue() as string) : "N/A"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        size: 80,
        cell: ({ row }: { row: any }) => (
          <div className="text-right">
            <button
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                router.push(`/admin/portal/suppliers/${row.original.id}`);
              }}
              className="text-blue-600 hover:text-blue-900 text-sm font-medium"
            >
              View
            </button>
          </div>
        ),
      },
    ],
    [router],
  );

  if (suppliersQuery.error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Suppliers</div>
          <p className="text-gray-600">{suppliersQuery.error.message}</p>
          <button
            onClick={() => suppliersQuery.refetch()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supplier Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage supplier accounts, onboarding, and capabilities
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Invite Supplier
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Export
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <button
          onClick={() => {
            setStatusFilter("");
            setPagination((prev) => ({ ...prev, pageIndex: 0 }));
          }}
          className={`bg-white overflow-hidden shadow rounded-lg text-left hover:ring-2 hover:ring-blue-500 transition-all ${statusFilter === "" ? "ring-2 ring-blue-500" : ""}`}
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
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Suppliers</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.total}</dd>
                </dl>
              </div>
            </div>
          </div>
        </button>
        <button
          onClick={() => {
            setStatusFilter("active");
            setPagination((prev) => ({ ...prev, pageIndex: 0 }));
          }}
          className={`bg-white overflow-hidden shadow rounded-lg text-left hover:ring-2 hover:ring-green-500 transition-all ${statusFilter === "active" ? "ring-2 ring-green-500" : ""}`}
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
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.active}</dd>
                </dl>
              </div>
            </div>
          </div>
        </button>
        <button
          onClick={() => {
            setStatusFilter("pending");
            setPagination((prev) => ({ ...prev, pageIndex: 0 }));
          }}
          className={`bg-white overflow-hidden shadow rounded-lg text-left hover:ring-2 hover:ring-orange-500 transition-all ${statusFilter === "pending" ? "ring-2 ring-orange-500" : ""}`}
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
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.pending}</dd>
                </dl>
              </div>
            </div>
          </div>
        </button>
        <button
          onClick={() => {
            setStatusFilter("suspended");
            setPagination((prev) => ({ ...prev, pageIndex: 0 }));
          }}
          className={`bg-white overflow-hidden shadow rounded-lg text-left hover:ring-2 hover:ring-red-500 transition-all ${statusFilter === "suspended" ? "ring-2 ring-red-500" : ""}`}
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-md bg-red-500 flex items-center justify-center">
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
                      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Suspended</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{stats.suspended}</dd>
                </dl>
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="search" className="sr-only">
              Search suppliers
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
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
              <input
                type="search"
                id="search"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Search by name, email, or company..."
              />
            </div>
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
              <option value="deactivated">Deactivated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Supplier Table */}
      <DataTable
        columns={columns}
        data={supplierList}
        totalRows={total}
        pagination={pagination}
        onPaginationChange={(updater) => {
          setPagination(typeof updater === "function" ? updater(pagination) : updater);
        }}
        sorting={sorting}
        onSortingChange={(updater) => {
          setSorting(typeof updater === "function" ? updater(sorting) : updater);
        }}
        isLoading={suppliersQuery.isLoading}
        onRowClick={(row: any) => router.push(`/admin/portal/suppliers/${row.id}`)}
        emptyMessage={
          statusFilter
            ? "No suppliers match your filter"
            : "No suppliers found. Get started by inviting your first supplier."
        }
      />

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => setShowInviteModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Invite Supplier</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email Address</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    placeholder="supplier@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Message (optional)
                  </label>
                  <textarea
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    placeholder="Add a personal message..."
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInvite}
                  disabled={!inviteEmail || inviteMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
