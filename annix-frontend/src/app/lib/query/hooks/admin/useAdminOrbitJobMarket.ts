import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminApiClient,
  type OrbitClusterUsage,
  type OrbitSeekerDetail,
  type OrbitSeekerMatchTier,
  type OrbitSeekerSummary,
} from "@/app/lib/api/adminApi";
import type {
  CreateJobMarketSourceDto,
  DuplicateJobPair,
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

export function useAdminOrbitClusterUsage() {
  return useQuery<OrbitClusterUsage>({
    queryKey: adminKeys.orbitJobMarket.clusterUsage(),
    queryFn: () => adminApiClient.orbitClusterUsage(),
    staleTime: 60 * 1000,
  });
}

export function useAdminOrbitRetentionCap() {
  return useQuery<{ cap: number }>({
    queryKey: adminKeys.orbitJobMarket.retentionCap(),
    queryFn: () => adminApiClient.orbitRetentionCap(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminSetOrbitRetentionCap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cap: number) => adminApiClient.setOrbitRetentionCap(cap),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitJobMarket.retentionCap() });
    },
  });
}

export function useAdminOrbitJobMarketDuplicates(enabled: boolean) {
  return useQuery<DuplicateJobPair[]>({
    queryKey: adminKeys.orbitJobMarket.duplicates(),
    queryFn: () => adminApiClient.orbitJobMarketDuplicates(200),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useAdminDeleteOrbitExternalJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: number) => adminApiClient.deleteOrbitExternalJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitJobMarket.all });
    },
  });
}

export function useAdminBulkDeleteOrbitExternalJobs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => adminApiClient.bulkDeleteOrbitExternalJobs(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitJobMarket.all });
    },
  });
}

export function useAdminAutoResolveOrbitDuplicates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => adminApiClient.autoResolveOrbitDuplicates(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitJobMarket.all });
    },
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

export function useAdminOrbitSeekers(params: {
  search?: string | null;
  page?: number;
  limit?: number;
}) {
  const rawSearch = params.search;
  const searchKey = rawSearch ? rawSearch : undefined;
  return useQuery<{ seekers: OrbitSeekerSummary[]; total: number }>({
    queryKey: adminKeys.orbitSeekers.list({
      search: searchKey,
      page: params.page,
      limit: params.limit,
    }),
    queryFn: () =>
      adminApiClient.orbitSeekers({
        search: rawSearch || undefined,
        page: params.page,
        limit: params.limit,
      }),
    staleTime: 60 * 1000,
  });
}

export function useAdminOrbitSeekerDetail(id: number) {
  return useQuery<OrbitSeekerDetail>({
    queryKey: adminKeys.orbitSeekers.detail(id),
    queryFn: () => adminApiClient.orbitSeekerDetail(id),
    enabled: Number.isFinite(id) && id > 0,
    staleTime: 30 * 1000,
  });
}

export function useAdminOrbitSeekerMatchTier(email: string) {
  const trimmed = email.trim();
  return useQuery<OrbitSeekerMatchTier>({
    queryKey: adminKeys.orbitSeekers.matchTier(trimmed),
    queryFn: () => adminApiClient.orbitSeekerMatchTier(trimmed),
    enabled: trimmed.length > 0,
    staleTime: 30 * 1000,
  });
}

export function useAdminSetOrbitSeekerMatchTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, tier }: { email: string; tier: string }) =>
      adminApiClient.setOrbitSeekerMatchTier(email, tier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.orbitSeekers.all });
    },
  });
}
