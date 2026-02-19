import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  annixRepApi,
  type DiscoveredBusiness,
  type DiscoverProspectsDto,
  type DiscoveryImportResult,
  type DiscoveryQuota,
  type DiscoverySearchResult,
  type DiscoverySource,
} from "@/app/lib/api/annixRepApi";
import { annixRepKeys } from "../../keys/annixRepKeys";

export function useDiscoverySearch(
  dto: DiscoverProspectsDto | null,
  enabled = true,
) {
  return useQuery<DiscoverySearchResult>({
    queryKey: annixRepKeys.discovery.search(
      dto?.latitude ?? 0,
      dto?.longitude ?? 0,
      dto?.radiusKm,
      dto?.sources,
    ),
    queryFn: () => annixRepApi.discovery.search(dto!),
    enabled: enabled && dto !== null && dto.latitude !== 0 && dto.longitude !== 0,
  });
}

export function useDiscoverySearchMutation() {
  return useMutation<DiscoverySearchResult, Error, DiscoverProspectsDto>({
    mutationFn: (dto) => annixRepApi.discovery.search(dto),
  });
}

export function useDiscoveryImport() {
  const queryClient = useQueryClient();

  return useMutation<DiscoveryImportResult, Error, DiscoveredBusiness[]>({
    mutationFn: (businesses) => annixRepApi.discovery.import(businesses),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixRepKeys.prospects.all });
      queryClient.invalidateQueries({ queryKey: annixRepKeys.dashboard.all });
    },
  });
}

export function useDiscoveryQuota() {
  return useQuery<DiscoveryQuota>({
    queryKey: annixRepKeys.discovery.quota(),
    queryFn: () => annixRepApi.discovery.quota(),
    staleTime: 60 * 1000,
  });
}
