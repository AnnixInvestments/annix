import { API_BASE_URL } from "@/lib/api-config";
import { StockControlApiClient } from "./base";
import type {
  ImportMatchRow,
  ImportResult,
  ImportUploadResponse,
  ReviewedImportResult,
  ReviewedRow,
  StockItem,
  StockPriceHistory,
} from "./types";

declare module "./base" {
  interface StockControlApiClient {
    stockItems(params?: {
      category?: string;
      belowMinStock?: string;
      search?: string;
      page?: string;
      limit?: string;
    }): Promise<{ items: StockItem[]; total: number }>;
    stockItemById(id: number): Promise<StockItem>;
    createStockItem(data: Partial<StockItem>): Promise<StockItem>;
    updateStockItem(id: number, data: Partial<StockItem>): Promise<StockItem>;
    deleteStockItem(id: number): Promise<void>;
    uploadStockItemPhoto(id: number, file: File): Promise<StockItem>;
    identifyFromPhoto(
      file: File,
      context?: string,
    ): Promise<{
      identifiedItems: {
        name: string;
        category: string;
        description: string;
        confidence: number;
        suggestedSku: string;
      }[];
      matchingStockItems: {
        id: number;
        sku: string;
        name: string;
        category: string | null;
        similarity: number;
      }[];
      rawAnalysis: string;
    }>;
    identifyForIssuance(file: File): Promise<{
      productName: string | null;
      batchNumber: string | null;
      confidence: number;
      analysis: string;
      matchingStockItems: {
        id: number;
        sku: string;
        name: string;
        category: string | null;
        similarity: number;
      }[];
    }>;
    lowStockAlerts(): Promise<StockItem[]>;
    categories(): Promise<string[]>;
    stockItemsGrouped(
      search?: string,
      locationId?: number,
      page?: number,
      limit?: number,
    ): Promise<{
      groups: { category: string; items: StockItem[] }[];
      total: number;
      page: number;
      limit: number;
    }>;
    uploadImportFile(file: File): Promise<ImportUploadResponse>;
    confirmImport(
      rows: unknown[],
      isStockTake?: boolean,
      stockTakeDate?: string | null,
    ): Promise<ImportResult>;
    clearQrPrintFlag(ids: number[]): Promise<{ cleared: number }>;
    downloadStockItemQrPdf(id: number): Promise<void>;
    downloadBatchLabelsPdf(body: {
      ids?: number[];
      search?: string;
      category?: string;
    }): Promise<void>;
    stockItemPriceHistory(stockItemId: number, limit?: number): Promise<StockPriceHistory[]>;
    matchImportRows(rows: unknown[]): Promise<ImportMatchRow[]>;
    confirmReviewedImport(
      rows: ReviewedRow[],
      isStockTake?: boolean,
      stockTakeDate?: string | null,
    ): Promise<ReviewedImportResult>;
  }
}

const proto = StockControlApiClient.prototype;

proto.stockItems = async function (params) {
  const query = params
    ? "?" +
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
        .join("&")
    : "";
  return this.request(`/stock-control/inventory${query}`);
};

proto.stockItemById = async function (id) {
  return this.request(`/stock-control/inventory/${id}`);
};

proto.createStockItem = async function (data) {
  return this.request("/stock-control/inventory", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

proto.updateStockItem = async function (id, data) {
  return this.request(`/stock-control/inventory/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

proto.deleteStockItem = async function (id) {
  return this.request(`/stock-control/inventory/${id}`, { method: "DELETE" });
};

proto.uploadStockItemPhoto = async function (id, file) {
  return this.uploadFile(`/stock-control/inventory/${id}/photo`, file);
};

proto.identifyFromPhoto = async function (file, context) {
  return this.uploadFile(
    "/stock-control/inventory/identify-photo",
    file,
    context ? { context } : undefined,
  );
};

proto.identifyForIssuance = async function (file) {
  return this.uploadFile("/stock-control/inventory/identify-issuance-photo", file);
};

proto.lowStockAlerts = async function () {
  return this.request("/stock-control/inventory/low-stock");
};

proto.categories = async function () {
  return this.request("/stock-control/inventory/categories");
};

proto.stockItemsGrouped = async function (search, locationId, page, limit) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (locationId) params.set("locationId", String(locationId));
  if (page) params.set("page", String(page));
  if (limit) params.set("limit", String(limit));
  const query = params.toString() ? `?${params.toString()}` : "";
  return this.request(`/stock-control/inventory/grouped${query}`);
};

proto.uploadImportFile = async function (file) {
  return this.uploadFile("/stock-control/import/upload", file);
};

proto.confirmImport = async function (rows, isStockTake = false, stockTakeDate = null) {
  return this.request("/stock-control/import/confirm", {
    method: "POST",
    body: JSON.stringify({ rows, isStockTake, stockTakeDate }),
  });
};

proto.clearQrPrintFlag = async function (ids) {
  return this.request("/stock-control/inventory/clear-qr-print", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
};

proto.downloadStockItemQrPdf = async function (id) {
  return this.downloadBlob(`/stock-control/inventory/${id}/qr/pdf`, `stock-${id}-label.pdf`);
};

proto.downloadBatchLabelsPdf = async function (body) {
  const h = this.headers();
  const response = await fetch(`${API_BASE_URL}/stock-control/inventory/labels/pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: h.Authorization ?? "",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Failed to download labels PDF: ${response.status}`);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "shelf-labels.pdf";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

proto.stockItemPriceHistory = async function (stockItemId, limit) {
  const query = limit ? `?limit=${limit}` : "";
  return this.request(`/stock-control/inventory/${stockItemId}/price-history${query}`);
};

proto.matchImportRows = async function (rows) {
  return this.request("/stock-control/import/match", {
    method: "POST",
    body: JSON.stringify({ rows }),
  });
};

proto.confirmReviewedImport = async function (rows, isStockTake = false, stockTakeDate = null) {
  return this.request("/stock-control/import/confirm-reviewed", {
    method: "POST",
    body: JSON.stringify({ rows, isStockTake, stockTakeDate }),
  });
};
