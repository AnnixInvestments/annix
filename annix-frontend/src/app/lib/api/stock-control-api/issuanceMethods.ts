import { StockControlApiClient } from "./base";
import type {
  BatchIssuanceDto,
  BatchIssuanceResult,
  CreateIssuanceDto,
  IssuanceFilters,
  IssuanceScanResult,
  StockIssuance,
} from "./types";

declare module "./base" {
  interface StockControlApiClient {
    scanIssuanceQr(qrCode: string): Promise<IssuanceScanResult>;
    createIssuance(dto: CreateIssuanceDto): Promise<StockIssuance>;
    createBatchIssuance(dto: BatchIssuanceDto): Promise<BatchIssuanceResult>;
    issuanceHistory(filters?: IssuanceFilters): Promise<StockIssuance[]>;
    issuanceById(id: number): Promise<StockIssuance>;
    recentIssuances(): Promise<StockIssuance[]>;
    undoIssuance(id: number): Promise<StockIssuance>;
  }
}

const proto = StockControlApiClient.prototype;

proto.scanIssuanceQr = async function (qrCode) {
  return this.request("/stock-control/issuance/scan-qr", {
    method: "POST",
    body: JSON.stringify({ qrCode }),
  });
};

proto.createIssuance = async function (dto) {
  return this.request("/stock-control/issuance", {
    method: "POST",
    body: JSON.stringify(dto),
  });
};

proto.createBatchIssuance = async function (dto) {
  return this.request("/stock-control/issuance/batch", {
    method: "POST",
    body: JSON.stringify(dto),
  });
};

proto.issuanceHistory = async function (filters) {
  const params = new URLSearchParams();
  if (filters?.startDate) params.set("startDate", filters.startDate);
  if (filters?.endDate) params.set("endDate", filters.endDate);
  if (filters?.staffId) params.set("staffId", String(filters.staffId));
  if (filters?.stockItemId) params.set("stockItemId", String(filters.stockItemId));
  if (filters?.jobCardId) params.set("jobCardId", String(filters.jobCardId));
  const query = params.toString() ? `?${params.toString()}` : "";
  return this.request(`/stock-control/issuance${query}`);
};

proto.issuanceById = async function (id) {
  return this.request(`/stock-control/issuance/${id}`);
};

proto.recentIssuances = async function () {
  return this.request("/stock-control/issuance/recent");
};

proto.undoIssuance = async function (id) {
  return this.request(`/stock-control/issuance/${id}/undo`, { method: "POST" });
};
