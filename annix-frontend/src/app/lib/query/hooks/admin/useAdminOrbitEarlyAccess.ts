import { useQuery } from "@tanstack/react-query";
import {
  adminApiClient,
  type OrbitEarlyAccessRow,
  type OrbitEarlyAccessStats,
} from "@/app/lib/api/adminApi";
import { adminKeys } from "@/app/lib/query/keys/adminKeys";

export function useAdminOrbitEarlyAccessStats() {
  return useQuery<OrbitEarlyAccessStats>({
    queryKey: adminKeys.orbitEarlyAccess.stats(),
    queryFn: () => adminApiClient.orbitEarlyAccessStats(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useAdminOrbitEarlyAccessList() {
  return useQuery<OrbitEarlyAccessRow[]>({
    queryKey: adminKeys.orbitEarlyAccess.list(),
    queryFn: () => adminApiClient.orbitEarlyAccessList(),
    staleTime: 2 * 60 * 1000,
  });
}
