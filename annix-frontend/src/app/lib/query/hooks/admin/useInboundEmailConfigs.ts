import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type AdminInboundConfigGroup, adminApiClient } from "@/app/lib/api/adminApi";
import { adminKeys } from "../../keys";

export function useInboundEmailConfigs() {
  return useQuery<AdminInboundConfigGroup[]>({
    queryKey: adminKeys.inboundEmails.configs(),
    queryFn: () => adminApiClient.inboundEmailConfigs(),
  });
}

export function useSetInboundEmailEnabled() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { app: string; companyId: number | null; enabled: boolean }) =>
      adminApiClient.setInboundEmailEnabled(params.app, params.companyId, params.enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.inboundEmails.all });
    },
  });
}
