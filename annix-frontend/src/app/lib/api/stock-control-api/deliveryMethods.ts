import { StockControlApiClient } from "./base";
import type {
  AnalyzedDeliveryNoteData,
  AnalyzedDeliveryNoteResult,
  DeliveryNote,
  StockMovement,
  SupplierInvoice,
} from "./types";

declare module "./base" {
  interface StockControlApiClient {
    deliveryNotes(): Promise<DeliveryNote[]>;
    deliveryNoteById(id: number): Promise<DeliveryNote>;
    createDeliveryNote(data: {
      deliveryNumber: string;
      supplierName: string;
      receivedDate?: string;
      notes?: string;
      receivedBy?: string;
      items: { stockItemId: number; quantityReceived: number }[];
    }): Promise<DeliveryNote>;
    deleteDeliveryNote(id: number): Promise<void>;
    uploadDeliveryPhoto(id: number, file: File): Promise<DeliveryNote>;
    previewDeliveryStockMatches(id: number): Promise<
      Array<{
        description: string;
        sku: string;
        quantity: number;
        proposedMatch: {
          id: number;
          sku: string;
          name: string;
          quantity: number;
          category: string | null;
          score: number;
          matchType: string;
        } | null;
        isNew: boolean;
      }>
    >;
    linkDeliveryNoteToStock(
      id: number,
      overrides?: Array<{ description: string; matchedItemId: number | null }>,
    ): Promise<DeliveryNote>;
    savePendingDeliveryNote(
      file: File,
      analyzedData: AnalyzedDeliveryNoteData,
    ): Promise<DeliveryNote>;
    confirmDeliveryNote(id: number, confirmedData: Record<string, unknown>): Promise<DeliveryNote>;
    stockMovements(params?: {
      stockItemId?: number;
      movementType?: string;
      startDate?: string;
      endDate?: string;
    }): Promise<StockMovement[]>;
    createManualAdjustment(data: {
      stockItemId: number;
      movementType: string;
      quantity: number;
      notes?: string;
    }): Promise<StockMovement>;
    triggerDeliveryExtraction(deliveryNoteId: number): Promise<DeliveryNote>;
    deliveryExtractionStatus(
      deliveryNoteId: number,
    ): Promise<{ status: string | null; extractedData: Record<string, unknown> | null }>;
    analyzeDeliveryNotePhoto(file: File): Promise<AnalyzedDeliveryNoteResult>;
    acceptAnalyzedDeliveryNote(
      file: File,
      analyzedData: AnalyzedDeliveryNoteData,
      documentType?: string,
    ): Promise<DeliveryNote>;
    acceptAnalyzedInvoice(
      file: File,
      analyzedData: AnalyzedDeliveryNoteData,
    ): Promise<SupplierInvoice>;
  }
}

const proto = StockControlApiClient.prototype;

proto.deliveryNotes = async function () {
  return this.request("/stock-control/deliveries");
};

proto.deliveryNoteById = async function (id) {
  return this.request(`/stock-control/deliveries/${id}`);
};

proto.createDeliveryNote = async function (data) {
  return this.request("/stock-control/deliveries", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

proto.deleteDeliveryNote = async function (id) {
  return this.request(`/stock-control/deliveries/${id}`, { method: "DELETE" });
};

proto.uploadDeliveryPhoto = async function (id, file) {
  return this.uploadFile(`/stock-control/deliveries/${id}/photo`, file);
};

proto.previewDeliveryStockMatches = async function (id) {
  return this.request(`/stock-control/deliveries/${id}/preview-stock-matches`, { method: "POST" });
};

proto.linkDeliveryNoteToStock = async function (id, overrides) {
  const body = overrides ? JSON.stringify({ overrides }) : undefined;
  return this.request(`/stock-control/deliveries/${id}/link-to-stock`, {
    method: "POST",
    body,
  });
};

proto.savePendingDeliveryNote = async function (file, analyzedData) {
  return this.uploadFile("/stock-control/deliveries/save-pending", file, {
    analyzedData: JSON.stringify(analyzedData),
  });
};

proto.confirmDeliveryNote = async function (id, confirmedData) {
  return this.request(`/stock-control/deliveries/${id}/confirm`, {
    method: "PATCH",
    body: JSON.stringify(confirmedData),
  });
};

proto.stockMovements = async function (params) {
  const query = params
    ? "?" +
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
        .join("&")
    : "";
  return this.request(`/stock-control/movements${query}`);
};

proto.createManualAdjustment = async function (data) {
  return this.request("/stock-control/movements/adjustment", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

proto.triggerDeliveryExtraction = async function (deliveryNoteId) {
  return this.request(`/stock-control/deliveries/${deliveryNoteId}/extract`, { method: "POST" });
};

proto.deliveryExtractionStatus = async function (deliveryNoteId) {
  return this.request(`/stock-control/deliveries/${deliveryNoteId}/extraction`);
};

proto.analyzeDeliveryNotePhoto = async function (file) {
  return this.uploadFile("/stock-control/deliveries/analyze", file);
};

proto.acceptAnalyzedDeliveryNote = async function (file, analyzedData, documentType) {
  const resolvedType = documentType || analyzedData.documentType || "SUPPLIER_DELIVERY";
  return this.uploadFile("/stock-control/deliveries/accept-analyzed", file, {
    analyzedData: JSON.stringify(analyzedData),
    documentType: resolvedType,
  });
};

proto.acceptAnalyzedInvoice = async function (file, analyzedData) {
  return this.uploadFile("/stock-control/deliveries/accept-analyzed", file, {
    analyzedData: JSON.stringify(analyzedData),
    documentType: "SUPPLIER_INVOICE",
  });
};
