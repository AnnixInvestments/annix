import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApiClient, type BrandingImage } from "@/app/lib/api/adminApi";
import { fetchPublicBranding } from "@/app/lib/api/brandingApi";
import type {
  Branding,
  BrandingAdminView,
  BrandingAssetSlot,
  BrandingUpdate,
} from "@/app/lib/branding/branding";
import { brandingKeys } from "../../keys/brandingKeys";

export function useBranding(brand: string) {
  return useQuery<Branding>({
    queryKey: brandingKeys.public(brand),
    queryFn: () => fetchPublicBranding(brand),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminBranding(brand: string) {
  return useQuery<BrandingAdminView>({
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

export function useAdminBrandingImages(brand: string) {
  return useQuery<BrandingImage[]>({
    queryKey: brandingKeys.images(brand),
    queryFn: () => adminApiClient.brandingImages(brand),
    staleTime: 60 * 1000,
  });
}

export function useAddBrandingImage(brand: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { file: File; label: string }) =>
      adminApiClient.addBrandingImage(brand, vars.file, vars.label),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brandingKeys.images(brand) });
    },
  });
}

export function useDeleteBrandingImage(brand: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApiClient.deleteBrandingImage(brand, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brandingKeys.images(brand) });
    },
  });
}
