import { API_BASE_URL } from '@/lib/api-config';
import { getStoredFingerprint } from '@/app/hooks/useDeviceFingerprint';

// Types for customer portal - must match backend DTOs

// CompanyDetailsDto from backend
export interface CustomerCompanyDto {
  legalName: string;
  tradingName?: string;
  registrationNumber: string;
  vatNumber?: string;
  industry?: string;
  companySize?: 'micro' | 'small' | 'medium' | 'large' | 'enterprise'; // lowercase to match backend
  streetAddress: string;
  city: string;
  provinceState: string;
  postalCode: string;
  country?: string;
  primaryPhone: string;
  faxNumber?: string;
  generalEmail?: string;
  website?: string;
}

// UserDetailsDto from backend - includes email and password
export interface CustomerUserDto {
  firstName: string;
  lastName: string;
  jobTitle?: string;
  email: string;
  password: string;
  directPhone?: string;
  mobilePhone?: string;
}

// DeviceBindingDto from backend
export interface CustomerSecurityDto {
  deviceFingerprint: string;
  browserInfo?: Record<string, any>;
  termsAccepted: boolean;
  securityPolicyAccepted: boolean;
}

// CreateCustomerRegistrationDto from backend
export interface CustomerRegistrationDto {
  company: CustomerCompanyDto;
  user: CustomerUserDto;
  security: CustomerSecurityDto;
}

// Legacy type aliases for compatibility
export type CustomerProfileDto = Omit<CustomerUserDto, 'email' | 'password'>;

export interface CustomerLoginDto {
  email: string;
  password: string;
  deviceFingerprint: string;
  browserInfo?: Record<string, any>;
}

export interface CustomerAuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  customer: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    companyName: string;
    accountStatus: string;
  };
}

export interface CustomerProfileResponse {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle?: string;
  directPhone?: string;
  mobilePhone?: string;
  accountStatus: string;
  createdAt: string;
  company: {
    id: number;
    legalName: string;
    tradingName?: string;
    streetAddress: string;
    city: string;
    provinceState: string;
    postalCode: string;
    country: string;
    primaryPhone: string;
  };
  security: {
    deviceBound: boolean;
    registeredIp: string;
    registeredAt: string;
  };
}

export interface CustomerDashboardResponse {
  profile: {
    id: number;
    name: string;
    email: string;
    jobTitle?: string;
    accountStatus: string;
    memberSince: string;
  };
  company: {
    id: number;
    name: string;
    legalName: string;
  };
  security: {
    deviceBound: boolean;
    registeredIp?: string;
    lastLogin?: string;
    lastActivity?: string;
  };
  rfqStats: {
    total: number;
    pending: number;
    quoted: number;
    accepted: number;
  };
}

class CustomerApiClient {
  private baseURL: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;

    // Load tokens from storage
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('customerAccessToken');
      this.refreshToken = localStorage.getItem('customerRefreshToken');
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    // Include device fingerprint on all authenticated requests
    const fingerprint = getStoredFingerprint();
    if (fingerprint) {
      headers['x-device-fingerprint'] = fingerprint;
    }

    return headers;
  }

  private setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    if (typeof window !== 'undefined') {
      localStorage.setItem('customerAccessToken', accessToken);
      localStorage.setItem('customerRefreshToken', refreshToken);
    }
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('customerAccessToken');
      localStorage.removeItem('customerRefreshToken');
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
      // Try to refresh token
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        // Retry the request with new token
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

  // Authentication endpoints
  async register(data: CustomerRegistrationDto): Promise<CustomerAuthResponse> {
    const result = await this.request<CustomerAuthResponse>('/customer/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    this.setTokens(result.access_token, result.refresh_token);
    return result;
  }

  async login(data: CustomerLoginDto): Promise<CustomerAuthResponse> {
    const result = await this.request<CustomerAuthResponse>('/customer/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    this.setTokens(result.access_token, result.refresh_token);
    return result;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/customer/auth/logout', {
        method: 'POST',
      });
    } finally {
      this.clearTokens();
    }
  }

  async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const result = await fetch(`${this.baseURL}/customer/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!result.ok) {
        this.clearTokens();
        return false;
      }

      const data = await result.json();
      this.setTokens(data.access_token, data.refresh_token);
      return true;
    } catch {
      this.clearTokens();
      return false;
    }
  }

  // Profile endpoints
  async getProfile(): Promise<CustomerProfileResponse> {
    return this.request<CustomerProfileResponse>('/customer/profile');
  }

  async updateProfile(data: Partial<CustomerProfileDto>): Promise<CustomerProfileResponse> {
    return this.request<CustomerProfileResponse>('/customer/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return this.request('/customer/profile/password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // Dashboard
  async getDashboard(): Promise<CustomerDashboardResponse> {
    return this.request<CustomerDashboardResponse>('/customer/dashboard');
  }

  // Company
  async getCompany(): Promise<CustomerCompanyDto> {
    return this.request<CustomerCompanyDto>('/customer/company');
  }

  async updateCompanyAddress(data: {
    streetAddress?: string;
    city?: string;
    provinceState?: string;
    postalCode?: string;
    primaryPhone?: string;
  }): Promise<CustomerCompanyDto> {
    return this.request<CustomerCompanyDto>('/customer/company/address', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Check if email is available during registration
  async checkEmailAvailable(email: string): Promise<{ available: boolean }> {
    return this.request<{ available: boolean }>(`/customer/check-email?email=${encodeURIComponent(email)}`);
  }
}

export const customerApiClient = new CustomerApiClient();

export const customerAuthApi = {
  register: (data: CustomerRegistrationDto) => customerApiClient.register(data),
  login: (data: CustomerLoginDto) => customerApiClient.login(data),
  logout: () => customerApiClient.logout(),
  refresh: () => customerApiClient.refreshAccessToken(),
  isAuthenticated: () => customerApiClient.isAuthenticated(),
};

export const customerPortalApi = {
  getProfile: () => customerApiClient.getProfile(),
  updateProfile: (data: Partial<CustomerProfileDto>) => customerApiClient.updateProfile(data),
  changePassword: (currentPassword: string, newPassword: string) =>
    customerApiClient.changePassword(currentPassword, newPassword),
  getDashboard: () => customerApiClient.getDashboard(),
  getCompany: () => customerApiClient.getCompany(),
  updateCompanyAddress: (data: Parameters<typeof customerApiClient.updateCompanyAddress>[0]) =>
    customerApiClient.updateCompanyAddress(data),
};
