"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useStockControlAuth } from "@/app/context/StockControlAuthContext";
import type { DeliveryNote } from "@/app/lib/api/stockControlApi";
import { formatDateZA } from "@/app/lib/datetime";
import {
  useDeleteDeliveryNote,
  useDeliveryNoteDetail,
  useLinkDeliveryNoteToStock,
  useUploadDeliveryPhoto,
} from "@/app/lib/query/hooks";
import { DeliveryMatchReview } from "@/app/stock-control/components/DeliveryMatchReview";
import { DeliveryNextAction } from "@/app/stock-control/components/NextActionBanner";
import { PhotoCapture } from "@/app/stock-control/components/PhotoCapture";
import { useViewAs } from "@/app/stock-control/context/ViewAsContext";
import { useConfirm } from "@/app/stock-control/hooks/useConfirm";

interface ExtractedLineItem {
  description?: string;
  itemCode?: string;
  productCode?: string;
  compoundCode?: string;
  sku?: string;
  quantity?: number;
  unitOfMeasure?: string;
  rollNumber?: string;
  batchNumber?: string;
  thicknessMm?: number;
  widthMm?: number;
  lengthM?: number;
  weightKg?: number;
  volumeLitersPerPack?: number;
  isPaint?: boolean;
}

function extractedLineItems(delivery: DeliveryNote): ExtractedLineItem[] {
  const data = delivery.extractedData as {
    lineItems?: ExtractedLineItem[];
  } | null;
  if (data == null) return [];
  const items = data.lineItems;
  return items == null ? [] : items;
}

export default function DeliveryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useStockControlAuth();
  const { effectiveRole } = useViewAs();
  const { confirm, ConfirmDialog } = useConfirm();
  const deliveryId = Number(params.id);

  const { data: delivery, isLoading, error: queryError } = useDeliveryNoteDetail(deliveryId);
  const uploadPhotoMutation = useUploadDeliveryPhoto();
  const linkToStockMutation = useLinkDeliveryNoteToStock();
  const deleteDeliveryMutation = useDeleteDeliveryNote();

  const [isUploading, setIsUploading] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [showMatchReview, setShowMatchReview] = useState(false);

  const queryErrorMessage = queryError
    ? queryError instanceof Error
      ? queryError.message
      : "Failed to load delivery note"
    : null;

  const handlePhotoCapture = async (file: File) => {
    try {
      setIsUploading(true);
      setMutationError(null);
      await uploadPhotoMutation.mutateAsync({ id: deliveryId, file });
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setIsUploading(false);
    }
  };

  const handleLinkToStock = () => {
    setMutationError(null);
    setShowMatchReview(true);
  };

  const handleMatchReviewConfirm = async (
    overrides: Array<{ description: string; matchedItemId: number | null }>,
  ) => {
    setShowMatchReview(false);
    try {
      setMutationError(null);
      const effectiveOverrides = overrides.length > 0 ? overrides : undefined;
      await linkToStockMutation.mutateAsync({ id: deliveryId, overrides: effectiveOverrides });
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : "Failed to link items to stock");
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: "Delete Delivery Note",
      message:
        "Are you sure you want to delete this delivery note? This will reverse any stock movements and permanently delete any linked supplier invoices.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) {
      return;
    }
    try {
      setMutationError(null);
      await deleteDeliveryMutation.mutateAsync(deliveryId);
      router.push("/stock-control/portal/deliveries");
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : "Failed to delete delivery note");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading delivery note...</p>
        </div>
      </div>
    );
  }

  if (queryErrorMessage || !delivery) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
          <p className="text-gray-600">{queryErrorMessage || "Delivery note not found"}</p>
          <Link
            href="/stock-control/portal/deliveries"
            className="mt-4 inline-block text-teal-600 hover:text-teal-800"
          >
            Back to Deliveries
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {ConfirmDialog}
      {mutationError && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4">
          <div className="flex items-start">
            <svg
              className="h-5 w-5 text-red-400 mt-0.5 mr-3 shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">{mutationError}</p>
            </div>
            <button
              onClick={() => setMutationError(null)}
              className="ml-3 text-red-400 hover:text-red-600"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/stock-control/portal/deliveries"
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
            <h1 className="text-2xl font-bold text-gray-900">Delivery {delivery.deliveryNumber}</h1>
            <p className="mt-1 text-sm text-gray-500">From {delivery.supplierName}</p>
          </div>
        </div>
        {(effectiveRole === "manager" || effectiveRole === "admin") && (
          <button
            onClick={handleDelete}
            disabled={deleteDeliveryMutation.isPending}
            className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleteDeliveryMutation.isPending ? (
              <>
                <svg
                  className="animate-spin -ml-0.5 mr-2 h-4 w-4 text-red-700"
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
                Deleting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Delete
              </>
            )}
          </button>
        )}
      </div>

      <DeliveryNextAction
        extractionStatus={delivery.extractionStatus}
        hasLinkedItems={delivery.items !== undefined && delivery.items.length > 0}
        extractedItemCount={extractedLineItems(delivery).length}
        userRole={effectiveRole}
        onLinkToStock={handleLinkToStock}
      />

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Delivery Details</h3>
        </div>
        <div className="px-4 py-5 sm:px-6">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-6">
            <div>
              <dt className="text-sm font-medium text-gray-500">Delivery Number</dt>
              <dd className="mt-1 text-sm text-gray-900">{delivery.deliveryNumber}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Supplier</dt>
              <dd className="mt-1 text-sm text-gray-900">{delivery.supplierName}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Received Date</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDateZA(delivery.receivedDate)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Received By</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {(() => {
                  const rawReceivedBy = delivery.receivedBy;
                  return rawReceivedBy || "-";
                })()}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDateZA(delivery.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Items Count</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {(() => {
                  const extractedLength = extractedLineItems(delivery).length;
                  return delivery.items ? delivery.items.length : extractedLength || 0;
                })()}
              </dd>
            </div>
            {delivery.notes && (
              <div className="col-span-2">
                <dt className="text-sm font-medium text-gray-500">Notes</dt>
                <dd className="mt-1 text-sm text-gray-900">{delivery.notes}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Document</h3>
        </div>
        <div className="p-4">
          {delivery.photoUrl ? (
            <div className="flex items-center space-x-4">
              <a
                href={delivery.photoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                View Document
              </a>
              <PhotoCapture onCapture={handlePhotoCapture} currentPhotoUrl={delivery.photoUrl} />
            </div>
          ) : (
            <div className="space-y-2">
              {isUploading ? (
                <p className="text-sm text-gray-500">Uploading photo...</p>
              ) : (
                <PhotoCapture onCapture={handlePhotoCapture} />
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Delivered Items</h3>
        </div>
        {delivery.items && delivery.items.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Item Name
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Roll #
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  SKU
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Weight
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  L/Tin
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Qty Received
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Total L
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(() => {
                const groups = delivery.items.reduce<
                  Map<string, { key: string; items: typeof delivery.items }>
                >((acc, item) => {
                  const stockKey = item.stockItem ? `s:${item.stockItem.id}` : null;
                  const descKey = item.stockItem ? item.stockItem.name : null;
                  const groupKey = stockKey || (descKey ? `d:${descKey}` : `i:${item.id}`);
                  const existing = acc.get(groupKey);
                  if (existing) {
                    existing.items.push(item);
                  } else {
                    acc.set(groupKey, { key: groupKey, items: [item] });
                  }
                  return acc;
                }, new Map());

                return Array.from(groups.values()).map((group) => {
                  const first = group.items[0];
                  const stockName = first.stockItem ? first.stockItem.name : "-";
                  const stockSku = first.stockItem ? first.stockItem.sku : null;
                  const rolls = group.items
                    .map((i) => i.rollNumber)
                    .filter((r): r is string => Boolean(r));
                  const rollLabel =
                    rolls.length === 0
                      ? "-"
                      : rolls.length === 1
                        ? rolls[0]
                        : `${rolls.length} rolls`;
                  const rollTooltip = rolls.length > 1 ? rolls.join(", ") : undefined;
                  const totalWeight = group.items.reduce(
                    (sum, i) => sum + (Number(i.weightKg) || 0),
                    0,
                  );
                  const packLitres = first.stockItem ? first.stockItem.packSizeLitres : null;
                  const packVal = packLitres ? Number(packLitres) : null;
                  const totalQty = group.items.reduce((sum, i) => sum + i.quantityReceived, 0);
                  const totalLitres = packVal ? packVal * totalQty : null;
                  return (
                    <tr key={group.key} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {first.stockItem ? (
                          <Link
                            href={`/stock-control/portal/inventory/${first.stockItem.id}`}
                            className="text-teal-700 hover:text-teal-900"
                          >
                            {stockName}
                          </Link>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono"
                        title={rollTooltip}
                      >
                        {rollLabel}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {stockSku || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                        {totalWeight > 0 ? `${totalWeight} kg` : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                        {packVal ? `${packVal}L` : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                        {totalQty}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-teal-700">
                        {totalLitres ? `${totalLitres.toFixed(1)}L` : "-"}
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        ) : extractedLineItems(delivery).length > 0 ? (
          <>
            <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-100 flex items-center justify-between">
              <p className="text-xs text-yellow-700">
                Extracted from document (not yet linked to inventory)
              </p>
              <button
                onClick={handleLinkToStock}
                disabled={linkToStockMutation.isPending}
                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {linkToStockMutation.isPending ? (
                  <>
                    <svg
                      className="animate-spin -ml-0.5 mr-1.5 h-3 w-3 text-white"
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
                    Adding to Stock...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-3 h-3 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    Add to Stock
                  </>
                )}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Description
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Code
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      L/Tin
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Qty
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Total L
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Dimensions
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Weight
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {extractedLineItems(delivery).map((item, idx) => {
                    const volPerPack = item.volumeLitersPerPack;
                    const qty = item.quantity;
                    const totalL = volPerPack && qty ? volPerPack * qty : null;
                    const rawDesc = item.description;
                    const desc = rawDesc || "-";
                    const rollNum = item.rollNumber;
                    const rawPc = item.productCode;
                    const rawCc = item.compoundCode;
                    const rawIc = item.itemCode;
                    const rawSku = item.sku;
                    const code = rawPc || rawCc || rawIc || rawSku || "-";
                    const rawUom = item.unitOfMeasure;
                    const uom = rawUom || "";
                    const thk = item.thicknessMm;
                    const wid = item.widthMm;
                    const len = item.lengthM;
                    const wkg = item.weightKg;
                    const hasDims = thk || wid || len;
                    return (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-4 text-sm font-medium text-gray-900">
                          {desc}
                          {rollNum && (
                            <span className="ml-2 text-xs text-gray-500">Roll: {rollNum}</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                          {code}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                          {volPerPack ? `${volPerPack}L` : "-"}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                          {qty || "-"} {uom}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-semibold text-teal-700">
                          {totalL ? `${totalL.toFixed(1)}L` : "-"}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                          {hasDims ? (
                            <span>
                              {thk && `${thk}mm`}
                              {wid && ` × ${wid}mm`}
                              {len && ` × ${len}m`}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                          {wkg ? `${wkg} kg` : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
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
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No items</h3>
            <p className="mt-1 text-sm text-gray-500">This delivery note has no items.</p>
          </div>
        )}
      </div>
      {showMatchReview && (
        <DeliveryMatchReview
          deliveryId={deliveryId}
          onConfirm={handleMatchReviewConfirm}
          onCancel={() => setShowMatchReview(false)}
        />
      )}
    </div>
  );
}
