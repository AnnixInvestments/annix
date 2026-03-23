import { StockControlApiClient } from "./base";
import type {
  ReconciliationDocCategory,
  ReconciliationDocumentRecord,
  ReconciliationEventRecord,
  ReconciliationEventType,
  ReconciliationGateStatus,
  ReconciliationItemRecord,
  ReconciliationSummary,
} from "./types";

declare module "./base" {
  interface StockControlApiClient {
    reconciliationDocuments(jobCardId: number): Promise<ReconciliationDocumentRecord[]>;
    uploadReconciliationDocument(
      jobCardId: number,
      file: File,
      category: ReconciliationDocCategory,
    ): Promise<ReconciliationDocumentRecord>;
    deleteReconciliationDocument(jobCardId: number, docId: number): Promise<void>;
    reconciliationDocumentViewUrl(jobCardId: number, docId: number): Promise<{ url: string }>;
    reconciliationDocumentDownloadUrl(jobCardId: number, docId: number): string;
    retryReconciliationExtraction(jobCardId: number, docId: number): Promise<void>;
    reconciliationGateStatus(jobCardId: number): Promise<ReconciliationGateStatus>;
    reconciliationItems(jobCardId: number): Promise<ReconciliationItemRecord[]>;
    addReconciliationItem(
      jobCardId: number,
      data: { itemDescription: string; itemCode: string | null; quantityOrdered: number },
    ): Promise<ReconciliationItemRecord>;
    updateReconciliationItem(
      jobCardId: number,
      itemId: number,
      data: Partial<ReconciliationItemRecord>,
    ): Promise<ReconciliationItemRecord>;
    deleteReconciliationItem(jobCardId: number, itemId: number): Promise<void>;
    recordReconciliationEvent(
      jobCardId: number,
      data: {
        eventType: ReconciliationEventType;
        items: Array<{ reconciliationItemId: number; quantity: number }>;
        referenceNumber: string | null;
        notes: string | null;
      },
    ): Promise<ReconciliationEventRecord[]>;
    reconciliationSummary(jobCardId: number): Promise<ReconciliationSummary>;
  }
}

const proto = StockControlApiClient.prototype;

proto.reconciliationDocuments = async function (jobCardId) {
  return this.request(`/stock-control/job-cards/${jobCardId}/reconciliation/documents`);
};

proto.uploadReconciliationDocument = async function (jobCardId, file, category) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", category);
  return this.request(`/stock-control/job-cards/${jobCardId}/reconciliation/documents`, {
    method: "POST",
    body: formData,
  });
};

proto.deleteReconciliationDocument = async function (jobCardId, docId) {
  return this.request(`/stock-control/job-cards/${jobCardId}/reconciliation/documents/${docId}`, {
    method: "DELETE",
  });
};

proto.reconciliationDocumentViewUrl = async function (jobCardId, docId) {
  return this.request(
    `/stock-control/job-cards/${jobCardId}/reconciliation/documents/${docId}/view`,
  );
};

proto.reconciliationDocumentDownloadUrl = (jobCardId, docId) =>
  `/api/stock-control/job-cards/${jobCardId}/reconciliation/documents/${docId}/download`;

proto.retryReconciliationExtraction = async function (jobCardId, docId) {
  return this.request(
    `/stock-control/job-cards/${jobCardId}/reconciliation/documents/${docId}/retry-extraction`,
    { method: "POST" },
  );
};

proto.reconciliationGateStatus = async function (jobCardId) {
  return this.request(`/stock-control/job-cards/${jobCardId}/reconciliation/gate-status`);
};

proto.reconciliationItems = async function (jobCardId) {
  return this.request(`/stock-control/job-cards/${jobCardId}/reconciliation/items`);
};

proto.addReconciliationItem = async function (jobCardId, data) {
  return this.request(`/stock-control/job-cards/${jobCardId}/reconciliation/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

proto.updateReconciliationItem = async function (jobCardId, itemId, data) {
  return this.request(`/stock-control/job-cards/${jobCardId}/reconciliation/items/${itemId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

proto.deleteReconciliationItem = async function (jobCardId, itemId) {
  return this.request(`/stock-control/job-cards/${jobCardId}/reconciliation/items/${itemId}`, {
    method: "DELETE",
  });
};

proto.recordReconciliationEvent = async function (jobCardId, data) {
  return this.request(`/stock-control/job-cards/${jobCardId}/reconciliation/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

proto.reconciliationSummary = async function (jobCardId) {
  return this.request(`/stock-control/job-cards/${jobCardId}/reconciliation/summary`);
};
