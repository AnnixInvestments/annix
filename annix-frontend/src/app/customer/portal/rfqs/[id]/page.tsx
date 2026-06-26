"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { FormModal } from "@/app/components/modals/FormModal";
import { useToast } from "@/app/components/Toast";
import { extractErrorMessage, isApiError } from "@/app/lib/api/apiError";
import { formatDateTimeZA, formatDateZA } from "@/app/lib/datetime";
import { useConfirm } from "@/app/lib/hooks/useConfirm";
import {
  type CustomerRfqDocumentSummary,
  type CustomerRfqItemDetail,
  downloadCustomerRfqDocument,
  useAcceptCustomerRfq,
  useCustomerRfqDetail,
  useCustomerRfqDocuments,
  useRejectCustomerRfq,
} from "@/app/lib/query/hooks";

const DECIDED_OR_LOCKED_STATUSES = new Set(["quoted", "accepted", "rejected", "cancelled"]);

function formatZAR(value: number): string {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(value);
}

function itemTypeLabel(itemType: string | undefined): string | null {
  if (itemType === "straight_pipe") return "Straight Pipe";
  if (itemType === "bend") return "Bend";
  if (itemType === "fitting") return "Fitting";
  return null;
}

function priceCell(value: number | null | undefined): string {
  if (value === null || value === undefined) return "On request";
  return formatZAR(value);
}

export default function CustomerRfqDetailPage() {
  const params = useParams();
  const rawParamId = params.id;
  const rfqId = Number(rawParamId);

  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const rfqQuery = useCustomerRfqDetail(rfqId);
  const documentsQuery = useCustomerRfqDocuments(rfqId);
  const acceptMutation = useAcceptCustomerRfq();
  const rejectMutation = useRejectCustomerRfq();

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const rawData = rfqQuery.data;
  const rfq = rawData ?? null;

  const rawDocuments = documentsQuery.data;
  const documents = rawDocuments ?? [];

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "quoted":
        return "bg-blue-100 text-blue-800";
      case "accepted":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-600";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleConflict = (error: unknown) => {
    const conflict = isApiError(error) && error.isConflict();
    if (conflict) {
      showToast(
        "This quote can no longer be changed — it may have already been decided. Refreshing…",
        "warning",
      );
      rfqQuery.refetch();
      return true;
    }
    return false;
  };

  const handleAccept = async () => {
    const ok = await confirm({
      title: "Accept this quotation?",
      message:
        "This accepts the quotation and lets our team proceed with your order. You won't be able to change it afterwards.",
      confirmLabel: "Accept quote",
      cancelLabel: "Not yet",
      variant: "info",
    });
    if (!ok) return;

    try {
      await acceptMutation.mutateAsync(rfqId);
      showToast("Quotation accepted. We'll be in touch shortly.", "success");
    } catch (error) {
      if (handleConflict(error)) return;
      showToast(
        extractErrorMessage(error, "We couldn't accept the quote. Please try again."),
        "error",
      );
    }
  };

  const openRejectModal = () => {
    setRejectReason("");
    setRejectModalOpen(true);
  };

  const submitReject = async () => {
    const trimmedReason = rejectReason.trim();
    try {
      await rejectMutation.mutateAsync({
        id: rfqId,
        reason: trimmedReason.length > 0 ? trimmedReason : undefined,
      });
      setRejectModalOpen(false);
      showToast("Quotation declined.", "success");
    } catch (error) {
      if (handleConflict(error)) {
        setRejectModalOpen(false);
        return;
      }
      showToast(
        extractErrorMessage(error, "We couldn't decline the quote. Please try again."),
        "error",
      );
    }
  };

  const handleDownload = async (doc: CustomerRfqDocumentSummary) => {
    const docId = doc.id;
    const filename = doc.filename;
    setDownloadingId(docId);
    try {
      const blob = await downloadCustomerRfqDocument(docId);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename || `quote-${rfqId}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      showToast(
        extractErrorMessage(error, "We couldn't download that document. Please try again."),
        "error",
      );
    } finally {
      setDownloadingId(null);
    }
  };

  if (rfqQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const rawError = rfqQuery.error;
  if (rawError || !rfq) {
    const friendly = rawError
      ? extractErrorMessage(rawError, "We couldn't load this RFQ.")
      : "We couldn't find this RFQ. It may have been removed.";
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{friendly}</p>
        </div>
        <Link href="/customer/portal/rfqs" className="text-blue-600 hover:underline">
          Back to RFQ list
        </Link>
      </div>
    );
  }

  const status = rfq.status;
  const statusLower = status.toLowerCase();
  const isQuoted = statusLower === "quoted";
  const isAccepted = statusLower === "accepted";
  const isRejected = statusLower === "rejected";
  const editLocked = DECIDED_OR_LOCKED_STATUSES.has(statusLower);

  const rawItems = rfq.items;
  const items: CustomerRfqItemDetail[] = rawItems ?? [];

  const rawTotalCost = rfq.totalCost;
  const hasTotalCost = rawTotalCost !== null && rawTotalCost !== undefined;

  const rawAcceptedAt = rfq.acceptedAt;
  const rawRejectedAt = rfq.rejectedAt;
  const rawRejectionReason = rfq.rejectionReason;

  const acceptPending = acceptMutation.isPending;
  const rejectPending = rejectMutation.isPending;
  const actionPending = acceptPending || rejectPending;
  const hasDocuments = documents.length > 0;

  return (
    <div className="space-y-6">
      {ConfirmDialog}

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/customer/portal/rfqs" className="text-gray-500 hover:text-gray-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">{rfq.rfqNumber}</h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(status)}`}
            >
              {status}
            </span>
          </div>
          <p className="mt-1 text-lg text-gray-600">{rfq.projectName}</p>
        </div>
      </div>

      {/* RFQ Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {rfq.description && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
              <p className="text-gray-700">{rfq.description}</p>
            </div>
          )}

          {/* Quote view (priced line table) when quoted/accepted/rejected */}
          {isQuoted || isAccepted || isRejected ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Quotation</h2>
              </div>
              {items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Qty
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit Price
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {items.map((item, index) => {
                        const rawItemId = item.id;
                        const rowKey = rawItemId ?? index;
                        const rawDescription = item.description;
                        const rawItemDescription = item.itemDescription;
                        const description =
                          rawDescription || rawItemDescription || `Item ${index + 1}`;
                        const typeLabel = itemTypeLabel(item.itemType);
                        const rawQuantity = item.quantity;
                        const quantity = rawQuantity ?? "—";
                        return (
                          <tr key={rowKey}>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              <div className="font-medium">{description}</div>
                              {typeLabel && (
                                <div className="text-xs text-gray-500 mt-0.5">{typeLabel}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 text-right whitespace-nowrap">
                              {quantity}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 text-right whitespace-nowrap">
                              {priceCell(item.unitPrice)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap font-medium">
                              {priceCell(item.totalPrice)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {hasTotalCost && (
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td
                            colSpan={3}
                            className="px-4 py-3 text-sm font-semibold text-gray-900 text-right"
                          >
                            Quote Total
                          </td>
                          <td className="px-4 py-3 text-base font-bold text-gray-900 text-right whitespace-nowrap">
                            {formatZAR(rawTotalCost as number)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500">
                  No priced line items on this quotation.
                </div>
              )}
              <p className="px-6 py-3 text-xs text-gray-400 border-t border-gray-100">
                Prices in South African Rand (ZAR). Items shown as “On request” are priced
                separately.
              </p>
            </div>
          ) : (
            /* Pre-quote: plain item list */
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Items</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {items.length > 0 ? (
                  items.map((item, index) => {
                    const rawItemId = item.id;
                    const rowKey = rawItemId ?? index;
                    const rawItemDescription = item.itemDescription;
                    const rawDescription = item.description;
                    const description = rawItemDescription || rawDescription || `Item ${index + 1}`;
                    const typeLabel = itemTypeLabel(item.itemType);
                    const rawNotes = item.itemNotes;
                    const rawQuantity = item.quantity;
                    return (
                      <div key={rowKey} className="p-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">{description}</h3>
                            {typeLabel && <p className="text-sm text-gray-500 mt-1">{typeLabel}</p>}
                          </div>
                          {rawQuantity !== undefined && rawQuantity !== null && (
                            <span className="text-sm text-gray-500">Qty: {rawQuantity}</span>
                          )}
                        </div>
                        {rawNotes && <p className="text-sm text-gray-600 mt-2">{rawNotes}</p>}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-gray-500">No items in this RFQ</div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {rfq.notes && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
              <p className="text-gray-700">{rfq.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quote decision panel */}
          {isQuoted && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Respond to quotation</h2>
              <p className="text-sm text-gray-500 mb-4">
                Review the quotation and let us know how you'd like to proceed.
              </p>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={actionPending}
                  className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {acceptPending ? "Accepting…" : "Accept quote"}
                </button>
                <button
                  type="button"
                  onClick={openRejectModal}
                  disabled={actionPending}
                  className="w-full flex items-center justify-center px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Decline quote
                </button>
              </div>
            </div>
          )}

          {/* Accepted confirmation */}
          {isAccepted && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex">
                <svg
                  className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5"
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
                <div>
                  <h4 className="text-sm font-medium text-green-800">Quotation accepted</h4>
                  <p className="mt-1 text-sm text-green-700">
                    Thank you for accepting this quotation. Our team will be in touch to proceed.
                  </p>
                  {rawAcceptedAt && (
                    <p className="mt-2 text-xs text-green-600">
                      Accepted {formatDateTimeZA(rawAcceptedAt)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Rejected confirmation */}
          {isRejected && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <svg
                  className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-red-800">Quotation declined</h4>
                  <p className="mt-1 text-sm text-red-700">
                    You declined this quotation. Contact us if you'd like us to re-quote.
                  </p>
                  {rawRejectionReason && (
                    <p className="mt-2 text-sm text-red-700">
                      <span className="font-medium">Reason:</span> {rawRejectionReason}
                    </p>
                  )}
                  {rawRejectedAt && (
                    <p className="mt-2 text-xs text-red-600">
                      Declined {formatDateTimeZA(rawRejectedAt)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Status</dt>
                <dd>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(status)}`}
                  >
                    {status}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Created</dt>
                <dd className="text-sm text-gray-900">{formatDateZA(rfq.createdAt)}</dd>
              </div>
              {rfq.requiredDate && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Required By</dt>
                  <dd className="text-sm text-gray-900">{formatDateZA(rfq.requiredDate)}</dd>
                </div>
              )}
              {rfq.totalWeightKg !== undefined && rfq.totalWeightKg !== null && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Total Weight</dt>
                  <dd className="text-sm text-gray-900">{rfq.totalWeightKg.toFixed(2)} kg</dd>
                </div>
              )}
              {hasTotalCost && (
                <div className="flex justify-between border-t border-gray-100 pt-3">
                  <dt className="text-sm font-medium text-gray-700">Quote Total</dt>
                  <dd className="text-sm font-semibold text-gray-900">
                    {formatZAR(rawTotalCost as number)}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Status info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <svg
                className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-blue-800">RFQ Status</h4>
                <p className="mt-1 text-sm text-blue-700">
                  {statusLower === "pending" &&
                    "Your RFQ is being reviewed by our team. We will provide a quotation shortly."}
                  {statusLower === "quoted" &&
                    "A quotation has been provided. Please review and respond."}
                  {statusLower === "accepted" &&
                    "Thank you for accepting the quotation. We will be in touch shortly."}
                  {statusLower === "draft" &&
                    "This RFQ is in draft status and has not been submitted yet."}
                  {statusLower === "rejected" && "This quotation was declined."}
                  {statusLower === "cancelled" && "This RFQ has been cancelled."}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
            <div className="space-y-3">
              {!editLocked && (
                <Link
                  href={`/customer/portal/rfqs/create?edit=${rfq.id}`}
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Edit RFQ
                </Link>
              )}

              {hasDocuments ? (
                documents.map((doc) => {
                  const docId = doc.id;
                  const isDownloading = downloadingId === docId;
                  return (
                    <button
                      key={docId}
                      type="button"
                      onClick={() => handleDownload(doc)}
                      disabled={isDownloading}
                      className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      {isDownloading ? "Downloading…" : "Download quote"}
                    </button>
                  );
                })
              ) : (
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                    />
                  </svg>
                  Print quote
                </button>
              )}

              <a
                href={`mailto:info@annix.co.za?subject=Question about RFQ ${rfq.rfqNumber}`}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </div>

      <FormModal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        onSubmit={submitReject}
        title="Decline quotation"
        submitLabel="Decline quote"
        cancelLabel="Keep quote"
        loading={rejectPending}
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Declining tells us you don't wish to proceed with this quotation. You can optionally let
            us know why.
          </p>
          <label htmlFor="reject-reason" className="block text-sm font-medium text-gray-700">
            Reason (optional)
          </label>
          <textarea
            id="reject-reason"
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            maxLength={2000}
            rows={4}
            placeholder="e.g. pricing, lead time, no longer required…"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <p className="text-xs text-gray-400 text-right">{rejectReason.length}/2000</p>
        </div>
      </FormModal>
    </div>
  );
}
