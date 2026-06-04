import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApiClient, type OrbitDelistReport } from "@/app/lib/api/adminApi";
import { adminKeys } from "@/app/lib/query/keys/adminKeys";

export function useAdminOrbitDelistReports() {
  return useQuery<OrbitDelistReport[]>({
    queryKey: adminKeys.orbitDelistReports.list(),
    queryFn: () => adminApiClient.orbitDelistReports(),
    staleTime: 60 * 1000,
  });
}

export function useAdminOrbitDelistReportCount(enabled: boolean = true) {
  return useQuery<{ count: number }>({
    queryKey: adminKeys.orbitDelistReports.count(),
    queryFn: () => adminApiClient.orbitDelistReportCount(),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useAdminConfirmOrbitDelist() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationFn: (id) => adminApiClient.confirmOrbitDelist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitDelistReports.all });
    },
  });
}

export function useAdminRejectOrbitDelist() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, number>({
    mutationFn: (id) => adminApiClient.rejectOrbitDelist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitDelistReports.all });
    },
  });
}
