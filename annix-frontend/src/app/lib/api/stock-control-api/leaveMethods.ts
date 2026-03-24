import { StockControlApiClient } from "./base";
import type { CreateLeaveRequest, StaffLeaveRecord } from "./types";

declare module "./base" {
  interface StockControlApiClient {
    leaveRecordsForMonth(year: number, month: number): Promise<StaffLeaveRecord[]>;
    leaveRecordsForUser(userId: number): Promise<StaffLeaveRecord[]>;
    onLeaveToday(): Promise<{ userIds: number[] }>;
    createLeaveRecord(data: CreateLeaveRequest): Promise<StaffLeaveRecord>;
    deleteLeaveRecord(id: number): Promise<{ message: string }>;
    adminDeleteLeaveRecord(id: number): Promise<{ message: string }>;
    uploadSickNote(leaveRecordId: number, file: File): Promise<StaffLeaveRecord>;
    sickNoteUrl(leaveRecordId: number): Promise<{ url: string }>;
  }
}

const proto = StockControlApiClient.prototype;

proto.leaveRecordsForMonth = async function (year, month) {
  return this.request(`/stock-control/leave?year=${year}&month=${month}`);
};

proto.leaveRecordsForUser = async function (userId) {
  return this.request(`/stock-control/leave/user/${userId}`);
};

proto.onLeaveToday = async function () {
  return this.request("/stock-control/leave/on-leave-today");
};

proto.createLeaveRecord = async function (data) {
  return this.request("/stock-control/leave", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

proto.deleteLeaveRecord = async function (id) {
  return this.request(`/stock-control/leave/${id}`, {
    method: "DELETE",
  });
};

proto.adminDeleteLeaveRecord = async function (id) {
  return this.request(`/stock-control/leave/${id}/admin`, {
    method: "DELETE",
  });
};

proto.uploadSickNote = async function (leaveRecordId, file) {
  return this.uploadFile(`/stock-control/leave/${leaveRecordId}/sick-note`, file);
};

proto.sickNoteUrl = async function (leaveRecordId) {
  return this.request(`/stock-control/leave/${leaveRecordId}/sick-note`);
};
