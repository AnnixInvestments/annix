import { API_BASE_URL } from '@/lib/api-config';

// Types for admin portal - must match backend DTOs

export interface AdminLoginDto {
  email: string;
  password: string;
}

export interface AdminUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

export interface AdminLoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AdminUser;
}

export interface AdminUserProfile {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  createdAt: string;
  lastActiveAt?: string;
}

export interface DashboardStats {
  totalCustomers: number;
  totalSuppliers: number;
  totalRfqs: number;
  pendingApprovals: {
    customers: number;
    suppliers: number;
    total: number;
  };
  recentActivity: ActivityItem[];
  systemHealth: {
    activeCustomerSessions: number;
    activeSupplierSessions: number;
    activeAdminSessions: number;
  };
}

export interface ActivityItem {
  id: number;
  timestamp: string;
  userId: number;
  userName: string;
  action: string;
  entityType: string;
  entityId?: number;
  details?: string;
  ipAddress?: string;
}

export interface CustomerStats {
  total: number;
  active: number;
  suspended: number;
  pendingReview: number;
}

export interface SupplierStats {
  total: number;
  active: number;
  suspended: number;
  pendingReview: number;
}

// Customer Management Types

export type CustomerAccountStatus = 'pending' | 'active' | 'suspended' | 'deactivated';

export interface CustomerQueryDto {
  search?: string;
  status?: CustomerAccountStatus;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface CustomerListItem {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  accountStatus: CustomerAccountStatus;
  createdAt: string;
  lastLoginAt?: string | null;
  deviceBound: boolean;
}

export interface CustomerListResponse {
  items: CustomerListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CustomerDetail {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle?: string;
  directPhone?: string;
  mobilePhone?: string;
  accountStatus: CustomerAccountStatus;
  suspensionReason?: string | null;
  suspendedAt?: string | null;
  createdAt: string;
  lastLoginAt?: string | null;
  deviceBound: boolean;
  company?: {
    name: string;
    vatNumber?: string;
    registrationNumber?: string;
    address?: string;
    city?: string;
    province?: string;
    postalCode?: string;
  };
  onboarding?: {
    status: string;
    submittedAt?: string;
    reviewedAt?: string;
  };
}

export interface SuspendCustomerDto {
  reason: string;
}

export interface ReactivateCustomerDto {
  note?: string;
}

export interface ResetDeviceBindingDto {
  reason: string;
}

export interface LoginHistoryItem {
  id: number;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  failureReason?: string;
}

export interface CustomerDocument {
  id: number;
  documentType: string;
  fileName: string;
  filePath: string;
  uploadedAt: string;
  validationStatus?: string;
  validationNotes?: string;
}

class AdminApiClient {
  private baseURL: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;

    // Load tokens from storage
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('adminAccessToken');
      this.refreshToken = localStorage.getItem('adminRefreshToken');
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    return headers;
  }

  private setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    if (typeof window !== 'undefined') {
      localStorage.setItem('adminAccessToken', accessToken);
      localStorage.setItem('adminRefreshToken', refreshToken);
    }
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('adminAccessToken');
      localStorage.removeItem('adminRefreshToken');
    }
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
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

    if (response.status === 401 && this.refreshToken) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        config.headers = {
          ...this.getHeaders(),
          ...(options.headers as Record<string, string>),
        };
        const retryResponse = await fetch(url, config);
        if (!retryResponse.ok) {
          const errorText = await retryResponse.text();
          throw new Error(`API Error (${retryResponse.status}): ${errorText}`);
        }
        return retryResponse.json();
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `API Error (${response.status}): ${errorText}`;

      try {
        const errorData = JSON.parse(errorText);
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        // Use raw error text if not JSON
      }

      throw new Error(errorMessage);
    }

    return response.json();
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch(`${this.baseURL}/admin/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) {
        this.clearTokens();
        return false;
      }

      const data = await response.json();
      this.accessToken = data.accessToken;
      if (typeof window !== 'undefined') {
        localStorage.setItem('adminAccessToken', data.accessToken);
      }
      return true;
    } catch {
      this.clearTokens();
      return false;
    }
  }

  // Authentication endpoints

  async login(dto: AdminLoginDto): Promise<AdminLoginResponse> {
    const response = await this.request<AdminLoginResponse>('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify(dto),
    });

    this.setTokens(response.accessToken, response.refreshToken);
    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/admin/auth/logout', { method: 'POST' });
    } finally {
      this.clearTokens();
    }
  }

  async getCurrentUser(): Promise<AdminUserProfile> {
    return this.request<AdminUserProfile>('/admin/auth/me');
  }

  // Dashboard endpoints

  async getDashboardStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>('/admin/dashboard/stats');
  }

  async getRecentActivity(limit: number = 20): Promise<ActivityItem[]> {
    return this.request<ActivityItem[]>(`/admin/dashboard/recent-activity?limit=${limit}`);
  }

  async getCustomerStats(): Promise<CustomerStats> {
    return this.request<CustomerStats>('/admin/dashboard/customers/stats');
  }

  async getSupplierStats(): Promise<SupplierStats> {
    return this.request<SupplierStats>('/admin/dashboard/suppliers/stats');
  }

  // Customer Management endpoints

  async listCustomers(query?: CustomerQueryDto): Promise<CustomerListResponse> {
    const params = new URLSearchParams();
    if (query?.search) params.append('search', query.search);
    if (query?.status) params.append('status', query.status);
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.sortBy) params.append('sortBy', query.sortBy);
    if (query?.sortOrder) params.append('sortOrder', query.sortOrder);

    const queryString = params.toString();
    return this.request<CustomerListResponse>(
      `/admin/customers${queryString ? `?${queryString}` : ''}`
    );
  }

  async getCustomerDetail(id: number): Promise<CustomerDetail> {
    return this.request<CustomerDetail>(`/admin/customers/${id}`);
  }

  async suspendCustomer(id: number, dto: SuspendCustomerDto): Promise<void> {
    return this.request<void>(`/admin/customers/${id}/suspend`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async reactivateCustomer(id: number, dto: ReactivateCustomerDto): Promise<void> {
    return this.request<void>(`/admin/customers/${id}/reactivate`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async resetDeviceBinding(id: number, dto: ResetDeviceBindingDto): Promise<void> {
    return this.request<void>(`/admin/customers/${id}/reset-device`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async getCustomerLoginHistory(id: number, limit?: number): Promise<LoginHistoryItem[]> {
    return this.request<LoginHistoryItem[]>(
      `/admin/customers/${id}/login-history${limit ? `?limit=${limit}` : ''}`
    );
  }

  async getCustomerDocuments(id: number): Promise<CustomerDocument[]> {
    return this.request<CustomerDocument[]>(`/admin/customers/${id}/documents`);
  }

  async getPendingReviewCustomers(): Promise<any[]> {
    return this.request<any[]>('/admin/customers/onboarding/pending-review');
  }

  async getCustomerOnboardingForReview(id: number): Promise<any> {
    return this.request<any>(`/admin/customers/onboarding/${id}`);
  }

  async approveCustomerOnboarding(id: number): Promise<void> {
    return this.request<void>(`/admin/customers/onboarding/${id}/approve`, {
      method: 'POST',
    });
  }

  async rejectCustomerOnboarding(id: number, reason: string, remediationSteps: string): Promise<void> {
    return this.request<void>(`/admin/customers/onboarding/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason, remediationSteps }),
    });
  }

  async reviewCustomerDocument(id: number, validationStatus: string, validationNotes?: string): Promise<void> {
    return this.request<void>(`/admin/customers/documents/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ validationStatus, validationNotes }),
    });
  }

  // Supplier Management endpoints

  async listSuppliers(query?: { page?: number; limit?: number; status?: string }): Promise<any> {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.status) params.append('status', query.status);

    const queryString = params.toString();
    return this.request<any>(
      `/admin/suppliers${queryString ? `?${queryString}` : ''}`
    );
  }

  async getSupplierDetail(id: number): Promise<any> {
    return this.request<any>(`/admin/suppliers/${id}`);
  }

  async getPendingReviewSuppliers(): Promise<any[]> {
    return this.request<any[]>('/admin/suppliers/pending-review');
  }

  async reviewSupplierDocument(
    supplierId: number,
    documentId: number,
    validationStatus: string,
    validationNotes?: string
  ): Promise<void> {
    return this.request<void>(`/admin/suppliers/${supplierId}/documents/${documentId}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ validationStatus, validationNotes }),
    });
  }

  async startSupplierReview(id: number): Promise<void> {
    return this.request<void>(`/admin/suppliers/${id}/start-review`, {
      method: 'POST',
    });
  }

  async approveSupplierOnboarding(id: number): Promise<void> {
    return this.request<void>(`/admin/suppliers/${id}/approve`, {
      method: 'POST',
    });
  }

  async rejectSupplierOnboarding(id: number, reason: string, remediationSteps: string): Promise<void> {
    return this.request<void>(`/admin/suppliers/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason, remediationSteps }),
    });
  }

  async suspendSupplier(id: number, reason: string): Promise<void> {
    return this.request<void>(`/admin/suppliers/${id}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async reactivateSupplier(id: number): Promise<void> {
    return this.request<void>(`/admin/suppliers/${id}/reactivate`, {
      method: 'POST',
    });
  }
}

export const adminApiClient = new AdminApiClient();
