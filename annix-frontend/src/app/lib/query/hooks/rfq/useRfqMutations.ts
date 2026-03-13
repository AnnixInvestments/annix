import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  type CreateUnifiedRfqDto,
  type RfqDraftResponse,
  type SaveRfqDraftDto,
  draftsApi,
  unifiedRfqApi,
} from "@/app/lib/api/client";
import { adminApiClient } from "@/app/lib/api/adminApi";
import { customerKeys, rfqKeys } from "../../keys";

interface CreateUnifiedRfqResult {
  rfq: { id: number };
  itemsCreated: number;
}

interface UpdateUnifiedRfqResult {
  rfq: { id: number };
  itemsUpdated: number;
}

export function useCreateUnifiedRfq() {
  const queryClient = useQueryClient();

  return useMutation<CreateUnifiedRfqResult, Error, CreateUnifiedRfqDto>({
    mutationFn: (data) => unifiedRfqApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rfqKeys.all });
      queryClient.invalidateQueries({ queryKey: customerKeys.rfqs.all });
    },
  });
}

export function useUpdateUnifiedRfq() {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateUnifiedRfqResult,
    Error,
    { id: number; data: CreateUnifiedRfqDto }
  >({
    mutationFn: ({ id, data }) => unifiedRfqApi.update(id, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: rfqKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: rfqKeys.all });
      queryClient.invalidateQueries({ queryKey: customerKeys.rfqs.all });
    },
  });
}

interface DraftMutationContext {
  previousDrafts: unknown;
}

export function useSaveDraft() {
  const queryClient = useQueryClient();

  return useMutation<RfqDraftResponse, Error, SaveRfqDraftDto, DraftMutationContext>({
    mutationFn: (data) => draftsApi.save(data),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: rfqKeys.drafts.all });
      const previousDrafts = queryClient.getQueryData(rfqKeys.drafts.all);
      return { previousDrafts };
    },
    onError: (_err, _newDraft, context) => {
      if (context?.previousDrafts) {
        queryClient.setQueryData(rfqKeys.drafts.all, context.previousDrafts);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: rfqKeys.drafts.all });
      queryClient.invalidateQueries({ queryKey: customerKeys.drafts.all });
    },
  });
}

export function useAdminSaveDraft() {
  const queryClient = useQueryClient();

  return useMutation<RfqDraftResponse, Error, SaveRfqDraftDto, DraftMutationContext>({
    mutationFn: (data) => adminApiClient.saveDraft(data),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: rfqKeys.drafts.all });
      const previousDrafts = queryClient.getQueryData(rfqKeys.drafts.all);
      return { previousDrafts };
    },
    onError: (_err, _newDraft, context) => {
      if (context?.previousDrafts) {
        queryClient.setQueryData(rfqKeys.drafts.all, context.previousDrafts);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: rfqKeys.drafts.all });
    },
  });
}

export function useMarkDraftConverted() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { draftId: number; rfqId: number }>({
    mutationFn: ({ draftId, rfqId }) => draftsApi.markAsConverted(draftId, rfqId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rfqKeys.drafts.all });
      queryClient.invalidateQueries({ queryKey: rfqKeys.all });
      queryClient.invalidateQueries({ queryKey: customerKeys.drafts.all });
      queryClient.invalidateQueries({ queryKey: customerKeys.rfqs.all });
    },
  });
}
