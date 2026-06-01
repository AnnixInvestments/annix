import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type CreateTierInvitePayload,
  type TierInvite,
  tierInviteAdminApi,
} from "@/app/lib/api/tierInviteAdminApi";

const tierInviteKeys = {
  all: ["admin", "tierInvites"] as const,
  list: (moduleKey: string) => ["admin", "tierInvites", moduleKey] as const,
};

export function useTierInvites(moduleKey: string) {
  return useQuery<TierInvite[]>({
    queryKey: tierInviteKeys.list(moduleKey),
    queryFn: () => tierInviteAdminApi.list(moduleKey),
    enabled: moduleKey.length > 0,
  });
}

export function useCreateTierInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTierInvitePayload) => tierInviteAdminApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tierInviteKeys.all });
    },
  });
}
