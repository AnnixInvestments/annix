"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import type {
  AsteriskAllocation,
  CpoCalloffRecord,
  CustomerPurchaseOrderItem,
  SageJcDumpImportResult,
  SageJcDumpParseResult,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateZA, fromISO, now } from "@/app/lib/datetime";
import {
  useAddCpoItem,
  useCpoCalloffRecords,
  useCpoDeliveryHistory,
  useCpoDetail,
  useDeleteCpoItem,
  useUpdateCalloffRecordStatus,
  useUpdateCpoItem,
  useUpdateCpoStatus,
} from "@/app/lib/query/hooks";
import { stockControlKeys } from "@/app/lib/query/keys";
import { QcpSection } from "@/app/stock-control/portal/job-cards/[id]/components/QcpSection";
import { AsteriskAllocationModal } from "../../../components/AsteriskAllocationModal";
import { CpoBatchAssignmentSection } from "./components/CpoBatchAssignmentSection";
import { CpoDataBookSection } from "./components/CpoDataBookSection";
import { CpoReleaseDocumentGenerator } from "./components/CpoReleaseDocumentGenerator";

function statusBadgeColor(status: string): string {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    fulfilled: "bg-blue-100 text-blue-800",
    cancelled: "bg-red-100 text-red-800",
  };
  return colors[status.toLowerCase()] || "bg-gray-100 text-gray-800";
}

function calloffStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    called_off: "bg-blue-100 text-blue-800 border-blue-200",
    delivered: "bg-green-100 text-green-800 border-green-200",
    invoiced: "bg-teal-100 text-teal-800 border-teal-200",
  };
  return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
}

function calloffStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "Pending",
    called_off: "Called Off",
    delivered: "Delivered",
    invoiced: "Invoiced",
  };
  return labels[status] || status;
}

const CALLOFF_STATUS_FLOW = ["pending", "called_off", "delivered", "invoiced"] as const;

function nextCalloffStatus(current: string): string | null {
  const idx = CALLOFF_STATUS_FLOW.indexOf(current as (typeof CALLOFF_STATUS_FLOW)[number]);
  if (idx < 0 || idx >= CALLOFF_STATUS_FLOW.length - 1) {
    return null;
  }
  return CALLOFF_STATUS_FLOW[idx + 1];
}

function isCalloffOverdue(record: CpoCalloffRecord): boolean {
  if (record.status !== "delivered" || !record.deliveredAt) return false;
  const deliveredDate = fromISO(record.deliveredAt as string);
  const daysSinceDelivery = now().diff(deliveredDate, "days").days;
  return daysSinceDelivery >= 21;
}

function itemFulfillmentPercent(ordered: number, fulfilled: number): number {
  if (ordered <= 0) return 0;
  return Math.min(100, Math.round((fulfilled / ordered) * 100));
}

interface ItemEditDraft {
  itemCode: string;
  itemDescription: string;
  itemNo: string;
  jtNo: string;
  quantityOrdered: string;
  m2: string;
}

function blankDraft(): ItemEditDraft {
  return { itemCode: "", itemDescription: "", itemNo: "", jtNo: "", quantityOrdered: "", m2: "" };
}

function draftFromItem(item: CustomerPurchaseOrderItem): ItemEditDraft {
  return {
    itemCode: item.itemCode || "",
    itemDescription: item.itemDescription || "",
    itemNo: item.itemNo || "",
    jtNo: item.jtNo || "",
    quantityOrdered: item.quantityOrdered != null ? String(item.quantityOrdered) : "",
    m2: item.m2 != null ? String(item.m2) : "",
  };
}

export default function CpoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const queryClient = useQueryClient();
  const { data: cpo, isLoading: isLoadingCpo, error: cpoError } = useCpoDetail(id);
  const { data: calloffRecords = [] } = useCpoCalloffRecords(id);
  const { data: deliveryHistory } = useCpoDeliveryHistory(id);

  const updateCpoStatusMutation = useUpdateCpoStatus();
  const updateCalloffRecordStatusMutation = useUpdateCalloffRecordStatus();
  const deleteCpoItemMutation = useDeleteCpoItem();

  const [mutationError, setMutationError] = useState<string | null>(null);
  const [updatingRecordId, setUpdatingRecordId] = useState<number | null>(null);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<ItemEditDraft>(blankDraft());
  const [addingItem, setAddingItem] = useState(false);
  const [addDraft, setAddDraft] = useState<ItemEditDraft>(blankDraft());
  const [itemError, setItemError] = useState<string | null>(null);

  const addCpoItemMutation = useAddCpoItem();
  const updateCpoItemMutation = useUpdateCpoItem();
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CustomerPurchaseOrderItem | null>(null);
  const [itemFormError, setItemFormError] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState({
    itemCode: "",
    itemDescription: "",
    itemNo: "",
    quantityOrdered: "",
    jtNo: "",
    m2: "",
  });

  const [activeTab, setActiveTab] = useState<"details" | "quality">("details");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const deliveryScrollRef = useRef<HTMLDivElement>(null);
  const deliveryDragState = useRef({ isDragging: false, startX: 0, scrollLeft: 0 });

  const handleDeliveryDragStart = useCallback((e: React.MouseEvent) => {
    const container = deliveryScrollRef.current;
    if (!container) return;
    if ((e.target as HTMLElement).closest("a, button")) return;

    deliveryDragState.current = {
      isDragging: true,
      startX: e.pageX - container.offsetLeft,
      scrollLeft: container.scrollLeft,
    };

    const handleMove = (moveEvent: MouseEvent) => {
      if (!deliveryDragState.current.isDragging) return;
      moveEvent.preventDefault();
      const x = moveEvent.pageX - container.offsetLeft;
      const walk = x - deliveryDragState.current.startX;
      container.scrollLeft = deliveryDragState.current.scrollLeft - walk;
    };

    const handleUp = () => {
      deliveryDragState.current.isDragging = false;
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  }, []);

  const [isEditingSpecs, setIsEditingSpecs] = useState(false);
  const [specsDraft, setSpecsDraft] = useState("");
  const [isSavingSpecs, setIsSavingSpecs] = useState(false);
  const [specsError, setSpecsError] = useState<string | null>(null);

  const handleSaveCoatingSpecs = useCallback(async () => {
    try {
      setIsSavingSpecs(true);
      setSpecsError(null);
      const trimmed = specsDraft.trim() || null;
      await stockControlApiClient.updateCpoCoatingSpecs(id, trimmed);
      await queryClient.invalidateQueries({ queryKey: stockControlKeys.cpos.detail(id) });
      setIsEditingSpecs(false);
    } catch (err) {
      setSpecsError(err instanceof Error ? err.message : "Failed to save coating specs");
    } finally {
      setIsSavingSpecs(false);
    }
  }, [id, specsDraft, queryClient]);

  const [sageParseResult, setSageParseResult] = useState<SageJcDumpParseResult | null>(null);
  const [sageImportResult, setSageImportResult] = useState<SageJcDumpImportResult | null>(null);
  const [sageParsing, setSageParsing] = useState(false);
  const [sageConfirming, setSageConfirming] = useState(false);
  const [sageError, setSageError] = useState<string | null>(null);
  const [showAllocationModal, setShowAllocationModal] = useState(false);

  const handleSageFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      try {
        setSageError(null);
        setSageImportResult(null);
        setSageParsing(true);
        const result = await stockControlApiClient.uploadSageJcDump(id, file);
        setSageParseResult(result);

        if (result.asteriskItems.length > 0) {
          setShowAllocationModal(true);
        } else {
          const jtGroupKeys = Object.keys(result.jtGroups);
          if (jtGroupKeys.length > 0) {
            setSageConfirming(true);
            const importResult = await stockControlApiClient.confirmSageJcDump(id, {
              cpoId: result.cpoId,
              jtGroups: result.jtGroups,
              asteriskAllocations: [],
            });
            setSageImportResult(importResult);
            setSageConfirming(false);
            router.push("/stock-control/portal/job-cards");
          }
        }
      } catch (err) {
        setSageError(err instanceof Error ? err.message : "Failed to parse Sage JC dump");
      } finally {
        setSageParsing(false);
      }
    },
    [id, router],
  );

  const handleAllocationConfirm = useCallback(
    async (allocations: AsteriskAllocation[]) => {
      if (!sageParseResult) return;
      try {
        setSageError(null);
        setSageConfirming(true);
        const importResult = await stockControlApiClient.confirmSageJcDump(id, {
          cpoId: sageParseResult.cpoId,
          jtGroups: sageParseResult.jtGroups,
          asteriskAllocations: allocations,
        });
        setSageImportResult(importResult);
        setShowAllocationModal(false);
        setSageParseResult(null);
        router.push("/stock-control/portal/job-cards");
      } catch (err) {
        setSageError(err instanceof Error ? err.message : "Failed to create job cards");
        setShowAllocationModal(false);
      } finally {
        setSageConfirming(false);
      }
    },
    [id, sageParseResult, router],
  );

  const openAddItemModal = () => {
    setEditingItem(null);
    setItemForm({
      itemCode: "",
      itemDescription: "",
      itemNo: "",
      quantityOrdered: "",
      jtNo: "",
      m2: "",
    });
    setItemFormError(null);
    setItemModalOpen(true);
  };

  const openEditItemModal = (item: CustomerPurchaseOrderItem) => {
    setEditingItem(item);
    setItemForm({
      itemCode: item.itemCode || "",
      itemDescription: item.itemDescription || "",
      itemNo: item.itemNo || "",
      quantityOrdered: String(item.quantityOrdered),
      jtNo: item.jtNo || "",
      m2: item.m2 != null ? String(item.m2) : "",
    });
    setItemFormError(null);
    setItemModalOpen(true);
  };

  const handleItemFormSubmit = async () => {
    const qty = parseFloat(itemForm.quantityOrdered);
    if (Number.isNaN(qty) || qty < 0) {
      setItemFormError("Quantity ordered must be a valid number (0 or more)");
      return;
    }
    try {
      setItemFormError(null);
      const data = {
        itemCode: itemForm.itemCode.trim() || null,
        itemDescription: itemForm.itemDescription.trim() || null,
        itemNo: itemForm.itemNo.trim() || null,
        quantityOrdered: qty,
        jtNo: itemForm.jtNo.trim() || null,
        m2: itemForm.m2.trim() ? parseFloat(itemForm.m2) : null,
      };
      if (editingItem) {
        await updateCpoItemMutation.mutateAsync({ cpoId: id, itemId: editingItem.id, data });
      } else {
        await addCpoItemMutation.mutateAsync({ cpoId: id, data });
      }
      setItemModalOpen(false);
    } catch (err) {
      setItemFormError(err instanceof Error ? err.message : "Failed to save line item");
    }
  };

  const error = cpoError
    ? cpoError instanceof Error
      ? cpoError.message
      : "Failed to load CPO"
    : mutationError;

  const handleEditItem = (item: CustomerPurchaseOrderItem) => {
    setEditingItemId(item.id);
    setEditDraft(draftFromItem(item));
    setItemError(null);
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditDraft(blankDraft());
    setItemError(null);
  };

  const handleSaveEdit = async () => {
    if (editingItemId === null) return;
    try {
      setItemError(null);
      await updateCpoItemMutation.mutateAsync({
        cpoId: id,
        itemId: editingItemId,
        data: {
          itemCode: editDraft.itemCode || null,
          itemDescription: editDraft.itemDescription || null,
          itemNo: editDraft.itemNo || null,
          jtNo: editDraft.jtNo || null,
          quantityOrdered: editDraft.quantityOrdered ? parseFloat(editDraft.quantityOrdered) : 0,
          m2: editDraft.m2 ? parseFloat(editDraft.m2) : null,
        },
      });
      setEditingItemId(null);
      setEditDraft(blankDraft());
    } catch (err) {
      setItemError(err instanceof Error ? err.message : "Failed to update item");
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    try {
      setItemError(null);
      await deleteCpoItemMutation.mutateAsync({ cpoId: id, itemId });
    } catch (err) {
      setItemError(err instanceof Error ? err.message : "Failed to delete item");
    }
  };

  const handleAddItem = async () => {
    try {
      setItemError(null);
      await addCpoItemMutation.mutateAsync({
        cpoId: id,
        data: {
          itemCode: addDraft.itemCode || null,
          itemDescription: addDraft.itemDescription || null,
          itemNo: addDraft.itemNo || null,
          jtNo: addDraft.jtNo || null,
          quantityOrdered: addDraft.quantityOrdered ? parseFloat(addDraft.quantityOrdered) : 0,
          m2: addDraft.m2 ? parseFloat(addDraft.m2) : null,
        },
      });
      setAddingItem(false);
      setAddDraft(blankDraft());
    } catch (err) {
      setItemError(err instanceof Error ? err.message : "Failed to add item");
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!cpo) return;
    try {
      setMutationError(null);
      await updateCpoStatusMutation.mutateAsync({ id: cpo.id, status: newStatus });
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const handleCalloffAdvance = async (record: CpoCalloffRecord) => {
    const next = nextCalloffStatus(record.status);
    if (!next) return;
    try {
      setUpdatingRecordId(record.id);
      setMutationError(null);
      await updateCalloffRecordStatusMutation.mutateAsync({
        recordId: record.id,
        status: next,
        cpoId: id,
      });
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : "Failed to update calloff status");
    } finally {
      setUpdatingRecordId(null);
    }
  };

  if (isLoadingCpo) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading purchase order...</p>
        </div>
      </div>
    );
  }

  if (error || !cpo) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error</div>
          <p className="text-gray-600">{error || "CPO not found"}</p>
          <Link
            href="/stock-control/portal/purchase-orders"
            className="mt-4 inline-block px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
          >
            Back to Purchase Orders
          </Link>
        </div>
      </div>
    );
  }

  const totalQty = Number(cpo.totalQuantity) || 0;
  const fulfilledQty = Number(cpo.fulfilledQuantity) || 0;
  const overallPct = totalQty > 0 ? Math.min(100, Math.round((fulfilledQty / totalQty) * 100)) : 0;

  const sortedItems = [...(cpo.items || [])].sort((a, b) => a.sortOrder - b.sortOrder);

  const recordsByJobCard = calloffRecords.reduce<Record<string, CpoCalloffRecord[]>>(
    (acc, record) => {
      const key = record.jobCardId ? `jc-${record.jobCardId}` : "unlinked";
      return {
        ...acc,
        [key]: [...(acc[key] || []), record],
      };
    },
    {},
  );

  const hasRubberColumn = calloffRecords.some((r) => r.calloffType === "rubber");
  const hasPaintColumn = calloffRecords.some((r) => r.calloffType === "paint");
  const hasSolutionColumn = calloffRecords.some((r) => r.calloffType === "solution");

  const calloffRows = Object.entries(recordsByJobCard)
    .map(([key, records]) => ({
      key,
      jobCard: records[0]?.jobCard || null,
      rubber: records.find((r) => r.calloffType === "rubber") || null,
      paint: records.find((r) => r.calloffType === "paint") || null,
      solution: records.find((r) => r.calloffType === "solution") || null,
      hasOverdue: records.some(isCalloffOverdue),
    }))
    .filter((row) => row.jobCard?.parentJobCardId !== null);

  const overdueRecords = calloffRecords.filter(isCalloffOverdue);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
            <Link href="/stock-control/portal/purchase-orders" className="hover:text-teal-600">
              Purchase Orders
            </Link>
            <span>/</span>
            <span className="text-gray-900">{cpo.cpoNumber}</span>
          </div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-gray-900">{cpo.cpoNumber}</h1>
            {(cpo.versionNumber || 1) > 1 && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                v{cpo.versionNumber}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span
            className={`px-3 py-1 text-sm font-semibold rounded-full ${statusBadgeColor(cpo.status)}`}
          >
            {cpo.status}
          </span>
          {cpo.status === "active" && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xls,.xlsx,.csv"
                onChange={handleSageFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={sageParsing || sageConfirming}
                className="px-3 py-1.5 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {sageParsing && (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                )}
                {sageParsing ? "Parsing..." : "Import Sage JC Dump"}
              </button>
              <button
                onClick={() => handleStatusChange("fulfilled")}
                disabled={updateCpoStatusMutation.isPending}
                className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Mark Fulfilled
              </button>
              <button
                onClick={() => handleStatusChange("cancelled")}
                disabled={updateCpoStatusMutation.isPending}
                className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex space-x-1 px-0" aria-label="CPO sections">
          <button
            type="button"
            onClick={() => setActiveTab("details")}
            className={`whitespace-nowrap py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "details"
                ? "border-teal-500 text-teal-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("quality")}
            className={`whitespace-nowrap py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "quality"
                ? "border-teal-500 text-teal-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Quality
          </button>
        </nav>
      </div>

      {activeTab === "quality" && (
        <div className="space-y-6">
          <QcpSection cpoId={id} />
          <CpoBatchAssignmentSection cpoId={id} />
          <CpoReleaseDocumentGenerator cpoId={id} />
          <CpoDataBookSection cpoId={id} />
        </div>
      )}

      <div className={activeTab !== "details" ? "hidden" : ""}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <dt className="text-xs font-medium text-gray-500 uppercase">Job Number</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900">{cpo.jobNumber}</dd>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <dt className="text-xs font-medium text-gray-500 uppercase">Customer</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900">{cpo.customerName || "-"}</dd>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <dt className="text-xs font-medium text-gray-500 uppercase">PO Number</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900">{cpo.poNumber || "-"}</dd>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <dt className="text-xs font-medium text-gray-500 uppercase">Overall Fulfilment</dt>
            <dd className="mt-1">
              <div className="flex items-center space-x-2">
                <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${overallPct >= 100 ? "bg-blue-500" : "bg-teal-500"}`}
                    style={{ width: `${overallPct}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-700">{overallPct}%</span>
              </div>
            </dd>
          </div>
        </div>

        {(cpo.jobName ||
          cpo.siteLocation ||
          cpo.contactPerson ||
          cpo.dueDate ||
          cpo.notes ||
          cpo.reference) && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Details</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
              {cpo.jobName && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Job Name</dt>
                  <dd className="text-sm text-gray-900">{cpo.jobName}</dd>
                </div>
              )}
              {cpo.siteLocation && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Site Location</dt>
                  <dd className="text-sm text-gray-900">{cpo.siteLocation}</dd>
                </div>
              )}
              {cpo.contactPerson && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Contact Person</dt>
                  <dd className="text-sm text-gray-900">{cpo.contactPerson}</dd>
                </div>
              )}
              {cpo.dueDate && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Due Date</dt>
                  <dd className="text-sm text-gray-900">{cpo.dueDate}</dd>
                </div>
              )}
              {cpo.reference && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Reference</dt>
                  <dd className="text-sm text-gray-900">{cpo.reference}</dd>
                </div>
              )}
              {cpo.notes && (
                <div className="md:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Notes</dt>
                  <dd className="text-sm text-gray-900 whitespace-pre-wrap">{cpo.notes}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium text-amber-900">Coating / Lining Specifications</h2>
            {!isEditingSpecs && (
              <button
                type="button"
                onClick={() => {
                  setSpecsDraft(cpo.coatingSpecs || "");
                  setIsEditingSpecs(true);
                  setSpecsError(null);
                }}
                className="text-sm text-amber-700 hover:text-amber-900 underline"
              >
                {cpo.coatingSpecs ? "Edit" : "Add Specs"}
              </button>
            )}
          </div>
          {specsError && <p className="text-sm text-red-600 mb-2">{specsError}</p>}
          {isEditingSpecs ? (
            <div className="space-y-3">
              <textarea
                value={specsDraft}
                onChange={(e) => setSpecsDraft(e.target.value)}
                rows={6}
                className="w-full border border-amber-300 rounded-md p-3 text-sm focus:ring-amber-500 focus:border-amber-500"
                placeholder={
                  "EXT: 1x Epoxy Primer 75\u00b5m DFT\nEXT: 1x Polyurethane Topcoat 125\u00b5m DFT\nINT: R/L 6mm Nitrile"
                }
              />
              <p className="text-xs text-amber-700">
                Saving will propagate these specs to all linked job cards.
              </p>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handleSaveCoatingSpecs}
                  disabled={isSavingSpecs}
                  className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 disabled:opacity-50"
                >
                  {isSavingSpecs ? "Saving..." : "Save & Propagate to JCs"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingSpecs(false)}
                  disabled={isSavingSpecs}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : cpo.coatingSpecs ? (
            <div className="space-y-1">
              {cpo.coatingSpecs.split("\n").map((line, idx) => {
                const isLabelled = /^(EXT|INT)\s*:/i.test(line);
                const label = isLabelled ? `${line.split(":")[0].trim()}:` : "\u2022";
                const content = isLabelled ? line.substring(line.indexOf(":") + 1).trim() : line;
                return (
                  <div key={idx} className="flex items-start space-x-2">
                    <span className="text-amber-600 font-mono text-xs mt-0.5">{label}</span>
                    <span className="text-sm text-gray-900">{content}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-amber-700 italic">
              No coating specs. Click &ldquo;Add Specs&rdquo; to enter specifications that will be
              propagated to all linked job cards.
            </p>
          )}
        </div>

        {overdueRecords.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
            <svg
              className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-red-800">
                Overdue Invoice{overdueRecords.length > 1 ? "s" : ""}
              </h3>
              <p className="text-sm text-red-700 mt-0.5">
                {overdueRecords.length} call-off{overdueRecords.length > 1 ? "s have" : " has"} been
                delivered for more than 21 days without an invoice.
              </p>
            </div>
          </div>
        )}

        {calloffRecords.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Call-Off Tracking</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      JC Number
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      JT Number
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Job Name
                    </th>
                    {hasRubberColumn && (
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rubber
                      </th>
                    )}
                    {hasPaintColumn && (
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Paint
                      </th>
                    )}
                    {hasSolutionColumn && (
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Solution
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {calloffRows.map((row) => {
                    const renderCell = (record: CpoCalloffRecord | null) => {
                      if (!record) {
                        return <span className="text-gray-300">—</span>;
                      }
                      const next = nextCalloffStatus(record.status);
                      const overdue = isCalloffOverdue(record);
                      const timestamp = [
                        record.calledOffAt
                          ? `Called off: ${formatDateZA(record.calledOffAt)}`
                          : null,
                        record.deliveredAt
                          ? `Delivered: ${formatDateZA(record.deliveredAt)}`
                          : null,
                        record.invoicedAt ? `Invoiced: ${formatDateZA(record.invoicedAt)}` : null,
                      ]
                        .filter(Boolean)
                        .join("\n");

                      if (!next) {
                        return (
                          <div className="flex items-center justify-center gap-1.5">
                            {overdue && (
                              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                            )}
                            <span
                              className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${calloffStatusColor(record.status)}`}
                              title={timestamp}
                            >
                              {calloffStatusLabel(record.status)}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div className="flex items-center justify-center gap-1.5">
                          {overdue && (
                            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                          )}
                          <button
                            onClick={() => handleCalloffAdvance(record)}
                            disabled={updatingRecordId === record.id}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded border cursor-pointer hover:shadow-sm disabled:opacity-50 transition-shadow ${calloffStatusColor(record.status)}`}
                            title={`${timestamp ? `${timestamp}\n` : ""}Click to advance to: ${calloffStatusLabel(next)}`}
                          >
                            {updatingRecordId === record.id ? (
                              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                  fill="none"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                />
                              </svg>
                            ) : (
                              <>
                                {calloffStatusLabel(record.status)}
                                <svg
                                  className="w-3 h-3 opacity-60"
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
                              </>
                            )}
                          </button>
                        </div>
                      );
                    };

                    return (
                      <tr
                        key={row.key}
                        className={row.hasOverdue ? "bg-red-50" : "hover:bg-gray-50"}
                      >
                        <td className="px-4 py-2 whitespace-nowrap">
                          {row.jobCard ? (
                            <Link
                              href={`/stock-control/portal/job-cards/${row.jobCard.id}`}
                              className="font-medium text-teal-700 hover:text-teal-900"
                            >
                              {row.jobCard.jobNumber}
                            </Link>
                          ) : (
                            <span className="text-gray-400">Unlinked</span>
                          )}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-gray-600">
                          {row.jobCard?.jtDnNumber || "—"}
                        </td>
                        <td className="px-4 py-2 text-gray-600 max-w-[220px] truncate">
                          {row.jobCard?.jobName || "—"}
                        </td>
                        {hasRubberColumn && (
                          <td className="px-4 py-2 text-center">{renderCell(row.rubber)}</td>
                        )}
                        {hasPaintColumn && (
                          <td className="px-4 py-2 text-center">{renderCell(row.paint)}</td>
                        )}
                        {hasSolutionColumn && (
                          <td className="px-4 py-2 text-center">{renderCell(row.solution)}</td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {deliveryHistory &&
          deliveryHistory.runningTotals.length > 0 &&
          deliveryHistory.deliveries.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  Delivery History ({deliveryHistory.deliveries.length} JT
                  {deliveryHistory.deliveries.length !== 1 ? "s" : ""})
                </h2>
              </div>
              <div
                ref={deliveryScrollRef}
                onMouseDown={handleDeliveryDragStart}
                className="overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing"
              >
                <table className="min-w-full divide-y divide-gray-200 select-none">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ordered
                      </th>
                      {deliveryHistory.deliveries.map((d) => (
                        <th
                          key={d.jobCardId}
                          className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          <Link
                            href={`/stock-control/portal/job-cards/${d.jobCardId}`}
                            className="text-teal-600 hover:text-teal-800"
                          >
                            {d.jtDnNumber || d.jobNumber}
                          </Link>
                          <div className="text-[10px] text-gray-400 font-normal normal-case">
                            {formatDateZA(d.importedAt)}
                          </div>
                        </th>
                      ))}
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Fulfilled
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Outstanding
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {deliveryHistory.runningTotals.map((rt, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm text-gray-900">
                          <span className="font-mono font-medium">{rt.itemCode || "-"}</span>
                          {rt.description && (
                            <span className="ml-2 text-gray-500 text-xs truncate max-w-[200px] inline-block align-bottom">
                              {rt.description}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-900 text-right font-medium">
                          {rt.ordered}
                        </td>
                        {deliveryHistory.deliveries.map((d) => {
                          const delivery = rt.deliveries.find((rd) => rd.jobCardId === d.jobCardId);
                          return (
                            <td key={d.jobCardId} className="px-4 py-3 text-sm text-right">
                              {delivery ? (
                                <span className="font-medium text-teal-700">
                                  {delivery.quantity}
                                </span>
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-6 py-3 text-sm text-right font-semibold text-gray-900">
                          {rt.fulfilled}
                        </td>
                        <td className="px-6 py-3 text-sm text-right font-semibold">
                          <span className={rt.remaining > 0 ? "text-amber-600" : "text-green-600"}>
                            {rt.remaining}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td className="px-6 py-3 text-sm font-semibold text-gray-900">Total</td>
                      <td className="px-6 py-3 text-sm text-right font-semibold text-gray-900">
                        {deliveryHistory.runningTotals.reduce((sum, rt) => sum + rt.ordered, 0)}
                      </td>
                      {deliveryHistory.deliveries.map((d) => (
                        <td
                          key={d.jobCardId}
                          className="px-4 py-3 text-sm text-right font-semibold text-teal-700"
                        >
                          {d.totalQuantity || "-"}
                        </td>
                      ))}
                      <td className="px-6 py-3 text-sm text-right font-semibold text-gray-900">
                        {deliveryHistory.runningTotals.reduce((sum, rt) => sum + rt.fulfilled, 0)}
                      </td>
                      <td className="px-6 py-3 text-sm text-right font-semibold">
                        {(() => {
                          const totalRemaining = deliveryHistory.runningTotals.reduce(
                            (sum, rt) => sum + rt.remaining,
                            0,
                          );
                          return (
                            <span
                              className={totalRemaining > 0 ? "text-amber-600" : "text-green-600"}
                            >
                              {totalRemaining}
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Line Items ({sortedItems.length})</h2>
            {cpo.status === "active" && !addingItem && editingItemId === null && (
              <button
                onClick={() => {
                  setAddDraft(blankDraft());
                  setAddingItem(true);
                  setItemError(null);
                }}
                className="px-3 py-1.5 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700"
              >
                + Add Line Item
              </button>
            )}
          </div>
          {itemError && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {itemError}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="hidden sm:table-cell px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item No
                  </th>
                  <th className="hidden sm:table-cell px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item Code
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="hidden md:table-cell px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    JT No
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ordered
                  </th>
                  <th className="px-3 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fulfilled
                  </th>
                  <th className="hidden md:table-cell px-3 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Remaining
                  </th>
                  <th className="hidden lg:table-cell px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="hidden lg:table-cell px-3 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    m2
                  </th>
                  {cpo.status === "active" && (
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedItems.length === 0 && !addingItem && (
                  <tr>
                    <td
                      colSpan={cpo.status === "active" ? 11 : 10}
                      className="px-6 py-6 text-center text-sm text-gray-500"
                    >
                      No line items
                    </td>
                  </tr>
                )}
                {sortedItems.map((item, idx) => {
                  const ordered = Number(item.quantityOrdered) || 0;
                  const fulfilled = Number(item.quantityFulfilled) || 0;
                  const remaining = Math.max(0, ordered - fulfilled);
                  const pct = itemFulfillmentPercent(ordered, fulfilled);
                  const isEditing = editingItemId === item.id;

                  if (isEditing) {
                    return (
                      <tr key={item.id} className="bg-teal-50">
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-400">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={editDraft.itemNo}
                            onChange={(e) =>
                              setEditDraft((d) => ({ ...d, itemNo: e.target.value }))
                            }
                            placeholder="Item No"
                            className="w-20 text-sm border border-gray-300 rounded px-2 py-1"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={editDraft.itemCode}
                            onChange={(e) =>
                              setEditDraft((d) => ({ ...d, itemCode: e.target.value }))
                            }
                            placeholder="Item code"
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1 font-mono"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={editDraft.itemDescription}
                            onChange={(e) =>
                              setEditDraft((d) => ({ ...d, itemDescription: e.target.value }))
                            }
                            placeholder="Description"
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={editDraft.jtNo}
                            onChange={(e) => setEditDraft((d) => ({ ...d, jtNo: e.target.value }))}
                            placeholder="JT No"
                            className="w-28 text-sm border border-gray-300 rounded px-2 py-1"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={editDraft.quantityOrdered}
                            onChange={(e) =>
                              setEditDraft((d) => ({ ...d, quantityOrdered: e.target.value }))
                            }
                            placeholder="0"
                            min="0"
                            step="any"
                            className="w-20 text-sm border border-gray-300 rounded px-2 py-1 text-right"
                          />
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                          {fulfilled}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right">
                          <span className={remaining > 0 ? "text-amber-600" : "text-green-600"}>
                            {remaining}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${pct >= 100 ? "bg-blue-500" : "bg-teal-500"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">{pct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={editDraft.m2}
                            onChange={(e) => setEditDraft((d) => ({ ...d, m2: e.target.value }))}
                            placeholder="m2"
                            min="0"
                            step="any"
                            className="w-20 text-sm border border-gray-300 rounded px-2 py-1 text-right"
                          />
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={handleSaveEdit}
                              disabled={updateCpoItemMutation.isPending}
                              className="px-2 py-1 text-xs font-medium text-white bg-teal-600 rounded hover:bg-teal-700 disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                        {cpo.status === "active" && (
                          <td className="px-6 py-3 whitespace-nowrap text-right">
                            <button
                              onClick={() => openEditItemModal(item)}
                              className="text-xs text-teal-600 hover:text-teal-800 font-medium"
                            >
                              Edit
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  }

                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-400">
                        {idx + 1}
                      </td>
                      <td className="hidden sm:table-cell px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {item.itemNo || "-"}
                      </td>
                      <td className="hidden sm:table-cell px-3 sm:px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900">
                        {item.itemCode || "-"}
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-sm text-gray-900 max-w-[120px] sm:max-w-xs truncate">
                        {item.itemDescription || "-"}
                      </td>
                      <td className="hidden md:table-cell px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {item.jtNo || "-"}
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        {ordered}
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        {fulfilled}
                      </td>
                      <td className="hidden md:table-cell px-3 sm:px-4 py-3 whitespace-nowrap text-sm font-medium text-right">
                        <span className={remaining > 0 ? "text-amber-600" : "text-green-600"}>
                          {remaining}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell px-3 sm:px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${pct >= 100 ? "bg-blue-500" : "bg-teal-500"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{pct}%</span>
                        </div>
                      </td>
                      <td className="hidden lg:table-cell px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                        {item.m2 != null ? Number(item.m2).toFixed(2) : "-"}
                      </td>
                      {cpo.status === "active" && (
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEditItem(item)}
                              disabled={editingItemId !== null || addingItem}
                              className="px-2 py-1 text-xs font-medium text-teal-700 bg-teal-50 rounded hover:bg-teal-100 disabled:opacity-40"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              disabled={
                                deleteCpoItemMutation.isPending ||
                                editingItemId !== null ||
                                addingItem
                              }
                              className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 disabled:opacity-40"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {addingItem && (
                  <tr className="bg-teal-50">
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-400">
                      {sortedItems.length + 1}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={addDraft.itemNo}
                        onChange={(e) => setAddDraft((d) => ({ ...d, itemNo: e.target.value }))}
                        placeholder="Item No"
                        className="w-20 text-sm border border-gray-300 rounded px-2 py-1"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={addDraft.itemCode}
                        onChange={(e) => setAddDraft((d) => ({ ...d, itemCode: e.target.value }))}
                        placeholder="Item code"
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1 font-mono"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={addDraft.itemDescription}
                        onChange={(e) =>
                          setAddDraft((d) => ({ ...d, itemDescription: e.target.value }))
                        }
                        placeholder="Description"
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={addDraft.jtNo}
                        onChange={(e) => setAddDraft((d) => ({ ...d, jtNo: e.target.value }))}
                        placeholder="JT No"
                        className="w-28 text-sm border border-gray-300 rounded px-2 py-1"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={addDraft.quantityOrdered}
                        onChange={(e) =>
                          setAddDraft((d) => ({ ...d, quantityOrdered: e.target.value }))
                        }
                        placeholder="0"
                        min="0"
                        step="any"
                        className="w-20 text-sm border border-gray-300 rounded px-2 py-1 text-right"
                      />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-400 text-right">
                      0
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-amber-600">
                      {addDraft.quantityOrdered ? parseFloat(addDraft.quantityOrdered) || 0 : 0}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className="text-xs text-gray-400">0%</span>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        value={addDraft.m2}
                        onChange={(e) => setAddDraft((d) => ({ ...d, m2: e.target.value }))}
                        placeholder="m2"
                        min="0"
                        step="any"
                        className="w-20 text-sm border border-gray-300 rounded px-2 py-1 text-right"
                      />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={handleAddItem}
                          disabled={addCpoItemMutation.isPending}
                          className="px-2 py-1 text-xs font-medium text-white bg-teal-600 rounded hover:bg-teal-700 disabled:opacity-50"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => {
                            setAddingItem(false);
                            setAddDraft(blankDraft());
                            setItemError(null);
                          }}
                          className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {itemModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingItem ? "Edit Line Item" : "Add Line Item"}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Item Code</label>
                  <input
                    type="text"
                    value={itemForm.itemCode}
                    onChange={(e) => setItemForm((f) => ({ ...f, itemCode: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={itemForm.itemDescription}
                    onChange={(e) =>
                      setItemForm((f) => ({ ...f, itemDescription: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Item No</label>
                    <input
                      type="text"
                      value={itemForm.itemNo}
                      onChange={(e) => setItemForm((f) => ({ ...f, itemNo: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">JT No</label>
                    <input
                      type="text"
                      value={itemForm.jtNo}
                      onChange={(e) => setItemForm((f) => ({ ...f, jtNo: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Quantity Ordered <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={itemForm.quantityOrdered}
                      onChange={(e) =>
                        setItemForm((f) => ({ ...f, quantityOrdered: e.target.value }))
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">m2</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={itemForm.m2}
                      onChange={(e) => setItemForm((f) => ({ ...f, m2: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
                {itemFormError && <p className="text-sm text-red-600">{itemFormError}</p>}
              </div>
              <div className="mt-5 flex justify-end gap-3">
                <button
                  onClick={() => setItemModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleItemFormSubmit}
                  disabled={addCpoItemMutation.isPending || updateCpoItemMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 disabled:opacity-50"
                >
                  {addCpoItemMutation.isPending || updateCpoItemMutation.isPending
                    ? "Saving..."
                    : editingItem
                      ? "Save Changes"
                      : "Add Item"}
                </button>
              </div>
            </div>
          </div>
        )}

        {cpo.previousVersions && cpo.previousVersions.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Previous Versions ({cpo.previousVersions.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {[...cpo.previousVersions].reverse().map((version, idx) => (
                <div key={idx} className="px-6 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-900">
                      Version {version.versionNumber}
                    </span>
                    <span className="text-xs text-gray-500">
                      Archived {formatDateZA(version.archivedAt)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    {version.totalItems} item{version.totalItems !== 1 ? "s" : ""}, total qty:{" "}
                    {version.totalQuantity}
                    {version.customerName ? ` | ${version.customerName}` : ""}
                    {version.poNumber ? ` | PO: ${version.poNumber}` : ""}
                  </div>
                  {version.items.length > 0 && (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-500">
                          <th className="text-left py-1 font-medium">Item Code</th>
                          <th className="text-left py-1 font-medium">Description</th>
                          <th className="text-right py-1 font-medium">Ordered</th>
                          <th className="text-right py-1 font-medium">Fulfilled</th>
                        </tr>
                      </thead>
                      <tbody>
                        {version.items.map((item, itemIdx) => (
                          <tr key={itemIdx} className="text-gray-600">
                            <td className="py-0.5 font-mono">{item.itemCode || "-"}</td>
                            <td className="py-0.5 max-w-xs truncate">
                              {item.itemDescription || "-"}
                            </td>
                            <td className="py-0.5 text-right">{item.quantityOrdered}</td>
                            <td className="py-0.5 text-right">{item.quantityFulfilled}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {sageError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-red-800">Import Error</h3>
                <p className="text-sm text-red-700 mt-1">{sageError}</p>
              </div>
              <button
                onClick={() => setSageError(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {sageImportResult && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5"
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
              <div className="flex-1">
                <h3 className="text-sm font-medium text-green-800">
                  Sage JC Dump Imported Successfully
                </h3>
                {sageImportResult.totalCreated > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-green-700">
                      Created {sageImportResult.totalCreated} job card
                      {sageImportResult.totalCreated === 1 ? "" : "s"}:
                    </p>
                    <ul className="text-sm text-green-700 ml-4 list-disc">
                      {sageImportResult.createdJobCards.map((jc) => (
                        <li key={jc.id}>
                          <Link
                            href={`/stock-control/portal/job-cards/${jc.id}`}
                            className="text-green-800 underline hover:text-green-900"
                          >
                            {jc.jtNumber}
                          </Link>{" "}
                          ({jc.itemCount} item{jc.itemCount === 1 ? "" : "s"})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {sageImportResult.skippedJtNumbers.length > 0 && (
                  <p className="text-sm text-green-600 mt-2">
                    Skipped {sageImportResult.skippedJtNumbers.length} already-imported JT
                    {sageImportResult.skippedJtNumbers.length === 1 ? "" : "s"}:{" "}
                    {sageImportResult.skippedJtNumbers.join(", ")}
                  </p>
                )}
                {sageImportResult.totalCreated === 0 &&
                  sageImportResult.skippedJtNumbers.length === 0 && (
                    <p className="text-sm text-green-700 mt-1">
                      No new job cards to create from this dump.
                    </p>
                  )}
              </div>
              <button
                onClick={() => setSageImportResult(null)}
                className="ml-auto text-green-400 hover:text-green-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {sageParseResult && !showAllocationModal && !sageImportResult && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-amber-800 mb-2">Sage JC Dump Parsed</h3>
            <div className="text-sm text-amber-700 space-y-1">
              <p>
                New JT groups: {Object.keys(sageParseResult.jtGroups).length} (
                {Object.keys(sageParseResult.jtGroups).join(", ") || "none"})
              </p>
              {sageParseResult.skippedJtNumbers.length > 0 && (
                <p>Skipped (already imported): {sageParseResult.skippedJtNumbers.join(", ")}</p>
              )}
              <p>Undelivered items: {sageParseResult.undeliveredItems.length}</p>
              {sageParseResult.asteriskItems.length > 0 && (
                <p>Items needing allocation: {sageParseResult.asteriskItems.length}</p>
              )}
            </div>
            {sageConfirming && (
              <div className="mt-3 flex items-center gap-2 text-sm text-amber-800">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Creating job cards...
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-gray-400">
          Created {formatDateZA(cpo.createdAt)}
          {cpo.createdBy && ` by ${cpo.createdBy}`}
          {cpo.sourceFileName && ` from ${cpo.sourceFileName}`}
        </div>
      </div>

      {sageParseResult && (
        <AsteriskAllocationModal
          isOpen={showAllocationModal}
          onClose={() => setShowAllocationModal(false)}
          onConfirm={handleAllocationConfirm}
          asteriskItems={sageParseResult.asteriskItems}
          autoJtCount={Object.keys(sageParseResult.jtGroups).length}
          autoJtNumbers={Object.keys(sageParseResult.jtGroups)}
          submitting={sageConfirming}
        />
      )}
    </div>
  );
}
