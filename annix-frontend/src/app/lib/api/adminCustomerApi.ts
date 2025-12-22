import { API_BASE_URL } from '@/lib/api-config';

// Types for admin customer management
export interface CustomerListItem {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  accountStatus: 'pending' | 'active' | 'suspended' | 'deactivated';
  createdAt: string;
  lastLoginAt: string | null;
  deviceBound: boolean;
}

export interface CustomerListResponse {
  items: CustomerListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CustomerDetailResponse {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle?: string;
  directPhone?: string;
  mobilePhone?: string;
  accountStatus: string;
  suspensionReason?: string;
  suspendedAt?: string;
  createdAt: string;
  termsAcceptedAt?: string;
  company: {
    id: number;
    legalName: string;
    tradingName?: string;
    registrationNumber: string;
    vatNumber?: string;
    industry?: string;
    companySize?: string;
    streetAddress: string;
    city: string;
    provinceState: string;
    postalCode: string;
    country: string;
    primaryPhone: string;
    generalEmail?: string;
    website?: string;
  };
  deviceBinding: {
    id: number;
    deviceFingerprint: string;
    registeredIp: string;
    ipCountry?: string;
    browserInfo: Record<string, any>;
    createdAt: string;
    isActive: boolean;
  } | null;
  recentLogins: {
    attemptTime: string;
    success: boolean;
    failureReason?: string;
    ipAddress: string;
    ipMismatchWarning: boolean;
  }[];
}

export interface CustomerLoginHistoryItem {
  id: number;
  attemptTime: string;
  success: boolean;
  failureReason?: string;
  ipAddress: string;
  userAgent?: string;
  deviceFingerprint: string;
  ipMismatchWarning: boolean;
}

class AdminCustomerApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...(options.headers as Record<string, string>),
      },
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `API Error (${response.status}): ${errorText}`;

      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.message) {
          errorMessage = errorJson.message;
        }
      } catch {
        // Use raw error text
      }

      throw new Error(errorMessage);
    }

    return response.json();
  }

  // List customers with filtering and pagination
  async listCustomers(params?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<CustomerListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<CustomerListResponse>(`/admin/customers${query}`);
  }

  // Get customer details
  async getCustomerDetail(customerId: number): Promise<CustomerDetailResponse> {
    return this.request<CustomerDetailResponse>(`/admin/customers/${customerId}`);
  }

  // Suspend customer account
  async suspendCustomer(customerId: number, reason: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/admin/customers/${customerId}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // Reactivate customer account
  async reactivateCustomer(customerId: number, note?: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/admin/customers/${customerId}/reactivate`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  }

  // Reset device binding
  async resetDeviceBinding(customerId: number, reason: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/admin/customers/${customerId}/reset-device`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // Get login history
  async getLoginHistory(customerId: number, limit: number = 50): Promise<CustomerLoginHistoryItem[]> {
    return this.request<CustomerLoginHistoryItem[]>(`/admin/customers/${customerId}/login-history?limit=${limit}`);
  }
}

export const adminCustomerApiClient = new AdminCustomerApiClient();

export const adminCustomerApi = {
  listCustomers: (params?: Parameters<typeof adminCustomerApiClient.listCustomers>[0]) =>
    adminCustomerApiClient.listCustomers(params),
  getCustomerDetail: (customerId: number) =>
    adminCustomerApiClient.getCustomerDetail(customerId),
  suspendCustomer: (customerId: number, reason: string) =>
    adminCustomerApiClient.suspendCustomer(customerId, reason),
  reactivateCustomer: (customerId: number, note?: string) =>
    adminCustomerApiClient.reactivateCustomer(customerId, note),
  resetDeviceBinding: (customerId: number, reason: string) =>
    adminCustomerApiClient.resetDeviceBinding(customerId, reason),
  getLoginHistory: (customerId: number, limit?: number) =>
    adminCustomerApiClient.getLoginHistory(customerId, limit),
};
