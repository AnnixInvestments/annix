"use client";

import { CheckCircle, Download, FileText, Pencil, RefreshCw, Save, X } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Breadcrumb } from "@/app/au-rubber/components/Breadcrumb";
import { useExtractionProgress } from "@/app/components/ExtractionProgressModal";
import { useToast } from "@/app/components/Toast";
import {
  auRubberApiClient,
  type RubberTaxInvoiceDto,
  type TaxInvoiceStatus,
  type TaxInvoiceType,
} from "@/app/lib/api/auRubberApi";
import { formatDateTimeZA, formatDateZA } from "@/app/lib/datetime";
import { LineItemRollsPanel } from "./LineItemRollsPanel";

export default function TaxInvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { showExtraction, hideExtraction } = useExtractionProgress();
  const [invoice, setInvoice] = useState<RubberTaxInvoiceDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRecomputingCosts, setIsRecomputingCosts] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [isSavingSummary, setIsSavingSummary] = useState(false);
  const [editForm, setEditForm] = useState({
    productDescription: "",
    deliveryNoteRef: "",
    orderNumber: "",
    quantity: "",
    unit: "",
    costPerUnit: "",
    subtotal: "",
    vatAmount: "",
    totalAmount: "",
  });

  const [splitPercent, setSplitPercent] = useState(50);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current || !splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
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
    const ext = path.split(".").pop()?.toLowerCase() || "";
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
      setError(err instanceof Error ? err : new Error("Failed to load invoice"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (invoiceId) {
      fetchData();
    }
  }, [invoiceId]);

  const handleExtract = async () => {
    try {
      setIsExtracting(true);
      showExtraction({
        brand: "au-rubber",
        label: "Extracting tax invoice…",
        estimatedDurationMs: 60000,
      });
      const updated = await auRubberApiClient.extractTaxInvoice(invoiceId);
      setInvoice(updated);
      showToast("Data extracted successfully", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Extraction failed";
      showToast(message, "error");
    } finally {
      hideExtraction();
      setIsExtracting(false);
    }
  };

  const handleRecomputeCompoundCosts = async () => {
    if (!invoice) return;
    try {
      setIsRecomputingCosts(true);
      const result = await auRubberApiClient.recomputeCompoundCosts(invoice.id);
      if (result.unitPrice == null) {
        showToast("No matching S&N invoice found yet — rolls keep toll cost only.", "warning");
      } else {
        showToast(
          `Updated compound cost on ${result.updated} rolls at R${result.unitPrice.toFixed(2)}/kg.`,
          "success",
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Recompute failed";
      showToast(message, "error");
    } finally {
      setIsRecomputingCosts(false);
    }
  };

  const handleApprove = async () => {
    try {
      setIsApproving(true);
      await auRubberApiClient.approveTaxInvoice(invoiceId);
      showToast("Invoice approved successfully", "success");
      const listPath =
        invoice?.invoiceType === "CUSTOMER"
          ? "/au-rubber/portal/tax-invoices/customers"
          : "/au-rubber/portal/tax-invoices/suppliers";
      router.push(listPath);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Approval failed";
      showToast(message, "error");
    } finally {
      setIsApproving(false);
    }
  };

  const startEditingSummary = () => {
    if (!invoice) return;
    const rawInvoiceProductDescription = invoice.productDescription;
    const rawExtractedDataDeliveryNoteRef = invoice.extractedData?.deliveryNoteRef;
    const rawExtractedDataOrderNumber = invoice.extractedData?.orderNumber;
    const rawInvoiceUnit = invoice.unit;
    setEditForm({
      productDescription: rawInvoiceProductDescription || "",
      deliveryNoteRef: rawExtractedDataDeliveryNoteRef || "",
      orderNumber: rawExtractedDataOrderNumber || "",
      quantity: invoice.numberOfRolls != null ? String(invoice.numberOfRolls) : "",
      unit: rawInvoiceUnit || "",
      costPerUnit: invoice.costPerUnit != null ? String(invoice.costPerUnit) : "",
      subtotal:
        invoice.extractedData?.subtotal != null ? String(invoice.extractedData.subtotal) : "",
      vatAmount:
        invoice.extractedData?.vatAmount != null ? String(invoice.extractedData.vatAmount) : "",
      totalAmount:
        invoice.extractedData?.totalAmount != null ? String(invoice.extractedData.totalAmount) : "",
    });
    setIsEditingSummary(true);
  };

  const cancelEditingSummary = () => {
    setIsEditingSummary(false);
  };

  const saveSummary = async () => {
    if (!invoice) return;
    try {
      const rawEditFormProductDescription = editForm.productDescription;
      const rawEditFormDeliveryNoteRef = editForm.deliveryNoteRef;
      const rawEditFormOrderNumber = editForm.orderNumber;
      const rawEditFormUnit = editForm.unit;
      setIsSavingSummary(true);
      const quantity = editForm.quantity ? Number(editForm.quantity) : undefined;
      const costPerUnit = editForm.costPerUnit ? Number(editForm.costPerUnit) : undefined;
      const subtotal = editForm.subtotal ? Number(editForm.subtotal) : undefined;
      const vatAmount = editForm.vatAmount ? Number(editForm.vatAmount) : undefined;
      const totalAmount = editForm.totalAmount ? Number(editForm.totalAmount) : undefined;

      const updated = await auRubberApiClient.updateTaxInvoice(invoiceId, {
        productDescription: rawEditFormProductDescription || undefined,
        deliveryNoteRef: rawEditFormDeliveryNoteRef || undefined,
        orderNumber: rawEditFormOrderNumber || undefined,
        quantity,
        unit: rawEditFormUnit || undefined,
        costPerUnit,
        subtotal,
        vatAmount,
        totalAmount,
      });
      setInvoice(updated);
      setIsEditingSummary(false);
      showToast("Invoice summary updated", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Update failed";
      showToast(message, "error");
    } finally {
      setIsSavingSummary(false);
    }
  };

  const statusBadge = (status: TaxInvoiceStatus) => {
    const colors: Record<TaxInvoiceStatus, string> = {
      PENDING: "bg-gray-100 text-gray-800",
      EXTRACTED: "bg-blue-100 text-blue-800",
      APPROVED: "bg-green-100 text-green-800",
    };
    const labels: Record<TaxInvoiceStatus, string> = {
      PENDING: "Pending",
      EXTRACTED: "Extracted",
      APPROVED: "Approved",
    };
    return (
      <span
        className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${colors[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  const typeBadge = (type: TaxInvoiceType) => {
    const colors: Record<TaxInvoiceType, string> = {
      SUPPLIER: "bg-orange-100 text-orange-800",
      CUSTOMER: "bg-teal-100 text-teal-800",
    };
    return (
      <span
        className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${colors[type]}`}
      >
        {type}
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
          <p className="text-gray-600">{rawErrorMessage || "Invoice not found"}</p>
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
  const backPath =
    returnUrl ||
    (invoice.invoiceType === "SUPPLIER"
      ? "/au-rubber/portal/tax-invoices/suppliers"
      : "/au-rubber/portal/tax-invoices/customers");

  const backLabel = returnUrl
    ? "Back"
    : invoice.invoiceType === "SUPPLIER"
      ? "Supplier Tax Invoices"
      : "Customer Tax Invoices";

  const rawInvoiceInvoiceNumber = invoice.invoiceNumber;
  const rawInvoiceInvoiceNumber2 = invoice.invoiceNumber;
  const rawInvoiceCompanyName = invoice.companyName;
  const rawInvoiceProductDescription2 = invoice.productDescription;
  const rawExtractedDataDeliveryNoteRef2 = invoice.extractedData?.deliveryNoteRef;
  const rawExtractedDataOrderNumber2 = invoice.extractedData?.orderNumber;
  const rawInvoiceUnit2 = invoice.unit;

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: backLabel, href: backPath },
          { label: rawInvoiceInvoiceNumber || `INV-${invoice.id}` },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {rawInvoiceInvoiceNumber2 || `INV-${invoice.id}`}
          </h1>
          <div className="mt-2 flex items-center space-x-3">
            {typeBadge(invoice.invoiceType)}
            {statusBadge(invoice.status)}
            {invoice.exportedToSageAt && (
              <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                Exported
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {invoice.status === "APPROVED" &&
            invoice.invoiceType === "SUPPLIER" &&
            !invoice.isCreditNote && (
              <button
                onClick={handleRecomputeCompoundCosts}
                disabled={isRecomputingCosts}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Re-run S&N compound cost lookup for the rolls on this invoice"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRecomputingCosts ? "animate-spin" : ""}`} />
                {isRecomputingCosts ? "Recomputing..." : "Recompute compound costs"}
              </button>
            )}
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
              title="Tax Invoice Document"
            />
          ) : documentUrl ? (
            <iframe src={documentUrl} className="w-full h-full" title="Tax Invoice Document" />
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
          <h2 className="text-lg font-medium text-gray-900 mb-4">Invoice Details</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Company</dt>
              <dd className="mt-1 text-sm text-gray-900">{rawInvoiceCompanyName || "-"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Invoice Date</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {invoice.invoiceDate ? formatDateZA(invoice.invoiceDate) : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Invoice Type</dt>
              <dd className="mt-1 text-sm text-gray-900">{invoice.invoiceTypeLabel}</dd>
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Invoice Summary</h2>
            {!isEditingSummary ? (
              <button
                type="button"
                onClick={startEditingSummary}
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-600 transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={saveSummary}
                  disabled={isSavingSummary}
                  className="inline-flex items-center gap-1.5 text-sm text-white bg-orange-600 hover:bg-orange-700 px-3 py-1.5 rounded-md disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSavingSummary ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={cancelEditingSummary}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-md border border-gray-300"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            )}
          </div>
          {isEditingSummary ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Product Description
                </label>
                <input
                  type="text"
                  value={editForm.productDescription}
                  onChange={(e) => setEditForm({ ...editForm, productDescription: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Delivery Note Ref
                  </label>
                  <input
                    type="text"
                    value={editForm.deliveryNoteRef}
                    onChange={(e) => setEditForm({ ...editForm, deliveryNoteRef: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Order Number
                  </label>
                  <input
                    type="text"
                    value={editForm.orderNumber}
                    onChange={(e) => setEditForm({ ...editForm, orderNumber: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-2 border-t border-gray-100">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={editForm.quantity}
                    onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Unit</label>
                  <input
                    type="text"
                    value={editForm.unit}
                    onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                    placeholder="e.g. rolls, kg, sheets"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Cost per Unit
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.costPerUnit}
                    onChange={(e) => setEditForm({ ...editForm, costPerUnit: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-2 border-t border-gray-100">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Subtotal (ex VAT)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.subtotal}
                    onChange={(e) => setEditForm({ ...editForm, subtotal: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">VAT</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.vatAmount}
                    onChange={(e) => setEditForm({ ...editForm, vatAmount: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    Total (incl VAT)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.totalAmount}
                    onChange={(e) => setEditForm({ ...editForm, totalAmount: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
            </div>
          ) : invoice.extractedData ? (
            <dl className="space-y-4">
              {invoice.extractedData.lineItems && invoice.extractedData.lineItems.length > 1 ? (
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-2">
                    Line Items ({invoice.extractedData.lineItems.length})
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
                        {invoice.extractedData.lineItems.map((item, idx) => {
                          const itemRolls = item.rolls;
                          const itemDescription = item.description;
                          return (
                            <Fragment key={idx}>
                              <tr>
                                <td className="px-3 py-2 text-xs text-gray-400">{idx + 1}</td>
                                <td className="px-3 py-2 text-sm text-gray-900">
                                  {itemDescription}
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
                              <tr>
                                <td colSpan={5} className="p-0">
                                  <LineItemRollsPanel
                                    invoiceId={invoice.id}
                                    invoiceType={invoice.invoiceType}
                                    lineIdx={idx}
                                    description={itemDescription}
                                    rolls={itemRolls || null}
                                    isApproved={invoice.status === "APPROVED"}
                                    onSaved={fetchData}
                                  />
                                </td>
                              </tr>
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </dd>
                </div>
              ) : (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Product Description</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {rawInvoiceProductDescription2 || "-"}
                  </dd>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Delivery Note Ref</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {rawExtractedDataDeliveryNoteRef2 || "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Order Number</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {rawExtractedDataOrderNumber2 || "-"}
                  </dd>
                </div>
              </div>
              {invoice.extractedData.lineItems && invoice.extractedData.lineItems.length <= 1 ? (
                <>
                  <div className="grid grid-cols-3 gap-4 pt-2 border-t border-gray-100">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Quantity</dt>
                      <dd className="mt-1 text-lg font-semibold text-gray-900">
                        {invoice.numberOfRolls != null ? invoice.numberOfRolls : "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Unit</dt>
                      <dd className="mt-1 text-lg font-semibold text-gray-900">
                        {rawInvoiceUnit2 || "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Cost per Unit</dt>
                      <dd className="mt-1 text-lg font-semibold text-gray-900">
                        {formatCurrency(invoice.costPerUnit)}
                      </dd>
                    </div>
                  </div>
                  {(() => {
                    const singleLine = invoice.extractedData.lineItems[0];
                    const singleRolls = singleLine?.rolls;
                    if (!singleLine || !singleRolls || singleRolls.length === 0) return null;
                    return (
                      <div className="pt-2 border-t border-gray-100">
                        <dt className="text-sm font-medium text-gray-500 mb-2">
                          Rolls ({singleRolls.length})
                        </dt>
                        <dd>
                          <LineItemRollsPanel
                            invoiceId={invoice.id}
                            invoiceType={invoice.invoiceType}
                            lineIdx={0}
                            description={singleLine.description}
                            rolls={singleRolls}
                            isApproved={invoice.status === "APPROVED"}
                            onSaved={fetchData}
                          />
                        </dd>
                      </div>
                    );
                  })()}
                </>
              ) : null}
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
    </div>
  );
}
