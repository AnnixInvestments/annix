"use client";

import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/app/components/Toast";
import type { AnalyzedDeliveryNoteData, DeliveryNote } from "@/app/lib/api/stockControlApi";
import { SdnStatus } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";
import {
  useConfirmDeliveryNote,
  useCreateDeliveryNote,
  useDeleteDeliveryNote,
  useDeliveryNotes,
  useLinkDeliveryNoteToStock,
  useReportStockItems,
} from "@/app/lib/query/hooks";
import { DeliveryNoteConfirmationModal } from "@/app/stock-control/components/DeliveryNoteConfirmationModal";

function itemsCount(delivery: DeliveryNote): { count: number; isExtracted: boolean } {
  const linkedCount = delivery.items ? delivery.items.length : 0;
  if (linkedCount > 0) {
    return { count: linkedCount, isExtracted: false };
  }
  const extractedData = delivery.extractedData as { lineItems?: unknown[] } | null;
  const extractedCount = extractedData?.lineItems ? extractedData.lineItems.length : 0;
  return { count: extractedCount, isExtracted: extractedCount > 0 };
}

function needsStockLink(delivery: DeliveryNote): boolean {
  const linkedCount = delivery.items ? delivery.items.length : 0;
  if (linkedCount > 0) return false;
  const extractedData = delivery.extractedData as { lineItems?: unknown[] } | null;
  const lineItems = extractedData?.lineItems;
  const lineCount = lineItems ? lineItems.length : 0;
  return lineCount > 0;
}

function sdnStatusBadge(status: string) {
  if (status === SdnStatus.PENDING_REVIEW) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-amber-100 text-amber-800">
        Pending Review
      </span>
    );
  } else if (status === SdnStatus.CONFIRMED) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-blue-100 text-blue-800">
        Confirmed
      </span>
    );
  } else if (status === SdnStatus.STOCK_LINKED) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-green-100 text-green-800">
        Stock Linked
      </span>
    );
  }
  return <span className="text-gray-400">-</span>;
}

interface DeliveryFormItem {
  stockItemId: number;
  quantityReceived: number;
}

export default function DeliveriesPage() {
  const { showToast } = useToast();
  const { data: deliveries = [], isLoading, error } = useDeliveryNotes();
  const createMutation = useCreateDeliveryNote();
  const deleteMutation = useDeleteDeliveryNote();
  const linkMutation = useLinkDeliveryNoteToStock();
  const confirmMutation = useConfirmDeliveryNote();

  const { data: stockItems = [] } = useReportStockItems();
  const [showModal, setShowModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    deliveryNumber: "",
    supplierName: "",
    receivedDate: "",
    notes: "",
    receivedBy: "",
  });
  const [formItems, setFormItems] = useState<DeliveryFormItem[]>([
    { stockItemId: 0, quantityReceived: 1 },
  ]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeliveryNote | null>(null);
  const [reviewTarget, setReviewTarget] = useState<DeliveryNote | null>(null);
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);

  const openCreateModal = () => {
    setCreateForm({
      deliveryNumber: "",
      supplierName: "",
      receivedDate: "",
      notes: "",
      receivedBy: "",
    });
    setFormItems([{ stockItemId: 0, quantityReceived: 1 }]);
    setShowModal(true);
  };

  const addFormItem = () => {
    setFormItems([...formItems, { stockItemId: 0, quantityReceived: 1 }]);
  };

  const removeFormItem = (index: number) => {
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  const updateFormItem = (index: number, field: keyof DeliveryFormItem, value: number) => {
    setFormItems(formItems.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const handleCreate = () => {
    const receivedDate = createForm.receivedDate;
    const notes = createForm.notes;
    const receivedBy = createForm.receivedBy;
    const validItems = formItems.filter(
      (item) => item.stockItemId > 0 && item.quantityReceived > 0,
    );
    if (validItems.length === 0) return;

    createMutation.mutate(
      {
        deliveryNumber: createForm.deliveryNumber,
        supplierName: createForm.supplierName,
        receivedDate: receivedDate || undefined,
        notes: notes || undefined,
        receivedBy: receivedBy || undefined,
        items: validItems,
      },
      {
        onSuccess: () => setShowModal(false),
        onError: () => showToast("Failed to create delivery note", "error"),
      },
    );
  };

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const needsLink = deliveries.filter(needsStockLink);
    const allSelected = needsLink.every((d) => selectedIds.has(d.id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(needsLink.map((d) => d.id)));
    }
  };

  const handleBulkAddToStock = async () => {
    setIsBulkAdding(true);
    const ids = Array.from(selectedIds);
    const results = await Promise.allSettled(ids.map((id) => linkMutation.mutateAsync({ id })));
    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failCount = results.filter((r) => r.status === "rejected").length;

    if (successCount > 0) {
      showToast(`${successCount} delivery note(s) added to stock`, "success");
    }
    if (failCount > 0) {
      showToast(`${failCount} delivery note(s) failed to add to stock`, "error");
    }

    setSelectedIds(new Set());
    setIsBulkAdding(false);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
      onError: () => showToast("Failed to delete delivery note", "error"),
    });
  };

  const handleReviewConfirmAndAddToStock = async (editedData: AnalyzedDeliveryNoteData) => {
    if (!reviewTarget) return;
    setIsReviewSubmitting(true);
    try {
      await confirmMutation.mutateAsync({
        id: reviewTarget.id,
        confirmedData: editedData as unknown as Record<string, unknown>,
      });
      await linkMutation.mutateAsync({ id: reviewTarget.id });
      showToast(
        `Delivery note ${reviewTarget.deliveryNumber} confirmed and added to stock`,
        "success",
      );
      setReviewTarget(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to confirm delivery note", "error");
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  const handleReviewSaveConfirmed = async (editedData: AnalyzedDeliveryNoteData) => {
    if (!reviewTarget) return;
    setIsReviewSubmitting(true);
    try {
      await confirmMutation.mutateAsync({
        id: reviewTarget.id,
        confirmedData: editedData as unknown as Record<string, unknown>,
      });
      showToast(`Delivery note ${reviewTarget.deliveryNumber} confirmed`, "success");
      setReviewTarget(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to confirm delivery note", "error");
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  const handleAddToStock = (delivery: DeliveryNote) => {
    linkMutation.mutate(
      { id: delivery.id },
      {
        onSuccess: () => showToast(`${delivery.deliveryNumber} added to stock`, "success"),
        onError: () => showToast("Failed to add to stock", "error"),
      },
    );
  };

  const buildAnalyzedDataFromExtracted = (
    delivery: DeliveryNote,
  ): AnalyzedDeliveryNoteData | null => {
    const supplierName = delivery.supplierName;
    const extracted = delivery.extractedData as Record<string, unknown> | null;
    if (!extracted) return null;
    return {
      documentType:
        (extracted.documentType as AnalyzedDeliveryNoteData["documentType"]) || "SUPPLIER_DELIVERY",
      deliveryNoteNumber:
        (extracted.deliveryNoteNumber as string) || delivery.deliveryNumber || null,
      invoiceNumber: (extracted.invoiceNumber as string) || null,
      deliveryDate: (extracted.deliveryDate as string) || null,
      purchaseOrderNumber: (extracted.purchaseOrderNumber as string) || null,
      customerReference: (extracted.customerReference as string) || null,
      fromCompany: (extracted.fromCompany as AnalyzedDeliveryNoteData["fromCompany"]) || {
        name: supplierName || null,
        address: null,
        vatNumber: null,
        contactPerson: null,
        phone: null,
        email: null,
      },
      toCompany: (extracted.toCompany as AnalyzedDeliveryNoteData["toCompany"]) || {
        name: null,
        address: null,
        vatNumber: null,
        contactPerson: null,
        phone: null,
        email: null,
      },
      lineItems: (extracted.lineItems as AnalyzedDeliveryNoteData["lineItems"]) || [],
      totals: (extracted.totals as AnalyzedDeliveryNoteData["totals"]) || {
        totalQuantity: null,
        totalWeightKg: null,
        numberOfRolls: null,
        subtotalExclVat: null,
        vatTotal: null,
        grandTotalInclVat: null,
      },
      notes: (extracted.notes as string) || null,
      receivedBySignature: false,
      receivedDate: null,
    };
  };

  if (isLoading && deliveries.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading delivery notes...</p>
        </div>
      </div>
    );
  }

  if (error && deliveries.length === 0) {
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Delivery Notes</h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-600">Track incoming stock deliveries</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkAddToStock}
              disabled={isBulkAdding}
              className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-transparent rounded-md shadow-sm text-xs sm:text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {isBulkAdding ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Adding...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 mr-1 sm:mr-2"
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
                  Bulk Add ({selectedIds.size})
                </>
              )}
            </button>
          )}
          <Link
            href="/stock-control/portal/deliveries/scan"
            className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-teal-600 rounded-md shadow-sm text-xs sm:text-sm font-medium text-teal-700 bg-white hover:bg-teal-50"
          >
            <svg
              className="w-4 h-4 mr-1 sm:mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Scan & Analyze
          </Link>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-transparent rounded-md shadow-sm text-xs sm:text-sm font-medium text-white bg-teal-600 hover:bg-teal-700"
          >
            <svg
              className="w-4 h-4 mr-1 sm:mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Delivery
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        {deliveries.length === 0 ? (
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
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No delivery notes</h3>
            <p className="mt-1 text-sm text-gray-500">Record a new delivery to get started.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-2 sm:px-4 py-3 w-8 sm:w-10">
                  <input
                    type="checkbox"
                    checked={
                      deliveries.filter(needsStockLink).length > 0 &&
                      deliveries.filter(needsStockLink).every((d) => selectedIds.has(d.id))
                    }
                    onChange={toggleSelectAll}
                    className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                  />
                </th>
                <th
                  scope="col"
                  className="px-3 sm:px-6 py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Delivery Number
                </th>
                <th
                  scope="col"
                  className="px-3 sm:px-6 py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Supplier
                </th>
                <th
                  scope="col"
                  className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Received Date
                </th>
                <th
                  scope="col"
                  className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="hidden sm:table-cell px-3 sm:px-6 py-3 text-right text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Items
                </th>
                <th
                  scope="col"
                  className="px-2 sm:px-6 py-3 text-right text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deliveries.map((delivery) => (
                <tr key={delivery.id} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-2 sm:px-4 py-3 sm:py-4 w-8 sm:w-10">
                    {needsStockLink(delivery) ? (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(delivery.id)}
                        onChange={() => toggleSelection(delivery.id)}
                        className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                      />
                    ) : null}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <Link
                      href={`/stock-control/portal/deliveries/${delivery.id}`}
                      className="text-xs sm:text-sm font-medium text-teal-700 hover:text-teal-900 break-all"
                    >
                      {delivery.deliveryNumber}
                    </Link>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 max-w-[120px] sm:max-w-none truncate">
                    {delivery.supplierName}
                  </td>
                  <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateZA(delivery.receivedDate)}
                  </td>
                  <td className="hidden sm:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm">
                    {sdnStatusBadge(delivery.sdnStatus)}
                  </td>
                  <td className="hidden sm:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-right text-gray-900">
                    {(() => {
                      const { count, isExtracted } = itemsCount(delivery);
                      return isExtracted ? (
                        <span
                          className="text-yellow-600"
                          title="Extracted items (not yet linked to inventory)"
                        >
                          {count}*
                        </span>
                      ) : (
                        count
                      );
                    })()}
                  </td>
                  <td className="px-2 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-right">
                    <div className="flex items-center justify-end gap-2">
                      {delivery.sdnStatus === SdnStatus.PENDING_REVIEW && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setReviewTarget(delivery);
                          }}
                          className="text-xs px-2 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                        >
                          Review
                        </button>
                      )}
                      {delivery.sdnStatus === SdnStatus.CONFIRMED && needsStockLink(delivery) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToStock(delivery);
                          }}
                          disabled={linkMutation.isPending}
                          className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 disabled:opacity-50"
                        >
                          Add to Stock
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(delivery);
                        }}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <svg
                          className="w-4 h-4 sm:w-5 sm:h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/10 backdrop-blur-md"
              onClick={() => setDeleteTarget(null)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">Delete Delivery Note</h3>
              </div>
              <p className="text-sm text-gray-500 mb-2">
                Are you sure you want to delete delivery note{" "}
                <span className="font-medium text-gray-900">{deleteTarget.deliveryNumber}</span>?
              </p>
              <p className="text-sm text-gray-500 mb-4">This action cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
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
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-medium text-gray-900 mb-4">New Delivery Note</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Delivery Number
                    </label>
                    <input
                      type="text"
                      value={createForm.deliveryNumber}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, deliveryNumber: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Supplier Name</label>
                    <input
                      type="text"
                      value={createForm.supplierName}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, supplierName: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Received Date</label>
                    <input
                      type="date"
                      value={createForm.receivedDate}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, receivedDate: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Received By</label>
                    <input
                      type="text"
                      value={createForm.receivedBy}
                      onChange={(e) => setCreateForm({ ...createForm, receivedBy: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={createForm.notes}
                    onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                    rows={2}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                  />
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">Items</label>
                    <button
                      onClick={addFormItem}
                      className="text-sm text-teal-600 hover:text-teal-800"
                    >
                      + Add Item
                    </button>
                  </div>
                  <div className="space-y-3">
                    {formItems.map((formItem, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <select
                          value={formItem.stockItemId}
                          onChange={(e) =>
                            updateFormItem(index, "stockItemId", parseInt(e.target.value, 10) || 0)
                          }
                          className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                        >
                          <option value={0}>Select item...</option>
                          {stockItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.sku} - {item.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={1}
                          value={formItem.quantityReceived}
                          onChange={(e) =>
                            updateFormItem(
                              index,
                              "quantityReceived",
                              parseInt(e.target.value, 10) || 1,
                            )
                          }
                          className="w-24 rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                          placeholder="Qty"
                        />
                        {formItems.length > 1 && (
                          <button
                            onClick={() => removeFormItem(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <svg
                              className="w-5 h-5"
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
                        )}
                      </div>
                    ))}
                  </div>
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
                  onClick={handleCreate}
                  disabled={(() => {
                    const createPending = createMutation.isPending;
                    const rawDeliveryNumber = createForm.deliveryNumber;
                    const rawSupplierName = createForm.supplierName;
                    return createPending || !rawDeliveryNumber || !rawSupplierName;
                  })()}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {createMutation.isPending ? "Creating..." : "Create Delivery Note"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {reviewTarget &&
        (() => {
          const analyzedData = buildAnalyzedDataFromExtracted(reviewTarget);
          if (!analyzedData) return null;
          return (
            <DeliveryNoteConfirmationModal
              analyzedData={analyzedData}
              onClose={() => setReviewTarget(null)}
              onConfirmAndAddToStock={handleReviewConfirmAndAddToStock}
              onSaveForReview={handleReviewSaveConfirmed}
              isSubmitting={isReviewSubmitting}
            />
          );
        })()}
    </div>
  );
}
