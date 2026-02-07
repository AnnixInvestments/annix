import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminApiClient,
  type CreateSecureDocumentDto,
  type LocalDocument,
  type NixUploadResponse,
  type SecureDocument,
  type SecureDocumentWithContent,
  type UpdateSecureDocumentDto,
} from "@/app/lib/api/adminApi";
import { adminKeys } from "../../keys";

export function useSecureDocumentsList() {
  return useQuery<SecureDocument[]>({
    queryKey: adminKeys.secureDocuments.list(),
    queryFn: () => adminApiClient.listSecureDocuments(),
  });
}

export function useLocalDocumentsList() {
  return useQuery<LocalDocument[]>({
    queryKey: adminKeys.secureDocuments.local(),
    queryFn: () => adminApiClient.listLocalDocuments(),
    retry: false,
  });
}

export function useSecureDocument(id: string | null) {
  return useQuery<SecureDocumentWithContent>({
    queryKey: adminKeys.secureDocuments.detail(id ?? ""),
    queryFn: () => adminApiClient.getSecureDocument(id!),
    enabled: id !== null && id.length > 0,
  });
}

export function useCreateSecureDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateSecureDocumentDto) => adminApiClient.createSecureDocument(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.secureDocuments.list() });
    },
  });
}

export function useUpdateSecureDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateSecureDocumentDto }) =>
      adminApiClient.updateSecureDocument(id, dto),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.secureDocuments.list() });
      queryClient.invalidateQueries({
        queryKey: adminKeys.secureDocuments.detail(variables.id),
      });
    },
  });
}

export function useDeleteSecureDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApiClient.deleteSecureDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.secureDocuments.list() });
    },
  });
}

export function useUploadNixDocument() {
  const queryClient = useQueryClient();
  return useMutation<
    NixUploadResponse,
    Error,
    { file: File; title?: string; description?: string; processWithNix: boolean }
  >({
    mutationFn: ({ file, title, description, processWithNix }) =>
      adminApiClient.uploadNixDocument(file, title, description, processWithNix),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.secureDocuments.list() });
    },
  });
}
