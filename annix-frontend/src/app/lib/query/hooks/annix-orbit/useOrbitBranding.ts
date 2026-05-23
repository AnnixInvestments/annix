import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  OrbitBranding,
  OrbitBrandingAssetSlot,
  OrbitBrandingUpdate,
} from "@/app/lib/annix-orbit/branding";
import { adminApiClient } from "@/app/lib/api/adminApi";
import { annixOrbitApiClient } from "@/app/lib/api/annixOrbitApi";
import { annixOrbitKeys } from "../../keys";

export function useOrbitBranding() {
  return useQuery<OrbitBranding>({
    queryKey: annixOrbitKeys.branding.public(),
    queryFn: () => annixOrbitApiClient.branding(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminOrbitBranding() {
  return useQuery<OrbitBranding>({
    queryKey: annixOrbitKeys.branding.admin(),
    queryFn: () => adminApiClient.orbitBranding(),
    staleTime: 60 * 1000,
  });
}

export function useUpdateOrbitBranding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: OrbitBrandingUpdate) => adminApiClient.updateOrbitBranding(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annixOrbitKeys.branding.all });
    },
  });
}

export function useUploadOrbitBrandingAsset() {
  return useMutation({
    mutationFn: (vars: { slot: OrbitBrandingAssetSlot; file: File }) =>
      adminApiClient.uploadOrbitBrandingAsset(vars.slot, vars.file),
  });
}
