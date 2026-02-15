import { API_BASE_URL } from "@/lib/api-config";

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

export type CustomerAccountStatus = "pending" | "active" | "suspended" | "deactivated";

export interface CustomerQueryDto {
  search?: string;
  status?: CustomerAccountStatus;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
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
    id: number;
    status: string;
    submittedAt?: string;
    reviewedAt?: string;
    reviewedByName?: string | null;
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
  ocrProcessedAt?: string;
  ocrFailed?: boolean;
  verificationConfidence?: number;
  allFieldsMatch?: boolean;
}

export interface FieldComparisonResult {
  field: string;
  expected: string | number | null;
  extracted: string | number | null;
  matches: boolean;
  similarity: number;
}

export interface DocumentReviewData {
  documentId: number;
  documentType: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
  validationStatus: string;
  validationNotes: string | null;
  presignedUrl: string;
  ocrProcessedAt: string | null;
  ocrFailed: boolean;
  verificationConfidence: number | null;
  allFieldsMatch: boolean | null;
  expectedData: Record<string, any>;
  extractedData: Record<string, any>;
  fieldComparison: FieldComparisonResult[];
  reviewedBy: string | null;
  reviewedAt: string | null;
  customer?: {
    id: number;
    firstName: string;
    lastName: string;
  };
  supplier?: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

export interface VerificationResult {
  success: boolean;
  documentId: number;
  entityType: "customer" | "supplier";
  validationStatus: string;
  allFieldsMatch: boolean;
  requiresManualReview: boolean;
  errorMessage?: string;
}

export interface AutoApprovalResult {
  entityType: "customer" | "supplier";
  entityId: number;
  approved: boolean;
  reason: string;
  missingDocuments: string[];
}

export interface DocumentPreviewImages {
  pages: string[];
  totalPages: number;
  invalidDocuments: string[];
  manualReviewDocuments: string[];
}

export interface SecureDocument {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  folder: string | null;
  storagePath: string;
  fileType: "markdown" | "pdf" | "excel" | "word" | "other";
  originalFilename: string | null;
  attachmentPath: string | null;
  createdBy: {
    id: number;
    firstName?: string | null;
    lastName?: string | null;
    username?: string | null;
    email?: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface SecureDocumentWithContent extends SecureDocument {
  content: string;
}

export interface CreateSecureDocumentDto {
  title: string;
  description?: string;
  content: string;
  folder?: string;
}

export interface UpdateSecureDocumentDto {
  title?: string;
  description?: string;
  content?: string;
  folder?: string;
}

export interface SecureEntityFolder {
  id: number;
  entityType: "customer" | "supplier";
  entityId: number;
  folderName: string;
  secureFolderPath: string;
  isActive: boolean;
  createdAt: string;
  deletedAt: string | null;
  deletionReason: string | null;
}

export interface LocalDocument {
  slug: string;
  title: string;
  description: string;
  filePath: string;
  updatedAt: string;
  isLocal: true;
}

export interface LocalDocumentWithContent extends LocalDocument {
  content: string;
}

// Re-export RfqDraftStatus from client for admin use
export type { RfqDraftStatus } from "./client";

// Admin RFQ types - extends existing types with admin-specific fields
export interface AdminRfqListItem {
  id: number;
  rfqNumber?: string;
  projectName: string;
  customerName: string;
  customerEmail: string;
  status: string;
  isUnregistered?: boolean;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  documentCount?: number;
  requiredDate?: string;
  isPastDeadline?: boolean;
}

export interface AdminRfqListResponse {
  items: AdminRfqListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RfqFullDraftResponse {
  id: number;
  draftNumber: string;
  projectName?: string;
  currentStep: number;
  completionPercentage: number;
  isConverted: boolean;
  convertedRfqId?: number;
  formData: Record<string, any>;
  globalSpecs?: Record<string, any>;
  requiredProducts?: string[];
  straightPipeEntries?: Record<string, any>[];
  pendingDocuments?: Record<string, any>[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminRfqQueryDto {
  search?: string;
  status?: string;
  customerId?: number;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
  page?: number;
  limit?: number;
}

class AdminApiClient {
  private baseURL: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;

    // Load tokens from storage
    if (typeof window !== "undefined") {
      this.accessToken = localStorage.getItem("adminAccessToken");
      this.refreshToken = localStorage.getItem("adminRefreshToken");
    }
  }

  private getHeaders(): Record<string, string> {
    if (!this.accessToken && typeof window !== "undefined") {
      this.accessToken = localStorage.getItem("adminAccessToken");
      this.refreshToken = localStorage.getItem("adminRefreshToken");
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    return headers;
  }

  private setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    if (typeof window !== "undefined") {
      localStorage.setItem("adminAccessToken", accessToken);
      localStorage.setItem("adminRefreshToken", refreshToken);
    }
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("adminAccessToken");
      localStorage.removeItem("adminRefreshToken");
    }
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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

    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return response.json();
    }

    return undefined as T;
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch(`${this.baseURL}/admin/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) {
        this.clearTokens();
        return false;
      }

      const data = await response.json();
      this.accessToken = data.accessToken;
      if (typeof window !== "undefined") {
        localStorage.setItem("adminAccessToken", data.accessToken);
      }
      return true;
    } catch {
      this.clearTokens();
      return false;
    }
  }

  // Authentication endpoints

  async login(dto: AdminLoginDto): Promise<AdminLoginResponse> {
    const response = await this.request<AdminLoginResponse>("/admin/auth/login", {
      method: "POST",
      body: JSON.stringify(dto),
    });

    this.setTokens(response.accessToken, response.refreshToken);
    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.request("/admin/auth/logout", { method: "POST" });
    } finally {
      this.clearTokens();
    }
  }

  async getCurrentUser(): Promise<AdminUserProfile> {
    return this.request<AdminUserProfile>("/admin/auth/me");
  }

  // Dashboard endpoints

  async getDashboardStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>("/admin/dashboard/stats");
  }

  async getRecentActivity(limit: number = 20): Promise<ActivityItem[]> {
    return this.request<ActivityItem[]>(`/admin/dashboard/recent-activity?limit=${limit}`);
  }

  async getCustomerStats(): Promise<CustomerStats> {
    return this.request<CustomerStats>("/admin/dashboard/customers/stats");
  }

  async getSupplierStats(): Promise<SupplierStats> {
    return this.request<SupplierStats>("/admin/dashboard/suppliers/stats");
  }

  // Customer Management endpoints

  async listCustomers(query?: CustomerQueryDto): Promise<CustomerListResponse> {
    const params = new URLSearchParams();
    if (query?.search) params.append("search", query.search);
    if (query?.status) params.append("status", query.status);
    if (query?.page) params.append("page", query.page.toString());
    if (query?.limit) params.append("limit", query.limit.toString());
    if (query?.sortBy) params.append("sortBy", query.sortBy);
    if (query?.sortOrder) params.append("sortOrder", query.sortOrder);

    const queryString = params.toString();
    return this.request<CustomerListResponse>(
      `/admin/customers${queryString ? `?${queryString}` : ""}`,
    );
  }

  async getCustomerDetail(id: number): Promise<CustomerDetail> {
    return this.request<CustomerDetail>(`/admin/customers/${id}`);
  }

  async suspendCustomer(id: number, dto: SuspendCustomerDto): Promise<void> {
    return this.request<void>(`/admin/customers/${id}/suspend`, {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }

  async reactivateCustomer(id: number, dto: ReactivateCustomerDto): Promise<void> {
    return this.request<void>(`/admin/customers/${id}/reactivate`, {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }

  async resetDeviceBinding(id: number, dto: ResetDeviceBindingDto): Promise<void> {
    return this.request<void>(`/admin/customers/${id}/reset-device`, {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }

  async getCustomerLoginHistory(id: number, limit?: number): Promise<LoginHistoryItem[]> {
    return this.request<LoginHistoryItem[]>(
      `/admin/customers/${id}/login-history${limit ? `?limit=${limit}` : ""}`,
    );
  }

  async getCustomerDocuments(id: number): Promise<CustomerDocument[]> {
    return this.request<CustomerDocument[]>(`/admin/customers/${id}/documents`);
  }

  async getCustomerDocumentUrl(
    documentId: number,
  ): Promise<{ url: string; filename: string; mimeType: string }> {
    return this.request<{ url: string; filename: string; mimeType: string }>(
      `/admin/customers/documents/${documentId}/url`,
    );
  }

  async getPendingReviewCustomers(): Promise<any[]> {
    return this.request<any[]>("/admin/customers/onboarding/pending-review");
  }

  async getCustomerOnboardingForReview(id: number): Promise<any> {
    return this.request<any>(`/admin/customers/onboarding/${id}`);
  }

  async approveCustomerOnboarding(id: number): Promise<void> {
    return this.request<void>(`/admin/customers/onboarding/${id}/approve`, {
      method: "POST",
    });
  }

  async rejectCustomerOnboarding(
    id: number,
    reason: string,
    remediationSteps: string,
  ): Promise<void> {
    return this.request<void>(`/admin/customers/onboarding/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason, remediationSteps }),
    });
  }

  async reviewCustomerDocument(
    id: number,
    validationStatus: string,
    validationNotes?: string,
  ): Promise<void> {
    return this.request<void>(`/admin/customers/documents/${id}/review`, {
      method: "POST",
      body: JSON.stringify({ validationStatus, validationNotes }),
    });
  }

  async getCustomerDocumentReviewData(documentId: number): Promise<DocumentReviewData> {
    return this.request<DocumentReviewData>(`/admin/customers/documents/${documentId}/review-data`);
  }

  async getCustomerDocumentPreviewImages(documentId: number): Promise<DocumentPreviewImages> {
    return this.request<DocumentPreviewImages>(
      `/admin/customers/documents/${documentId}/preview-images`,
    );
  }

  async reVerifyCustomerDocument(documentId: number): Promise<VerificationResult> {
    return this.request<VerificationResult>(`/admin/customers/documents/${documentId}/re-verify`, {
      method: "POST",
    });
  }

  async checkCustomerAutoApproval(customerId: number): Promise<AutoApprovalResult> {
    return this.request<AutoApprovalResult>(`/admin/customers/${customerId}/check-auto-approval`, {
      method: "POST",
    });
  }

  async inviteCustomer(
    email: string,
    message?: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>("/admin/customers/invite", {
      method: "POST",
      body: JSON.stringify({ email, message }),
    });
  }

  // Supplier Management endpoints

  async listSuppliers(query?: { page?: number; limit?: number; status?: string }): Promise<any> {
    const params = new URLSearchParams();
    if (query?.page) params.append("page", query.page.toString());
    if (query?.limit) params.append("limit", query.limit.toString());
    if (query?.status) params.append("status", query.status);

    const queryString = params.toString();
    return this.request<any>(`/admin/suppliers${queryString ? `?${queryString}` : ""}`);
  }

  async getSupplierDetail(id: number): Promise<any> {
    return this.request<any>(`/admin/suppliers/${id}`);
  }

  async getPendingReviewSuppliers(): Promise<any[]> {
    return this.request<any[]>("/admin/suppliers/pending-review");
  }

  async reviewSupplierDocument(
    supplierId: number,
    documentId: number,
    validationStatus: string,
    validationNotes?: string,
  ): Promise<void> {
    return this.request<void>(`/admin/suppliers/${supplierId}/documents/${documentId}/review`, {
      method: "PATCH",
      body: JSON.stringify({ validationStatus, validationNotes }),
    });
  }

  async startSupplierReview(id: number): Promise<void> {
    return this.request<void>(`/admin/suppliers/${id}/start-review`, {
      method: "POST",
    });
  }

  async approveSupplierOnboarding(id: number): Promise<void> {
    return this.request<void>(`/admin/suppliers/${id}/approve`, {
      method: "POST",
    });
  }

  async rejectSupplierOnboarding(
    id: number,
    reason: string,
    remediationSteps: string,
  ): Promise<void> {
    return this.request<void>(`/admin/suppliers/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason, remediationSteps }),
    });
  }

  async suspendSupplier(id: number, reason: string): Promise<void> {
    return this.request<void>(`/admin/suppliers/${id}/suspend`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }

  async reactivateSupplier(id: number): Promise<void> {
    return this.request<void>(`/admin/suppliers/${id}/reactivate`, {
      method: "POST",
    });
  }

  async inviteSupplier(
    email: string,
    message?: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>("/admin/suppliers/invite", {
      method: "POST",
      body: JSON.stringify({ email, message }),
    });
  }

  async getSupplierDocumentReviewData(
    supplierId: number,
    documentId: number,
  ): Promise<DocumentReviewData> {
    return this.request<DocumentReviewData>(
      `/admin/suppliers/${supplierId}/documents/${documentId}/review-data`,
    );
  }

  async reVerifySupplierDocument(
    supplierId: number,
    documentId: number,
  ): Promise<VerificationResult> {
    return this.request<VerificationResult>(
      `/admin/suppliers/${supplierId}/documents/${documentId}/re-verify`,
      {
        method: "POST",
      },
    );
  }

  async checkSupplierAutoApproval(supplierId: number): Promise<AutoApprovalResult> {
    return this.request<AutoApprovalResult>(`/admin/suppliers/${supplierId}/check-auto-approval`, {
      method: "POST",
    });
  }

  async getSupplierDocumentPreviewImages(
    supplierId: number,
    documentId: number,
  ): Promise<DocumentPreviewImages> {
    return this.request<DocumentPreviewImages>(
      `/admin/suppliers/${supplierId}/documents/${documentId}/preview-images`,
    );
  }

  // Secure Documents endpoints

  async listSecureDocuments(): Promise<SecureDocument[]> {
    return this.request<SecureDocument[]>("/admin/secure-documents");
  }

  async getSecureDocument(id: string): Promise<SecureDocumentWithContent> {
    return this.request<SecureDocumentWithContent>(`/admin/secure-documents/${id}`);
  }

  async createSecureDocument(dto: CreateSecureDocumentDto): Promise<SecureDocument> {
    return this.request<SecureDocument>("/admin/secure-documents", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }

  async updateSecureDocument(id: string, dto: UpdateSecureDocumentDto): Promise<SecureDocument> {
    return this.request<SecureDocument>(`/admin/secure-documents/${id}`, {
      method: "PUT",
      body: JSON.stringify(dto),
    });
  }

  async deleteSecureDocument(id: string): Promise<void> {
    return this.request<void>(`/admin/secure-documents/${id}`, {
      method: "DELETE",
    });
  }

  async secureDocumentAttachmentUrl(id: string): Promise<{ url: string; filename: string }> {
    return this.request<{ url: string; filename: string }>(
      `/admin/secure-documents/${id}/attachment-url`,
    );
  }

  async listLocalDocuments(): Promise<LocalDocument[]> {
    return this.request<LocalDocument[]>("/admin/secure-documents/local");
  }

  async getLocalDocument(filePath: string): Promise<LocalDocumentWithContent> {
    const encodedPath = encodeURIComponent(filePath);
    const response = await this.request<{ content: string; document: LocalDocument }>(
      `/admin/secure-documents/local/${encodedPath}`,
    );
    return { ...response.document, content: response.content };
  }

  async listEntityFolders(): Promise<SecureEntityFolder[]> {
    return this.request<SecureEntityFolder[]>("/admin/secure-documents/entity-folders/list");
  }

  async getEntityFolderDocuments(
    entityType: "customer" | "supplier",
    entityId: number,
  ): Promise<{ folder: SecureEntityFolder | null; documents: SecureDocument[] }> {
    return this.request<{ folder: SecureEntityFolder | null; documents: SecureDocument[] }>(
      `/admin/secure-documents/entity-folders/${entityType}/${entityId}`,
    );
  }

  // Admin RFQ Management - view all RFQs across all customers

  async listRfqs(query?: AdminRfqQueryDto): Promise<AdminRfqListResponse> {
    const params = new URLSearchParams();
    if (query?.search) params.append("search", query.search);
    if (query?.status) params.append("status", query.status);
    if (query?.customerId) params.append("customerId", query.customerId.toString());
    if (query?.dateFrom) params.append("dateFrom", query.dateFrom);
    if (query?.dateTo) params.append("dateTo", query.dateTo);
    if (query?.page) params.append("page", query.page.toString());
    if (query?.limit) params.append("limit", query.limit.toString());
    if (query?.sortBy) params.append("sortBy", query.sortBy);
    if (query?.sortOrder) params.append("sortOrder", query.sortOrder);

    const queryString = params.toString();
    return this.request<AdminRfqListResponse>(`/admin/rfqs${queryString ? `?${queryString}` : ""}`);
  }

  async getRfqDetail(id: number): Promise<any> {
    return this.request<any>(`/admin/rfqs/${id}`);
  }

  async getRfqItems(id: number): Promise<any[]> {
    return this.request<any[]>(`/admin/rfqs/${id}/items`);
  }

  async getRfqFullDraft(id: number): Promise<RfqFullDraftResponse> {
    return this.request<RfqFullDraftResponse>(`/admin/rfqs/${id}/full`);
  }

  async updateRfq(id: number, data: any): Promise<any> {
    return this.request<any>(`/admin/rfqs/${id}/unified`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async saveDraft(data: any): Promise<any> {
    return this.request<any>("/admin/rfqs/drafts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async uploadNixDocument(
    file: File,
    title?: string,
    description?: string,
    processWithNix: boolean = true,
  ): Promise<NixUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);
    if (title) formData.append("title", title);
    if (description) formData.append("description", description);
    formData.append("processWithNix", processWithNix.toString());

    const response = await fetch(`${this.baseURL}/nix/admin/upload-document`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  async listNixDocuments(): Promise<NixDocumentListResponse> {
    return this.request<NixDocumentListResponse>("/nix/admin/documents");
  }

  async documentPagesForTraining(
    entityType: "customer" | "supplier",
    documentId: number,
  ): Promise<PdfPagesResponse> {
    return this.request<PdfPagesResponse>(`/nix/admin/document-pages/${entityType}/${documentId}`);
  }

  async extractFromRegion(
    entityType: "customer" | "supplier",
    documentId: number,
    regionCoordinates: RegionCoordinates,
    fieldName: string,
  ): Promise<ExtractionResult> {
    return this.request<ExtractionResult>(
      `/nix/admin/extract-from-region/${entityType}/${documentId}`,
      {
        method: "POST",
        body: JSON.stringify({ regionCoordinates, fieldName }),
      },
    );
  }

  async saveExtractionRegion(
    data: SaveExtractionRegionDto,
  ): Promise<{ success: boolean; id: number }> {
    return this.request<{ success: boolean; id: number }>("/nix/admin/extraction-regions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async listExtractionRegions(documentCategory?: string): Promise<ExtractionRegion[]> {
    const path = documentCategory
      ? `/nix/admin/extraction-regions/${encodeURIComponent(documentCategory)}`
      : "/nix/admin/extraction-regions";
    return this.request<ExtractionRegion[]>(path);
  }

  async deleteExtractionRegion(id: number): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/nix/admin/extraction-regions/${id}`, {
      method: "DELETE",
    });
  }

  async saveCustomFieldValue(
    data: SaveCustomFieldValueDto,
  ): Promise<{ success: boolean; id: number }> {
    return this.request<{ success: boolean; id: number }>("/nix/admin/custom-field-values", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async customFieldValues(
    entityType: "customer" | "supplier",
    entityId: number,
  ): Promise<{ fields: CustomFieldValue[] }> {
    return this.request<{ fields: CustomFieldValue[] }>(
      `/nix/admin/custom-field-values/${entityType}/${entityId}`,
    );
  }

  async customFieldDefinitions(
    documentCategory?: string,
  ): Promise<{ definitions: CustomFieldDefinition[] }> {
    const path = documentCategory
      ? `/nix/admin/custom-field-definitions/${encodeURIComponent(documentCategory)}`
      : "/nix/admin/custom-field-definitions";
    return this.request<{ definitions: CustomFieldDefinition[] }>(path);
  }

  // Reference Data endpoints

  async referenceDataModules(): Promise<ReferenceDataModuleInfo[]> {
    return this.request<ReferenceDataModuleInfo[]>("/admin/reference-data/modules");
  }

  async referenceDataSchema(entityName: string): Promise<EntitySchemaResponse> {
    return this.request<EntitySchemaResponse>(
      `/admin/reference-data/modules/${encodeURIComponent(entityName)}/schema`,
    );
  }

  async referenceDataRecords(
    entityName: string,
    query?: ReferenceDataQueryDto,
  ): Promise<PaginatedReferenceData> {
    const params = new URLSearchParams();
    if (query?.page) params.append("page", query.page.toString());
    if (query?.limit) params.append("limit", query.limit.toString());
    if (query?.sortBy) params.append("sortBy", query.sortBy);
    if (query?.sortOrder) params.append("sortOrder", query.sortOrder);
    if (query?.search) params.append("search", query.search);

    const queryString = params.toString();
    return this.request<PaginatedReferenceData>(
      `/admin/reference-data/modules/${encodeURIComponent(entityName)}${queryString ? `?${queryString}` : ""}`,
    );
  }

  async referenceDataRecord(entityName: string, id: number): Promise<Record<string, any>> {
    return this.request<Record<string, any>>(
      `/admin/reference-data/modules/${encodeURIComponent(entityName)}/${id}`,
    );
  }

  async createReferenceDataRecord(
    entityName: string,
    data: Record<string, any>,
  ): Promise<Record<string, any>> {
    return this.request<Record<string, any>>(
      `/admin/reference-data/modules/${encodeURIComponent(entityName)}`,
      { method: "POST", body: JSON.stringify(data) },
    );
  }

  async updateReferenceDataRecord(
    entityName: string,
    id: number,
    data: Record<string, any>,
  ): Promise<Record<string, any>> {
    return this.request<Record<string, any>>(
      `/admin/reference-data/modules/${encodeURIComponent(entityName)}/${id}`,
      { method: "PATCH", body: JSON.stringify(data) },
    );
  }

  async deleteReferenceDataRecord(
    entityName: string,
    id: number,
  ): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(
      `/admin/reference-data/modules/${encodeURIComponent(entityName)}/${id}`,
      { method: "DELETE" },
    );
  }
}

export interface NixUploadResponse {
  success: boolean;
  documentId?: string;
  documentSlug?: string;
  message?: string;
  error?: string;
}

export interface NixDocument {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NixDocumentListResponse {
  documents: NixDocument[];
}

export interface RegionCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
  pageNumber: number;
}

export interface PdfPageImage {
  pageNumber: number;
  imageData: string;
  width: number;
  height: number;
}

export interface PdfPagesResponse {
  totalPages: number;
  pages: PdfPageImage[];
}

export interface ExtractionResult {
  text: string;
  confidence: number;
}

export interface SaveExtractionRegionDto {
  documentCategory: string;
  fieldName: string;
  regionCoordinates: RegionCoordinates;
  labelCoordinates?: RegionCoordinates;
  labelText?: string;
  extractionPattern?: string;
  sampleValue?: string;
  isCustomField?: boolean;
}

export interface SaveCustomFieldValueDto {
  entityType: "customer" | "supplier";
  entityId: number;
  fieldName: string;
  fieldValue?: string;
  documentCategory: string;
  extractedFromDocumentId?: number;
  confidence?: number;
}

export interface CustomFieldValue {
  id: number;
  fieldName: string;
  fieldValue: string | null;
  documentCategory: string;
  confidence: number | null;
  isVerified: boolean;
}

export interface CustomFieldDefinition {
  fieldName: string;
  documentCategory: string;
  sampleValue: string | null;
}

export interface ExtractionRegion {
  id: number;
  documentCategory: string;
  fieldName: string;
  regionCoordinates: RegionCoordinates;
  extractionPattern?: string;
  sampleValue?: string;
  useCount: number;
  successCount: number;
}

// Reference Data Types

export interface ReferenceDataModuleInfo {
  entityName: string;
  tableName: string;
  displayName: string;
  category: string;
  columnCount: number;
  recordCount: number;
}

export interface ColumnSchemaInfo {
  propertyName: string;
  databaseName: string;
  type: string;
  nullable: boolean;
  isPrimary: boolean;
  isGenerated: boolean;
}

export interface RelationSchemaInfo {
  propertyName: string;
  relationType: string;
  targetEntityName: string;
  joinColumnName?: string;
}

export interface EntitySchemaResponse {
  columns: ColumnSchemaInfo[];
  relations: RelationSchemaInfo[];
}

export interface ReferenceDataQueryDto {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
  search?: string;
}

export interface PaginatedReferenceData {
  items: Record<string, any>[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const adminApiClient = new AdminApiClient();
