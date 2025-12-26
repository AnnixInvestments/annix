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

// Document validation types
export interface DocumentValidationResult {
  success: boolean;
  isValid: boolean;
  mismatches: Array<{
    field: string;
    expected: string;
    extracted: string;
    similarity?: number;
  }>;
  extractedData: {
    vatNumber?: string;
    registrationNumber?: string;
    companyName?: string;
    streetAddress?: string;
    city?: string;
    provinceState?: string;
    postalCode?: string;
    confidence?: string;
  };
  ocrFailed: boolean;
  requiresManualReview: boolean;
  allowedToProceed: boolean;
  message?: string;
}

export interface CustomerLoginDto {
  email: string;
  password: string;
  deviceFingerprint: string;
  browserInfo?: Record<string, any>;
}

export interface CustomerAuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  customerId: number;
  name: string;
  companyName: string;
  ipMismatchWarning?: boolean;
  registeredIp?: string;
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

    this.setTokens(result.accessToken, result.refreshToken);
    return result;
  }

  async registerWithFormData(formData: FormData): Promise<CustomerAuthResponse> {
    const response = await fetch(`${this.baseURL}/customer/register`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Registration failed (${response.status})`;
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

    const result = await response.json();
    this.setTokens(result.accessToken, result.refreshToken);
    return result;
  }

  async login(data: CustomerLoginDto): Promise<CustomerAuthResponse> {
    const result = await this.request<CustomerAuthResponse>('/customer/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    this.setTokens(result.accessToken, result.refreshToken);
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
  registerWithFormData: (formData: FormData) => customerApiClient.registerWithFormData(formData),
  login: (data: CustomerLoginDto) => customerApiClient.login(data),
  logout: () => customerApiClient.logout(),
  refresh: () => customerApiClient.refreshAccessToken(),
  isAuthenticated: () => customerApiClient.isAuthenticated(),

  /**
   * Validate uploaded document against user input using OCR
   */
  validateDocument: async (
    file: File,
    documentType: 'vat' | 'registration',
    expectedData: {
      vatNumber?: string;
      registrationNumber?: string;
      companyName?: string;
      streetAddress?: string;
      city?: string;
      provinceState?: string;
      postalCode?: string;
    }
  ): Promise<DocumentValidationResult> => {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('documentType', documentType);
    formData.append('expectedData', JSON.stringify(expectedData));

    const response = await fetch(`${API_BASE_URL}/customer/validate-document`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.message || 'Document validation failed');
      } catch {
        throw new Error('Document validation failed');
      }
    }

    return response.json();
  },
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

// Onboarding types and API
export interface OnboardingStatus {
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  companyDetailsComplete: boolean;
  documentsComplete: boolean;
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  remediationSteps?: string;
  requiredDocuments: {
    type: string;
    label: string;
    uploaded: boolean;
    status?: string;
  }[];
}

export interface CustomerDocument {
  id: number;
  documentType: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  expiryDate?: string;
  validationStatus: string;
  validationNotes?: string;
}

export interface PreferredSupplier {
  id: number;
  supplierProfileId?: number;
  supplierName: string;
  supplierEmail?: string;
  priority: number;
  notes?: string;
  addedBy?: string;
  createdAt: string;
  isRegistered: boolean;
}

export interface SupplierInvitation {
  id: number;
  email: string;
  supplierCompanyName?: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
  invitedBy?: string;
  isExpired: boolean;
}

class CustomerOnboardingApi {
  private client: CustomerApiClient;

  constructor(client: CustomerApiClient) {
    this.client = client;
  }

  async getStatus(): Promise<OnboardingStatus> {
    return this.client['request']<OnboardingStatus>('/customer/onboarding/status');
  }

  async updateCompanyDetails(data: Partial<CustomerCompanyDto>): Promise<{ success: boolean; message: string }> {
    return this.client['request']('/customer/onboarding/company', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async submit(): Promise<{ success: boolean; message: string }> {
    return this.client['request']('/customer/onboarding/submit', {
      method: 'POST',
    });
  }
}

class CustomerDocumentApi {
  private client: CustomerApiClient;

  constructor(client: CustomerApiClient) {
    this.client = client;
  }

  async getDocuments(): Promise<CustomerDocument[]> {
    return this.client['request']<CustomerDocument[]>('/customer/documents');
  }

  async uploadDocument(file: File, documentType: string, expiryDate?: string): Promise<{ id: number; message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    if (expiryDate) {
      formData.append('expiryDate', expiryDate);
    }

    const response = await fetch(`${this.client['baseURL']}/customer/documents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.client['accessToken']}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }

    return response.json();
  }

  async deleteDocument(id: number): Promise<{ success: boolean; message: string }> {
    return this.client['request'](`/customer/documents/${id}`, {
      method: 'DELETE',
    });
  }

  getDownloadUrl(id: number): string {
    return `${this.client['baseURL']}/customer/documents/${id}/download`;
  }
}

class CustomerSupplierApi {
  private client: CustomerApiClient;

  constructor(client: CustomerApiClient) {
    this.client = client;
  }

  // Preferred Suppliers
  async getPreferredSuppliers(): Promise<PreferredSupplier[]> {
    return this.client['request']<PreferredSupplier[]>('/customer/suppliers');
  }

  async addPreferredSupplier(data: {
    supplierProfileId?: number;
    supplierName?: string;
    supplierEmail?: string;
    priority?: number;
    notes?: string;
  }): Promise<{ id: number; message: string }> {
    return this.client['request']('/customer/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePreferredSupplier(
    id: number,
    data: { priority?: number; notes?: string }
  ): Promise<{ success: boolean; message: string }> {
    return this.client['request'](`/customer/suppliers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async removePreferredSupplier(id: number): Promise<{ success: boolean; message: string }> {
    return this.client['request'](`/customer/suppliers/${id}`, {
      method: 'DELETE',
    });
  }

  // Invitations
  async getInvitations(): Promise<SupplierInvitation[]> {
    return this.client['request']<SupplierInvitation[]>('/customer/suppliers/invitations');
  }

  async createInvitation(data: {
    email: string;
    supplierCompanyName?: string;
    message?: string;
  }): Promise<{ id: number; message: string; expiresAt: string }> {
    return this.client['request']('/customer/suppliers/invite', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async cancelInvitation(id: number): Promise<{ success: boolean; message: string }> {
    return this.client['request'](`/customer/suppliers/invitations/${id}/cancel`, {
      method: 'POST',
    });
  }

  async resendInvitation(id: number): Promise<{ success: boolean; message: string; expiresAt: string }> {
    return this.client['request'](`/customer/suppliers/invitations/${id}/resend`, {
      method: 'POST',
    });
  }
}

// Email verification API
export const customerEmailApi = {
  verifyEmail: async (token: string): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/customer/auth/verify-email/${token}`);
    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.message || 'Verification failed');
      } catch {
        throw new Error('Verification failed');
      }
    }
    return response.json();
  },

  resendVerification: async (email: string): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/customer/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.message || 'Failed to resend verification');
      } catch {
        throw new Error('Failed to resend verification');
      }
    }
    return response.json();
  },
};

// Export API instances
export const customerOnboardingApi = new CustomerOnboardingApi(customerApiClient);
export const customerDocumentApi = new CustomerDocumentApi(customerApiClient);
export const customerSupplierApi = new CustomerSupplierApi(customerApiClient);
