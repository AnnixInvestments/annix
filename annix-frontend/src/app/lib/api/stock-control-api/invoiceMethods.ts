import { throwIfNotOk } from "@/app/lib/api/apiError";
import { StockControlApiClient } from "./base";
import type {
  CreateInvoiceDto,
  InvoiceClarification,
  PriceChangeSummary,
  SubmitClarificationDto,
  SuggestedDeliveryNote,
  SupplierInvoice,
  SupplierInvoiceItem,
} from "./types";

declare module "./base" {
  interface StockControlApiClient {
    supplierInvoices(): Promise<SupplierInvoice[]>;
    supplierInvoiceById(id: number): Promise<SupplierInvoice>;
    createSupplierInvoice(dto: CreateInvoiceDto): Promise<SupplierInvoice>;
    uploadInvoiceScan(id: number, file: File): Promise<SupplierInvoice>;
    reExtractInvoice(invoiceId: number): Promise<SupplierInvoice>;
    invoiceClarifications(invoiceId: number): Promise<InvoiceClarification[]>;
    submitInvoiceClarification(
      invoiceId: number,
      clarificationId: number,
      dto: SubmitClarificationDto,
    ): Promise<InvoiceClarification>;
    skipInvoiceClarification(
      invoiceId: number,
      clarificationId: number,
    ): Promise<InvoiceClarification>;
    invoicePriceSummary(invoiceId: number): Promise<PriceChangeSummary>;
    approveInvoice(invoiceId: number): Promise<SupplierInvoice>;
    deleteInvoice(invoiceId: number): Promise<void>;
    updateInvoiceItem(
      invoiceId: number,
      itemId: number,
      updates: {
        quantity?: number;
        unitPrice?: number;
        unitType?: string;
        extractedDescription?: string;
      },
    ): Promise<SupplierInvoiceItem>;
    manualMatchInvoiceItem(
      invoiceId: number,
      itemId: number,
      stockItemId: number,
    ): Promise<SupplierInvoiceItem>;
    deleteInvoiceItem(invoiceId: number, itemId: number): Promise<void>;
    deleteUnmatchedInvoiceItems(invoiceId: number): Promise<void>;
    deleteSupplierInvoice(id: number): Promise<void>;
    unlinkedInvoices(): Promise<SupplierInvoice[]>;
    suggestedDeliveryNotes(invoiceId: number): Promise<SuggestedDeliveryNote[]>;
    linkInvoiceToDeliveryNote(invoiceId: number, deliveryNoteId: number): Promise<SupplierInvoice>;
    autoLinkInvoices(): Promise<{ linked: number; details: string[] }>;
    reExtractAllFailed(): Promise<{ triggered: number; failed: string[] }>;
    sageExportPreview(params: {
      dateFrom?: string;
      dateTo?: string;
      excludeExported?: boolean;
    }): Promise<{ invoiceCount: number; lineItemCount: number; totalAmount: number }>;
    sageExportCsv(params: {
      dateFrom?: string;
      dateTo?: string;
      excludeExported?: boolean;
    }): Promise<Blob>;
  }
}

const proto = StockControlApiClient.prototype;

proto.supplierInvoices = async function () {
  return this.request("/stock-control/invoices");
};

proto.supplierInvoiceById = async function (id) {
  return this.request(`/stock-control/invoices/${id}`);
};

proto.createSupplierInvoice = async function (dto) {
  return this.request("/stock-control/invoices", {
    method: "POST",
    body: JSON.stringify(dto),
  });
};

proto.uploadInvoiceScan = async function (id, file) {
  return this.uploadFile(`/stock-control/invoices/${id}/scan`, file);
};

proto.reExtractInvoice = async function (invoiceId) {
  return this.request(`/stock-control/invoices/${invoiceId}/re-extract`, { method: "POST" });
};

proto.invoiceClarifications = async function (invoiceId) {
  return this.request(`/stock-control/invoices/${invoiceId}/clarifications`);
};

proto.submitInvoiceClarification = async function (invoiceId, clarificationId, dto) {
  return this.request(`/stock-control/invoices/${invoiceId}/clarifications/${clarificationId}`, {
    method: "POST",
    body: JSON.stringify(dto),
  });
};

proto.skipInvoiceClarification = async function (invoiceId, clarificationId) {
  return this.request(
    `/stock-control/invoices/${invoiceId}/clarifications/${clarificationId}/skip`,
    { method: "POST" },
  );
};

proto.invoicePriceSummary = async function (invoiceId) {
  return this.request(`/stock-control/invoices/${invoiceId}/price-summary`);
};

proto.approveInvoice = async function (invoiceId) {
  return this.request(`/stock-control/invoices/${invoiceId}/approve`, { method: "POST" });
};

proto.deleteInvoice = async function (invoiceId) {
  return this.request(`/stock-control/invoices/${invoiceId}`, { method: "DELETE" });
};

proto.updateInvoiceItem = async function (invoiceId, itemId, updates) {
  return this.request(`/stock-control/invoices/${invoiceId}/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
};

proto.manualMatchInvoiceItem = async function (invoiceId, itemId, stockItemId) {
  return this.request(`/stock-control/invoices/${invoiceId}/items/${itemId}/match`, {
    method: "POST",
    body: JSON.stringify({ stockItemId }),
  });
};

proto.deleteInvoiceItem = async function (invoiceId, itemId) {
  await this.request(`/stock-control/invoices/${invoiceId}/items/${itemId}`, {
    method: "DELETE",
  });
};

proto.deleteUnmatchedInvoiceItems = async function (invoiceId) {
  const invoice = await this.supplierInvoiceById(invoiceId);
  const rawItems = invoice.items;
  const items = rawItems || [];
  const unmatched = items.filter((item: { stockItemId?: number | null }) => !item.stockItemId);
  for (const item of unmatched) {
    await this.deleteInvoiceItem(invoiceId, item.id);
  }
};

proto.deleteSupplierInvoice = async function (id) {
  return this.request(`/stock-control/invoices/${id}`, { method: "DELETE" });
};

proto.unlinkedInvoices = async function () {
  return this.request("/stock-control/invoices/unlinked");
};

proto.suggestedDeliveryNotes = async function (invoiceId) {
  return this.request(`/stock-control/invoices/${invoiceId}/suggested-delivery-notes`);
};

proto.linkInvoiceToDeliveryNote = async function (invoiceId, deliveryNoteId) {
  return this.request(`/stock-control/invoices/${invoiceId}/link-delivery-note`, {
    method: "POST",
    body: JSON.stringify({ deliveryNoteId }),
  });
};

proto.autoLinkInvoices = async function () {
  return this.request("/stock-control/invoices/auto-link", { method: "POST" });
};

proto.reExtractAllFailed = async function () {
  return this.request("/stock-control/invoices/re-extract-all-failed", { method: "POST" });
};

proto.sageExportPreview = async function (params) {
  const query = new URLSearchParams();
  if (params.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params.dateTo) query.set("dateTo", params.dateTo);
  if (params.excludeExported !== undefined)
    query.set("excludeExported", String(params.excludeExported));
  return this.request(`/stock-control/invoices/export/sage-preview?${query.toString()}`);
};

proto.sageExportCsv = async function (params) {
  const query = new URLSearchParams();
  if (params.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params.dateTo) query.set("dateTo", params.dateTo);
  if (params.excludeExported !== undefined)
    query.set("excludeExported", String(params.excludeExported));
  const url = `${this.baseURL}/stock-control/invoices/export/sage-csv?${query.toString()}`;
  const response = await fetch(url, { headers: this.headers() });
  await throwIfNotOk(response);
  return response.blob();
};
