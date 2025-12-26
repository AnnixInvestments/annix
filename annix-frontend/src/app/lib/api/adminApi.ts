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
}

export const adminApiClient = new AdminApiClient();
