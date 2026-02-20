import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annixRepApi,
  type MeetingPlatform,
  type UpdateMeetingPlatformConnectionDto,
} from "@/app/lib/api/annixRepApi";
import { cacheConfig } from "@/app/lib/query/cacheConfig";
import { annixRepKeys } from "@/app/lib/query/keys/annixRepKeys";

export function useMeetingPlatformConnections() {
  return useQuery({
    queryKey: annixRepKeys.meetingPlatforms.connections(),
    queryFn: () => annixRepApi.meetingPlatforms.connections(),
    ...cacheConfig.meetingPlatforms,
  });
}

export function useMeetingPlatformConnection(connectionId: number) {
  return useQuery({
    queryKey: annixRepKeys.meetingPlatforms.connection(connectionId),
    queryFn: () => annixRepApi.meetingPlatforms.connection(connectionId),
    enabled: connectionId > 0,
    ...cacheConfig.meetingPlatforms,
  });
}

export function usePlatformRecordings(connectionId: number, limit?: number) {
  return useQuery({
    queryKey: annixRepKeys.meetingPlatforms.recordings(connectionId, limit),
    queryFn: () => annixRepApi.meetingPlatforms.recordings(connectionId, limit),
    enabled: connectionId > 0,
    ...cacheConfig.meetingPlatforms,
  });
}

export function usePlatformRecording(recordId: number) {
  return useQuery({
    queryKey: annixRepKeys.meetingPlatforms.recording(recordId),
    queryFn: () => annixRepApi.meetingPlatforms.recording(recordId),
    enabled: recordId > 0,
    ...cacheConfig.meetingPlatforms,
  });
}

export function useAvailableMeetingPlatforms() {
  return useQuery({
    queryKey: annixRepKeys.meetingPlatforms.availablePlatforms(),
    queryFn: () => annixRepApi.meetingPlatforms.availablePlatforms(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useMeetingPlatformOAuthUrl(platform: MeetingPlatform, redirectUri: string) {
  return useQuery({
    queryKey: ["annixRep", "meetingPlatforms", "oauth", platform, redirectUri],
    queryFn: () => annixRepApi.meetingPlatforms.oauthUrl(platform, redirectUri),
    enabled: Boolean(platform && redirectUri),
    staleTime: 5 * 60 * 1000,
  });
}

export function useConnectMeetingPlatform() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      platform,
      authCode,
      redirectUri,
    }: {
      platform: MeetingPlatform;
      authCode: string;
      redirectUri: string;
    }) => annixRepApi.meetingPlatforms.oauthCallback(platform, authCode, redirectUri),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.meetingPlatforms.connections() });
    },
  });
}

export function useUpdateMeetingPlatformConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateMeetingPlatformConnectionDto }) =>
      annixRepApi.meetingPlatforms.update(id, dto),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.meetingPlatforms.connection(id) });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.meetingPlatforms.connections() });
    },
  });
}

export function useDisconnectMeetingPlatform() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => annixRepApi.meetingPlatforms.disconnect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.meetingPlatforms.connections() });
    },
  });
}

export function useSyncMeetingPlatform() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, daysBack }: { id: number; daysBack?: number }) =>
      annixRepApi.meetingPlatforms.sync(id, daysBack),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.meetingPlatforms.connection(id) });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.meetingPlatforms.recordings(id) });
    },
  });
}
