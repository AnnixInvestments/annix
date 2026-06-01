import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { annixRepKeys } from "@/app/lib/query/keys/annixRepKeys";
import { type StartFilterConfig, voiceAgentApi } from "@/app/lib/voice-agent/voiceAgentApi";

export function useVoiceAgentStatus() {
  return useQuery({
    queryKey: annixRepKeys.voiceAgent.health(),
    queryFn: () => voiceAgentApi.health(),
    retry: false,
    // eslint-disable-next-line no-restricted-syntax -- polls the LOCAL desktop agent (no Neon/network cost); 2 min liveness check
    refetchInterval: 120_000,
  });
}

export function useVoiceAgentDevices(enabled: boolean) {
  return useQuery({
    queryKey: annixRepKeys.voiceAgent.devices(),
    queryFn: () => voiceAgentApi.devices(),
    retry: false,
    enabled,
  });
}

export function useVoiceFilterStatus(enabled: boolean) {
  return useQuery({
    queryKey: annixRepKeys.voiceAgent.filterStatus(),
    queryFn: () => voiceAgentApi.filterStatus(),
    retry: false,
    enabled,
    // eslint-disable-next-line no-restricted-syntax -- polls the LOCAL desktop agent (no Neon/network cost); live filter stats need sub-second updates
    refetchInterval: enabled ? 2_000 : false,
  });
}

export function useStartFilter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: StartFilterConfig) => voiceAgentApi.startFilter(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.voiceAgent.filterStatus() });
    },
  });
}

export function useStopFilter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => voiceAgentApi.stopFilter(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.voiceAgent.filterStatus() });
    },
  });
}

export function useStartEnrollment() {
  return useMutation({
    mutationFn: () => voiceAgentApi.startEnrollment(),
  });
}

export function useStartVoiceMeeting() {
  return useMutation({
    mutationFn: (name: string) => voiceAgentApi.meetingStart(name),
  });
}

export function useStopVoiceMeeting() {
  return useMutation({
    mutationFn: () => voiceAgentApi.meetingStop(),
  });
}

export function useVoiceEnrollmentStatus(enabled: boolean) {
  return useQuery({
    queryKey: [...annixRepKeys.voiceAgent.all, "enrollment"] as const,
    queryFn: () => voiceAgentApi.enrollmentStatus(),
    retry: false,
    enabled,
    // eslint-disable-next-line no-restricted-syntax -- polls the LOCAL desktop agent (no Neon/network cost); live enrollment progress needs sub-second updates
    refetchInterval: enabled ? 1_000 : false,
  });
}
