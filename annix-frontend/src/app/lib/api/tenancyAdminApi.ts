import { createApiClient } from "@/app/lib/api/createApiClient";
import { adminTokenStore } from "@/app/lib/api/portalTokenStores";
import { API_BASE_URL } from "@/lib/api-config";

export interface TenantSummary {
  companyId: number;
  name: string;
  ownerUserId: number | null;
  tier: string;
  userCount: number;
}

export interface CreateTenantPayload {
  companyName: string;
  ownerEmail: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  ownerRoleCode: string;
  tier: string;
}

export interface InviteTenantUserPayload {
  email: string;
  firstName?: string;
  lastName?: string;
  roleCode: string;
}

const apiClient = createApiClient({
  baseURL: API_BASE_URL,
  tokenStore: adminTokenStore,
  refreshUrl: `${API_BASE_URL}/admin/auth/refresh`,
});

class TenancyAdminApiClient {
  async list(moduleKey: string): Promise<TenantSummary[]> {
    return apiClient.get<TenantSummary[]>(`/admin/tenancy/${moduleKey}/tenants`);
  }

  async create(moduleKey: string, payload: CreateTenantPayload): Promise<TenantSummary> {
    return apiClient.post<TenantSummary>(`/admin/tenancy/${moduleKey}/tenants`, payload);
  }

  async inviteUser(
    moduleKey: string,
    companyId: number,
    payload: InviteTenantUserPayload,
  ): Promise<{ userId: number; email: string }> {
    return apiClient.post(`/admin/tenancy/${moduleKey}/tenants/${companyId}/users`, payload);
  }

  async transferOwner(
    moduleKey: string,
    companyId: number,
    newOwnerUserId: number,
  ): Promise<TenantSummary> {
    return apiClient.post<TenantSummary>(
      `/admin/tenancy/${moduleKey}/tenants/${companyId}/transfer-owner`,
      { newOwnerUserId },
    );
  }
}

export const tenancyAdminApi = new TenancyAdminApiClient();
