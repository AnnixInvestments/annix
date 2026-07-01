"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type DraftAiSourcingInput,
  type ReassignSourcingInput,
  type SendSourcingInput,
  type SourcingPlan,
  type SourcingSendResult,
  sourcingApi,
  type UpdateSourcingDraftBodyInput,
} from "@/app/lib/nix/sourcing-api";
import { sourcingKeys } from "../../keys/sourcingKeys";

export type {
  SourcingBucket,
  SourcingDraftLineItem,
  SourcingExternalCandidate,
  SourcingPlan,
  SourcingSendResult,
  SourcingUnmatchedItem,
} from "@/app/lib/nix/sourcing-api";

export function useSourcingPlan(sessionId: number) {
  return useQuery<SourcingPlan | null>({
    queryKey: sourcingKeys.plan(sessionId),
    queryFn: () => sourcingApi.currentPlan(sessionId),
    enabled: sessionId > 0,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
}

export function usePlanSourcing(sessionId: number) {
  const queryClient = useQueryClient();
  return useMutation<SourcingPlan, Error, void>({
    mutationFn: () => sourcingApi.plan(sessionId),
    onSuccess: (plan) => {
      queryClient.setQueryData(sourcingKeys.plan(sessionId), plan);
    },
  });
}

export function useReassignSourcingItem(sessionId: number) {
  const queryClient = useQueryClient();
  return useMutation<SourcingPlan, Error, Omit<ReassignSourcingInput, "sessionId">>({
    mutationFn: (input) => sourcingApi.reassign({ ...input, sessionId }),
    onSuccess: (plan) => {
      queryClient.setQueryData(sourcingKeys.plan(sessionId), plan);
    },
  });
}

export function useUpdateSourcingDraftBody(sessionId: number) {
  const queryClient = useQueryClient();
  return useMutation<SourcingPlan, Error, Omit<UpdateSourcingDraftBodyInput, "sessionId">>({
    mutationFn: (input) => sourcingApi.draftBody({ ...input, sessionId }),
    onSuccess: (plan) => {
      queryClient.setQueryData(sourcingKeys.plan(sessionId), plan);
    },
  });
}

export function useDraftSourcingAi(sessionId: number) {
  const queryClient = useQueryClient();
  return useMutation<SourcingPlan, Error, Omit<DraftAiSourcingInput, "sessionId">>({
    mutationFn: (input) => sourcingApi.draftAi({ ...input, sessionId }),
    onSuccess: (plan) => {
      queryClient.setQueryData(sourcingKeys.plan(sessionId), plan);
    },
  });
}

export function useSendSourcingBucket(sessionId: number) {
  return useMutation<SourcingSendResult, Error, Omit<SendSourcingInput, "sessionId">>({
    mutationFn: (input) => sourcingApi.send({ ...input, sessionId }),
  });
}
