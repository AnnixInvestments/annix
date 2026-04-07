"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PdfPreviewModal, usePdfPreview } from "@/app/components/PdfPreviewModal";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import { formatDateTimeZA, formatDateZA, fromJSDate } from "@/app/lib/datetime";
import {
  useCreateManualAdjustment,
  useDownloadStockItemQrPdf,
  useInventoryItemDetail,
  useInventoryLocations,
  useStockMovements,
  useUpdateStockItem,
  useUploadStockItemPhoto,
} from "@/app/lib/query/hooks";
import { PhotoCapture } from "@/app/stock-control/components/PhotoCapture";
import { useViewAs } from "@/app/stock-control/context/ViewAsContext";
import { formatZAR } from "@/app/stock-control/lib/currency";

interface RecipientSummary {
  name: string;
  totalQty: number;
  count: number;
}

function movementTypeBadge(type: string): string {
  const colors: Record<string, string> = {
    in: "bg-green-100 text-green-800",
    out: "bg-red-100 text-red-800",
    adjustment: "bg-amber-100 text-amber-800",
    delivery: "bg-green-100 text-green-800",
    allocation: "bg-blue-100 text-blue-800",
    return: "bg-purple-100 text-purple-800",
  };
  return colors[type.toLowerCase()] || "bg-gray-100 text-gray-800";
}

function recipientFromNotes(notes: string): string | null {
  const match = notes.match(/^Issued to\s+(.+?)\s+by\s+.+$/i);
  if (match) return match[1];
  const match2 = notes.match(/^(.+?)(?:\s+—\s+job\s+.+)?$/i);
  const isIssuance = !notes.includes("Stock take") && !notes.includes("counted");
  return isIssuance ? (match2 ? match2[1] : null) : null;
}

export default function InventoryDetailPage() {
  const params = useParams();
  const itemId = Number(params.id);
  const { user } = useStockControlAuth();
  const { effectiveRole } = useViewAs();

  const { data: item, isLoading: isLoadingItem, error: itemError } = useInventoryItemDetail(itemId);
  const { data: movements = [] } = useStockMovements(itemId);
  const { data: locations = [] } = useInventoryLocations();

  const updateStockItemMutation = useUpdateStockItem();
  const createManualAdjustmentMutation = useCreateManualAdjustment();
  const uploadPhotoMutation = useUploadStockItemPhoto();
  const downloadQrMutation = useDownloadStockItemQrPdf();
  const pdfPreview = usePdfPreview();

  const [mutationError, setMutationError] = useState<string | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    movementType: "in" as "in" | "out" | "adjustment",
    quantity: 0,
    notes: "",
  });
  const [showModal, setShowModal] = useState(false);
  const [modalForm, setModalForm] = useState({
    sku: "",
    name: "",
    description: "",
    category: "",
    unitOfMeasure: "each",
    costPerUnit: 0,
    quantity: 0,
    minStockLevel: 0,
    locationId: null as number | null,
  });

  const dailyIssuance = useMemo((): { date: string; issued: number }[] => {
    if (movements.length === 0) return [];
    const outMovements = movements.filter((m) => m.movementType === "out");
    if (outMovements.length === 0) return [];
    const dailyMap = new Map<string, { issued: number; ts: number }>();
    for (const m of outMovements) {
      const dt = fromJSDate(new Date(m.createdAt));
      const dateKey = dt.toFormat("dd MMM yyyy");
      const existing = dailyMap.get(dateKey);
      const prev = existing ? existing.issued : 0;
      const ts = existing ? existing.ts : dt.startOf("day").toMillis();
      dailyMap.set(dateKey, { issued: prev + Number(m.quantity), ts });
    }
    return Array.from(dailyMap.entries())
      .map(([date, val]) => ({ date, issued: Math.round(val.issued * 100) / 100, ts: val.ts }))
      .sort((a, b) => a.ts - b.ts)
      .map(({ date, issued }) => ({ date, issued }));
  }, [movements]);

  const topRecipients = useMemo((): RecipientSummary[] => {
    if (movements.length === 0) return [];
    const map = new Map<string, { totalQty: number; count: number }>();
    movements
      .filter((m) => m.movementType === "out" && m.notes)
      .forEach((m) => {
        const name = recipientFromNotes(m.notes || "");
        if (!name || name === "-") return;
        const existing = map.get(name) || { totalQty: 0, count: 0 };
        map.set(name, {
          totalQty: existing.totalQty + Number(m.quantity),
          count: existing.count + 1,
        });
      });
    return Array.from(map.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 5);
  }, [movements]);

  const usageInsights = useMemo(() => {
    const outMovements = movements.filter((m) => m.movementType === "out");
    const totalOut = outMovements.reduce((sum, m) => sum + Number(m.quantity), 0);
    const dates = outMovements.map((m) => new Date(m.createdAt).getTime());
    const firstOut = dates.length > 0 ? Math.min(...dates) : null;
    const lastOut = dates.length > 0 ? Math.max(...dates) : null;
    const daySpan =
      firstOut && lastOut ? Math.max(1, (lastOut - firstOut) / (1000 * 60 * 60 * 24)) : 0;
    const avgDailyUsage = daySpan > 0 ? totalOut / daySpan : 0;
    const daysUntilStockout =
      avgDailyUsage > 0 && item ? Math.floor(item.quantity / avgDailyUsage) : null;
    const lastRestock = movements
      .filter((m) => m.movementType === "in" && m.referenceType !== "stock_take")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    return { totalOut, avgDailyUsage, daysUntilStockout, lastRestock };
  }, [movements, item]);

  const error = itemError
    ? itemError instanceof Error
      ? itemError.message
      : "Failed to load item details"
    : mutationError;

  const openEditModal = () => {
    if (!item) return;
    setModalForm({
      sku: item.sku,
      name: item.name,
      description: item.description || "",
      category: item.category || "",
      unitOfMeasure: item.unitOfMeasure,
      costPerUnit: item.costPerUnit,
      quantity: item.quantity,
      minStockLevel: item.minStockLevel,
      locationId: item.locationId,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      setMutationError(null);
      await updateStockItemMutation.mutateAsync({ id: itemId, data: modalForm });
      setShowModal(false);
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : "Failed to update item");
    }
  };

  const handleAdjust = async () => {
    if (adjustForm.quantity <= 0 && adjustForm.movementType !== "adjustment") return;
    try {
      setMutationError(null);
      await createManualAdjustmentMutation.mutateAsync({
        stockItemId: itemId,
        movementType: adjustForm.movementType,
        quantity: adjustForm.quantity,
        notes: adjustForm.notes || undefined,
      });
      setShowAdjustModal(false);
      setAdjustForm({ movementType: "in", quantity: 0, notes: "" });
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : "Failed to adjust stock");
    }
  };

  const handlePrintQr = async () => {
    try {
      setMutationError(null);
      const blob = await downloadQrMutation.mutateAsync(itemId);
      pdfPreview.open(blob, `stock-${itemId}-label.pdf`);
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : "Failed to download QR label");
    }
  };

  const handlePhotoCapture = async (file: File) => {
    try {
      setMutationError(null);
      await uploadPhotoMutation.mutateAsync({ id: itemId, file });
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : "Failed to upload photo");
    }
  };

  const canAdjustStock = effectiveRole === "manager" || effectiveRole === "admin";

  if (isLoadingItem) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading item details...</p>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
          <p className="text-gray-600">{error || "Item not found"}</p>
          <Link
            href="/stock-control/portal/inventory"
            className="mt-4 inline-block text-teal-600 hover:text-teal-800"
          >
            Back to Inventory
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
            href="/stock-control/portal/inventory"
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
            <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
            <p className="mt-1 text-sm text-gray-500 font-mono">{item.sku}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handlePrintQr}
            disabled={downloadQrMutation.isPending}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
              />
            </svg>
            {downloadQrMutation.isPending ? "Generating..." : "Print QR"}
          </button>
          {canAdjustStock && (
            <button
              onClick={() => {
                setAdjustForm({ movementType: "in", quantity: 0, notes: "" });
                setShowAdjustModal(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-teal-600 rounded-md shadow-sm text-sm font-medium text-teal-600 bg-white hover:bg-teal-50"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Adjust Stock
            </button>
          )}
          <button
            onClick={openEditModal}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Edit Item
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg overflow-x-auto">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Item Details</h3>
            </div>
            <div className="px-4 py-5 sm:px-6">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-6">
                <div>
                  <dt className="text-sm font-medium text-gray-500">SKU</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono">{item.sku}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{item.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Category</dt>
                  <dd className="mt-1 text-sm text-gray-900">{item.category || "-"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Unit of Measure</dt>
                  <dd className="mt-1 text-sm text-gray-900">{item.unitOfMeasure}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Current SOH</dt>
                  <dd
                    className={`mt-1 text-sm font-semibold ${item.quantity <= item.minStockLevel ? "text-red-600" : "text-gray-900"}`}
                  >
                    {item.quantity}
                    {item.quantity <= item.minStockLevel && (
                      <span className="ml-2 text-xs font-normal text-amber-600">Below minimum</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Min Stock Level</dt>
                  <dd className="mt-1 text-sm text-gray-900">{item.minStockLevel}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Cost per Unit</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatZAR(item.costPerUnit)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Total Value</dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900">
                    {formatZAR(item.quantity * item.costPerUnit)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Location</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {item.locationId
                      ? (() => {
                          const loc = locations.find((l) => l.id === item.locationId);
                          return loc ? loc.name : "-";
                        })()
                      : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDateZA(item.updatedAt)}</dd>
                </div>
                {item.description && (
                  <div className="col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Description</dt>
                    <dd className="mt-1 text-sm text-gray-900">{item.description}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
            <div className="bg-white shadow rounded-lg overflow-x-auto">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Usage Insights</h3>
              </div>
              <div className="px-4 py-5 sm:px-6 space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Created</span>
                  <span className="text-sm text-gray-900">{formatDateZA(item.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Total Movements</span>
                  <span className="text-sm text-gray-900">{movements.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Stock Status</span>
                  <span
                    className={`text-sm font-medium ${item.quantity <= item.minStockLevel ? "text-red-600" : item.quantity <= item.minStockLevel * 1.5 ? "text-amber-600" : "text-green-600"}`}
                  >
                    {item.quantity <= item.minStockLevel
                      ? "Low"
                      : item.quantity <= item.minStockLevel * 1.5
                        ? "Warning"
                        : "OK"}
                  </span>
                </div>
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Total Issued</span>
                    <span className="text-sm text-gray-900">
                      {usageInsights.totalOut} {item.unitOfMeasure}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Avg Daily Usage</span>
                  <span className="text-sm text-gray-900">
                    {usageInsights.avgDailyUsage > 0
                      ? `${usageInsights.avgDailyUsage.toFixed(1)} / day`
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Days Until Stockout</span>
                  <span
                    className={`text-sm font-medium ${
                      usageInsights.daysUntilStockout !== null &&
                      usageInsights.daysUntilStockout <= 7
                        ? "text-red-600"
                        : usageInsights.daysUntilStockout !== null &&
                            usageInsights.daysUntilStockout <= 14
                          ? "text-amber-600"
                          : "text-gray-900"
                    }`}
                  >
                    {usageInsights.daysUntilStockout !== null
                      ? `${usageInsights.daysUntilStockout} days`
                      : "-"}
                  </span>
                </div>
                {usageInsights.lastRestock && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Last Restock</span>
                    <span className="text-sm text-gray-900">
                      {formatDateZA(usageInsights.lastRestock.createdAt)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {topRecipients.length > 0 && (
              <div className="bg-white shadow rounded-lg overflow-x-auto">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Top Recipients</h3>
                </div>
                <div className="px-4 py-4 sm:px-6 space-y-3">
                  {topRecipients.map((r) => {
                    const maxQty = topRecipients[0].totalQty;
                    const widthPct = maxQty > 0 ? (r.totalQty / maxQty) * 100 : 0;
                    return (
                      <div key={r.name}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700 truncate">{r.name}</span>
                          <span className="text-gray-500 flex-shrink-0 ml-2">
                            {r.totalQty} ({r.count}x)
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal-500 rounded-full transition-all duration-300"
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="bg-white shadow rounded-lg overflow-x-auto">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Photo</h3>
            </div>
            <div className="p-4">
              {item.photoUrl && (
                <img
                  src={item.photoUrl}
                  alt={item.name}
                  className="w-full rounded-lg object-cover mb-3"
                />
              )}
              {uploadPhotoMutation.isPending ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </div>
              ) : (
                <PhotoCapture onCapture={handlePhotoCapture} currentPhotoUrl={undefined} />
              )}
            </div>
          </div>
        </div>
      </div>

      {dailyIssuance.length >= 1 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Daily Issuance</h3>
          </div>
          <div className="px-2 py-4" style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyIssuance} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  formatter={(value) => [Number(value), "Issued"]}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="issued" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Movement History</h3>
        </div>
        {movements.length === 0 ? (
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
            <h3 className="mt-2 text-sm font-medium text-gray-900">No movements</h3>
            <p className="mt-1 text-sm text-gray-500">No stock movements recorded for this item.</p>
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
                  Type
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Quantity
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Reference
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Issued To
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Issued By
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {movements.map((movement) => (
                <tr key={movement.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateTimeZA(movement.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${movementTypeBadge(movement.movementType)}`}
                    >
                      {movement.movementType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                    {movement.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {movement.referenceType
                      ? `${movement.referenceType} #${movement.referenceId}`
                      : "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {(() => {
                      const raw = movement.notes || "-";
                      const match = raw.match(/^Issued to\s+(.+?)\s+by\s+.+$/i);
                      return match ? match[1] : raw;
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {movement.createdBy || "System"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdjustModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black/10 backdrop-blur-md transition-opacity"
              onClick={() => setShowAdjustModal(false)}
            ></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Adjust Stock</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Movement Type</label>
                  <select
                    value={adjustForm.movementType}
                    onChange={(e) =>
                      setAdjustForm({
                        ...adjustForm,
                        movementType: e.target.value as "in" | "out" | "adjustment",
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                  >
                    <option value="in">Stock In</option>
                    <option value="out">Stock Out</option>
                    <option value="adjustment">Set Absolute</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {adjustForm.movementType === "adjustment" ? "New Quantity" : "Quantity"}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={adjustForm.quantity}
                    onChange={(e) =>
                      setAdjustForm({ ...adjustForm, quantity: parseInt(e.target.value, 10) || 0 })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                  />
                  {item && adjustForm.movementType !== "adjustment" && (
                    <p className="mt-1 text-xs text-gray-500">
                      Current SOH: {item.quantity} | After:{" "}
                      {adjustForm.movementType === "in"
                        ? item.quantity + adjustForm.quantity
                        : Math.max(0, item.quantity - adjustForm.quantity)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={adjustForm.notes}
                    onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                    rows={3}
                    placeholder="Reason for adjustment..."
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdjust}
                  disabled={createManualAdjustmentMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {createManualAdjustmentMutation.isPending ? "Adjusting..." : "Apply Adjustment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-black/10 backdrop-blur-md transition-opacity"
              onClick={() => setShowModal(false)}
            ></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Stock Item</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">SKU</label>
                    <input
                      type="text"
                      value={modalForm.sku}
                      onChange={(e) => setModalForm({ ...modalForm, sku: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      value={modalForm.name}
                      onChange={(e) => setModalForm({ ...modalForm, name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={modalForm.description}
                    onChange={(e) => setModalForm({ ...modalForm, description: e.target.value })}
                    rows={2}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <input
                      type="text"
                      value={modalForm.category}
                      onChange={(e) => setModalForm({ ...modalForm, category: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Unit of Measure
                    </label>
                    <input
                      type="text"
                      value={modalForm.unitOfMeasure}
                      onChange={(e) =>
                        setModalForm({ ...modalForm, unitOfMeasure: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cost per Unit</label>
                    <input
                      type="number"
                      step="0.01"
                      value={modalForm.costPerUnit}
                      onChange={(e) =>
                        setModalForm({ ...modalForm, costPerUnit: parseFloat(e.target.value) || 0 })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Quantity</label>
                    <input
                      type="number"
                      value={modalForm.quantity}
                      onChange={(e) =>
                        setModalForm({ ...modalForm, quantity: parseInt(e.target.value, 10) || 0 })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Min Stock Level
                    </label>
                    <input
                      type="number"
                      value={modalForm.minStockLevel}
                      onChange={(e) =>
                        setModalForm({
                          ...modalForm,
                          minStockLevel: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <select
                    value={modalForm.locationId ?? ""}
                    onChange={(e) =>
                      setModalForm({
                        ...modalForm,
                        locationId: e.target.value ? parseInt(e.target.value, 10) : null,
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                  >
                    <option value="">No location</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={updateStockItemMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {updateStockItemMutation.isPending ? "Saving..." : "Update"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <PdfPreviewModal state={pdfPreview.state} onClose={pdfPreview.close} />
    </div>
  );
}
