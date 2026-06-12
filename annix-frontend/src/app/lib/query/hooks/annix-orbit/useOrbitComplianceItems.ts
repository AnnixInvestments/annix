import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annixOrbitApiClient,
  type OrbitComplianceItem,
  type OrbitComplianceItemCreateInput,
  type OrbitComplianceItemUpdateInput,
} from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys } from "../../keys";

export function useOrbitComplianceItems() {
  return useQuery<OrbitComplianceItem[]>({
    queryKey: annixOrbitKeys.complianceItems.list(),
    queryFn: () => annixOrbitApiClient.complianceItems(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useOrbitCreateComplianceItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: OrbitComplianceItemCreateInput) =>
      annixOrbitApiClient.createComplianceItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.complianceItems.all });
    },
  });
}

export function useOrbitUpdateComplianceItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; data: OrbitComplianceItemUpdateInput }) =>
      annixOrbitApiClient.updateComplianceItem(vars.id, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.complianceItems.all });
    },
  });
}

export function useOrbitDeleteComplianceItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => annixOrbitApiClient.deleteComplianceItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.complianceItems.all });
    },
  });
}
