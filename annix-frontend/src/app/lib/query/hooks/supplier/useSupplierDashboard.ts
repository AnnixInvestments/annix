import { useQuery } from "@tanstack/react-query";
import {
  type OnboardingStatusResponse,
  type SupplierBoqListItem,
  supplierPortalApi,
} from "@/app/lib/api/supplierApi";
import { supplierKeys } from "../../keys";

export function useSupplierOnboardingStatus() {
  return useQuery<OnboardingStatusResponse>({
    queryKey: supplierKeys.onboarding.status(),
    queryFn: () => supplierPortalApi.getOnboardingStatus(),
  });
}

export function useSupplierDashboardBoqs() {
  return useQuery<SupplierBoqListItem[]>({
    queryKey: supplierKeys.boqs.list(),
    queryFn: () => supplierPortalApi.getMyBoqs(),
  });
}
