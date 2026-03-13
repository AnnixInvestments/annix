import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  InboundEmail,
  InboundEmailConfigResponse,
  InboundEmailConfigUpdate,
  InboundEmailStats,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { stockControlKeys } from "../../keys/stockControlKeys";

export function useInboundEmailConfig() {
  return useQuery<InboundEmailConfigResponse>({
    queryKey: stockControlKeys.inboundEmails.config(),
    queryFn: () => stockControlApiClient.inboundEmailConfig(),
  });
}

export function useUpdateInboundEmailConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: InboundEmailConfigUpdate) =>
      stockControlApiClient.updateInboundEmailConfig(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.inboundEmails.config() });
    },
  });
}

export function useTestInboundEmailConnection() {
  return useMutation({
    mutationFn: () => stockControlApiClient.testInboundEmailConnection(),
  });
}

export function useInboundEmails(filters?: {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  documentType?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery<{ items: InboundEmail[]; total: number }>({
    queryKey: stockControlKeys.inboundEmails.list(
      filters as Record<string, string | number | undefined>,
    ),
    queryFn: () => stockControlApiClient.inboundEmails(filters),
  });
}

export function useInboundEmailDetail(emailId: number) {
  return useQuery<InboundEmail>({
    queryKey: stockControlKeys.inboundEmails.detail(emailId),
    queryFn: () => stockControlApiClient.inboundEmailDetail(emailId),
    enabled: emailId > 0,
  });
}

export function useReclassifyAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ attachmentId, documentType }: { attachmentId: number; documentType: string }) =>
      stockControlApiClient.reclassifyAttachment(attachmentId, documentType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.inboundEmails.all });
    },
  });
}

export function useInboundEmailStats() {
  return useQuery<InboundEmailStats>({
    queryKey: stockControlKeys.inboundEmails.stats(),
    queryFn: () => stockControlApiClient.inboundEmailStats(),
  });
}
