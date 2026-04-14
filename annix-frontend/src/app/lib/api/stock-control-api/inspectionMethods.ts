import { StockControlApiClient } from "./base";
import type { InspectionBooking } from "./types";

declare module "./base" {
  interface StockControlApiClient {
    createInspectionBooking(
      jobCardId: number,
      data: {
        inspectionDate: string;
        startTime: string;
        endTime: string;
        inspectorEmail: string;
        inspectorName?: string;
        notes?: string;
      },
    ): Promise<InspectionBooking>;
    inspectionBookingsForJobCard(jobCardId: number): Promise<InspectionBooking[]>;
    inspectionBookingsForRange(startDate: string, endDate: string): Promise<InspectionBooking[]>;
    bookedSlotsForDate(date: string): Promise<InspectionBooking[]>;
    completeInspection(bookingId: number, notes?: string): Promise<InspectionBooking>;
    cancelInspection(bookingId: number): Promise<InspectionBooking>;
    acceptInspectionProposal(bookingId: number): Promise<InspectionBooking>;
    rejectInspectionProposal(bookingId: number): Promise<InspectionBooking>;
  }
}

const proto = StockControlApiClient.prototype;

proto.createInspectionBooking = async function (jobCardId, data) {
  return this.request(`/stock-control/workflow/job-cards/${jobCardId}/inspection-bookings`, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

proto.inspectionBookingsForJobCard = async function (jobCardId) {
  return this.request(`/stock-control/workflow/job-cards/${jobCardId}/inspection-bookings`);
};

proto.inspectionBookingsForRange = async function (startDate, endDate) {
  return this.request(
    `/stock-control/workflow/inspection-bookings?startDate=${startDate}&endDate=${endDate}`,
  );
};

proto.bookedSlotsForDate = async function (date) {
  return this.request(`/stock-control/workflow/inspection-bookings/date/${date}/slots`);
};

proto.completeInspection = async function (bookingId, notes) {
  return this.request(`/stock-control/workflow/inspection-bookings/${bookingId}/complete`, {
    method: "POST",
    body: JSON.stringify({ notes: notes || null }),
  });
};

proto.cancelInspection = async function (bookingId) {
  return this.request(`/stock-control/workflow/inspection-bookings/${bookingId}/cancel`, {
    method: "POST",
  });
};

proto.acceptInspectionProposal = async function (bookingId) {
  return this.request(`/stock-control/workflow/inspection-bookings/${bookingId}/accept-proposal`, {
    method: "POST",
  });
};

proto.rejectInspectionProposal = async function (bookingId) {
  return this.request(`/stock-control/workflow/inspection-bookings/${bookingId}/reject-proposal`, {
    method: "POST",
  });
};
