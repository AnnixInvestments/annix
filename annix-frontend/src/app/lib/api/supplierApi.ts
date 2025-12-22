import { API_BASE_URL } from '@/lib/api-config';
import { getStoredFingerprint } from '@/app/hooks/useDeviceFingerprint';

// Types for supplier portal - must match backend DTOs

export interface SupplierRegistrationDto {
  email: string;
  password: string;
}

export interface SupplierLoginDto {
  email: string;
  password: string;
  deviceFingerprint: string;
  browserInfo?: Record<string, any>;
}

export interface SupplierAuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  supplier: {
    id: number;
    email: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
    accountStatus: string;
    onboardingStatus: string;
  };
}

export interface SupplierCompanyDto {
  legalName: string;
  tradingName?: string;
  registrationNumber: string;
  taxNumber?: string;
  vatNumber?: string;
  streetAddress: string;
  addressLine2?: string;
  city: string;
  provinceState: string;
  postalCode: string;
  country?: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  primaryPhone?: string;
  faxNumber?: string;
  generalEmail?: string;
  website?: string;
  operationalRegions?: string[];
  industryType?: string;
  companySize?: 'micro' | 'small' | 'medium' | 'large' | 'enterprise';
}

export interface SupplierProfileDto {
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  directPhone?: string;
  mobilePhone?: string;
  acceptTerms?: boolean;
  acceptSecurityPolicy?: boolean;
}

export interface SupplierDocumentDto {
  id: number;
  documentType: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  validationStatus: string;
  validationNotes?: string;
  expiryDate?: string;
  isRequired: boolean;
}

export interface OnboardingStatusResponse {
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  companyDetailsComplete: boolean;
  documentsComplete: boolean;
  missingDocuments: string[];
  rejectionReason?: string;
  remediationSteps?: string;
  canSubmit: boolean;
}

export interface SupplierDashboardResponse {
  profile: {
    firstName?: string;
    lastName?: string;
    email: string;
    companyName?: string;
  };
  onboarding: {
    status: string;
    companyDetailsComplete: boolean;
    documentsComplete: boolean;
    submittedAt?: string;
  };
  documents: {
    total: number;
    pending: number;
    valid: number;
    invalid: number;
  };
}

class SupplierApiClient {
  private baseURL: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;

    // Load tokens from storage
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('supplierAccessToken');
      this.refreshToken = localStorage.getItem('supplierRefreshToken');
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

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
      localStorage.setItem('supplierAccessToken', accessToken);
      localStorage.setItem('supplierRefreshToken', refreshToken);
    }
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('supplierAccessToken');
      localStorage.removeItem('supplierRefreshToken');
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
  async register(data: SupplierRegistrationDto): Promise<{ success: boolean; message: string }> {
    return this.request('/supplier/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/supplier/auth/verify-email/${token}`);
  }

  async resendVerification(email: string): Promise<{ success: boolean; message: string }> {
    return this.request('/supplier/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async login(data: SupplierLoginDto): Promise<SupplierAuthResponse> {
    const result = await this.request<SupplierAuthResponse>('/supplier/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    this.setTokens(result.accessToken, result.refreshToken);
    return result;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/supplier/auth/logout', {
        method: 'POST',
      });
    } finally {
      this.clearTokens();
    }
  }

  async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const fingerprint = getStoredFingerprint();
      const result = await fetch(`${this.baseURL}/supplier/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken, deviceFingerprint: fingerprint }),
      });

      if (!result.ok) {
        this.clearTokens();
        return false;
      }

      const data = await result.json();
      this.setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      this.clearTokens();
      return false;
    }
  }

  // Profile endpoints
  async getProfile(): Promise<any> {
    return this.request('/supplier/profile');
  }

  async updateProfile(data: SupplierProfileDto): Promise<any> {
    return this.request('/supplier/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Dashboard
  async getDashboard(): Promise<SupplierDashboardResponse> {
    return this.request<SupplierDashboardResponse>('/supplier/dashboard');
  }

  // Onboarding
  async getOnboardingStatus(): Promise<OnboardingStatusResponse> {
    return this.request<OnboardingStatusResponse>('/supplier/onboarding/status');
  }

  async saveCompanyDetails(data: SupplierCompanyDto): Promise<any> {
    return this.request('/supplier/onboarding/company', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getDocuments(): Promise<SupplierDocumentDto[]> {
    return this.request<SupplierDocumentDto[]>('/supplier/onboarding/documents');
  }

  async uploadDocument(file: File, documentType: string, expiryDate?: string): Promise<SupplierDocumentDto> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    if (expiryDate) {
      formData.append('expiryDate', expiryDate);
    }

    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${this.baseURL}/supplier/onboarding/documents`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${errorText}`);
    }

    return response.json();
  }

  async deleteDocument(documentId: number): Promise<void> {
    await this.request(`/supplier/onboarding/documents/${documentId}`, {
      method: 'DELETE',
    });
  }

  async submitOnboarding(): Promise<{ success: boolean; message: string }> {
    return this.request('/supplier/onboarding/submit', {
      method: 'POST',
    });
  }
}

export const supplierApiClient = new SupplierApiClient();

export const supplierAuthApi = {
  register: (data: SupplierRegistrationDto) => supplierApiClient.register(data),
  verifyEmail: (token: string) => supplierApiClient.verifyEmail(token),
  resendVerification: (email: string) => supplierApiClient.resendVerification(email),
  login: (data: SupplierLoginDto) => supplierApiClient.login(data),
  logout: () => supplierApiClient.logout(),
  refresh: () => supplierApiClient.refreshAccessToken(),
  isAuthenticated: () => supplierApiClient.isAuthenticated(),
};

export const supplierPortalApi = {
  getProfile: () => supplierApiClient.getProfile(),
  updateProfile: (data: SupplierProfileDto) => supplierApiClient.updateProfile(data),
  getDashboard: () => supplierApiClient.getDashboard(),
  getOnboardingStatus: () => supplierApiClient.getOnboardingStatus(),
  saveCompanyDetails: (data: SupplierCompanyDto) => supplierApiClient.saveCompanyDetails(data),
  getDocuments: () => supplierApiClient.getDocuments(),
  uploadDocument: (file: File, documentType: string, expiryDate?: string) =>
    supplierApiClient.uploadDocument(file, documentType, expiryDate),
  deleteDocument: (documentId: number) => supplierApiClient.deleteDocument(documentId),
  submitOnboarding: () => supplierApiClient.submitOnboarding(),
};
