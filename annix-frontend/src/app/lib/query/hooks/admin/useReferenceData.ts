import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApiClient, type ReferenceDataQueryDto } from "@/app/lib/api/adminApi";
import { referenceDataKeys } from "@/app/lib/query/keys";

export function useReferenceDataModules() {
  return useQuery({
    queryKey: referenceDataKeys.modules(),
    queryFn: () => adminApiClient.referenceDataModules(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useReferenceDataSchema(entityName: string | null) {
  return useQuery({
    queryKey: referenceDataKeys.schema(entityName ?? ""),
    queryFn: () => adminApiClient.referenceDataSchema(entityName!),
    enabled: entityName !== null,
    staleTime: 10 * 60 * 1000,
  });
}

export function useReferenceDataRecords(entityName: string | null, params?: ReferenceDataQueryDto) {
  return useQuery({
    queryKey: referenceDataKeys.list(entityName ?? "", params),
    queryFn: () => adminApiClient.referenceDataRecords(entityName!, params),
    enabled: entityName !== null,
  });
}

export function useCreateReferenceData(entityName: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, any>) =>
      adminApiClient.createReferenceDataRecord(entityName, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referenceDataKeys.list(entityName) });
      queryClient.invalidateQueries({ queryKey: referenceDataKeys.modules() });
    },
  });
}

export function useUpdateReferenceData(entityName: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, any> }) =>
      adminApiClient.updateReferenceDataRecord(entityName, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referenceDataKeys.list(entityName) });
    },
  });
}

export function useDeleteReferenceData(entityName: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => adminApiClient.deleteReferenceDataRecord(entityName, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referenceDataKeys.list(entityName) });
      queryClient.invalidateQueries({ queryKey: referenceDataKeys.modules() });
    },
  });
}
