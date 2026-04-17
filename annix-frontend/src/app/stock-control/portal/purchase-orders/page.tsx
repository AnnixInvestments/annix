"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmModal } from "@/app/components/modals/ConfirmModal";
import type { CustomerPurchaseOrder } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";
import { useCpos, useDeleteCpo } from "@/app/lib/query/hooks";
import { HelpTooltip } from "../../components/HelpTooltip";
import { StatusBadge } from "../../components/StatusBadge";
import { setPendingCpoImportFile } from "./import/pending-file";

const STATUS_TABS = ["all", "active", "fulfilled", "cancelled"] as const;

function fulfillmentPercent(cpo: CustomerPurchaseOrder): number {
  if (cpo.totalQuantity <= 0) return 0;
  return Math.min(100, Math.round((cpo.fulfilledQuantity / cpo.totalQuantity) * 100));
}

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; cpoNumber: string } | null>(
    null,
  );
  const [isDragging, setIsDragging] = useState(false);

  const { data: cpos = [], isLoading, error, refetch } = useCpos(activeTab);
  const deleteCpo = useDeleteCpo();

  const handleDelete = (id: number) => {
    deleteCpo.mutate(id, {
      onSettled: () => {
        setConfirmDelete(null);
      },
    });
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setPendingCpoImportFile(file);
      router.push("/stock-control/portal/purchase-orders/import");
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingCpoImportFile(file);
      router.push("/stock-control/portal/purchase-orders/import");
    }
  };

  if (isLoading && cpos.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading purchase orders...</p>
        </div>
      </div>
    );
  }

  if (error && cpos.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
          <p className="text-gray-600">
            {error instanceof Error ? error.message : "Failed to load CPOs"}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="space-y-6"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDragging(false);
        }
      }}
      onDrop={handleFileDrop}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Customer Purchase Orders <HelpTooltip term="CPO" />
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Track large jobs from order through to fulfilment
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            href="/stock-control/portal/purchase-orders/reports"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Reports
          </Link>
          <label className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 cursor-pointer">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Import CPO
            <input
              type="file"
              className="hidden"
              accept=".xlsx,.xls,.pdf,.png,.jpg,.jpeg,.gif,.bmp,.webp,.heic,.tiff"
              onChange={handleFileInput}
            />
          </label>
        </div>
      </div>

      {isDragging && (
        <div className="border-2 border-dashed border-teal-400 bg-teal-50 rounded-lg p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-teal-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="mt-2 text-teal-700 font-medium">Drop your Excel/PDF file here to import</p>
        </div>
      )}

      <div className="flex space-x-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-sm font-medium rounded-md capitalize ${
              activeTab === tab
                ? "bg-teal-100 text-teal-800"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        {cpos.length === 0 ? (
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
            <h3 className="mt-2 text-sm font-medium text-gray-900">No purchase orders</h3>
            <p className="mt-1 text-sm text-gray-500">
              Import a Job Card Excel to create a Customer Purchase Order.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    CPO #
                  </th>
                  <th
                    scope="col"
                    className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Job / Customer
                  </th>
                  <th
                    scope="col"
                    className="hidden sm:table-cell px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Items
                  </th>
                  <th
                    scope="col"
                    className="hidden md:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Fulfilment
                  </th>
                  <th
                    scope="col"
                    className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Created
                  </th>
                  <th scope="col" className="relative px-3 sm:px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cpos.map((cpo) => {
                  const cpoNumber = confirmDelete?.cpoNumber;
                  const pct = fulfillmentPercent(cpo);
                  return (
                    <tr
                      key={cpo.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/stock-control/portal/purchase-orders/${cpo.id}`)}
                    >
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <span className="text-teal-600 font-medium">{cpo.cpoNumber}</span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          const jobName = cpo.jobName;
                          {jobName || cpo.jobNumber}
                        </div>
                        {cpo.customerName && (
                          <div className="text-sm text-gray-500">{cpo.customerName}</div>
                        )}
                      </td>
                      <td className="hidden sm:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                        {cpo.totalItems}
                      </td>
                      <td className="hidden md:table-cell px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden w-24">
                            <div
                              className={`h-full rounded-full ${pct >= 100 ? "bg-blue-500" : "bg-teal-500"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 w-8">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={cpo.status} />
                      </td>
                      <td className="hidden sm:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDateZA(cpo.createdAt)}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDelete({ id: cpo.id, cpoNumber: cpo.cpoNumber });
                          }}
                          disabled={deleteCpo.isPending && deleteCpo.variables === cpo.id}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        >
                          {deleteCpo.isPending && deleteCpo.variables === cpo.id ? "..." : "Delete"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmDelete !== null}
        title="Delete Purchase Order"
        message={`Delete CPO ${cpoNumber || ""}? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteCpo.isPending}
        onConfirm={() => {
          if (confirmDelete) {
            handleDelete(confirmDelete.id);
          }
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
