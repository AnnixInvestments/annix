import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annixRepApi,
  type CreateCrmConfigDto,
  type CrmProvider,
  type UpdateCrmConfigDto,
} from "@/app/lib/api/annixRepApi";
import { cacheConfig } from "@/app/lib/query/cacheConfig";
import { annixRepKeys } from "@/app/lib/query/keys/annixRepKeys";

export function useCrmConfigs() {
  return useQuery({
    queryKey: annixRepKeys.crm.configs(),
    queryFn: () => annixRepApi.crm.configs(),
    ...cacheConfig.crm,
  });
}

export function useCrmConfig(configId: number) {
  return useQuery({
    queryKey: annixRepKeys.crm.config(configId),
    queryFn: () => annixRepApi.crm.config(configId),
    enabled: configId > 0,
    ...cacheConfig.crm,
  });
}

export function useCrmSyncStatus(configId: number) {
  return useQuery({
    queryKey: annixRepKeys.crm.status(configId),
    queryFn: () => annixRepApi.crm.syncStatus(configId),
    enabled: configId > 0,
    refetchInterval: 30000,
  });
}

export function useCreateCrmConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateCrmConfigDto) => annixRepApi.crm.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.crm.configs() });
    },
  });
}

export function useUpdateCrmConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateCrmConfigDto }) =>
      annixRepApi.crm.update(id, dto),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.crm.config(id) });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.crm.configs() });
    },
  });
}

export function useDeleteCrmConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => annixRepApi.crm.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.crm.configs() });
    },
  });
}

export function useTestCrmConnection() {
  return useMutation({
    mutationFn: (configId: number) => annixRepApi.crm.testConnection(configId),
  });
}

export function useSyncProspectToCrm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ configId, prospectId }: { configId: number; prospectId: number }) =>
      annixRepApi.crm.syncProspect(configId, prospectId),
    onSuccess: (_, { configId }) => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.crm.status(configId) });
    },
  });
}

export function useSyncMeetingToCrm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ configId, meetingId }: { configId: number; meetingId: number }) =>
      annixRepApi.crm.syncMeeting(configId, meetingId),
    onSuccess: (_, { configId }) => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.crm.status(configId) });
    },
  });
}

export function useSyncAllProspectsToCrm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (configId: number) => annixRepApi.crm.syncAllProspects(configId),
    onSuccess: (_, configId) => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.crm.status(configId) });
    },
  });
}

export function useExportProspectsCsv() {
  return useMutation({
    mutationFn: async (configId?: number) => {
      const blob = await annixRepApi.crm.exportProspectsCsv(configId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "prospects.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
  });
}

export function useExportMeetingsCsv() {
  return useMutation({
    mutationFn: async (configId?: number) => {
      const blob = await annixRepApi.crm.exportMeetingsCsv(configId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "meetings.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
  });
}

export function useCrmOAuthUrl(provider: CrmProvider, redirectUri: string) {
  return useQuery({
    queryKey: ["annixRep", "crm", "oauth", provider, redirectUri],
    queryFn: () => annixRepApi.crm.oauthUrl(provider, redirectUri),
    enabled: Boolean(provider && redirectUri),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCrmOAuthCallback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      provider,
      code,
      redirectUri,
    }: {
      provider: CrmProvider;
      code: string;
      redirectUri: string;
    }) => annixRepApi.crm.oauthCallback(provider, code, redirectUri),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.crm.configs() });
    },
  });
}

export function useCrmDisconnect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (configId: number) => annixRepApi.crm.disconnect(configId),
    onSuccess: (_, configId) => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.crm.config(configId) });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.crm.configs() });
    },
  });
}

export function useSyncNow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (configId: number) => annixRepApi.crm.syncNow(configId),
    onSuccess: (_, configId) => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.crm.status(configId) });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.crm.syncLogs(configId) });
    },
  });
}

export function usePullAll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (configId: number) => annixRepApi.crm.pullAll(configId),
    onSuccess: (_, configId) => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.crm.status(configId) });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.crm.syncLogs(configId) });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.prospects.all });
    },
  });
}

export function useCrmSyncLogs(configId: number, limit?: number, offset?: number) {
  return useQuery({
    queryKey: annixRepKeys.crm.syncLogs(configId, limit, offset),
    queryFn: () => annixRepApi.crm.syncLogs(configId, limit, offset),
    enabled: configId > 0,
    ...cacheConfig.crm,
  });
}

export function useRefreshCrmToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (configId: number) => annixRepApi.crm.refreshToken(configId),
    onSuccess: (_, configId) => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.crm.config(configId) });
    },
  });
}
