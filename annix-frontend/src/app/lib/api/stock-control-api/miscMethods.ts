import { StockControlApiClient } from "./base";
import type {
  CpoCalloffBreakdown,
  CpoCalloffRecord,
  CpoDeliveryHistory,
  CpoFulfillmentReportItem,
  CpoImportResult,
  CpoOverdueInvoiceItem,
  CustomerPurchaseOrder,
  GlobalSearchResponse,
  GlossaryTerm,
  InboundEmail,
  InboundEmailAttachment,
  InboundEmailConfigResponse,
  InboundEmailConfigUpdate,
  InboundEmailStats,
  JobCardImportRow,
  JobCardImportUploadResponse,
  Requisition,
  RequisitionItem,
  StockControlSupplierDto,
} from "./types";

declare module "./base" {
  interface StockControlApiClient {
    requisitions(): Promise<Requisition[]>;
    requisitionById(id: number): Promise<Requisition>;
    updateRequisitionItem(
      reqId: number,
      itemId: number,
      data: { packSizeLitres?: number; reorderQty?: number | null; reqNumber?: string | null },
    ): Promise<RequisitionItem>;
    suppliers(): Promise<StockControlSupplierDto[]>;
    createSupplier(data: {
      name: string;
      vatNumber?: string;
      registrationNumber?: string;
      address?: string;
      contactPerson?: string;
      phone?: string;
      email?: string;
    }): Promise<StockControlSupplierDto>;
    cpos(status?: string): Promise<CustomerPurchaseOrder[]>;
    cpoById(id: number): Promise<CustomerPurchaseOrder>;
    uploadCpoImportFile(file: File): Promise<JobCardImportUploadResponse>;
    confirmCpoImport(rows: JobCardImportRow[]): Promise<CpoImportResult>;
    updateCpoStatus(id: number, status: string): Promise<CustomerPurchaseOrder>;
    deleteCpo(id: number): Promise<void>;
    cpoCalloffRecords(cpoId: number): Promise<CpoCalloffRecord[]>;
    cpoDeliveryHistory(cpoId: number): Promise<CpoDeliveryHistory>;
    updateCalloffRecordStatus(recordId: number, status: string): Promise<CpoCalloffRecord>;
    cpoFulfillmentReport(): Promise<CpoFulfillmentReportItem[]>;
    cpoCalloffBreakdown(): Promise<CpoCalloffBreakdown>;
    cpoOverdueInvoices(): Promise<CpoOverdueInvoiceItem[]>;
    cpoExportCsv(): Promise<Blob>;
    globalSearch(query: string, limit?: number): Promise<GlobalSearchResponse>;
    glossaryTerms(): Promise<GlossaryTerm[]>;
    upsertGlossaryTerm(
      abbreviation: string,
      body: { term: string; definition: string; category?: string | null },
    ): Promise<GlossaryTerm>;
    deleteGlossaryTerm(abbreviation: string): Promise<void>;
    resetGlossary(): Promise<void>;
    inboundEmailConfig(): Promise<InboundEmailConfigResponse>;
    updateInboundEmailConfig(dto: InboundEmailConfigUpdate): Promise<{ message: string }>;
    testInboundEmailConnection(): Promise<{ success: boolean; error?: string }>;
    inboundEmails(filters?: {
      status?: string;
      dateFrom?: string;
      dateTo?: string;
      documentType?: string;
      page?: number;
      limit?: number;
    }): Promise<{ items: InboundEmail[]; total: number }>;
    inboundEmailDetail(emailId: number): Promise<InboundEmail>;
    reclassifyAttachment(
      attachmentId: number,
      documentType: string,
    ): Promise<InboundEmailAttachment>;
    inboundEmailStats(): Promise<InboundEmailStats>;
  }
}

const proto = StockControlApiClient.prototype;

proto.requisitions = async function () {
  return this.request("/stock-control/requisitions");
};

proto.requisitionById = async function (id) {
  return this.request(`/stock-control/requisitions/${id}`);
};

proto.updateRequisitionItem = async function (reqId, itemId, data) {
  return this.request(`/stock-control/requisitions/${reqId}/items/${itemId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

proto.suppliers = async function () {
  return this.request("/stock-control/suppliers");
};

proto.createSupplier = async function (data) {
  return this.request("/stock-control/suppliers", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

proto.cpos = async function (status) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return this.request(`/stock-control/cpos${query}`);
};

proto.cpoById = async function (id) {
  return this.request(`/stock-control/cpos/${id}`);
};

proto.uploadCpoImportFile = async function (file) {
  return this.uploadFile("/stock-control/cpos/upload", file);
};

proto.confirmCpoImport = async function (rows) {
  return this.request("/stock-control/cpos/confirm", {
    method: "POST",
    body: JSON.stringify({ rows }),
  });
};

proto.updateCpoStatus = async function (id, status) {
  return this.request(`/stock-control/cpos/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
};

proto.deleteCpo = async function (id) {
  return this.request(`/stock-control/cpos/${id}`, { method: "DELETE" });
};

proto.cpoCalloffRecords = async function (cpoId) {
  return this.request(`/stock-control/cpos/${cpoId}/calloff-records`);
};

proto.cpoDeliveryHistory = async function (cpoId) {
  return this.request(`/stock-control/cpos/${cpoId}/delivery-history`);
};

proto.updateCalloffRecordStatus = async function (recordId, status) {
  return this.request(`/stock-control/cpos/calloff-records/${recordId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
};

proto.cpoFulfillmentReport = async function () {
  return this.request("/stock-control/cpos/reports/fulfillment");
};

proto.cpoCalloffBreakdown = async function () {
  return this.request("/stock-control/cpos/reports/calloff-breakdown");
};

proto.cpoOverdueInvoices = async function () {
  return this.request("/stock-control/cpos/reports/overdue-invoices");
};

proto.cpoExportCsv = async function () {
  const h = this.authHeaders();
  const response = await fetch(`${this.baseURL}/stock-control/cpos/reports/export`, { headers: h });
  if (!response.ok) {
    throw new Error("Failed to export CSV");
  }
  return response.blob();
};

proto.globalSearch = async function (query, limit = 20) {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  return this.request(`/stock-control/search?${params.toString()}`);
};

proto.glossaryTerms = async function () {
  return this.request("/stock-control/glossary");
};

proto.upsertGlossaryTerm = async function (abbreviation, body) {
  return this.request(`/stock-control/glossary/${encodeURIComponent(abbreviation)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
};

proto.deleteGlossaryTerm = async function (abbreviation) {
  return this.request(`/stock-control/glossary/${encodeURIComponent(abbreviation)}`, {
    method: "DELETE",
  });
};

proto.resetGlossary = async function () {
  return this.request("/stock-control/glossary", { method: "DELETE" });
};

proto.inboundEmailConfig = async function () {
  return this.request(
    "/inbound-email/stock-control/{companyId}/config".replace("{companyId}", this.companyIdParam()),
  );
};

proto.updateInboundEmailConfig = async function (dto) {
  return this.request(
    "/inbound-email/stock-control/{companyId}/config".replace("{companyId}", this.companyIdParam()),
    {
      method: "PATCH",
      body: JSON.stringify(dto),
    },
  );
};

proto.testInboundEmailConnection = async function () {
  return this.request(
    "/inbound-email/stock-control/{companyId}/test-connection".replace(
      "{companyId}",
      this.companyIdParam(),
    ),
    { method: "POST" },
  );
};

proto.inboundEmails = async function (filters) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters?.dateTo) params.set("dateTo", filters.dateTo);
  if (filters?.documentType) params.set("documentType", filters.documentType);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();
  return this.request(
    `/inbound-email/stock-control/${this.companyIdParam()}/emails${qs ? `?${qs}` : ""}`,
  );
};

proto.inboundEmailDetail = async function (emailId) {
  return this.request(`/inbound-email/stock-control/${this.companyIdParam()}/emails/${emailId}`);
};

proto.reclassifyAttachment = async function (attachmentId, documentType) {
  return this.request(`/inbound-email/attachments/${attachmentId}/reclassify`, {
    method: "PATCH",
    body: JSON.stringify({ documentType }),
  });
};

proto.inboundEmailStats = async function () {
  return this.request(`/inbound-email/stock-control/${this.companyIdParam()}/stats`);
};
