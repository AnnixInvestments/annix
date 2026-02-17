import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type CreateRepProfileDto,
  fieldflowApi,
  type UpdateRepProfileDto,
} from "@/app/lib/api/fieldflowApi";
import { fieldflowKeys } from "@/app/lib/query/keys/fieldflowKeys";

export function useRepProfileStatus() {
  return useQuery({
    queryKey: fieldflowKeys.repProfile.status(),
    queryFn: () => fieldflowApi.repProfile.status(),
    retry: false,
    staleTime: 0,
  });
}

export function useRepProfile() {
  return useQuery({
    queryKey: fieldflowKeys.repProfile.profile(),
    queryFn: () => fieldflowApi.repProfile.profile(),
  });
}

export function useRepSearchTerms() {
  return useQuery({
    queryKey: fieldflowKeys.repProfile.searchTerms(),
    queryFn: () => fieldflowApi.repProfile.searchTerms(),
  });
}

export function useCreateRepProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateRepProfileDto) => fieldflowApi.repProfile.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.repProfile.all });
    },
  });
}

export function useUpdateRepProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateRepProfileDto) => fieldflowApi.repProfile.update(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.repProfile.all });
    },
  });
}

export function useCompleteRepSetup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => fieldflowApi.repProfile.completeSetup(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fieldflowKeys.repProfile.all });
    },
  });
}
