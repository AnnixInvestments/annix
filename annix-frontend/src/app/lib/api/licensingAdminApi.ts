import { createApiClient } from "@/app/lib/api/createApiClient";
import { adminTokenStore } from "@/app/lib/api/portalTokenStores";
import type { ModuleCatalog } from "@/app/lib/query/hooks";
import { API_BASE_URL } from "@/lib/api-config";

export interface TierPricingPayload {
  name?: string;
  description?: string;
  monthlyPriceCents?: number;
  annualPriceCents?: number;
  includedSeats?: number;
  aiDocAllowance?: number;
  visibility?: string;
}

export interface AddOnPayload {
  label?: string;
  description?: string;
  monthlyPriceCents?: number;
  discountable?: boolean;
}

const apiClient = createApiClient({
  baseURL: API_BASE_URL,
  tokenStore: adminTokenStore,
  refreshUrl: `${API_BASE_URL}/admin/auth/refresh`,
});

class LicensingAdminApiClient {
  async catalog(moduleKey: string): Promise<ModuleCatalog> {
    return apiClient.get<ModuleCatalog>(`/admin/licensing/${moduleKey}/catalog`);
  }

  async setTierPricing(
    moduleKey: string,
    tierKey: string,
    payload: TierPricingPayload,
  ): Promise<ModuleCatalog> {
    return apiClient.put<ModuleCatalog>(
      `/admin/licensing/${moduleKey}/tiers/${tierKey}/pricing`,
      payload,
    );
  }

  async setTierFeatures(
    moduleKey: string,
    tierKey: string,
    featureKeys: string[],
  ): Promise<ModuleCatalog> {
    return apiClient.put<ModuleCatalog>(`/admin/licensing/${moduleKey}/tiers/${tierKey}/features`, {
      featureKeys,
    });
  }

  async setAddOn(
    moduleKey: string,
    addOnKey: string,
    payload: AddOnPayload,
  ): Promise<ModuleCatalog> {
    return apiClient.put<ModuleCatalog>(
      `/admin/licensing/${moduleKey}/add-ons/${addOnKey}`,
      payload,
    );
  }
}

export const licensingAdminApi = new LicensingAdminApiClient();
