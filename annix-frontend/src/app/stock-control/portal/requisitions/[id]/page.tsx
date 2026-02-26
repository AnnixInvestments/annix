"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Requisition } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";
import { exportToExcel, exportToPDF, exportToWord } from "@/app/lib/export/exportTable";

function statusBadgeColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-blue-100 text-blue-800",
    ordered: "bg-purple-100 text-purple-800",
    received: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };
  return colors[status.toLowerCase()] || "bg-gray-100 text-gray-800";
}

export default function RequisitionDetailPage() {
  const params = useParams();
  const reqId = Number(params.id);

  const [requisition, setRequisition] = useState<Requisition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editPackSize, setEditPackSize] = useState<number>(20);
  const [isSaving, setIsSaving] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [pendingReorderQty, setPendingReorderQty] = useState<Map<number, string>>(new Map());
  const [pendingReqNumber, setPendingReqNumber] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await stockControlApiClient.requisitionById(reqId);
      setRequisition(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load requisition"));
    } finally {
      setIsLoading(false);
    }
  }, [reqId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEditPackSize = (itemId: number, currentPackSize: number) => {
    setEditingItemId(itemId);
    setEditPackSize(Number(currentPackSize));
  };

  const handleSavePackSize = async (itemId: number) => {
    if (editPackSize <= 0) return;
    try {
      setIsSaving(true);
      await stockControlApiClient.updateRequisitionItem(reqId, itemId, {
        packSizeLitres: editPackSize,
      });
      setEditingItemId(null);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to update pack size"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
  };

  const handleReorderQtyChange = (itemId: number, value: string) => {
    setPendingReorderQty((prev) => new Map(prev).set(itemId, value));
  };

  const handleReorderQtyBlur = async (itemId: number) => {
    const value = pendingReorderQty.get(itemId);
    if (value === undefined) return;

    const item = requisition?.items.find((i) => i.id === itemId);
    const currentValue = item?.reorderQty?.toString() ?? "";
    if (value === currentValue) return;

    try {
      setIsSaving(true);
      const reorderQty = value === "" ? null : parseInt(value, 10);
      await stockControlApiClient.updateRequisitionItem(reqId, itemId, { reorderQty });
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to update reorder qty"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReqNumberChange = (itemId: number, value: string) => {
    setPendingReqNumber((prev) => new Map(prev).set(itemId, value));
  };

  const handleReqNumberBlur = async (itemId: number) => {
    const value = pendingReqNumber.get(itemId);
    if (value === undefined) return;

    const item = requisition?.items.find((i) => i.id === itemId);
    const currentValue = item?.reqNumber ?? "";
    if (value === currentValue) return;

    try {
      setIsSaving(true);
      const reqNumber = value === "" ? null : value;
      await stockControlApiClient.updateRequisitionItem(reqId, itemId, { reqNumber });
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to update req number"));
    } finally {
      setIsSaving(false);
    }
  };

  const reorderQtyValue = (itemId: number, dbValue: number | null): string => {
    const pending = pendingReorderQty.get(itemId);
    return pending !== undefined ? pending : (dbValue?.toString() ?? "");
  };

  const reqNumberValue = (itemId: number, dbValue: string | null): string => {
    const pending = pendingReqNumber.get(itemId);
    return pending !== undefined ? pending : (dbValue ?? "");
  };

  const exportColumns = [
    { header: "Product Name", accessorKey: "productName" },
    { header: "Area", accessorKey: "area" },
    { header: "Litres Req.", accessorKey: "litresRequired" },
    { header: "Pack Size (L)", accessorKey: "packSizeLitres" },
    { header: "Packs to Order", accessorKey: "packsToOrder" },
    { header: "Reorder Qty", accessorKey: "reorderQty" },
    { header: "Req Number", accessorKey: "reqNumber" },
    { header: "Stock Match", accessorKey: "stockMatch" },
  ];

  const exportData = () =>
    (requisition?.items ?? []).map((item) => ({
      productName: item.productName,
      area: item.area === "external" ? "Ext" : item.area === "internal" ? "Int" : item.area || "-",
      litresRequired: Number(item.litresRequired).toFixed(1),
      packSizeLitres: `${Number(item.packSizeLitres).toFixed(0)}L`,
      packsToOrder: item.packsToOrder,
      reorderQty: item.reorderQty ?? "-",
      reqNumber: item.reqNumber ?? "-",
      stockMatch: item.stockItem ? item.stockItem.name : "Not in inventory",
    }));

  const exportMetadata = () => ({
    Requisition: requisition?.requisitionNumber ?? "",
    Status: requisition?.status ?? "",
    "Created By": requisition?.createdBy ?? "-",
    Created: requisition ? formatDateZA(requisition.createdAt) : "",
    ...(requisition?.jobCard
      ? { "Job Card": `${requisition.jobCard.jobNumber} - ${requisition.jobCard.jobName}` }
      : {}),
  });

  const handleExport = (format: "excel" | "word" | "pdf") => {
    if (!requisition) return;
    const data = exportData();
    const filename = requisition.requisitionNumber;
    const title = `Requisition ${requisition.requisitionNumber}`;
    const meta = exportMetadata();

    if (format === "excel") {
      exportToExcel(data, exportColumns, filename, "Requisition");
    } else if (format === "pdf") {
      exportToPDF(data, exportColumns, filename, title, meta);
    } else if (format === "word") {
      exportToWord(data, exportColumns, filename, title, meta);
    }
    setShowExportMenu(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading requisition...</p>
        </div>
      </div>
    );
  }

  if (error || !requisition) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
          <p className="text-gray-600">{error?.message || "Requisition not found"}</p>
          <Link
            href="/stock-control/portal/requisitions"
            className="mt-4 inline-block text-teal-600 hover:text-teal-800"
          >
            Back to Requisitions
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/stock-control/portal/requisitions"
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">{requisition.requisitionNumber}</h1>
              <span
                className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${statusBadgeColor(requisition.status)}`}
              >
                {requisition.status}
              </span>
            </div>
            {requisition.source === "reorder" ? (
              <p className="mt-1">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                  Low Stock Reorder
                </span>
              </p>
            ) : requisition.jobCard ? (
              <p className="mt-1 text-sm text-gray-500">
                Job Card:{" "}
                <Link
                  href={`/stock-control/portal/job-cards/${requisition.jobCardId}`}
                  className="text-teal-700 hover:text-teal-900"
                >
                  {requisition.jobCard.jobNumber} - {requisition.jobCard.jobName}
                </Link>
              </p>
            ) : null}
          </div>
        </div>
        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Export
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
              <div className="py-1">
                <button
                  onClick={() => handleExport("excel")}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <svg
                    className="w-4 h-4 mr-3 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
                  </svg>
                  Excel (.xlsx)
                </button>
                <button
                  onClick={() => handleExport("word")}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <svg
                    className="w-4 h-4 mr-3 text-blue-600"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
                  </svg>
                  Word (.docx)
                </button>
                <button
                  onClick={() => handleExport("pdf")}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <svg
                    className="w-4 h-4 mr-3 text-red-600"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
                  </svg>
                  PDF (.pdf)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Details</h3>
        </div>
        <div className="px-4 py-5 sm:px-6">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-6">
            <div>
              <dt className="text-sm font-medium text-gray-500">Created By</dt>
              <dd className="mt-1 text-sm text-gray-900">{requisition.createdBy || "-"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDateZA(requisition.createdAt)}</dd>
            </div>
            {requisition.notes && (
              <div className="col-span-2">
                <dt className="text-sm font-medium text-gray-500">Notes</dt>
                <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                  {requisition.notes}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Requisition Items</h3>
          <span className="text-sm text-gray-500">{requisition.items.length} item(s)</span>
        </div>
        {requisition.items.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-sm font-medium text-gray-900">No items</h3>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Product Name
                </th>
                {requisition.source === "reorder" ? (
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Qty Required
                  </th>
                ) : (
                  <>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Area
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Litres Req.
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Pack Size (L)
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Packs to Order
                    </th>
                  </>
                )}
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Reorder Qty
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Req Number
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Stock Match
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requisition.items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.productName}
                  </td>
                  {requisition.source === "reorder" ? (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                      {item.quantityRequired ?? "-"}
                    </td>
                  ) : (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                        {item.area === "external"
                          ? "Ext"
                          : item.area === "internal"
                            ? "Int"
                            : item.area || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                        {Number(item.litresRequired).toFixed(1)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        {editingItemId === item.id ? (
                          <div className="flex items-center justify-end space-x-2">
                            <input
                              type="number"
                              min={1}
                              step={1}
                              value={editPackSize}
                              onChange={(e) => setEditPackSize(parseFloat(e.target.value) || 1)}
                              className="w-20 rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm text-right"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSavePackSize(item.id);
                                if (e.key === "Escape") handleCancelEdit();
                              }}
                            />
                            <button
                              onClick={() => handleSavePackSize(item.id)}
                              disabled={isSaving}
                              className="text-teal-600 hover:text-teal-800 disabled:text-gray-400"
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
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="text-gray-400 hover:text-gray-600"
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
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditPackSize(item.id, item.packSizeLitres)}
                            className="text-gray-900 hover:text-teal-700 cursor-pointer"
                            title="Click to edit pack size"
                          >
                            {Number(item.packSizeLitres).toFixed(0)}L
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                        {item.packsToOrder}
                      </td>
                    </>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={reorderQtyValue(item.id, item.reorderQty)}
                      onChange={(e) => handleReorderQtyChange(item.id, e.target.value)}
                      onBlur={() => handleReorderQtyBlur(item.id)}
                      placeholder="-"
                      className="w-20 rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm text-right"
                      disabled={isSaving}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <input
                      type="text"
                      value={reqNumberValue(item.id, item.reqNumber)}
                      onChange={(e) => handleReqNumberChange(item.id, e.target.value)}
                      onBlur={() => handleReqNumberBlur(item.id)}
                      placeholder="-"
                      className="w-28 rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                      disabled={isSaving}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {item.stockItem ? (
                      <span className="text-gray-700">{item.stockItem.name}</span>
                    ) : (
                      <span className="text-amber-600 italic">Not in inventory</span>
                    )}
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
