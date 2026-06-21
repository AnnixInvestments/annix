import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CommitRubberBondingAgentImportInput,
  CreateRubberBondingAgentInput,
  RubberBondingAgentsResponse,
  UpdateRubberBondingAgentInput,
} from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { stockControlKeys } from "../../keys/stockControlKeys";

export function useRubberBondingAgents() {
  return useQuery<RubberBondingAgentsResponse>({
    queryKey: stockControlKeys.rubberBondingAgents.list(),
    queryFn: () => stockControlApiClient.rubberBondingAgents(),
  });
}

export function useCreateRubberBondingAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRubberBondingAgentInput) =>
      stockControlApiClient.createRubberBondingAgent(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.rubberBondingAgents.all });
    },
  });
}

export function useUpdateRubberBondingAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: number; input: UpdateRubberBondingAgentInput }) =>
      stockControlApiClient.updateRubberBondingAgent(params.id, params.input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.rubberBondingAgents.all });
    },
  });
}

export function useDeleteRubberBondingAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => stockControlApiClient.deleteRubberBondingAgent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.rubberBondingAgents.all });
    },
  });
}

export function useSeedRubberBondingAgents() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => stockControlApiClient.seedRubberBondingAgents(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.rubberBondingAgents.all });
    },
  });
}

export function useEnrichRubberBondingCoverage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => stockControlApiClient.enrichRubberBondingCoverage(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.rubberBondingAgents.all });
    },
  });
}

export function useImportRubberBondingAgents() {
  return useMutation({
    mutationFn: (file: File) => stockControlApiClient.importRubberBondingAgents(file),
  });
}

export function useCommitRubberBondingAgentImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CommitRubberBondingAgentImportInput) =>
      stockControlApiClient.commitRubberBondingAgentImport(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: stockControlKeys.rubberBondingAgents.all });
    },
  });
}
