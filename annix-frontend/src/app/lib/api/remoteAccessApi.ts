import { API_BASE_URL } from '@/lib/api-config';

export type RemoteAccessRequestType = 'VIEW' | 'EDIT';
export type RemoteAccessDocumentType = 'RFQ' | 'BOQ';
export type RemoteAccessStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED';

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

class RemoteAccessApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private adminHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('adminAccessToken');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private customerHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('customerAccessToken');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    useCustomerAuth: boolean = false,
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const config: RequestInit = {
      ...options,
      headers: {
        ...(useCustomerAuth ? this.customerHeaders() : this.adminHeaders()),
        ...(options.headers as Record<string, string>),
      },
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  async isFeatureEnabled(): Promise<boolean> {
    const result = await this.request<FeatureEnabledResponse>('/remote-access/enabled');
    return result.enabled;
  }

  async requestAccess(dto: CreateRemoteAccessRequestDto): Promise<RemoteAccessRequestResponse> {
    return this.request<RemoteAccessRequestResponse>('/remote-access/request', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async checkAccessStatus(
    documentType: RemoteAccessDocumentType,
    documentId: number,
  ): Promise<AccessStatusResponse> {
    return this.request<AccessStatusResponse>(
      `/remote-access/status?documentType=${documentType}&documentId=${documentId}`,
    );
  }

  async requestStatus(requestId: number): Promise<RemoteAccessRequestResponse> {
    return this.request<RemoteAccessRequestResponse>(`/remote-access/request/${requestId}`);
  }

  async pendingRequests(): Promise<PendingAccessRequestsResponse> {
    return this.request<PendingAccessRequestsResponse>(
      '/remote-access/pending',
      {},
      true,
    );
  }

  async respondToRequest(
    requestId: number,
    dto: RespondToAccessRequestDto,
  ): Promise<RemoteAccessRequestResponse> {
    return this.request<RemoteAccessRequestResponse>(
      `/remote-access/${requestId}/respond`,
      {
        method: 'PUT',
        body: JSON.stringify(dto),
      },
      true,
    );
  }
}

export const remoteAccessApi = new RemoteAccessApiClient();
export default remoteAccessApi;
