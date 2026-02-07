import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type FeatureFlagDetail,
  type FeatureFlagDetailResponse,
  featureFlagsApi,
} from "@/app/lib/api/featureFlagsApi";
import { featureFlagKeys } from "../../keys";

export function useFeatureFlags() {
  return useQuery<FeatureFlagDetailResponse>({
    queryKey: featureFlagKeys.detailed(),
    queryFn: () => featureFlagsApi.allFlagsDetailed(),
    select: (data) => data,
  });
}

export function useToggleFeatureFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ flagKey, enabled }: { flagKey: string; enabled: boolean }) =>
      featureFlagsApi.updateFlag(flagKey, enabled),
    onSuccess: (updated) => {
      queryClient.setQueryData<FeatureFlagDetailResponse>(featureFlagKeys.detailed(), (old) => {
        if (!old) return old;
        return {
          ...old,
          flags: old.flags.map((f: FeatureFlagDetail) =>
            f.flagKey === updated.flagKey ? { ...f, enabled: updated.enabled } : f,
          ),
        };
      });
    },
  });
}
