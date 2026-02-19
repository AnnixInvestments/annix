import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annixRepApi,
  type CreateRepProfileDto,
  type UpdateRepProfileDto,
} from "@/app/lib/api/annixRepApi";
import { cacheConfig } from "@/app/lib/query/cacheConfig";
import { annixRepKeys } from "@/app/lib/query/keys/annixRepKeys";

export function useRepProfileStatus() {
  return useQuery({
    queryKey: annixRepKeys.repProfile.status(),
    queryFn: () => annixRepApi.repProfile.status(),
    retry: false,
    staleTime: 0,
  });
}

export function useRepProfile() {
  return useQuery({
    queryKey: annixRepKeys.repProfile.profile(),
    queryFn: () => annixRepApi.repProfile.profile(),
    ...cacheConfig.profile,
  });
}

export function useRepSearchTerms() {
  return useQuery({
    queryKey: annixRepKeys.repProfile.searchTerms(),
    queryFn: () => annixRepApi.repProfile.searchTerms(),
    ...cacheConfig.profile,
  });
}

export function useCreateRepProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateRepProfileDto) => annixRepApi.repProfile.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.repProfile.all });
    },
  });
}

export function useUpdateRepProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateRepProfileDto) => annixRepApi.repProfile.update(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.repProfile.all });
    },
  });
}

export function useCompleteRepSetup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => annixRepApi.repProfile.completeSetup(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.repProfile.all });
    },
  });
}
