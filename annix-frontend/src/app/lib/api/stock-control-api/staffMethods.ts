import { API_BASE_URL } from "@/lib/api-config";
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
    downloadStaffIdCardPdf(staffId: number): Promise<void>;
    downloadBatchStaffIdCards(ids?: number[]): Promise<void>;
    mySignature(): Promise<StaffSignature>;
    uploadSignature(signatureDataUrl: string): Promise<StaffSignature>;
    deleteSignature(): Promise<{ success: boolean }>;
  }
}

const proto = StockControlApiClient.prototype;

proto.staffMembers = async function (params) {
  const query = params
    ? "?" +
      Object.entries(params)
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
  const h = this.headers();
  const response = await fetch(`${API_BASE_URL}/stock-control/staff/${staffId}/qr/pdf`, {
    headers: { Authorization: h.Authorization ?? "" },
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      const errorData = await response.json();
      throw new Error(
        errorData.message ?? `Failed to download staff ID card PDF: ${response.status}`,
      );
    }
    throw new Error(`Failed to download staff ID card PDF: ${response.status}`);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  window.open(url, "_blank");
};

proto.downloadBatchStaffIdCards = async function (ids) {
  const h = this.headers();
  const response = await fetch(`${API_BASE_URL}/stock-control/staff/id-cards/pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: h.Authorization ?? "",
    },
    body: JSON.stringify({ ids }),
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      const errorData = await response.json();
      throw new Error(
        errorData.message ?? `Failed to download batch ID cards: ${response.status}`,
      );
    }
    throw new Error(`Failed to download batch ID cards: ${response.status}`);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  window.open(url, "_blank");
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
