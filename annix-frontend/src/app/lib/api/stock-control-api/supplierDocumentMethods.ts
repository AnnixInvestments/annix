import { StockControlApiClient } from "./base";
import type { SupplierDocument, SupplierDocumentExpiryStatus, SupplierDocumentType } from "./types";

declare module "./base" {
  interface StockControlApiClient {
    supplierDocuments(filters?: {
      supplierId?: number;
      docType?: SupplierDocumentType;
      expiryStatus?: SupplierDocumentExpiryStatus;
    }): Promise<SupplierDocument[]>;
    supplierDocumentById(id: number): Promise<SupplierDocument>;
    expiringSupplierDocuments(withinDays?: number): Promise<SupplierDocument[]>;
    uploadSupplierDocument(
      file: File,
      data: {
        supplierId: number;
        docType: SupplierDocumentType;
        docNumber?: string | null;
        issuedAt?: string | null;
        expiresAt?: string | null;
        notes?: string | null;
      },
    ): Promise<SupplierDocument>;
    updateSupplierDocument(
      id: number,
      data: {
        docType?: SupplierDocumentType;
        docNumber?: string | null;
        issuedAt?: string | null;
        expiresAt?: string | null;
        notes?: string | null;
      },
    ): Promise<SupplierDocument>;
    deleteSupplierDocument(id: number): Promise<{ deleted: boolean }>;
  }
}

const proto = StockControlApiClient.prototype;

proto.supplierDocuments = async function (filters) {
  const params = new URLSearchParams();
  if (filters?.supplierId) params.set("supplierId", String(filters.supplierId));
  if (filters?.docType) params.set("docType", filters.docType);
  if (filters?.expiryStatus) params.set("expiryStatus", filters.expiryStatus);
  const qs = params.toString();
  return this.request(`/stock-control/supplier-documents${qs ? `?${qs}` : ""}`);
};

proto.supplierDocumentById = async function (id) {
  return this.request(`/stock-control/supplier-documents/${id}`);
};

proto.expiringSupplierDocuments = async function (withinDays) {
  const qs = withinDays !== undefined ? `?days=${withinDays}` : "";
  return this.request(`/stock-control/supplier-documents/expiring-soon${qs}`);
};

proto.uploadSupplierDocument = async function (file, data) {
  const extraFields: Record<string, string> = {
    supplierId: String(data.supplierId),
    docType: data.docType,
  };
  if (data.docNumber) extraFields.docNumber = data.docNumber;
  if (data.issuedAt) extraFields.issuedAt = data.issuedAt;
  if (data.expiresAt) extraFields.expiresAt = data.expiresAt;
  if (data.notes) extraFields.notes = data.notes;
  return this.uploadFile("/stock-control/supplier-documents", file, extraFields);
};

proto.updateSupplierDocument = async function (id, data) {
  return this.request(`/stock-control/supplier-documents/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

proto.deleteSupplierDocument = async function (id) {
  return this.request(`/stock-control/supplier-documents/${id}`, { method: "DELETE" });
};
