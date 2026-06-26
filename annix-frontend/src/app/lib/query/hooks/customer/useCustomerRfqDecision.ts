import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { rfqApi, rfqDocumentApi } from "@/app/lib/api/client";
import { customerKeys } from "../../keys";

export interface CustomerRfqItemDetail {
  id?: number;
  lineNumber?: number;
  itemDescription?: string;
  description?: string;
  itemType?: string;
  quantity?: number;
  unitPrice?: number | null;
  totalPrice?: number | null;
  itemNotes?: string;
}

export interface CustomerRfqDocumentSummary {
  id: number;
  rfqId: number;
  filename: string;
  mimeType: string;
  fileSizeBytes: number;
  downloadUrl: string;
  uploadedBy?: string;
  createdAt: string | Date;
}

export interface CustomerRfqDetail {
  id: number;
  rfqNumber: string;
  projectName: string;
  description?: string;
  status: string;
  notes?: string;
  totalWeightKg?: number;
  totalCost?: number | null;
  requiredDate?: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
  acceptedAt?: string | Date | null;
  rejectedAt?: string | Date | null;
  rejectionReason?: string | null;
  items?: CustomerRfqItemDetail[];
  documents?: CustomerRfqDocumentSummary[];
}

function invalidateRfqDecisionQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  id: number,
): void {
  queryClient.invalidateQueries({ queryKey: customerKeys.rfqs.detail(id) });
  queryClient.invalidateQueries({ queryKey: customerKeys.rfqs.list() });
  queryClient.invalidateQueries({ queryKey: customerKeys.dashboard.all });
}

export function useAcceptCustomerRfq() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => rfqApi.accept(id),
    onSuccess: (_data, id) => {
      invalidateRfqDecisionQueries(queryClient, id);
    },
  });
}

export function useRejectCustomerRfq() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: { id: number; reason?: string }) => {
      const reason = vars.reason;
      return rfqApi.reject(vars.id, reason);
    },
    onSuccess: (_data, vars) => {
      const id = vars.id;
      invalidateRfqDecisionQueries(queryClient, id);
    },
  });
}

export function useCustomerRfqDocuments(rfqId: number) {
  return useQuery({
    queryKey: customerKeys.rfqs.documents(rfqId),
    queryFn: () => rfqDocumentApi.getByRfqId(rfqId),
    staleTime: 2 * 60 * 1000,
    enabled: rfqId > 0,
  });
}

export function downloadCustomerRfqDocument(documentId: number): Promise<Blob> {
  return rfqDocumentApi.download(documentId);
}
