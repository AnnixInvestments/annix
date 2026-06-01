import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { annixRepApi, type UpsertVoiceProfileDto } from "@/app/lib/api/annixRepApi";
import { annixRepKeys } from "@/app/lib/query/keys/annixRepKeys";

export function useVoiceProfile() {
  return useQuery({
    queryKey: annixRepKeys.voiceProfile.status(),
    queryFn: () => annixRepApi.voiceProfile.profile(),
    retry: false,
  });
}

export function useUpsertVoiceProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpsertVoiceProfileDto) => annixRepApi.voiceProfile.upsert(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.voiceProfile.all });
    },
  });
}

export function useResetVoiceProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => annixRepApi.voiceProfile.reset(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.voiceProfile.all });
    },
  });
}
