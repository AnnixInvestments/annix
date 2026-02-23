"use client";

import {
  CALLOFF_STATUS,
  CALLOFF_STATUS_OPTIONS,
  CalloffStatus,
  calloffStatusColor,
  calloffStatusLabel,
} from "@annix/product-data/rubber/calloffStatus";
import {
  LENGTH_OPTIONS,
  THICKNESS_OPTIONS,
  WIDTH_OPTIONS,
} from "@annix/product-data/rubber/dimensions";
import {
  isTerminalStatus,
  STATUS_LABELS,
  statusColor,
  statusLabel,
  validNextStatuses,
} from "@annix/product-data/rubber/orderStatus";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/app/components/Toast";
import type { CallOff } from "@/app/lib/api/rubberPortalApi";
import { formatDateTimeZA, formatDateZA, fromMillis, nowMillis } from "@/app/lib/datetime";
import {
  useRubberCompanies,
  useRubberOrderDetail,
  useRubberOrderStatuses,
  useRubberProducts,
  useUpdateRubberOrder,
} from "@/app/lib/query/hooks";
import { Breadcrumb } from "../../components/Breadcrumb";
import { CalloffInput } from "../components/CalloffInput";

function CalloffStatusUpdate({
  currentStatus,
  onUpdate,
}: {
  currentStatus?: CalloffStatus;
  onUpdate: (status: CalloffStatus, notes: string) => void;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [status, setStatus] = React.useState<CalloffStatus>(CALLOFF_STATUS.APPROVED);
  const [notes, setNotes] = React.useState("");

  const handleSubmit = () => {
    onUpdate(status, notes);
    setIsOpen(false);
    setNotes("");
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-blue-600 hover:text-blue-800"
        title="Update status"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute right-0 top-6 z-10 bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-64">
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-700">
              Current: {currentStatus ? calloffStatusLabel(currentStatus) : "None"}
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(Number(e.target.value) as CalloffStatus)}
              className="w-full rounded-md border-gray-300 shadow-sm text-sm border p-1"
            >
              {CALLOFF_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="w-full rounded-md border-gray-300 shadow-sm text-sm border p-1"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsOpen(false)}
                className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface EditableItem {
  id?: number;
  productId?: number;
  thickness?: number;
  width?: number;
  length?: number;
  quantity?: number;
  callOffs: CallOff[];
  kgPerRoll?: number | null;
}

interface OriginalState {
  status: number;
  companyId: number | undefined;
  companyOrderNumber: string;
  items: string;
}

export default function RubberOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = Number(params.id);
  const { showToast } = useToast();

  const orderQuery = useRubberOrderDetail(orderId);
  const productsQuery = useRubberProducts();
  const companiesQuery = useRubberCompanies();
  const statusesQuery = useRubberOrderStatuses();
  const updateOrderMutation = useUpdateRubberOrder();

  const order = orderQuery.data ?? null;
  const products = productsQuery.data ?? [];
  const companies = companiesQuery.data ?? [];
  const statuses = statusesQuery.data ?? [];

  const [isSaving, setIsSaving] = useState(false);

  const [editStatus, setEditStatus] = useState<number>(0);
  const [editCompanyId, setEditCompanyId] = useState<number | undefined>(undefined);
  const [editCompanyOrderNumber, setEditCompanyOrderNumber] = useState("");
  const [editItems, setEditItems] = useState<EditableItem[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [originalState, setOriginalState] = useState<OriginalState | null>(null);

  useEffect(() => {
    if (order) {
      setEditStatus(order.status);
      setEditCompanyId(order.companyId || undefined);
      setEditCompanyOrderNumber(order.companyOrderNumber || "");
      const mappedItems = order.items.map((item) => ({
        id: item.id,
        productId: item.productId || undefined,
        thickness: item.thickness || undefined,
        width: item.width || undefined,
        length: item.length || undefined,
        quantity: item.quantity || undefined,
        callOffs: item.callOffs || [],
        kgPerRoll: item.kgPerRoll,
      }));
      setEditItems(mappedItems);
      setOriginalState({
        status: order.status,
        companyId: order.companyId || undefined,
        companyOrderNumber: order.companyOrderNumber || "",
        items: JSON.stringify(mappedItems),
      });
    }
  }, [order]);

  const hasUnsavedChanges = useMemo(() => {
    if (!originalState) return false;
    return (
      editStatus !== originalState.status ||
      editCompanyId !== originalState.companyId ||
      editCompanyOrderNumber !== originalState.companyOrderNumber ||
      JSON.stringify(editItems) !== originalState.items
    );
  }, [editStatus, editCompanyId, editCompanyOrderNumber, editItems, originalState]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleBackClick = useCallback(
    (e: React.MouseEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        if (confirm("You have unsaved changes. Are you sure you want to leave?")) {
          router.push("/admin/portal/rubber/orders");
        }
      }
    },
    [hasUnsavedChanges, router],
  );

  const validateItems = () => {
    const issues: string[] = [];
    const itemsWithoutProduct = editItems.filter((item) => !item.productId);
    const itemsWithoutDimensions = editItems.filter(
      (item) => item.productId && (!item.thickness || !item.width || !item.length),
    );
    const itemsWithoutQuantity = editItems.filter((item) => item.productId && !item.quantity);

    const duplicateKeys = new Set<string>();
    const seenKeys = new Set<string>();
    editItems.forEach((item) => {
      if (item.productId && item.thickness && item.width && item.length) {
        const key = `${item.productId}-${item.thickness}-${item.width}-${item.length}`;
        if (seenKeys.has(key)) {
          duplicateKeys.add(key);
        }
        seenKeys.add(key);
      }
    });

    if (itemsWithoutProduct.length > 0) {
      issues.push(
        `${itemsWithoutProduct.length} item(s) have no product selected and will be removed`,
      );
    }
    if (itemsWithoutDimensions.length > 0) {
      issues.push(`${itemsWithoutDimensions.length} item(s) are missing dimensions`);
    }
    if (itemsWithoutQuantity.length > 0) {
      issues.push(`${itemsWithoutQuantity.length} item(s) have no quantity`);
    }
    if (duplicateKeys.size > 0) {
      issues.push(
        `${duplicateKeys.size} product/dimension combination(s) appear multiple times - consider combining quantities`,
      );
    }
    return issues;
  };

  const handleSave = async () => {
    const validationIssues = validateItems();
    if (validationIssues.length > 0) {
      const message = `Warning:\n- ${validationIssues.join("\n- ")}\n\nDo you want to continue saving?`;
      if (!confirm(message)) {
        return;
      }
    }

    try {
      setIsSaving(true);
      await updateOrderMutation.mutateAsync({
        id: orderId,
        data: {
          status: editStatus,
          companyId: editCompanyId,
          companyOrderNumber: editCompanyOrderNumber || undefined,
          items: editItems
            .filter((item) => item.productId)
            .map((item) => ({
              productId: item.productId,
              thickness: item.thickness,
              width: item.width,
              length: item.length,
              quantity: item.quantity,
              callOffs: item.callOffs,
            })),
        },
      });
      showToast("Order updated", "success");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update order";
      showToast(errorMessage, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const addItem = () => {
    setEditItems([...editItems, { callOffs: [] }]);
  };

  const removeItem = (index: number) => {
    setEditItems(editItems.filter((_, i) => i !== index));
  };

  const duplicateItem = (index: number) => {
    const item = editItems[index];
    const newItem: EditableItem = {
      productId: item.productId,
      thickness: item.thickness,
      width: item.width,
      length: item.length,
      quantity: item.quantity,
      callOffs: [],
      kgPerRoll: item.kgPerRoll,
    };
    const newItems = [...editItems];
    newItems.splice(index + 1, 0, newItem);
    setEditItems(newItems);
  };

  const computeKgPerRoll = (item: EditableItem): number | null => {
    const product = productById(item.productId);
    if (!product?.specificGravity || !item.thickness || !item.width || !item.length) return null;
    return item.thickness * (item.width / 1000) * item.length * product.specificGravity;
  };

  const updateItem = (index: number, updates: Partial<EditableItem>) => {
    const newItems = [...editItems];
    const updatedItem = { ...newItems[index], ...updates };
    const dimensionFields = ["productId", "thickness", "width", "length"];
    const dimensionChanged = dimensionFields.some((field) => field in updates);
    if (dimensionChanged) {
      updatedItem.kgPerRoll = computeKgPerRoll(updatedItem);
    }
    newItems[index] = updatedItem;
    setEditItems(newItems);
  };

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const productById = (id: number | undefined) => products.find((p) => p.id === id);

  const calculateTotalKg = (item: EditableItem) => {
    if (item.kgPerRoll === null || item.kgPerRoll === undefined || !item.quantity) return null;
    return item.kgPerRoll * item.quantity;
  };

  const calculatePricePerRoll = (item: EditableItem) => {
    const product = productById(item.productId);
    if (item.kgPerRoll === null || item.kgPerRoll === undefined || !product?.pricePerKg)
      return null;
    return item.kgPerRoll * product.pricePerKg;
  };

  const calculateTotalPrice = (item: EditableItem) => {
    const pricePerRoll = calculatePricePerRoll(item);
    if (pricePerRoll === null || !item.quantity) return null;
    return pricePerRoll * item.quantity;
  };

  const calloffSummary = (item: EditableItem) => {
    const totalCalled = item.callOffs.reduce((sum, c) => sum + c.quantity, 0);
    const qty = item.quantity || 0;
    return { called: totalCalled, total: qty, remaining: qty - totalCalled };
  };

  const duplicateItemKeys = useMemo(() => {
    const keyCounts = new Map<string, number>();
    editItems.forEach((item) => {
      if (item.productId && item.thickness && item.width && item.length) {
        const key = `${item.productId}-${item.thickness}-${item.width}-${item.length}`;
        keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
      }
    });
    const duplicates = new Set<string>();
    keyCounts.forEach((count, key) => {
      if (count > 1) duplicates.add(key);
    });
    return duplicates;
  }, [editItems]);

  const isItemDuplicate = (item: EditableItem) => {
    if (!item.productId || !item.thickness || !item.width || !item.length) return false;
    const key = `${item.productId}-${item.thickness}-${item.width}-${item.length}`;
    return duplicateItemKeys.has(key);
  };

  const availableStatuses = useMemo(() => {
    if (!order) return statuses;
    const validNext = validNextStatuses(order.status);
    const currentStatus = order.status;
    return statuses.filter(
      (s) => s.value === currentStatus || (validNext as number[]).includes(s.value),
    );
  }, [order, statuses]);

  const addCalloff = (
    itemIndex: number,
    quantity: number,
    status: CalloffStatus,
    notes: string,
  ) => {
    const item = editItems[itemIndex];
    const summary = calloffSummary(item);
    if (quantity > summary.remaining) {
      showToast("Cannot call off more than remaining quantity", "error");
      return;
    }
    const timestamp = nowMillis();
    const newCalloff: CallOff = {
      quantity,
      quantityRemaining: summary.remaining - quantity,
      events: [{ timestamp, status, notes: notes || undefined }],
      notes: notes || undefined,
      createdAt: timestamp,
    };
    updateItem(itemIndex, { callOffs: [...item.callOffs, newCalloff] });
  };

  const addCalloffEvent = (
    itemIndex: number,
    calloffIndex: number,
    status: CalloffStatus,
    notes: string,
  ) => {
    const item = editItems[itemIndex];
    const calloff = item.callOffs[calloffIndex];
    const newEvent = {
      timestamp: nowMillis(),
      status,
      notes: notes || undefined,
    };
    const updatedCalloff = { ...calloff, events: [...calloff.events, newEvent] };
    const newCalloffs = [...item.callOffs];
    newCalloffs[calloffIndex] = updatedCalloff;
    updateItem(itemIndex, { callOffs: newCalloffs });
  };

  const removeCalloff = (itemIndex: number, calloffIndex: number) => {
    const item = editItems[itemIndex];
    const newCalloffs = item.callOffs.filter((_, i) => i !== calloffIndex);
    updateItem(itemIndex, { callOffs: newCalloffs });
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return "-";
    return `R ${value.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (orderQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order...</p>
        </div>
      </div>
    );
  }

  if (orderQuery.error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Order</div>
          <p className="text-gray-600">
            {orderQuery.error instanceof Error ? orderQuery.error.message : "Failed to load order"}
          </p>
          <button
            onClick={() => orderQuery.refetch()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-gray-500 text-lg font-semibold mb-2">Order Not Found</div>
          <Link href="/admin/portal/rubber/orders" className="text-blue-600 hover:text-blue-800">
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Orders", href: "/admin/portal/rubber/orders" },
          { label: order.orderNumber },
        ]}
      />
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-gray-900">Order {order.orderNumber}</h1>
            <span
              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor(order.status)}`}
            >
              {order.statusLabel}
            </span>
          </div>
          <div className="mt-1 text-sm text-gray-600 space-y-0.5">
            <p>
              Created {formatDateTimeZA(order.createdAt)}
              {order.createdBy && <span className="text-gray-400"> by {order.createdBy}</span>}
            </p>
            {order.updatedAt !== order.createdAt && (
              <p>
                Updated {formatDateTimeZA(order.updatedAt)}
                {order.updatedBy && <span className="text-gray-400"> by {order.updatedBy}</span>}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {hasUnsavedChanges && (
            <span className="text-sm text-orange-600 font-medium">Unsaved changes</span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Order Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            {isTerminalStatus(order.status) ? (
              <div className="mt-1 flex items-center space-x-2">
                <span
                  className={`px-3 py-2 inline-flex text-sm font-medium rounded-md ${statusColor(order.status)}`}
                >
                  {statusLabel(order.status)}
                </span>
                <span className="text-sm text-gray-500">(Final status)</span>
              </div>
            ) : (
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              >
                {availableStatuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Company</label>
            <select
              value={editCompanyId ?? ""}
              onChange={(e) =>
                setEditCompanyId(e.target.value ? Number(e.target.value) : undefined)
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
            >
              <option value="">Select company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Company Order Number</label>
            <input
              type="text"
              value={editCompanyOrderNumber}
              onChange={(e) => setEditCompanyOrderNumber(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              placeholder="PO-12345"
            />
          </div>
        </div>
      </div>

      {order.statusHistory && order.statusHistory.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Status History</h2>
          <div className="flow-root">
            <ul className="-mb-8">
              {order.statusHistory.map((event, idx) => (
                <li key={idx}>
                  <div className="relative pb-8">
                    {idx !== order.statusHistory.length - 1 && (
                      <span
                        className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200"
                        aria-hidden="true"
                      />
                    )}
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white">
                          <svg
                            className="h-5 w-5 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                        <div>
                          <p className="text-sm text-gray-500">
                            <span
                              className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColor(event.fromStatus)}`}
                            >
                              {STATUS_LABELS[event.fromStatus] || "Unknown"}
                            </span>
                            <span className="mx-2">→</span>
                            <span
                              className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColor(event.toStatus)}`}
                            >
                              {STATUS_LABELS[event.toStatus] || "Unknown"}
                            </span>
                          </p>
                          {event.notes && (
                            <p className="mt-1 text-sm text-gray-500 italic">{event.notes}</p>
                          )}
                        </div>
                        <div className="whitespace-nowrap text-right text-sm text-gray-500">
                          <time>{formatDateTimeZA(fromMillis(event.timestamp).toISO())}</time>
                          {event.changedBy && (
                            <div className="text-xs text-gray-400">by {event.changedBy}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">
            Order {order.orderNumber} Line Items
          </h2>
          <button
            onClick={addItem}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Item
          </button>
        </div>

        {editItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No items. Click "Add Item" to add products.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="w-10 px-3 py-3"></th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    Line
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                  >
                    Product
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase"
                  >
                    Specific Gravity
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase"
                  >
                    Thickness
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase"
                  >
                    Width
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase"
                  >
                    Length
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase"
                  >
                    Kg/Roll
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase"
                  >
                    Price/Kg
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase"
                  >
                    Qty
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase"
                  >
                    Price/Roll
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase"
                  >
                    Total
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {editItems.map((item, index) => {
                  const product = productById(item.productId);
                  const pricePerRoll = calculatePricePerRoll(item);
                  const totalPrice = calculateTotalPrice(item);
                  const summary = calloffSummary(item);
                  const isExpanded = expandedItems.has(index);
                  const isDuplicate = isItemDuplicate(item);

                  return (
                    <React.Fragment key={index}>
                      <tr
                        className={`hover:bg-gray-50 ${isDuplicate ? "bg-amber-50" : ""}`}
                        title={
                          isDuplicate
                            ? "Duplicate product/dimensions - consider combining quantities"
                            : ""
                        }
                      >
                        <td className="px-3 py-3">
                          <button
                            onClick={() => toggleExpand(index)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <svg
                              className={`w-5 h-5 transform transition-transform ${isExpanded ? "rotate-90" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </button>
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-900">
                          <div className="flex items-center space-x-1">
                            <span>{index + 1}</span>
                            {isDuplicate && (
                              <span className="text-amber-600" title="Duplicate">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path
                                    fillRule="evenodd"
                                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <select
                            value={item.productId ?? ""}
                            onChange={(e) =>
                              updateItem(index, {
                                productId: e.target.value ? Number(e.target.value) : undefined,
                              })
                            }
                            className="w-full min-w-[200px] rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm border p-1.5"
                          >
                            <option value="">Select product</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.title || `Product #${p.id}`}
                              </option>
                            ))}
                          </select>
                          {product && (
                            <div className="text-xs text-gray-500 mt-1">
                              {[
                                product.compoundOwnerName,
                                product.compoundName,
                                product.hardnessName,
                                product.typeName,
                                product.colourName,
                              ]
                                .filter(Boolean)
                                .join(", ")}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center text-sm text-gray-900">
                          {product?.specificGravity ?? "-"}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <select
                            value={item.thickness ?? ""}
                            onChange={(e) =>
                              updateItem(index, {
                                thickness: e.target.value ? Number(e.target.value) : undefined,
                              })
                            }
                            className="w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm border p-1.5"
                          >
                            <option value="">-</option>
                            {THICKNESS_OPTIONS.map((t) => (
                              <option key={t} value={t}>
                                {t} mm
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <select
                            value={item.width ?? ""}
                            onChange={(e) =>
                              updateItem(index, {
                                width: e.target.value ? Number(e.target.value) : undefined,
                              })
                            }
                            className="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm border p-1.5"
                          >
                            <option value="">-</option>
                            {WIDTH_OPTIONS.map((w) => (
                              <option key={w} value={w}>
                                {w} mm
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <select
                            value={item.length ?? ""}
                            onChange={(e) =>
                              updateItem(index, {
                                length: e.target.value ? Number(e.target.value) : undefined,
                              })
                            }
                            className="w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm border p-1.5"
                          >
                            <option value="">-</option>
                            {LENGTH_OPTIONS.map((l) => (
                              <option key={l} value={l}>
                                {l} m
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-3 text-center text-sm text-gray-900">
                          {item.kgPerRoll != null ? `${item.kgPerRoll.toFixed(1)} Kg` : "-"}
                        </td>
                        <td className="px-3 py-3 text-center text-sm text-gray-900">
                          {product?.pricePerKg ? formatCurrency(product.pricePerKg) : "-"}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() =>
                                updateItem(index, {
                                  quantity: Math.max(0, (item.quantity || 0) - 1),
                                })
                              }
                              className="p-1 text-gray-400 hover:text-gray-600"
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
                                  d="M15 19l-7-7 7-7"
                                />
                              </svg>
                            </button>
                            <input
                              type="number"
                              value={item.quantity ?? ""}
                              onChange={(e) =>
                                updateItem(index, {
                                  quantity: e.target.value ? Number(e.target.value) : undefined,
                                })
                              }
                              className="w-12 text-center rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm border p-1"
                              min="0"
                            />
                            <button
                              onClick={() =>
                                updateItem(index, { quantity: (item.quantity || 0) + 1 })
                              }
                              className="p-1 text-gray-400 hover:text-gray-600"
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
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right text-sm text-gray-900">
                          {formatCurrency(pricePerRoll)}
                        </td>
                        <td className="px-3 py-3 text-right text-sm font-medium text-gray-900">
                          {formatCurrency(totalPrice)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => toggleExpand(index)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Calloff"
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
                                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => duplicateItem(index)}
                              className="text-gray-600 hover:text-gray-800"
                              title="Duplicate"
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
                                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => removeItem(index)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete"
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
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-gray-50">
                          <td colSpan={13} className="px-6 py-4">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium text-gray-900">
                                  Calloff Request Details
                                </h4>
                                <span className="text-sm text-gray-500">
                                  {summary.called} of {summary.total} rolls called off
                                </span>
                              </div>

                              {item.callOffs.length > 0 && (
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead>
                                    <tr>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        #
                                      </th>
                                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                                        Quantity
                                      </th>
                                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                                        Remaining
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Status History
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                        Notes
                                      </th>
                                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                                        Actions
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-200">
                                    {item.callOffs.map((calloff, cIndex) => (
                                      <tr key={cIndex}>
                                        <td className="px-3 py-2 text-sm text-gray-900 font-medium">
                                          <div>{cIndex + 1}</div>
                                          {calloff.createdAt && (
                                            <div className="text-xs text-gray-400">
                                              {formatDateZA(fromMillis(calloff.createdAt).toISO())}
                                            </div>
                                          )}
                                        </td>
                                        <td className="px-3 py-2 text-center text-sm text-gray-900">
                                          {calloff.quantity} rolls
                                        </td>
                                        <td className="px-3 py-2 text-center text-sm text-gray-900">
                                          {calloff.quantityRemaining}
                                        </td>
                                        <td className="px-3 py-2 text-sm">
                                          <div className="space-y-1">
                                            {calloff.events.map((event, eIndex) => (
                                              <div key={eIndex} className="flex flex-col">
                                                <div className="flex items-center space-x-2">
                                                  <span
                                                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${calloffStatusColor(event.status)}`}
                                                  >
                                                    {calloffStatusLabel(event.status)}
                                                  </span>
                                                  <span className="text-gray-500 text-xs">
                                                    {formatDateTimeZA(
                                                      fromMillis(event.timestamp).toISO(),
                                                    )}
                                                  </span>
                                                  {event.createdBy && (
                                                    <span className="text-gray-400 text-xs">
                                                      by {event.createdBy}
                                                    </span>
                                                  )}
                                                </div>
                                                {event.notes && (
                                                  <div className="text-xs text-gray-500 ml-2 mt-0.5 italic">
                                                    {event.notes}
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </td>
                                        <td className="px-3 py-2 text-sm text-gray-500 max-w-[200px]">
                                          {calloff.notes && (
                                            <div className="truncate">{calloff.notes}</div>
                                          )}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                          <div className="flex items-center justify-center space-x-2">
                                            <CalloffStatusUpdate
                                              currentStatus={
                                                calloff.events[calloff.events.length - 1]?.status
                                              }
                                              onUpdate={(status, notes) =>
                                                addCalloffEvent(index, cIndex, status, notes)
                                              }
                                            />
                                            <button
                                              onClick={() => removeCalloff(index, cIndex)}
                                              className="text-red-600 hover:text-red-800"
                                              title="Remove calloff"
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

                              {summary.remaining > 0 && (
                                <div className="pt-2 border-t">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-600">
                                      Remaining {summary.remaining} rolls
                                    </span>
                                  </div>
                                  <CalloffInput
                                    maxQuantity={summary.remaining}
                                    onAdd={(qty, status, notes) =>
                                      addCalloff(index, qty, status, notes)
                                    }
                                  />
                                </div>
                              )}

                              {summary.remaining === 0 && item.callOffs.length > 0 && (
                                <div className="text-sm text-green-600 font-medium">
                                  All rolls have been called off
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {editItems.length > 0 && (
          <div className="px-6 py-4 bg-gray-50 border-t">
            <div className="flex justify-end space-x-8">
              <div className="text-sm">
                <span className="text-gray-500">Total Items:</span>{" "}
                <span className="font-medium">{editItems.length}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Total Quantity:</span>{" "}
                <span className="font-medium">
                  {editItems.reduce((sum, item) => sum + (item.quantity || 0), 0)} rolls
                </span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Total Weight:</span>{" "}
                <span className="font-medium">
                  {editItems
                    .reduce((sum, item) => sum + (calculateTotalKg(item) || 0), 0)
                    .toLocaleString("en-ZA", {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}{" "}
                  Kg
                </span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Total:</span>{" "}
                <span className="font-medium text-lg">
                  {formatCurrency(
                    editItems.reduce((sum, item) => sum + (calculateTotalPrice(item) || 0), 0),
                  )}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
