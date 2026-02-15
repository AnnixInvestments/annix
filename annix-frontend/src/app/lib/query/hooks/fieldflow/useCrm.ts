import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type CreateCrmConfigDto,
  fieldflowApi,
  type UpdateCrmConfigDto,
} from "@/app/lib/api/fieldflowApi";
import { fieldflowKeys } from "@/app/lib/query/keys/fieldflowKeys";

export function useCrmConfigs() {
  return useQuery({
    queryKey: fieldflowKeys.crm.configs(),
    queryFn: () => fieldflowApi.crm.configs(),
  });
}

export function useCrmConfig(configId: number) {
  return useQuery({
    queryKey: fieldflowKeys.crm.config(configId),
    queryFn: () => fieldflowApi.crm.config(configId),
    enabled: configId > 0,
  });
}

export function useCrmSyncStatus(configId: number) {
  return useQuery({
    queryKey: fieldflowKeys.crm.status(configId),
    queryFn: () => fieldflowApi.crm.syncStatus(configId),
    enabled: configId > 0,
    refetchInterval: 30000,
  });
}

export function useCreateCrmConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateCrmConfigDto) => fieldflowApi.crm.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.crm.configs() });
    },
  });
}

export function useUpdateCrmConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateCrmConfigDto }) =>
      fieldflowApi.crm.update(id, dto),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.crm.config(id) });
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.crm.configs() });
    },
  });
}

export function useDeleteCrmConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => fieldflowApi.crm.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.crm.configs() });
    },
  });
}

export function useTestCrmConnection() {
  return useMutation({
    mutationFn: (configId: number) => fieldflowApi.crm.testConnection(configId),
  });
}

export function useSyncProspectToCrm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ configId, prospectId }: { configId: number; prospectId: number }) =>
      fieldflowApi.crm.syncProspect(configId, prospectId),
    onSuccess: (_, { configId }) => {
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.crm.status(configId) });
    },
  });
}

export function useSyncMeetingToCrm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ configId, meetingId }: { configId: number; meetingId: number }) =>
      fieldflowApi.crm.syncMeeting(configId, meetingId),
    onSuccess: (_, { configId }) => {
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.crm.status(configId) });
    },
  });
}

export function useSyncAllProspectsToCrm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (configId: number) => fieldflowApi.crm.syncAllProspects(configId),
    onSuccess: (_, configId) => {
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.crm.status(configId) });
    },
  });
}

export function useExportProspectsCsv() {
  return useMutation({
    mutationFn: async (configId?: number) => {
      const blob = await fieldflowApi.crm.exportProspectsCsv(configId);
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
      const blob = await fieldflowApi.crm.exportMeetingsCsv(configId);
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
