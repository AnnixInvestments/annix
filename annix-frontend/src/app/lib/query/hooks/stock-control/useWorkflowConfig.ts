import { useQuery } from "@tanstack/react-query";
import type { WorkflowStepConfig } from "@/app/lib/api/stockControlApi";
import { stockControlApiClient } from "@/app/lib/api/stockControlApi";
import { stockControlKeys } from "../../keys/stockControlKeys";

export function useWorkflowStepConfigs() {
  return useQuery<WorkflowStepConfig[]>({
    queryKey: stockControlKeys.workflowConfig.foreground(),
    queryFn: () => stockControlApiClient.workflowStepConfigs(),
    staleTime: 5 * 60_000,
  });
}

export function useBackgroundStepConfigs() {
  return useQuery<WorkflowStepConfig[]>({
    queryKey: stockControlKeys.workflowConfig.background(),
    queryFn: () => stockControlApiClient.backgroundStepConfigs(),
    staleTime: 5 * 60_000,
  });
}
