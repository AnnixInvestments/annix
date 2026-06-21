import { useQuery } from "@tanstack/react-query";
import { browserBaseUrl } from "@/lib/api-config";
import { publicKeys } from "../../keys";

interface InspectionBookingDetails {
  booking: {
    id: number;
    inspectionDate: string;
    startTime: string;
    endTime: string;
    inspectorEmail: string;
    inspectorName: string | null;
    notes: string | null;
    status: string;
    bookedByName: string | null;
    proposedDate: string | null;
    proposedStartTime: string | null;
    proposedEndTime: string | null;
  };
  jobCard: { id: number; jobName: string | null; jcNumber: string | null } | null;
  company: { name: string };
}

async function fetchInspectionBooking(token: string): Promise<InspectionBookingDetails> {
  const response = await fetch(
    `${browserBaseUrl()}/stock-control/public/inspection-bookings/${token}`,
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const bodyMessage = body.message;
    throw new Error(bodyMessage ? bodyMessage : `Failed to load booking (${response.status})`);
  }

  return response.json();
}

export function usePublicInspectionBooking(token: string) {
  return useQuery<InspectionBookingDetails>({
    queryKey: publicKeys.inspectionBooking(token),
    queryFn: () => fetchInspectionBooking(token),
    enabled: token.length > 0,
    retry: false,
  });
}

export type { InspectionBookingDetails };
