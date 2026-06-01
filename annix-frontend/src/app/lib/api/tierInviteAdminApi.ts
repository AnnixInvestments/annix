import { createApiClient } from "@/app/lib/api/createApiClient";
import { adminTokenStore } from "@/app/lib/api/portalTokenStores";
import { API_BASE_URL } from "@/lib/api-config";

export interface TierInvite {
  id: number;
  moduleKey: string;
  email: string;
  tierKey: string;
  freeDays: number;
  token: string;
  status: "pending" | "accepted" | "expired";
  acceptedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreateTierInvitePayload {
  moduleKey: string;
  email: string;
  tierKey: string;
  freeDays: number;
}

const apiClient = createApiClient({
  baseURL: API_BASE_URL,
  tokenStore: adminTokenStore,
  refreshUrl: `${API_BASE_URL}/admin/auth/refresh`,
});

class TierInviteAdminApiClient {
  async list(moduleKey: string): Promise<TierInvite[]> {
    return apiClient.get<TierInvite[]>(
      `/admin/access/tier-invites?moduleKey=${encodeURIComponent(moduleKey)}`,
    );
  }

  async create(payload: CreateTierInvitePayload): Promise<TierInvite> {
    return apiClient.post<TierInvite>("/admin/access/tier-invites", payload);
  }
}

export const tierInviteAdminApi = new TierInviteAdminApiClient();
