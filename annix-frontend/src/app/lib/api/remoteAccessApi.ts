import { createApiClient } from "@/app/lib/api/createApiClient";
import { adminTokenStore, customerTokenStore } from "@/app/lib/api/portalTokenStores";
import { API_BASE_URL } from "@/lib/api-config";

export type RemoteAccessRequestType = "VIEW" | "EDIT";
export type RemoteAccessDocumentType = "RFQ" | "BOQ";
export type RemoteAccessStatus = "PENDING" | "APPROVED" | "DENIED" | "EXPIRED";

export interface CreateRemoteAccessRequestDto {
  requestType: RemoteAccessRequestType;
  documentType: RemoteAccessDocumentType;
  documentId: number;
  message?: string;
}

export interface RespondToAccessRequestDto {
  approved: boolean;
  denialReason?: string;
}

export interface RemoteAccessRequestResponse {
  id: number;
  requestType: RemoteAccessRequestType;
  documentType: RemoteAccessDocumentType;
  documentId: number;
  status: RemoteAccessStatus;
  message?: string;
  requestedAt: string;
  expiresAt: string;
  respondedAt?: string;
  requestedBy?: {
    id: number;
    name: string;
    email: string;
  };
  documentOwner?: {
    id: number;
    name: string;
    email: string;
  };
  document?: {
    id: number;
    name: string;
    type: string;
  };
}

export interface PendingAccessRequestsResponse {
  requests: RemoteAccessRequestResponse[];
  count: number;
}

export interface AccessStatusResponse {
  hasAccess: boolean;
  status: RemoteAccessStatus;
  requestId?: number;
  expiresAt?: string;
  message?: string;
}

export interface FeatureEnabledResponse {
  enabled: boolean;
}

const adminClient = createApiClient({
  baseURL: API_BASE_URL,
  tokenStore: adminTokenStore,
  refreshUrl: `${API_BASE_URL}/admin/auth/refresh`,
});

const customerClient = createApiClient({
  baseURL: API_BASE_URL,
  tokenStore: customerTokenStore,
  refreshUrl: `${API_BASE_URL}/customer/auth/refresh`,
});

class RemoteAccessApiClient {
  async isFeatureEnabled(): Promise<boolean> {
    const result = await adminClient.get<FeatureEnabledResponse>("/remote-access/enabled");
    return result.enabled;
  }

  async requestAccess(dto: CreateRemoteAccessRequestDto): Promise<RemoteAccessRequestResponse> {
    return adminClient.post<RemoteAccessRequestResponse>("/remote-access/request", dto);
  }

  async checkAccessStatus(
    documentType: RemoteAccessDocumentType,
    documentId: number,
  ): Promise<AccessStatusResponse> {
    return adminClient.get<AccessStatusResponse>(
      `/remote-access/status?documentType=${documentType}&documentId=${documentId}`,
    );
  }

  async requestStatus(requestId: number): Promise<RemoteAccessRequestResponse> {
    return adminClient.get<RemoteAccessRequestResponse>(`/remote-access/request/${requestId}`);
  }

  async pendingRequests(): Promise<PendingAccessRequestsResponse> {
    return customerClient.get<PendingAccessRequestsResponse>("/remote-access/pending");
  }

  async respondToRequest(
    requestId: number,
    dto: RespondToAccessRequestDto,
  ): Promise<RemoteAccessRequestResponse> {
    return customerClient.put<RemoteAccessRequestResponse>(
      `/remote-access/${requestId}/respond`,
      dto,
    );
  }
}

export const remoteAccessApi = new RemoteAccessApiClient();
export default remoteAccessApi;
