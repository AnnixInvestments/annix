import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApiClient } from "@/app/lib/api/adminApi";
import type {
  CreateJobMarketSourceDto,
  ExternalJob,
  JobMarketSource,
  JobMarketStats,
  JobSourceProviderInfo,
  UpdateJobMarketSourceDto,
} from "@/app/lib/api/annixOrbitApi";
import { adminKeys } from "@/app/lib/query/keys/adminKeys";

export function useAdminOrbitJobMarketProviders() {
  return useQuery<JobSourceProviderInfo[]>({
    queryKey: adminKeys.orbitJobMarket.providers(),
    queryFn: () => adminApiClient.orbitJobMarketProviders(),
    staleTime: 30 * 60 * 1000,
  });
}

export function useAdminOrbitJobMarketStats() {
  return useQuery<JobMarketStats>({
    queryKey: adminKeys.orbitJobMarket.stats(),
    queryFn: () => adminApiClient.orbitJobMarketStats(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminOrbitJobMarketSources() {
  return useQuery<JobMarketSource[]>({
    queryKey: adminKeys.orbitJobMarket.sources(),
    queryFn: () => adminApiClient.orbitJobMarketSources(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useAdminOrbitExternalJobs(params?: {
  country?: string;
  category?: string;
  search?: string | null;
  page?: number;
  limit?: number;
}) {
  const rawSearch = params?.search;
  const searchKey = rawSearch ?? undefined;
  return useQuery<{ jobs: ExternalJob[]; total: number }>({
    queryKey: adminKeys.orbitJobMarket.jobs({
      country: params?.country,
      category: params?.category,
      search: searchKey,
      page: params?.page,
      limit: params?.limit,
    }),
    queryFn: () =>
      adminApiClient.orbitExternalJobs({
        country: params?.country,
        category: params?.category,
        search: rawSearch || undefined,
        page: params?.page,
        limit: params?.limit,
      }),
    staleTime: 2 * 60 * 1000,
  });
}

export function useAdminCreateOrbitJobMarketSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateJobMarketSourceDto) => adminApiClient.createOrbitJobMarketSource(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitJobMarket.all });
    },
  });
}

export function useAdminUpdateOrbitJobMarketSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateJobMarketSourceDto }) =>
      adminApiClient.updateOrbitJobMarketSource(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitJobMarket.all });
    },
  });
}

export function useAdminDeleteOrbitJobMarketSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => adminApiClient.deleteOrbitJobMarketSource(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitJobMarket.all });
    },
  });
}

export function useAdminTriggerOrbitIngestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sourceId: number) => adminApiClient.triggerOrbitIngestion(sourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitJobMarket.all });
    },
  });
}

export function useAdminVetPendingOrbitJobs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (limit?: number) => adminApiClient.vetPendingOrbitJobs(limit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitJobMarket.all });
    },
  });
}
