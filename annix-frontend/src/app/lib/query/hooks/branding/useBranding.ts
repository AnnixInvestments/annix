import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApiClient } from "@/app/lib/api/adminApi";
import { fetchPublicBranding } from "@/app/lib/api/brandingApi";
import type { Branding, BrandingAssetSlot, BrandingUpdate } from "@/app/lib/branding/branding";
import { brandingKeys } from "../../keys/brandingKeys";

export function useBranding(brand: string) {
  return useQuery<Branding>({
    queryKey: brandingKeys.public(brand),
    queryFn: () => fetchPublicBranding(brand),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminBranding(brand: string) {
  return useQuery<Branding>({
    queryKey: brandingKeys.admin(brand),
    queryFn: () => adminApiClient.appBranding(brand),
    staleTime: 60 * 1000,
  });
}

export function useUpdateBranding(brand: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BrandingUpdate) => adminApiClient.updateAppBranding(brand, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brandingKeys.all });
    },
  });
}

export function useUploadBrandingAsset(brand: string) {
  return useMutation({
    mutationFn: (vars: { slot: BrandingAssetSlot; file: File }) =>
      adminApiClient.uploadAppBrandingAsset(brand, vars.slot, vars.file),
  });
}
