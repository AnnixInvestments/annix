import { StockControlApiClient } from "./base";
import type {
  BatchIssuanceDto,
  BatchIssuanceResult,
  CpoBatchIssuanceDto,
  CpoBatchIssuanceResult,
  CpoBatchIssueContext,
  CreateIssuanceDto,
  IssuanceFilters,
  IssuanceScanResult,
  IssuanceSession,
  StockIssuance,
} from "./types";

declare module "./base" {
  interface StockControlApiClient {
    scanIssuanceQr(qrCode: string): Promise<IssuanceScanResult>;
    createIssuance(dto: CreateIssuanceDto): Promise<StockIssuance>;
    createBatchIssuance(dto: BatchIssuanceDto): Promise<BatchIssuanceResult>;
    createCpoBatchIssuance(dto: CpoBatchIssuanceDto): Promise<CpoBatchIssuanceResult>;
    cpoBatchIssueContext(cpoId: number): Promise<CpoBatchIssueContext>;
    issuanceHistory(filters?: IssuanceFilters): Promise<StockIssuance[]>;
    issuanceById(id: number): Promise<StockIssuance>;
    recentIssuances(): Promise<StockIssuance[]>;
    undoIssuance(id: number): Promise<StockIssuance>;
    issuanceSessionById(id: number): Promise<IssuanceSession>;
    undoIssuanceSession(id: number): Promise<IssuanceSession>;
    approveIssuanceSession(id: number, managerStaffId: number): Promise<IssuanceSession>;
    rejectIssuanceSession(id: number, reason: string): Promise<IssuanceSession>;
    pendingApprovalSessions(): Promise<IssuanceSession[]>;
    sessionsForCpo(cpoId: number): Promise<IssuanceSession[]>;
    sessionsForJobCard(jobCardId: number): Promise<IssuanceSession[]>;
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

proto.createCpoBatchIssuance = async function (dto) {
  return this.request("/stock-control/issuance/cpo-batch", {
    method: "POST",
    body: JSON.stringify(dto),
  });
};

proto.cpoBatchIssueContext = async function (cpoId) {
  return this.request(`/stock-control/issuance/cpo-batch/context/${cpoId}`);
};

proto.issuanceSessionById = async function (id) {
  return this.request(`/stock-control/issuance/sessions/${id}`);
};

proto.undoIssuanceSession = async function (id) {
  return this.request(`/stock-control/issuance/sessions/${id}/undo`, { method: "POST" });
};

proto.approveIssuanceSession = async function (id, managerStaffId) {
  return this.request(`/stock-control/issuance/sessions/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ managerStaffId }),
  });
};

proto.rejectIssuanceSession = async function (id, reason) {
  return this.request(`/stock-control/issuance/sessions/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
};

proto.pendingApprovalSessions = async function () {
  return this.request("/stock-control/issuance/sessions/pending-approval");
};

proto.sessionsForCpo = async function (cpoId) {
  return this.request(`/stock-control/issuance/sessions/by-cpo/${cpoId}`);
};

proto.sessionsForJobCard = async function (jobCardId) {
  return this.request(`/stock-control/issuance/sessions/by-job-card/${jobCardId}`);
};
