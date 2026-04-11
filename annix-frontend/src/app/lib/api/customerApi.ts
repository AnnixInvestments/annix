import { throwIfNotOk } from "@/app/lib/api/apiError";
import { type ApiClient, createApiClient } from "@/app/lib/api/createApiClient";
import { customerTokenStore } from "@/app/lib/api/portalTokenStores";
import { API_BASE_URL } from "@/lib/api-config";

// Types for customer portal - must match backend DTOs

// CompanyDetailsDto from backend
export interface CustomerCompanyDto {
  legalName: string;
  tradingName?: string;
  registrationNumber: string;
  vatNumber?: string;
  industry?: string;
  companySize?: "micro" | "small" | "medium" | "large" | "enterprise";
  streetAddress: string;
  city: string;
  provinceState: string;
  postalCode: string;
  country?: string;
  currencyCode?: string;
  primaryPhone: string;
  faxNumber?: string;
  generalEmail?: string;
  website?: string;
  beeLevel?: number | null;
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
export type CustomerProfileDto = Omit<CustomerUserDto, "email" | "password">;

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

const customerRefreshHandler = async (): Promise<boolean> => {
  const currentRefreshToken = customerTokenStore.refreshToken();
  if (!currentRefreshToken) return false;

  try {
    const result = await fetch(`${API_BASE_URL}/customer/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: currentRefreshToken }),
    });

    if (!result.ok) {
      customerTokenStore.clear();
      return false;
    }

    const data = await result.json();
    const accessToken = data.access_token || data.accessToken;
    const newRefreshToken = data.refresh_token || data.refreshToken;

    if (accessToken && newRefreshToken) {
      customerTokenStore.setTokens(accessToken, newRefreshToken, customerTokenStore.rememberMe());
      return true;
    }

    customerTokenStore.clear();
    return false;
  } catch {
    customerTokenStore.clear();
    return false;
  }
};

const apiClient: ApiClient = createApiClient({
  baseURL: API_BASE_URL,
  tokenStore: customerTokenStore,
  refreshHandler: customerRefreshHandler,
});

class CustomerApiClient {
  baseURL = API_BASE_URL;
  private rememberMeFlag = true;
  tokens = customerTokenStore;

  setRememberMe(remember: boolean) {
    this.rememberMeFlag = remember;
  }

  private setTokens(accessToken: string, refreshToken: string) {
    this.tokens.setTokens(accessToken, refreshToken, this.rememberMeFlag);
  }

  clearTokens() {
    this.tokens.clear();
  }

  isAuthenticated(): boolean {
    return this.tokens.isAuthenticated();
  }

  request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return apiClient.request<T>(endpoint, options);
  }

  async register(data: CustomerRegistrationDto): Promise<CustomerAuthResponse> {
    const result = await apiClient.post<CustomerAuthResponse>("/customer/register", data);
    this.setTokens(result.accessToken, result.refreshToken);
    return result;
  }

  async registerWithFormData(formData: FormData): Promise<CustomerAuthResponse> {
    const response = await fetch(`${API_BASE_URL}/customer/register`, {
      method: "POST",
      body: formData,
    });

    await throwIfNotOk(response);

    const result = await response.json();
    this.setTokens(result.accessToken, result.refreshToken);
    return result;
  }

  async login(data: CustomerLoginDto): Promise<CustomerAuthResponse> {
    const result = await apiClient.post<CustomerAuthResponse>("/customer/auth/login", data);
    this.setTokens(result.accessToken, result.refreshToken);
    return result;
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post("/customer/auth/logout");
    } finally {
      this.clearTokens();
    }
  }

  refreshAccessToken(): Promise<boolean> {
    return apiClient.refreshAccessToken();
  }

  // Profile endpoints
  async getProfile(): Promise<CustomerProfileResponse> {
    return this.request<CustomerProfileResponse>("/customer/profile");
  }

  async updateProfile(data: Partial<CustomerProfileDto>): Promise<CustomerProfileResponse> {
    return this.request<CustomerProfileResponse>("/customer/profile", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.request("/customer/profile/password", {
      method: "PATCH",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // Dashboard
  async getDashboard(): Promise<CustomerDashboardResponse> {
    return this.request<CustomerDashboardResponse>("/customer/dashboard");
  }

  // Company
  async getCompany(): Promise<CustomerCompanyDto> {
    return this.request<CustomerCompanyDto>("/customer/company");
  }

  async updateCompanyAddress(data: {
    streetAddress?: string;
    city?: string;
    provinceState?: string;
    postalCode?: string;
    primaryPhone?: string;
  }): Promise<CustomerCompanyDto> {
    return this.request<CustomerCompanyDto>("/customer/company/address", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // Check if email is available during registration
  async checkEmailAvailable(email: string): Promise<{ available: boolean }> {
    return this.request<{ available: boolean }>(
      `/customer/check-email?email=${encodeURIComponent(email)}`,
    );
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
    documentType: "vat" | "registration",
    expectedData: {
      vatNumber?: string;
      registrationNumber?: string;
      companyName?: string;
      streetAddress?: string;
      city?: string;
      provinceState?: string;
      postalCode?: string;
    },
  ): Promise<DocumentValidationResult> => {
    const formData = new FormData();
    formData.append("document", file);
    formData.append("documentType", documentType);
    formData.append("expectedData", JSON.stringify(expectedData));

    const response = await fetch(`${API_BASE_URL}/customer/validate-document`, {
      method: "POST",
      body: formData,
    });

    await throwIfNotOk(response);

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
  status: "draft" | "submitted" | "under_review" | "approved" | "rejected";
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
  status: "pending" | "accepted" | "expired" | "cancelled";
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
  invitedBy?: string;
  isExpired: boolean;
}

export interface DirectorySupplier {
  supplierProfileId: number;
  companyName: string;
  province: string;
  products: string[];
  productLabels: string[];
  status: "preferred" | "blocked" | "none";
  preferredSupplierId?: number;
  blockedSupplierId?: number;
}

export interface DirectoryFilters {
  search?: string;
  province?: string;
  products?: string[];
}

class CustomerOnboardingApi {
  private client: CustomerApiClient;

  constructor(client: CustomerApiClient) {
    this.client = client;
  }

  async getStatus(): Promise<OnboardingStatus> {
    return this.client["request"]<OnboardingStatus>("/customer/onboarding/status");
  }

  async updateCompanyDetails(
    data: Partial<CustomerCompanyDto>,
  ): Promise<{ success: boolean; message: string }> {
    return this.client["request"]("/customer/onboarding/company", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async submit(): Promise<{ success: boolean; message: string }> {
    return this.client["request"]("/customer/onboarding/submit", {
      method: "POST",
    });
  }
}

class CustomerDocumentApi {
  private client: CustomerApiClient;

  constructor(client: CustomerApiClient) {
    this.client = client;
  }

  async getDocuments(): Promise<CustomerDocument[]> {
    return this.client["request"]<CustomerDocument[]>("/customer/documents");
  }

  async uploadDocument(
    file: File,
    documentType: string,
    expiryDate?: string,
    verificationResult?: {
      success: boolean;
      overallConfidence: number;
      allFieldsMatch: boolean;
      extractedData?: Record<string, unknown>;
      fieldResults?: Array<{
        field: string;
        expected?: string | number | null;
        extracted?: string | number | null;
        match: boolean;
        similarity?: number;
      }>;
    },
  ): Promise<{ id: number; message: string }> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("documentType", documentType);
    if (expiryDate) {
      formData.append("expiryDate", expiryDate);
    }
    if (verificationResult) {
      formData.append("verificationResult", JSON.stringify(verificationResult));
    }

    const response = await fetch(`${this.client["baseURL"]}/customer/documents`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.client["tokens"].accessToken()}`,
      },
      body: formData,
    });

    await throwIfNotOk(response);

    return response.json();
  }

  async deleteDocument(id: number): Promise<{ success: boolean; message: string }> {
    return this.client["request"](`/customer/documents/${id}`, {
      method: "DELETE",
    });
  }

  getDownloadUrl(id: number): string {
    return `${this.client["baseURL"]}/customer/documents/${id}/download`;
  }

  async downloadDocument(id: number): Promise<void> {
    const { blob, filename } = await this.fetchDocumentBlob(id);

    // Create blob and trigger download
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  }

  async previewDocument(id: number): Promise<{ url: string; mimeType: string; filename: string }> {
    const { blob, filename } = await this.fetchDocumentBlob(id);
    const url = URL.createObjectURL(blob);
    return { url, mimeType: blob.type, filename };
  }

  private async fetchDocumentBlob(id: number): Promise<{ blob: Blob; filename: string }> {
    const token =
      typeof window !== "undefined"
        ? (localStorage.getItem("customerAccessToken") ??
          sessionStorage.getItem("customerAccessToken"))
        : null;
    const url = `${this.client["baseURL"]}/customer/documents/${id}/download`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    await throwIfNotOk(response);

    // Get filename from Content-Disposition header or use default
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = "document";
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
      if (match) {
        filename = match[1];
      }
    }

    const blob = await response.blob();
    return { blob, filename };
  }
}

class CustomerSupplierApi {
  private client: CustomerApiClient;

  constructor(client: CustomerApiClient) {
    this.client = client;
  }

  // Preferred Suppliers
  async getPreferredSuppliers(): Promise<PreferredSupplier[]> {
    return this.client["request"]<PreferredSupplier[]>("/customer/suppliers");
  }

  async addPreferredSupplier(data: {
    supplierProfileId?: number;
    supplierName?: string;
    supplierEmail?: string;
    priority?: number;
    notes?: string;
  }): Promise<{ id: number; message: string }> {
    return this.client["request"]("/customer/suppliers", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updatePreferredSupplier(
    id: number,
    data: { priority?: number; notes?: string },
  ): Promise<{ success: boolean; message: string }> {
    return this.client["request"](`/customer/suppliers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async removePreferredSupplier(id: number): Promise<{ success: boolean; message: string }> {
    return this.client["request"](`/customer/suppliers/${id}`, {
      method: "DELETE",
    });
  }

  // Invitations
  async getInvitations(): Promise<SupplierInvitation[]> {
    return this.client["request"]<SupplierInvitation[]>("/customer/suppliers/invitations");
  }

  async createInvitation(data: {
    email: string;
    supplierCompanyName?: string;
    message?: string;
  }): Promise<{ id: number; message: string; expiresAt: string }> {
    return this.client["request"]("/customer/suppliers/invite", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async cancelInvitation(id: number): Promise<{ success: boolean; message: string }> {
    return this.client["request"](`/customer/suppliers/invitations/${id}/cancel`, {
      method: "POST",
    });
  }

  async resendInvitation(
    id: number,
  ): Promise<{ success: boolean; message: string; expiresAt: string }> {
    return this.client["request"](`/customer/suppliers/invitations/${id}/resend`, {
      method: "POST",
    });
  }

  async supplierDirectory(filters?: DirectoryFilters): Promise<DirectorySupplier[]> {
    const params = new URLSearchParams();
    if (filters?.search) params.append("search", filters.search);
    if (filters?.province) params.append("province", filters.province);
    if (filters?.products) {
      filters.products.forEach((p) => params.append("products", p));
    }
    const queryString = params.toString();
    const url = queryString
      ? `/customer/suppliers/directory?${queryString}`
      : "/customer/suppliers/directory";
    return this.client["request"]<DirectorySupplier[]>(url);
  }

  async blockSupplier(
    supplierProfileId: number,
    reason?: string,
  ): Promise<{ id: number; message: string }> {
    return this.client["request"](`/customer/suppliers/${supplierProfileId}/block`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }

  async unblockSupplier(supplierProfileId: number): Promise<{ success: boolean; message: string }> {
    return this.client["request"](`/customer/suppliers/${supplierProfileId}/block`, {
      method: "DELETE",
    });
  }
}

// Email verification API
export const customerEmailApi = {
  verifyEmail: async (token: string): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/customer/auth/verify-email/${token}`);
    await throwIfNotOk(response);
    return response.json();
  },

  resendVerification: async (email: string): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/customer/auth/resend-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    await throwIfNotOk(response);
    return response.json();
  },
};

// Export API instances
export const customerOnboardingApi = new CustomerOnboardingApi(customerApiClient);
export const customerDocumentApi = new CustomerDocumentApi(customerApiClient);
export const customerSupplierApi = new CustomerSupplierApi(customerApiClient);
