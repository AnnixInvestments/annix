import { toPairs as entries } from "es-toolkit/compat";
import { StockControlApiClient } from "./base";
import type { StaffMember, StaffSignature } from "./types";

declare module "./base" {
  interface StockControlApiClient {
    staffMembers(params?: { search?: string; active?: string }): Promise<StaffMember[]>;
    staffMemberById(id: number): Promise<StaffMember>;
    createStaffMember(data: Partial<StaffMember>): Promise<StaffMember>;
    updateStaffMember(id: number, data: Partial<StaffMember>): Promise<StaffMember>;
    deleteStaffMember(id: number): Promise<StaffMember>;
    uploadStaffPhoto(id: number, file: File): Promise<StaffMember>;
    downloadStaffIdCardPdf(staffId: number): Promise<Blob>;
    downloadBatchStaffIdCards(ids?: number[]): Promise<Blob>;
    mySignature(): Promise<StaffSignature>;
    uploadSignature(signatureDataUrl: string): Promise<StaffSignature>;
    deleteSignature(): Promise<{ success: boolean }>;
  }
}

const proto = StockControlApiClient.prototype;

proto.staffMembers = async function (params) {
  const query = params
    ? "?" +
      entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
        .join("&")
    : "";
  return this.request(`/stock-control/staff${query}`);
};

proto.staffMemberById = async function (id) {
  return this.request(`/stock-control/staff/${id}`);
};

proto.createStaffMember = async function (data) {
  return this.request("/stock-control/staff", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

proto.updateStaffMember = async function (id, data) {
  return this.request(`/stock-control/staff/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
};

proto.deleteStaffMember = async function (id) {
  return this.request(`/stock-control/staff/${id}`, { method: "DELETE" });
};

proto.uploadStaffPhoto = async function (id, file) {
  return this.uploadFile(`/stock-control/staff/${id}/photo`, file);
};

proto.downloadStaffIdCardPdf = async function (staffId) {
  return this.requestBlob(`/stock-control/staff/${staffId}/qr/pdf`);
};

proto.downloadBatchStaffIdCards = async function (ids) {
  return this.requestBlob("/stock-control/staff/id-cards/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
};

proto.mySignature = async function () {
  return this.request("/stock-control/signatures");
};

proto.uploadSignature = async function (signatureDataUrl) {
  return this.request("/stock-control/signatures", {
    method: "POST",
    body: JSON.stringify({ signatureDataUrl }),
  });
};

proto.deleteSignature = async function () {
  return this.request("/stock-control/signatures", { method: "DELETE" });
};
