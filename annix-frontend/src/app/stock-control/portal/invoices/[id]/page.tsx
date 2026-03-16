"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import type {
  DeliveryNote,
  InvoiceClarification,
  PriceChangeSummary,
  StockItem,
  SuggestedDeliveryNote,
  SupplierInvoice,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";
import { InvoiceNextAction } from "@/app/stock-control/components/NextActionBanner";
import InvoiceClarificationPopup from "./InvoiceClarificationPopup";
import PriceUpdateReview from "./PriceUpdateReview";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800",
  processing: "bg-blue-100 text-blue-800",
  needs_clarification: "bg-yellow-100 text-yellow-800",
  awaiting_approval: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  needs_clarification: "Needs Clarification",
  awaiting_approval: "Awaiting Approval",
  completed: "Completed",
  failed: "Failed",
};

const MATCH_STATUS_COLORS: Record<string, string> = {
  matched: "bg-green-100 text-green-800",
  unmatched: "bg-red-100 text-red-800",
  clarification_needed: "bg-yellow-100 text-yellow-800",
  manually_matched: "bg-blue-100 text-blue-800",
  new_item_created: "bg-purple-100 text-purple-800",
};

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useStockControlAuth();
  const invoiceId = Number(params.id);

  const [invoice, setInvoice] = useState<SupplierInvoice | null>(null);
  const [clarifications, setClarifications] = useState<InvoiceClarification[]>([]);
  const [priceSummary, setPriceSummary] = useState<PriceChangeSummary | null>(null);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [suggestedDeliveryNotes, setSuggestedDeliveryNotes] = useState<SuggestedDeliveryNote[]>([]);
  const [allDeliveryNotes, setAllDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [selectedDeliveryNoteId, setSelectedDeliveryNoteId] = useState<number | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [currentClarificationIndex, setCurrentClarificationIndex] = useState(0);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isReExtracting, setIsReExtracting] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{
    quantity: string;
    unitPrice: string;
    unitType: string;
  }>({ quantity: "", unitPrice: "", unitType: "" });
  const [isSavingItem, setIsSavingItem] = useState(false);

  const fetchInvoice = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await stockControlApiClient.supplierInvoiceById(invoiceId);
      setInvoice(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load invoice"));
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId]);

  const fetchClarifications = useCallback(async () => {
    try {
      const data = await stockControlApiClient.invoiceClarifications(invoiceId);
      setClarifications(data);
      setCurrentClarificationIndex(0);
    } catch (err) {
      console.error("Failed to load clarifications:", err);
    }
  }, [invoiceId]);

  const fetchPriceSummary = useCallback(async () => {
    try {
      const data = await stockControlApiClient.invoicePriceSummary(invoiceId);
      setPriceSummary(data);
    } catch (err) {
      console.error("Failed to load price summary:", err);
    }
  }, [invoiceId]);

  const fetchStockItems = useCallback(async () => {
    try {
      const result = await stockControlApiClient.stockItems({ limit: "1000" });
      setStockItems(result.items);
    } catch (err) {
      console.error("Failed to load stock items:", err);
    }
  }, []);

  const fetchSuggestedDeliveryNotes = useCallback(async () => {
    try {
      const data = await stockControlApiClient.suggestedDeliveryNotes(invoiceId);
      setSuggestedDeliveryNotes(data);
    } catch (err) {
      console.error("Failed to load suggested delivery notes:", err);
    }
  }, [invoiceId]);

  const fetchAllDeliveryNotes = useCallback(async () => {
    try {
      const data = await stockControlApiClient.deliveryNotes();
      setAllDeliveryNotes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load delivery notes:", err);
    }
  }, []);

  const handleLinkDeliveryNote = async (deliveryNoteId?: number) => {
    const idToLink = deliveryNoteId || selectedDeliveryNoteId;
    if (!idToLink) return;
    try {
      setIsLinking(true);
      setLinkError(null);
      setSelectedDeliveryNoteId(idToLink);
      await stockControlApiClient.linkInvoiceToDeliveryNote(invoiceId, idToLink);
      await fetchInvoice();
      setSelectedDeliveryNoteId(null);
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : "Failed to link delivery note");
    } finally {
      setIsLinking(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
    fetchClarifications();
    fetchPriceSummary();
    fetchStockItems();
    fetchSuggestedDeliveryNotes();
    fetchAllDeliveryNotes();
  }, [
    fetchInvoice,
    fetchClarifications,
    fetchPriceSummary,
    fetchStockItems,
    fetchSuggestedDeliveryNotes,
    fetchAllDeliveryNotes,
  ]);

  const handleClarificationSubmit = async (
    clarificationId: number,
    response: {
      selectedStockItemId?: number;
      createNewItem?: {
        sku: string;
        name: string;
        description?: string;
        category?: string;
        unitOfMeasure?: string;
      };
      skipPriceUpdate?: boolean;
      confirmed?: boolean;
    },
  ) => {
    try {
      await stockControlApiClient.submitInvoiceClarification(invoiceId, clarificationId, response);
      await fetchClarifications();
      await fetchInvoice();
      await fetchPriceSummary();

      if (currentClarificationIndex < clarifications.length - 1) {
        setCurrentClarificationIndex((prev) => prev + 1);
      }
    } catch (err) {
      console.error("Failed to submit clarification:", err);
    }
  };

  const handleClarificationSkip = async (clarificationId: number) => {
    try {
      await stockControlApiClient.skipInvoiceClarification(invoiceId, clarificationId);
      await fetchClarifications();
      await fetchInvoice();

      if (currentClarificationIndex < clarifications.length - 1) {
        setCurrentClarificationIndex((prev) => prev + 1);
      }
    } catch (err) {
      console.error("Failed to skip clarification:", err);
    }
  };

  const handleReExtract = async () => {
    try {
      setIsReExtracting(true);
      await stockControlApiClient.reExtractInvoice(invoiceId);
      await fetchInvoice();
      await fetchClarifications();
      await fetchPriceSummary();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Re-extraction failed"));
    } finally {
      setIsReExtracting(false);
    }
  };

  const handleApprove = async () => {
    try {
      setIsApproving(true);
      await stockControlApiClient.approveInvoice(invoiceId);
      await fetchInvoice();
      setShowApprovalModal(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to approve invoice"));
    } finally {
      setIsApproving(false);
    }
  };

  const startEditing = (item: import("@/app/lib/api/stockControlApi").SupplierInvoiceItem) => {
    const uType = item["unitType"];
    const sItem = item["stockItem"];
    setEditingItemId(item.id);
    setEditValues({
      quantity: String(item.quantity),
      unitPrice: item.unitPrice !== null ? String(item.unitPrice) : "",
      unitType: uType || sItem?.unitOfMeasure || "each",
    });
  };

  const cancelEditing = () => {
    setEditingItemId(null);
  };

  const saveItemEdit = async (itemId: number) => {
    setIsSavingItem(true);
    try {
      await stockControlApiClient.updateInvoiceItem(invoiceId, itemId, {
        quantity: Number(editValues.quantity),
        unitPrice: Number(editValues.unitPrice),
        unitType: editValues.unitType,
      });
      setEditingItemId(null);
      await fetchInvoice();
      await fetchPriceSummary();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to update item"));
    } finally {
      setIsSavingItem(false);
    }
  };

  const canEdit = user?.role === "accounts" || user?.role === "admin" || user?.role === "manager";
  const canAdjustPrice =
    user?.role === "accounts" || user?.role === "admin" || user?.role === "manager";

  const handleAdjustPrice = async (itemId: number, newPrice: number) => {
    await stockControlApiClient.updateInvoiceItem(invoiceId, itemId, {
      unitPrice: newPrice,
    });
    await fetchInvoice();
    await fetchPriceSummary();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Invoice</div>
          <p className="text-gray-600">{error?.message || "Invoice not found"}</p>
          <Link
            href="/stock-control/portal/invoices"
            className="mt-4 inline-block text-teal-600 hover:text-teal-800"
          >
            Back to Invoices
          </Link>
        </div>
      </div>
    );
  }

  const currentClarification = clarifications[currentClarificationIndex];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/stock-control/portal/invoices" className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{invoice.invoiceNumber}</h1>
            <p className="mt-1 text-sm text-gray-600">{invoice.supplierName}</p>
          </div>
        </div>
        <span
          className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${STATUS_COLORS[invoice.extractionStatus] || "bg-gray-100 text-gray-800"}`}
        >
          {STATUS_LABELS[invoice.extractionStatus] || invoice.extractionStatus}
        </span>
      </div>

      <InvoiceNextAction
        extractionStatus={invoice.extractionStatus}
        pendingClarificationCount={clarifications.filter((c) => c.status === "pending").length}
        hasPriceChanges={priceSummary !== null && priceSummary.items.length > 0}
        userRole={user?.role || null}
        onApprove={() => setShowApprovalModal(true)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Invoice Details</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Invoice Number</dt>
                <dd className="mt-1 text-sm text-gray-900">{invoice.invoiceNumber}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Supplier</dt>
                <dd className="mt-1 text-sm text-gray-900">{invoice.supplierName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Invoice Date</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {invoice.invoiceDate ? formatDateZA(invoice.invoiceDate) : "-"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {invoice.totalAmount
                    ? `R${Number(invoice.totalAmount).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`
                    : "-"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">VAT Amount</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {invoice.vatAmount
                    ? `R${Number(invoice.vatAmount).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`
                    : "-"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Delivery Note
                  {invoice.linkedDeliveryNoteIds && invoice.linkedDeliveryNoteIds.length > 1
                    ? "s"
                    : ""}
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {invoice.deliveryNoteId ? (
                    <div className="space-y-1">
                      <Link
                        href={`/stock-control/portal/deliveries/${invoice.deliveryNoteId}`}
                        className="text-teal-600 hover:text-teal-800"
                      >
                        {invoice.deliveryNote?.deliveryNumber || `DN-${invoice.deliveryNoteId}`}
                      </Link>
                      {invoice.linkedDeliveryNoteIds
                        ?.filter((dnId) => dnId !== invoice.deliveryNoteId)
                        .map((dnId) => (
                          <div key={dnId}>
                            <Link
                              href={`/stock-control/portal/deliveries/${dnId}`}
                              className="text-teal-600 hover:text-teal-800"
                            >
                              DN-{dnId}
                            </Link>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800">
                      Unlinked
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-white shadow rounded-lg overflow-x-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Line Items</h2>
              {canEdit && <span className="text-xs text-gray-400">Click a row to edit</span>}
            </div>
            {invoice.items && invoice.items.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Matched Item
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoice.items.map((item) => {
                    const isEditing = editingItemId === item.id;
                    const itemUnitType = item.unitType;
                    const itemDiscountPercent = item.discountPercent;
                    const itemStockItem = item.stockItem;

                    return (
                      <tr
                        key={item.id}
                        className={`${canEdit && !isEditing ? "cursor-pointer hover:bg-gray-50" : ""} ${isEditing ? "bg-teal-50" : ""}`}
                        onClick={() => {
                          if (canEdit && !isEditing && !editingItemId) startEditing(item);
                        }}
                      >
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.lineNumber}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          <div>{item.extractedDescription}</div>
                          {item.extractedSku && (
                            <div className="text-xs text-gray-500">SKU: {item.extractedSku}</div>
                          )}
                          {(item.isPartA || item.isPartB) && (
                            <span
                              className={`inline-flex mt-1 px-2 py-0.5 text-xs rounded-full ${item.isPartA ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800"}`}
                            >
                              {item.isPartA ? "Part A" : "Part B"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editValues.quantity}
                              onChange={(e) =>
                                setEditValues((prev) => ({ ...prev, quantity: e.target.value }))
                              }
                              onClick={(e) => e.stopPropagation()}
                              className="w-16 px-2 py-1 text-sm border border-teal-300 rounded text-right focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                              min={0}
                            />
                          ) : (
                            item.quantity
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {isEditing ? (
                            <select
                              value={editValues.unitType}
                              onChange={(e) =>
                                setEditValues((prev) => ({ ...prev, unitType: e.target.value }))
                              }
                              onClick={(e) => e.stopPropagation()}
                              className="w-20 px-1 py-1 text-sm border border-teal-300 rounded focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                            >
                              {[
                                "each",
                                "ltr",
                                "kg",
                                "roll",
                                "m",
                                "m2",
                                "pack",
                                "set",
                                "pair",
                                "box",
                                "drum",
                                "pail",
                                "can",
                                "tin",
                                "bag",
                                "sheet",
                                "length",
                                "bundle",
                              ].map((u) => (
                                <option key={u} value={u}>
                                  {u}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-gray-400 text-xs">
                              {itemUnitType || itemStockItem?.unitOfMeasure || "-"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editValues.unitPrice}
                              onChange={(e) =>
                                setEditValues((prev) => ({ ...prev, unitPrice: e.target.value }))
                              }
                              onClick={(e) => e.stopPropagation()}
                              className="w-24 px-2 py-1 text-sm border border-teal-300 rounded text-right focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                              min={0}
                              step="0.01"
                            />
                          ) : (
                            <>
                              {item.unitPrice
                                ? `R${Number(item.unitPrice).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`
                                : "-"}
                              {Number(itemDiscountPercent) > 0 && (
                                <div className="text-xs text-green-600 font-medium">
                                  {itemDiscountPercent}% disc.
                                </div>
                              )}
                            </>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {itemStockItem ? (
                            <div>
                              <div>{itemStockItem.name}</div>
                              <div className="text-xs text-gray-500">{itemStockItem.sku}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {isEditing ? (
                            <div
                              className="flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => saveItemEdit(item.id)}
                                disabled={isSavingItem}
                                className="px-2 py-1 text-xs font-medium text-white bg-teal-600 rounded hover:bg-teal-700 disabled:opacity-50"
                              >
                                {isSavingItem ? "..." : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditing}
                                className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${MATCH_STATUS_COLORS[item.matchStatus] || "bg-gray-100 text-gray-800"}`}
                            >
                              {item.matchStatus.replace(/_/g, " ")}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">No line items extracted yet</div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {!invoice.deliveryNoteId && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-amber-800 mb-3">Link to Delivery Note</h3>
              <p className="text-xs text-amber-600 mb-4">
                This invoice is not linked to a delivery note. Link it to match stock deliveries.
              </p>

              {linkError && (
                <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-xs text-red-600">{linkError}</p>
                </div>
              )}

              {isLinking && (
                <div className="mb-3 flex items-center justify-center py-2">
                  <svg
                    className="animate-spin h-5 w-5 text-teal-600 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span className="text-sm text-teal-700">Linking delivery note...</span>
                </div>
              )}

              {suggestedDeliveryNotes.length > 0 && !isLinking && (
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-gray-700 mb-2">Suggested Matches</h4>
                  <div className="space-y-2">
                    {suggestedDeliveryNotes.map((dn) => (
                      <button
                        key={dn.id}
                        type="button"
                        onClick={() => handleLinkDeliveryNote(dn.id)}
                        disabled={isLinking}
                        className="w-full text-left p-2 rounded border text-xs border-gray-200 hover:border-teal-500 hover:bg-teal-50 transition-colors disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{dn.deliveryNumber}</div>
                            <div className="text-gray-500">{dn.supplierName}</div>
                            <div className="text-gray-400 text-[10px]">{dn.matchReason}</div>
                          </div>
                          <svg
                            className="w-4 h-4 text-teal-600 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                            />
                          </svg>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!isLinking && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {suggestedDeliveryNotes.length > 0
                      ? "Or select from all delivery notes:"
                      : "Select delivery note:"}
                  </label>
                  <select
                    value=""
                    onChange={(e) => {
                      const dnId = parseInt(e.target.value, 10);
                      if (dnId) {
                        handleLinkDeliveryNote(dnId);
                      }
                    }}
                    disabled={isLinking}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-sm"
                  >
                    <option value="">Select delivery note...</option>
                    {allDeliveryNotes.map((dn) => (
                      <option key={dn.id} value={dn.id}>
                        {dn.deliveryNumber} - {dn.supplierName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {invoice.scanUrl && (
            <div className="bg-white shadow rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Invoice Scan</h3>
              <a href={invoice.scanUrl} target="_blank" rel="noopener noreferrer">
                <img
                  src={invoice.scanUrl}
                  alt="Invoice scan"
                  className="w-full rounded-lg border border-gray-200 hover:opacity-80 transition-opacity"
                />
              </a>
              {invoice.extractionStatus === "failed" && invoice.extractedData?.rawText ? (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-xs font-medium text-red-800">Extraction Error</p>
                  <p className="text-xs text-red-600 mt-1 break-words">
                    {String(invoice.extractedData.rawText)}
                  </p>
                </div>
              ) : null}
              {(invoice.extractionStatus === "pending" ||
                invoice.extractionStatus === "failed") && (
                <button
                  onClick={handleReExtract}
                  disabled={isReExtracting}
                  className="mt-3 w-full px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 disabled:bg-gray-400"
                >
                  {isReExtracting ? "Extracting..." : "Re-extract Invoice Data"}
                </button>
              )}
            </div>
          )}

          {invoice.extractionStatus === "awaiting_approval" && priceSummary && (
            <div className="bg-white shadow rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Price Updates</h3>
              <PriceUpdateReview
                priceSummary={priceSummary}
                onApprove={() => setShowApprovalModal(true)}
                canAdjustPrice={canAdjustPrice}
                onAdjustPrice={handleAdjustPrice}
              />
            </div>
          )}

          {invoice.extractionStatus === "completed" && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 text-green-500 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-green-800">Invoice Processed</h3>
                  <p className="text-xs text-green-600 mt-1">
                    Approved on {invoice.approvedAt ? formatDateZA(invoice.approvedAt) : "-"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {currentClarification && (
        <InvoiceClarificationPopup
          clarification={currentClarification}
          totalClarifications={clarifications.length}
          currentIndex={currentClarificationIndex}
          stockItems={stockItems}
          onSubmit={handleClarificationSubmit}
          onSkip={handleClarificationSkip}
          onClose={() => {}}
        />
      )}

      {showApprovalModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => setShowApprovalModal(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Approval</h3>
              <p className="text-sm text-gray-600 mb-6">
                This will apply all price updates to the matched stock items. This action cannot be
                undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  disabled={isApproving}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 disabled:bg-gray-400"
                >
                  {isApproving ? "Approving..." : "Approve & Update Prices"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
