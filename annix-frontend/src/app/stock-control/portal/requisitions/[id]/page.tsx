"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";
import { exportToExcel, exportToPDF, exportToWord } from "@/app/lib/export/exportTable";
import { useRequisitionDetail, useUpdateRequisitionItem } from "@/app/lib/query/hooks";
import { stockControlKeys } from "@/app/lib/query/keys";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromJobCard = searchParams.get("fromJobCard");
  const completeStep = searchParams.get("completeStep");
  const reqId = Number(params.id);
  const queryClient = useQueryClient();
  const isOrderPlacement = completeStep ? completeStep.includes("order_placement") : false;
  const readOnly = isOrderPlacement;

  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editPackSize, setEditPackSize] = useState<number>(20);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [pendingReorderQty, setPendingReorderQty] = useState<Map<number, string>>(new Map());
  const [pendingReqNumber, setPendingReqNumber] = useState<Map<number, string>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [savingRowId, setSavingRowId] = useState<number | null>(null);
  const [savedRows, setSavedRows] = useState<Set<number>>(new Set());

  const { data: requisition, isLoading, error: fetchError } = useRequisitionDetail(reqId);
  const updateItem = useUpdateRequisitionItem(reqId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleEditPackSize = (itemId: number, currentPackSize: number) => {
    setEditingItemId(itemId);
    setEditPackSize(Number(currentPackSize));
  };

  const handleSavePackSize = (itemId: number) => {
    if (editPackSize <= 0) return;
    updateItem.mutate(
      { itemId, data: { packSizeLitres: editPackSize } },
      {
        onSuccess: () => {
          setEditingItemId(null);
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : "Failed to update pack size");
        },
      },
    );
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
  };

  const handleReorderQtyChange = (itemId: number, value: string) => {
    setPendingReorderQty((prev) => new Map(prev).set(itemId, value));
  };

  const handleReorderQtyBlur = (itemId: number) => {
    const value = pendingReorderQty.get(itemId);
    if (value === undefined) return;

    const item = requisition?.items.find((i) => i.id === itemId);
    const currentValue = item?.reorderQty != null ? item.reorderQty.toString() : "";
    if (value === currentValue) return;

    const reorderQty = value === "" ? null : parseInt(value, 10);
    updateItem.mutate(
      { itemId, data: { reorderQty } },
      {
        onError: (err) => {
          setError(err instanceof Error ? err.message : "Failed to update reorder qty");
        },
      },
    );
  };

  const handleReqNumberChange = (itemId: number, value: string) => {
    setPendingReqNumber((prev) => new Map(prev).set(itemId, value));
  };

  const handleReqNumberBlur = (itemId: number) => {
    const value = pendingReqNumber.get(itemId);
    if (value === undefined) return;

    const item = requisition?.items.find((i) => i.id === itemId);
    const currentValue = item ? item.reqNumber || "" : "";
    if (value === currentValue) return;

    const reqNumber = value === "" ? null : value;
    updateItem.mutate(
      { itemId, data: { reqNumber } },
      {
        onError: (err) => {
          setError(err instanceof Error ? err.message : "Failed to update req number");
        },
      },
    );
  };

  const reorderQtyValue = (itemId: number, dbValue: number | null): string => {
    const pending = pendingReorderQty.get(itemId);
    return pending !== undefined ? pending : dbValue != null ? dbValue.toString() : "";
  };

  const reqNumberValue = (itemId: number, dbValue: string | null): string => {
    const pending = pendingReqNumber.get(itemId);
    return pending !== undefined ? pending : dbValue || "";
  };

  const handleSaveRow = async (itemId: number) => {
    if (!requisition) return;
    const item = requisition.items.find((i) => i.id === itemId);
    if (!item) return;

    setSavingRowId(itemId);
    setError(null);

    const reorderVal = pendingReorderQty.get(itemId);
    const reqNumVal = pendingReqNumber.get(itemId);

    const payload: Record<string, unknown> = {};

    if (reorderVal !== undefined) {
      payload.reorderQty = reorderVal === "" ? null : parseInt(reorderVal, 10);
    }

    if (reqNumVal !== undefined) {
      payload.reqNumber = reqNumVal === "" ? null : reqNumVal;
    }

    if (Object.keys(payload).length === 0) {
      setSavingRowId(null);
      setSavedRows((prev) => new Set(prev).add(itemId));
      setTimeout(() => {
        setSavedRows((prev) => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });
      }, 2000);
      return;
    }

    try {
      await stockControlApiClient.updateRequisitionItem(reqId, itemId, payload as any);
      await queryClient.invalidateQueries({
        queryKey: stockControlKeys.requisitions.detail(reqId),
      });
      setPendingReorderQty((prev) => {
        const next = new Map(prev);
        next.delete(itemId);
        return next;
      });
      setPendingReqNumber((prev) => {
        const next = new Map(prev);
        next.delete(itemId);
        return next;
      });
      setSavingRowId(null);
      setSavedRows((prev) => new Set(prev).add(itemId));
      setTimeout(() => {
        setSavedRows((prev) => {
          const next = new Set(prev);
          next.delete(itemId);
          return next;
        });
      }, 2000);
    } catch (err) {
      setSavingRowId(null);
      setError(err instanceof Error ? err.message : "Failed to save");
    }
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
    (requisition?.items || []).map((item) => ({
      productName: item.productName,
      area: item.area === "external" ? "Ext" : item.area === "internal" ? "Int" : item.area || "-",
      litresRequired: Number(item.litresRequired).toFixed(1),
      packSizeLitres: `${Number(item.packSizeLitres).toFixed(0)}L`,
      packsToOrder: item.packsToOrder,
      reorderQty: item.reorderQty != null ? item.reorderQty : "-",
      reqNumber: item.reqNumber || "-",
      stockMatch: item.stockItem ? item.stockItem.name : "Not in inventory",
    }));

  const exportMetadata = () => ({
    Requisition: requisition ? requisition.requisitionNumber : "",
    Status: requisition ? requisition.status : "",
    "Created By": requisition ? requisition.createdBy || "-" : "-",
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

  const completeStepAndReturn = async () => {
    if (!fromJobCard || !requisition) return;
    try {
      setIsAccepting(true);
      setError(null);
      if (completeStep) {
        await stockControlApiClient.completeBackgroundStep(
          Number(fromJobCard),
          completeStep,
          "Requisition reviewed and accepted",
        );
      } else {
        await stockControlApiClient.completeRequisitionStep(Number(fromJobCard));
      }
      router.push(`/stock-control/portal/job-cards/${fromJobCard}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete requisition step");
      setIsAccepting(false);
    }
  };

  const handlePrintAndReturn = () => {
    window.print();
    const onAfterPrint = () => {
      window.removeEventListener("afterprint", onAfterPrint);
      completeStepAndReturn();
    };
    window.addEventListener("afterprint", onAfterPrint);
  };

  const handleAcceptAndReturn = () => {
    if (isOrderPlacement) {
      handlePrintAndReturn();
    } else {
      completeStepAndReturn();
    }
  };

  const isSaving = updateItem.isPending;

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

  if (fetchError || !requisition) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
          <p className="text-gray-600">
            {fetchError instanceof Error ? fetchError.message : "Requisition not found"}
          </p>
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
    <div className="space-y-6 print:space-y-2">
      <style jsx global>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          body { font-size: 10px !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-compact-table th,
          .print-compact-table td { padding: 4px 8px !important; font-size: 9px !important; }
          .print-compact-details dt,
          .print-compact-details dd { font-size: 10px !important; }
          .print-compact-details { gap: 4px 16px !important; }
          .print-hide-col-stock { display: none !important; }
          h1 { font-size: 16px !important; }
          h3 { font-size: 12px !important; }
        }
      `}</style>
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/stock-control/portal/requisitions"
            className="text-gray-500 hover:text-gray-700 print:hidden"
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
        <div className="flex items-center space-x-3 print:hidden">
          {fromJobCard && (
            <button
              onClick={handleAcceptAndReturn}
              disabled={isAccepting}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50"
            >
              {isAccepting ? (
                <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isOrderPlacement ? (
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
              ) : (
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
              {isAccepting
                ? "Completing..."
                : isOrderPlacement
                  ? "Print & Return to Job Card"
                  : completeStep
                    ? "Authorise & Return to Job Card"
                    : "Accept & Return to Job Card"}
            </button>
          )}
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
      </div>

      <div className="bg-white shadow rounded-lg overflow-x-auto print:shadow-none print:rounded-none">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 print:px-2 print:py-2">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Details</h3>
        </div>
        <div className="px-4 py-5 sm:px-6 print:px-2 print:py-2">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-6 print-compact-details">
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

      <div className="bg-white shadow rounded-lg overflow-x-auto print:shadow-none print:rounded-none">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex items-center justify-between print:px-2 print:py-2">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Requisition Items</h3>
          <span className="text-sm text-gray-500">{requisition.items.length} item(s)</span>
        </div>
        {requisition.items.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-sm font-medium text-gray-900">No items</h3>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 print-compact-table">
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
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print-hide-col-stock"
                >
                  Stock Match
                </th>
                {!readOnly && (
                  <th
                    scope="col"
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Save
                  </th>
                )}
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
                      {item.quantityRequired != null ? item.quantityRequired : "-"}
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
                        {readOnly ? (
                          <span className="text-gray-900">
                            {Number(item.packSizeLitres).toFixed(0)}L
                          </span>
                        ) : editingItemId === item.id ? (
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
                    {readOnly ? (
                      <span className="font-semibold text-gray-900">
                        {item.reorderQty != null ? item.reorderQty : "-"}
                      </span>
                    ) : (
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={reorderQtyValue(item.id, item.reorderQty)}
                        onChange={(e) => handleReorderQtyChange(item.id, e.target.value)}
                        placeholder="-"
                        className="w-20 rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm text-right"
                        disabled={isSaving}
                      />
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {readOnly ? (
                      <span className="text-gray-900">{item.reqNumber || "-"}</span>
                    ) : (
                      <input
                        type="text"
                        value={reqNumberValue(item.id, item.reqNumber)}
                        onChange={(e) => handleReqNumberChange(item.id, e.target.value)}
                        placeholder="-"
                        className="w-28 rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                        disabled={isSaving}
                      />
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm print-hide-col-stock">
                    {item.stockItem ? (
                      <span className="text-gray-700">{item.stockItem.name}</span>
                    ) : (
                      <span className="text-amber-600 italic">Not in inventory</span>
                    )}
                  </td>
                  {!readOnly && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      {savedRows.has(item.id) ? (
                        <span className="inline-flex items-center text-green-600 text-xs font-medium">
                          <svg
                            className="w-4 h-4 mr-1"
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
                          Saved
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSaveRow(item.id)}
                          disabled={savingRowId === item.id}
                          className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md bg-teal-600 text-white hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                          {savingRowId === item.id ? "Saving..." : "Save"}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
