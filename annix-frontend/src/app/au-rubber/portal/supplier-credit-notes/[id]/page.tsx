"use client";

import { CheckCircle, Download, FileText, Link2, RefreshCw } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Breadcrumb } from "@/app/au-rubber/components/Breadcrumb";
import { useConfirm } from "@/app/au-rubber/hooks/useConfirm";
import { useExtractionProgress } from "@/app/components/ExtractionProgressModal";
import { useToast } from "@/app/components/Toast";
import { toastError } from "@/app/lib/api/apiError";
import {
  auRubberApiClient,
  type RubberSupplierCocDto,
  type RubberTaxInvoiceDto,
  type TaxInvoiceStatus,
} from "@/app/lib/api/auRubberApi";
import { formatDateTimeZA, formatDateZA } from "@/app/lib/datetime";
import { useAlert } from "@/app/lib/hooks/useAlert";

export default function SupplierCreditNoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { alert, AlertDialog } = useAlert();
  const { showExtraction, hideExtraction } = useExtractionProgress();
  const { confirm: confirmDialog, ConfirmDialog } = useConfirm();
  const [invoice, setInvoice] = useState<RubberTaxInvoiceDto | null>(null);
  const [calenderRollCocs, setCalenderRollCocs] = useState<RubberSupplierCocDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);

  const [splitPercent, setSplitPercent] = useState(50);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dragging = isDraggingRef.current;
      const container = splitContainerRef.current;
      if (!dragging || !container) return;
      const rect = container.getBoundingClientRect();
      const x = moveEvent.clientX - rect.left;
      const percent = Math.max(20, Math.min(80, (x / rect.width) * 100));
      setSplitPercent(percent);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  const invoiceId = Number(params.id);

  const isOfficeFile = (path: string): boolean => {
    const rawExt = path.split(".").pop();
    const ext = rawExt ? rawExt.toLowerCase() : "";
    return ["xlsx", "xls", "docx", "doc", "pptx", "ppt"].includes(ext);
  };

  const officeViewerUrl = (url: string): string =>
    `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const data = await auRubberApiClient.taxInvoiceById(invoiceId);
      setInvoice(data);

      if (data.documentPath) {
        const url = await auRubberApiClient.documentUrl(data.documentPath);
        setDocumentUrl(url);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load credit note"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (invoiceId) {
      fetchData();
    }
  }, [invoiceId]);

  useEffect(() => {
    auRubberApiClient
      .supplierCocs({})
      .then((cocs) =>
        setCalenderRollCocs(
          cocs.filter((coc) => coc.cocType === "CALENDARER" || coc.cocType === "CALENDER_ROLL"),
        ),
      )
      .catch(() => setCalenderRollCocs([]));
  }, []);

  const estimateExtractionDurationMs = async (): Promise<number> => {
    if (!documentUrl) return 120000;
    try {
      const head = await fetch(documentUrl, { method: "HEAD" });
      const rawContentLength = head.headers.get("content-length");
      const contentLength = Number(rawContentLength || 0);
      if (contentLength <= 0) return 120000;
      const estimatedPages = Math.max(1, Math.round(contentLength / 150000));
      const perPageMs = 12000;
      const ms = estimatedPages * perPageMs;
      return Math.min(600000, Math.max(60000, ms));
    } catch {
      return 120000;
    }
  };

  const handleExtract = async () => {
    try {
      setIsExtracting(true);
      const estimatedDurationMs = await estimateExtractionDurationMs();
      showExtraction({
        brand: "au-rubber",
        label: "Extracting credit note…",
        estimatedDurationMs,
      });
      const updated = await auRubberApiClient.extractTaxInvoice(invoiceId);
      setInvoice(updated);
      showToast("Data extracted successfully", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Extraction failed";
      alert({ message: message, variant: "error" });
    } finally {
      hideExtraction();
      setIsExtracting(false);
    }
  };

  const handleApprove = async () => {
    if (!invoice) return;
    const rollCount = invoice.creditNoteRollNumbers.length;
    const message =
      rollCount > 0
        ? `Approving this credit note will mark ${rollCount} roll(s) as REJECTED. Continue?`
        : "Approve this credit note?";
    const confirmed = await confirmDialog({
      title: "Approve Credit Note",
      message,
    });
    if (!confirmed) return;
    try {
      setIsApproving(true);
      await auRubberApiClient.approveTaxInvoice(invoiceId);
      showToast("Credit note approved", "success");
      router.push("/au-rubber/portal/supplier-credit-notes");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Approval failed";
      alert({ message: errorMessage, variant: "error" });
    } finally {
      setIsApproving(false);
    }
  };

  const handleLinkCoc = async (cocId: number | null) => {
    try {
      setIsLinking(true);
      const updated = await auRubberApiClient.linkTaxInvoiceCalenderRollCoc(invoiceId, cocId);
      setInvoice(updated);
      showToast(
        cocId == null ? "Calender Roll CoC unlinked" : "Calender Roll CoC linked",
        "success",
      );
    } catch (err) {
      toastError(showToast, err, "Failed to update linked Calender Roll CoC");
    } finally {
      setIsLinking(false);
    }
  };

  const statusBadge = (status: TaxInvoiceStatus) => {
    const colors: Record<TaxInvoiceStatus, string> = {
      PENDING: "bg-gray-100 text-gray-800",
      EXTRACTED: "bg-blue-100 text-blue-800",
      APPROVED: "bg-green-100 text-green-800",
      FAILED: "bg-red-100 text-red-800",
    };
    const labels: Record<TaxInvoiceStatus, string> = {
      PENDING: "Pending",
      EXTRACTED: "Extracted",
      APPROVED: "Approved",
      FAILED: "Failed",
    };
    return (
      <span
        className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${colors[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  const formatCurrency = (amount: number | null): string => {
    if (amount == null) return "-";
    return `R ${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
      </div>
    );
  }

  if (error || !invoice) {
    const rawErrorMessage = error?.message;
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Error Loading Data</div>
          <p className="text-gray-600">{rawErrorMessage || "Credit note not found"}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const returnUrl = searchParams.get("returnUrl");
  const backPath = returnUrl || "/au-rubber/portal/supplier-credit-notes";
  const backLabel = returnUrl ? "Back" : "Supplier Credit Notes";

  const rawInvoiceInvoiceNumber = invoice.invoiceNumber;
  const rawInvoiceCompanyName = invoice.companyName;
  const rawInvoiceProductDescription = invoice.productDescription;
  const rawExtractedDataDeliveryNoteRef = invoice.extractedData?.deliveryNoteRef;
  const rawExtractedDataOrderNumber = invoice.extractedData?.orderNumber;
  const extractedLineItems = invoice.extractedData ? invoice.extractedData.lineItems : null;
  const linkedCocId = invoice.linkedCalenderRollCocId;
  const linkedCocNumber = invoice.linkedCalenderRollCocNumber;

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: backLabel, href: backPath },
          { label: rawInvoiceInvoiceNumber || `CN-${invoice.id}` },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {rawInvoiceInvoiceNumber || `CN-${invoice.id}`}
          </h1>
          <div className="mt-2 flex items-center space-x-3">
            <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-red-100 text-red-800">
              Credit Note
            </span>
            {statusBadge(invoice.status)}
            {invoice.exportedToSageAt && (
              <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                Exported
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {invoice.status === "EXTRACTED" && (
            <button
              onClick={handleApprove}
              disabled={isApproving}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle className={`w-4 h-4 mr-2 ${isApproving ? "animate-pulse" : ""}`} />
              {isApproving ? "Approving..." : "Approve"}
            </button>
          )}
          <button
            onClick={handleExtract}
            disabled={isExtracting || !invoice.documentPath}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isExtracting ? "animate-spin" : ""}`} />
            {isExtracting
              ? "Extracting..."
              : invoice.status === "PENDING"
                ? "Extract Data"
                : "Re-extract"}
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center mb-4">
          <Link2 className="w-5 h-5 text-gray-500 mr-2" />
          <h2 className="text-lg font-medium text-gray-900">Linked Calender Roll CoC</h2>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            {linkedCocId ? (
              <p className="text-sm text-gray-900">
                Currently linked to{" "}
                <span className="font-semibold">{linkedCocNumber || `CoC #${linkedCocId}`}</span>
              </p>
            ) : (
              <p className="text-sm text-gray-500">No Calender Roll CoC linked</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={linkedCocId ?? ""}
              onChange={(e) => handleLinkCoc(e.target.value ? Number(e.target.value) : null)}
              disabled={isLinking}
              className="block w-64 rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm border p-2 disabled:opacity-50"
            >
              <option value="">Not linked</option>
              {calenderRollCocs.map((coc) => {
                const cocNumber = coc.cocNumber;
                return (
                  <option key={coc.id} value={coc.id}>
                    {cocNumber || `CoC #${coc.id}`}
                  </option>
                );
              })}
            </select>
            {linkedCocId && (
              <button
                type="button"
                onClick={() => handleLinkCoc(null)}
                disabled={isLinking}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-900">Document</span>
          </div>
          {documentUrl && (
            <a
              href={documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-orange-600 hover:text-orange-800"
            >
              <Download className="w-4 h-4 mr-1" />
              View Document
            </a>
          )}
        </div>
        <div className="h-[600px] bg-gray-100">
          {documentUrl && invoice.documentPath && isOfficeFile(invoice.documentPath) ? (
            <iframe
              src={officeViewerUrl(documentUrl)}
              className="w-full h-full"
              title="Credit Note Document"
            />
          ) : documentUrl ? (
            <iframe src={documentUrl} className="w-full h-full" title="Credit Note Document" />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              No document available
            </div>
          )}
        </div>
      </div>

      <div ref={splitContainerRef} className="flex flex-col lg:flex-row gap-0 relative">
        <div
          className="bg-white shadow rounded-lg p-6 overflow-auto"
          style={{ width: `calc(${splitPercent}% - 4px)` }}
        >
          <h2 className="text-lg font-medium text-gray-900 mb-4">Credit Note Details</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Company</dt>
              <dd className="mt-1 text-sm text-gray-900">{rawInvoiceCompanyName || "-"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Credit Note Date</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {invoice.invoiceDate ? formatDateZA(invoice.invoiceDate) : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1 text-sm text-gray-900">{invoice.statusLabel}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDateTimeZA(invoice.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Roll Numbers</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {invoice.creditNoteRollNumbers.length > 0
                  ? invoice.creditNoteRollNumbers.join(", ")
                  : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Exported to Sage</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {invoice.exportedToSageAt
                  ? formatDateTimeZA(invoice.exportedToSageAt)
                  : "Not exported"}
              </dd>
            </div>
          </dl>
        </div>

        <div
          onMouseDown={handleDragStart}
          className="hidden lg:flex w-2 cursor-col-resize items-center justify-center group hover:bg-teal-100 rounded transition-colors"
          title="Drag to resize"
        >
          <div className="w-0.5 h-8 bg-gray-300 group-hover:bg-teal-500 rounded-full transition-colors" />
        </div>

        <div
          className="bg-white shadow rounded-lg p-6 overflow-auto flex-1"
          style={{ width: `calc(${100 - splitPercent}% - 4px)` }}
        >
          <h2 className="text-lg font-medium text-gray-900 mb-4">Credit Note Summary</h2>
          {invoice.extractedData ? (
            <dl className="space-y-4">
              {extractedLineItems && extractedLineItems.length > 1 ? (
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-2">
                    Line Items ({extractedLineItems.length})
                  </dt>
                  <dd>
                    <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-md overflow-hidden">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            #
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Description
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            Qty
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            Unit Price
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {extractedLineItems.map((item, idx) => (
                          <Fragment key={idx}>
                            <tr>
                              <td className="px-3 py-2 text-xs text-gray-400">{idx + 1}</td>
                              <td className="px-3 py-2 text-sm text-gray-900">
                                {item.description}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900 text-right">
                                {item.quantity != null ? item.quantity : "-"}
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-900 text-right">
                                {formatCurrency(item.unitPrice)}
                              </td>
                              <td className="px-3 py-2 text-sm font-medium text-gray-900 text-right">
                                {formatCurrency(item.amount)}
                              </td>
                            </tr>
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </dd>
                </div>
              ) : (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Product Description</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {rawInvoiceProductDescription || "-"}
                  </dd>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Delivery Note Ref</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {rawExtractedDataDeliveryNoteRef || "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Order Number</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {rawExtractedDataOrderNumber || "-"}
                  </dd>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-2 border-t border-gray-100">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Subtotal (ex VAT)</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">
                    {formatCurrency(invoice.extractedData.subtotal)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">VAT</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">
                    {formatCurrency(invoice.extractedData.vatAmount)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Total (incl VAT)</dt>
                  <dd className="mt-1 text-sm font-semibold text-gray-900">
                    {formatCurrency(invoice.extractedData.totalAmount)}
                  </dd>
                </div>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-gray-500">No data extracted yet</p>
          )}
        </div>
      </div>
      {ConfirmDialog}
      {AlertDialog}
    </div>
  );
}
