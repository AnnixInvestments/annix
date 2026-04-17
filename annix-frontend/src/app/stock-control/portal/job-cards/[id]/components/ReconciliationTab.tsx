"use client";

import {
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ReconciliationDocCategory,
  ReconciliationDocumentRecord,
  ReconciliationEventType,
  ReconciliationItemRecord,
  ReconciliationSummary,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateLongZA } from "@/app/lib/datetime";

interface ReconciliationTabProps {
  jobCardId: number;
}

const CATEGORY_LABELS: Record<ReconciliationDocCategory, string> = {
  jt_dn: "JT / DN",
  sales_order: "Sales Order",
  cpo: "Customer PO",
  drawing: "Drawing",
  polymer_dn: "Polymer DN",
  mps_dn: "MPS DN",
};

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-gray-100 text-gray-700" },
  partial: { label: "Partial", className: "bg-amber-100 text-amber-700" },
  complete: { label: "Complete", className: "bg-green-100 text-green-700" },
  discrepancy: { label: "Discrepancy", className: "bg-red-100 text-red-700" },
};

const EVENT_TYPE_LABELS: Record<ReconciliationEventType, string> = {
  qa_release: "QA Release",
  polymer_dn: "Polymer DN",
  mps_dn: "MPS DN",
  manual_adjustment: "Manual",
};

type RecordModal = "polymer_dn" | "mps_dn" | null;

export function ReconciliationTab(props: ReconciliationTabProps) {
  const [documents, setDocuments] = useState<ReconciliationDocumentRecord[]>([]);
  const [items, setItems] = useState<ReconciliationItemRecord[]>([]);
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);
  const [addingItem, setAddingItem] = useState(false);
  const [newItem, setNewItem] = useState({
    itemDescription: "",
    itemCode: "",
    quantityOrdered: "",
  });
  const [recordModal, setRecordModal] = useState<RecordModal>(null);
  const [recordRef, setRecordRef] = useState("");
  const [recordEntries, setRecordEntries] = useState<Record<number, string>>({});
  const [recordNotes, setRecordNotes] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [viewingUrl, setViewingUrl] = useState<string | null>(null);
  const [uploadingCategory, setUploadingCategory] = useState<ReconciliationDocCategory | null>(
    null,
  );
  const uploadRef = useRef<HTMLInputElement | null>(null);
  const pendingCategory = useRef<ReconciliationDocCategory | null>(null);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const [docs, reconItems, reconSummary] = await Promise.all([
        stockControlApiClient.reconciliationDocuments(props.jobCardId),
        stockControlApiClient.reconciliationItems(props.jobCardId),
        stockControlApiClient.reconciliationSummary(props.jobCardId),
      ]);
      setDocuments(docs);
      setItems(reconItems);
      setSummary(reconSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reconciliation data");
    } finally {
      setIsLoading(false);
    }
  }, [props.jobCardId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleAddItem = async () => {
    try {
      const itemCode = newItem.itemCode;
      setError(null);
      await stockControlApiClient.addReconciliationItem(props.jobCardId, {
        itemDescription: newItem.itemDescription,
        itemCode: itemCode || null,
        quantityOrdered: Number(newItem.quantityOrdered) || 0,
      });
      setNewItem({ itemDescription: "", itemCode: "", quantityOrdered: "" });
      setAddingItem(false);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add item");
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    try {
      await stockControlApiClient.deleteReconciliationItem(props.jobCardId, itemId);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item");
    }
  };

  const handleRecordSubmit = async () => {
    if (!recordModal) return;
    try {
      setIsRecording(true);
      const eventType: ReconciliationEventType = recordModal;
      const eventItems = Object.entries(recordEntries)
        .filter(([_, qty]) => Number(qty) > 0)
        .map(([id, qty]) => ({
          reconciliationItemId: Number(id),
          quantity: Number(qty),
        }));

      if (eventItems.length === 0) {
        setError("Enter quantities for at least one item");
        return;
      }

      await stockControlApiClient.recordReconciliationEvent(props.jobCardId, {
        eventType,
        items: eventItems,
        referenceNumber: recordRef || null,
        notes: recordNotes || null,
      });

      setRecordModal(null);
      setRecordRef("");
      setRecordEntries({});
      setRecordNotes("");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record event");
    } finally {
      setIsRecording(false);
    }
  };

  const handleViewDoc = async (docId: number) => {
    try {
      const { url } = await stockControlApiClient.reconciliationDocumentViewUrl(
        props.jobCardId,
        docId,
      );
      setViewingUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load document");
    }
  };

  const handleUploadAdditionalDoc = (category: ReconciliationDocCategory) => {
    pendingCategory.current = category;
    uploadRef.current?.click();
  };

  const handleFileSelected = async (file: File) => {
    const category = pendingCategory.current;
    if (!category) return;
    try {
      setUploadingCategory(category);
      await stockControlApiClient.uploadReconciliationDocument(props.jobCardId, file, category);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingCategory(null);
      pendingCategory.current = null;
    }
  };

  const handleDeleteDoc = async (docId: number) => {
    try {
      await stockControlApiClient.deleteReconciliationDocument(props.jobCardId, docId);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  if (isLoading && items.length === 0) {
    return <div className="py-8 text-center text-sm text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-5">
      <input
        ref={uploadRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleFileSelected(file);
            e.target.value = "";
          }
        }}
      />

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: "Ordered", value: summary.totalOrdered, color: "text-gray-900" },
            { label: "QA Released", value: summary.totalReleased, color: "text-blue-700" },
            { label: "Shipped", value: summary.totalShipped, color: "text-green-700" },
            { label: "MPS", value: summary.totalMps, color: "text-purple-700" },
            {
              label: "Discrepancies",
              value: summary.discrepancy,
              color: summary.discrepancy > 0 ? "text-red-700" : "text-gray-400",
            },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-gray-200 bg-white p-3">
              <div className={`text-lg font-semibold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-900">
            Documents
            {documents.length > 0 && (
              <span className="ml-2 text-xs font-normal text-gray-500">({documents.length})</span>
            )}
          </h3>
          <div className="flex gap-1">
            {(["polymer_dn", "mps_dn"] as ReconciliationDocCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => handleUploadAdditionalDoc(cat)}
                disabled={uploadingCategory === cat}
                className="rounded-md bg-teal-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {uploadingCategory === cat ? (
                  <Loader2 className="inline h-3 w-3 animate-spin" />
                ) : (
                  <Upload className="mr-1 inline h-3 w-3" />
                )}
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>
        {documents.length === 0 ? (
          <div className="px-5 py-4 text-center text-xs text-gray-400">
            No documents uploaded yet
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between px-5 py-2.5">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {CATEGORY_LABELS[doc.documentCategory] || doc.documentCategory}
                  </span>
                  <span className="max-w-[200px] truncate text-xs text-gray-600">
                    {doc.originalFilename}
                  </span>
                  {doc.extractionStatus === "completed" && doc.extractedItems && (
                    <span className="text-xs text-green-600">
                      {doc.extractedItems.length} items extracted
                    </span>
                  )}
                  {doc.extractionStatus === "processing" && (
                    <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                  )}
                  {doc.extractionStatus === "failed" && (
                    <button
                      onClick={() =>
                        stockControlApiClient
                          .retryReconciliationExtraction(props.jobCardId, doc.id)
                          .then(() => setTimeout(refresh, 2000))
                      }
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      <RefreshCw className="inline h-3 w-3" /> Retry
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleViewDoc(doc.id)}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    title="View"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <a
                    href={stockControlApiClient.reconciliationDocumentDownloadUrl(
                      props.jobCardId,
                      doc.id,
                    )}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    title="Download"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => handleDeleteDoc(doc.id)}
                    className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                    title="Delete"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-900">
            Item Tracking
            {items.length > 0 && (
              <span className="ml-2 text-xs font-normal text-gray-500">({items.length})</span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRecordModal("polymer_dn")}
              disabled={items.length === 0}
              className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Record Polymer DN
            </button>
            <button
              onClick={() => setRecordModal("mps_dn")}
              disabled={items.length === 0}
              className="rounded-md bg-purple-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              Record MPS DN
            </button>
            <button
              onClick={() => setAddingItem(true)}
              className="rounded-md bg-teal-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-teal-700"
            >
              <Plus className="mr-0.5 inline h-3 w-3" /> Add Item
            </button>
          </div>
        </div>

        {addingItem && (
          <div className="border-b border-gray-200 bg-gray-50 px-5 py-3">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-gray-600">Description</label>
                <input
                  value={newItem.itemDescription}
                  onChange={(e) => setNewItem({ ...newItem, itemDescription: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-xs"
                  placeholder="Item description"
                />
              </div>
              <div className="w-28">
                <label className="mb-1 block text-xs font-medium text-gray-600">Code</label>
                <input
                  value={newItem.itemCode}
                  onChange={(e) => setNewItem({ ...newItem, itemCode: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-xs"
                  placeholder="Optional"
                />
              </div>
              <div className="w-20">
                <label className="mb-1 block text-xs font-medium text-gray-600">Qty</label>
                <input
                  type="number"
                  value={newItem.quantityOrdered}
                  onChange={(e) => setNewItem({ ...newItem, quantityOrdered: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-xs"
                />
              </div>
              <button
                onClick={handleAddItem}
                disabled={!newItem.itemDescription || !newItem.quantityOrdered}
                className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => setAddingItem(false)}
                className="rounded-md bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="px-5 py-6 text-center text-xs text-gray-400">
            No items tracked yet. Items will be auto-extracted from uploaded documents.
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="w-6 px-2 py-2" />
                <th className="px-3 py-2 text-left font-medium text-gray-500">Item</th>
                <th className="px-3 py-2 text-left font-medium text-gray-500">Code</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500">Ordered</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500">Released</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500">Shipped</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500">MPS</th>
                <th className="px-3 py-2 text-center font-medium text-gray-500">Status</th>
                <th className="w-8 px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => {
                const itemCode = item.itemCode;
                const isExpanded = expandedItemId === item.id;
                const STATUS_BADGESReconciliationStatus = STATUS_BADGES[item.reconciliationStatus];
                const badge = STATUS_BADGESReconciliationStatus || STATUS_BADGES.pending;
                return (
                  <>
                    <tr
                      key={item.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                    >
                      <td className="px-2 py-2 text-center text-gray-400">
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-900">{item.itemDescription}</td>
                      <td className="px-3 py-2 text-gray-500">{itemCode || "-"}</td>
                      <td className="px-3 py-2 text-right font-medium">{item.quantityOrdered}</td>
                      <td className="px-3 py-2 text-right text-blue-700">
                        {item.quantityReleased}
                      </td>
                      <td className="px-3 py-2 text-right text-green-700">
                        {item.quantityShipped}
                      </td>
                      <td className="px-3 py-2 text-right text-purple-700">{item.quantityMps}</td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteItem(item.id);
                          }}
                          className="text-red-400 hover:text-red-600"
                          title="Delete"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                    {isExpanded && item.events.length > 0 && (
                      <tr key={`${item.id}-events`}>
                        <td colSpan={9} className="bg-gray-50 px-8 py-2">
                          <div className="text-xs text-gray-500">
                            {item.events.map((event) => (
                              <div key={event.id} className="flex items-center gap-3 py-1">
                                <span className="font-medium">
                                  {EVENT_TYPE_LABELS[event.eventType]}
                                </span>
                                <span>Qty: {event.quantity}</span>
                                {event.referenceNumber && <span>Ref: {event.referenceNumber}</span>}
                                <span className="text-gray-400">
                                  by {event.performedByName} on {formatDateLongZA(event.createdAt)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                    {isExpanded && item.events.length === 0 && (
                      <tr key={`${item.id}-empty`}>
                        <td colSpan={9} className="bg-gray-50 px-8 py-2 text-xs text-gray-400">
                          No events recorded yet
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {recordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Record {recordModal === "polymer_dn" ? "Polymer DN" : "MPS DN"}
              </h3>
              <button onClick={() => setRecordModal(null)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                DN Reference Number
              </label>
              <input
                value={recordRef}
                onChange={(e) => setRecordRef(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                placeholder="e.g. DN-1234"
              />
            </div>

            <div className="mb-3 max-h-60 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="px-2 py-1.5 text-left font-medium text-gray-500">Item</th>
                    <th className="w-20 px-2 py-1.5 text-right font-medium text-gray-500">
                      Ordered
                    </th>
                    <th className="w-24 px-2 py-1.5 text-right font-medium text-gray-500">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-2 py-1.5">{item.itemDescription}</td>
                      <td className="px-2 py-1.5 text-right text-gray-500">
                        {item.quantityOrdered}
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          min="0"
                          value={recordEntries[item.id] || ""}
                          onChange={(e) =>
                            setRecordEntries({ ...recordEntries, [item.id]: e.target.value })
                          }
                          className="w-full rounded border border-gray-300 px-2 py-1 text-right text-xs"
                          placeholder="0"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-gray-600">Notes</label>
              <textarea
                value={recordNotes}
                onChange={(e) => setRecordNotes(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                rows={2}
                placeholder="Optional notes"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRecordModal(null)}
                className="rounded-md bg-gray-200 px-4 py-1.5 text-xs font-medium text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordSubmit}
                disabled={isRecording}
                className="rounded-md bg-teal-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {isRecording ? "Recording..." : "Record"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-md">
          <div className="relative h-[90vh] w-[90vw] max-w-5xl rounded-lg bg-white shadow-xl">
            <button
              onClick={() => setViewingUrl(null)}
              className="absolute right-3 top-3 z-10 rounded-full bg-gray-100 p-1.5 hover:bg-gray-200"
            >
              <X className="h-5 w-5" />
            </button>
            <iframe src={viewingUrl} className="h-full w-full rounded-lg" title="Document Viewer" />
          </div>
        </div>
      )}
    </div>
  );
}
