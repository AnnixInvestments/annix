import { createApiClient } from "@/app/lib/api/createApiClient";
import { adminTokenStore } from "@/app/lib/api/portalTokenStores";
import { API_BASE_URL } from "@/lib/api-config";

export type PromoDiscountType = "percentage" | "fixed_amount";
export type PromoBillingCycle = "monthly" | "annual" | "any";
export type PromoDiscountDuration = "first_payment" | "n_months" | "forever";

export interface PromoCode {
  id: number;
  code: string;
  description: string;
  moduleKey: string | null;
  discountType: PromoDiscountType;
  discountValue: number;
  appliesToTiers: string[];
  assignedCompanyIds: number[];
  billingCycle: PromoBillingCycle;
  discountDuration: PromoDiscountDuration;
  durationMonths: number | null;
  maxRedemptions: number | null;
  timesRedeemed: number;
  validFrom: string | null;
  validUntil: string | null;
  active: boolean;
}

export interface CreatePromoCodePayload {
  code: string;
  description?: string;
  moduleKey?: string;
  discountType: PromoDiscountType;
  discountValue: number;
  appliesToTiers?: string[];
  assignedCompanyIds?: number[];
  billingCycle?: PromoBillingCycle;
  discountDuration?: PromoDiscountDuration;
  durationMonths?: number;
  maxRedemptions?: number;
  validFrom?: string;
  validUntil?: string;
  active?: boolean;
}

export type UpdatePromoCodePayload = Partial<Omit<CreatePromoCodePayload, "code">>;

const apiClient = createApiClient({
  baseURL: API_BASE_URL,
  tokenStore: adminTokenStore,
  refreshUrl: `${API_BASE_URL}/admin/auth/refresh`,
});

class PromoCodeAdminApiClient {
  async list(): Promise<PromoCode[]> {
    return apiClient.get<PromoCode[]>("/admin/promo-codes");
  }

  async create(payload: CreatePromoCodePayload): Promise<PromoCode> {
    return apiClient.post<PromoCode>("/admin/promo-codes", payload);
  }

  async update(id: number, payload: UpdatePromoCodePayload): Promise<PromoCode> {
    return apiClient.put<PromoCode>(`/admin/promo-codes/${id}`, payload);
  }

  async remove(id: number): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/admin/promo-codes/${id}`);
  }
}

export const promoCodeAdminApi = new PromoCodeAdminApiClient();
