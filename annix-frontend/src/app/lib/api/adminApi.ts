import { type ApiClient, createApiClient, createEndpoint } from "@/app/lib/api/createApiClient";
import { adminTokenStore } from "@/app/lib/api/portalTokenStores";
import type {
  CreateSeekerTestingIssueInput,
  CreateSeekerTestPhaseInput,
  SeekerErrorsLatency,
  SeekerProgressRow,
  SeekerReadinessReport,
  SeekerReadinessSnapshot,
  SeekerTestingIssue,
  SeekerTestingOverview,
  SeekerTestPhase,
  UpdateSeekerTestingIssueInput,
  UpdateSeekerTestPhaseInput,
} from "@/app/lib/api/seeker-testing.types";
import type {
  Branding,
  BrandingAdminView,
  BrandingAssetSlot,
  BrandingUpdate,
  BrandingUploadResult,
} from "@/app/lib/branding/branding";
import { API_BASE_URL } from "@/lib/api-config";

// Types for admin portal - must match backend DTOs

import type {
  ActivityItem,
  AdminAttention,
  AdminInboundConfigGroup,
  AdminLoginDto,
  AdminLoginResponse,
  AdminRfqListResponse,
  AdminRfqQueryDto,
  AdminUserProfile,
  AutoApprovalResult,
  CreateSecureDocumentDto,
  CustomerDetail,
  CustomerDocument,
  CustomerListResponse,
  CustomerQueryDto,
  CustomerStats,
  DashboardStats,
  DocumentPreviewImages,
  DocumentReviewData,
  FeedbackAttachmentUrl,
  FeedbackDetail,
  FeedbackItem,
  LocalDocument,
  LocalDocumentWithContent,
  LoginHistoryItem,
  ReactivateCustomerDto,
  ResetDeviceBindingDto,
  ResolutionStatus,
  RfqFullDraftResponse,
  SecureDocument,
  SecureDocumentWithContent,
  SecureEntityFolder,
  SupplierStats,
  SuspendCustomerDto,
  UpdateSecureDocumentDto,
  VerificationResult,
} from "./adminApi.types";
import type {
  CreateJobMarketSourceDto,
  DuplicateJobPair,
  ExternalJob,
  JobMarketSource,
  JobMarketStats,
  JobSourceProviderInfo,
  UpdateJobMarketSourceDto,
} from "./annixOrbitApi";

export type * from "./adminApi.types";

const apiClient: ApiClient = createApiClient({
  baseURL: API_BASE_URL,
  tokenStore: adminTokenStore,
  refreshUrl: `${API_BASE_URL}/admin/auth/refresh`,
});

class AdminApiClient {
  baseURL = API_BASE_URL;

  setRememberMe(_remember: boolean) {
    // PortalTokenStore tracks rememberMe via setTokens
  }

  private setTokens(accessToken: string, refreshToken: string) {
    adminTokenStore.setTokens(accessToken, refreshToken, adminTokenStore.rememberMe());
  }

  clearTokens() {
    adminTokenStore.clear();
  }

  isAuthenticated(): boolean {
    return adminTokenStore.isAuthenticated();
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      return await apiClient.request<T>(endpoint, options);
    } catch (error) {
      if (error instanceof Error && error.message.includes("unexpected response")) {
        return undefined as T;
      }
      throw error;
    }
  }

  refreshAccessToken(): Promise<boolean> {
    return apiClient.refreshAccessToken();
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

  getCurrentUser = createEndpoint<[], AdminUserProfile>(apiClient, "GET", {
    path: "/admin/auth/me",
  });

  // Dashboard endpoints

  getDashboardStats = createEndpoint<[], DashboardStats>(apiClient, "GET", {
    path: "/admin/dashboard/stats",
  });

  getRecentActivity = createEndpoint<[limit?: number], ActivityItem[]>(apiClient, "GET", {
    path: (limit) => `/admin/dashboard/recent-activity?limit=${limit}`,
  });

  getCustomerStats = createEndpoint<[], CustomerStats>(apiClient, "GET", {
    path: "/admin/dashboard/customers/stats",
  });

  getSupplierStats = createEndpoint<[], SupplierStats>(apiClient, "GET", {
    path: "/admin/dashboard/suppliers/stats",
  });

  getAttention = createEndpoint<[], AdminAttention>(apiClient, "GET", {
    path: "/admin/dashboard/attention",
  });

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

  getCustomerDetail = createEndpoint<[id: number], CustomerDetail>(apiClient, "GET", {
    path: (id) => `/admin/customers/${id}`,
  });

  suspendCustomer = createEndpoint<[id: number, dto: SuspendCustomerDto], void>(apiClient, "POST", {
    path: (id, _dto) => `/admin/customers/${id}/suspend`,
    body: (_id, dto) => dto,
  });

  reactivateCustomer = createEndpoint<[id: number, dto: ReactivateCustomerDto], void>(
    apiClient,
    "POST",
    {
      path: (id, _dto) => `/admin/customers/${id}/reactivate`,
      body: (_id, dto) => dto,
    },
  );

  resetDeviceBinding = createEndpoint<[id: number, dto: ResetDeviceBindingDto], void>(
    apiClient,
    "POST",
    {
      path: (id, _dto) => `/admin/customers/${id}/reset-device`,
      body: (_id, dto) => dto,
    },
  );

  async getCustomerLoginHistory(id: number, limit?: number): Promise<LoginHistoryItem[]> {
    return this.request<LoginHistoryItem[]>(
      `/admin/customers/${id}/login-history${limit ? `?limit=${limit}` : ""}`,
    );
  }

  getCustomerDocuments = createEndpoint<[id: number], CustomerDocument[]>(apiClient, "GET", {
    path: (id) => `/admin/customers/${id}/documents`,
  });

  async getCustomerDocumentUrl(
    documentId: number,
  ): Promise<{ url: string; filename: string; mimeType: string }> {
    return this.request<{ url: string; filename: string; mimeType: string }>(
      `/admin/customers/documents/${documentId}/url`,
    );
  }

  getPendingReviewCustomers = createEndpoint<[], any[]>(apiClient, "GET", {
    path: "/admin/customers/onboarding/pending-review",
  });

  getCustomerOnboardingForReview = createEndpoint<[id: number], any>(apiClient, "GET", {
    path: (id) => `/admin/customers/onboarding/${id}`,
  });

  approveCustomerOnboarding = createEndpoint<[id: number], void>(apiClient, "POST", {
    path: (id) => `/admin/customers/onboarding/${id}/approve`,
  });

  rejectCustomerOnboarding = createEndpoint<
    [id: number, reason: string, remediationSteps: string],
    void
  >(apiClient, "POST", {
    path: (id, _reason, _remediationSteps) => `/admin/customers/onboarding/${id}/reject`,
    body: (_id, reason, remediationSteps) => ({ reason, remediationSteps }),
  });

  reviewCustomerDocument = createEndpoint<
    [id: number, validationStatus: string, validationNotes?: string],
    void
  >(apiClient, "POST", {
    path: (id, _validationStatus, _validationNotes) => `/admin/customers/documents/${id}/review`,
    body: (_id, validationStatus, validationNotes) => ({ validationStatus, validationNotes }),
  });

  getCustomerDocumentReviewData = createEndpoint<[documentId: number], DocumentReviewData>(
    apiClient,
    "GET",
    {
      path: (documentId) => `/admin/customers/documents/${documentId}/review-data`,
    },
  );

  async getCustomerDocumentPreviewImages(documentId: number): Promise<DocumentPreviewImages> {
    return this.request<DocumentPreviewImages>(
      `/admin/customers/documents/${documentId}/preview-images`,
    );
  }

  reVerifyCustomerDocument = createEndpoint<[documentId: number], VerificationResult>(
    apiClient,
    "POST",
    {
      path: (documentId) => `/admin/customers/documents/${documentId}/re-verify`,
    },
  );

  checkCustomerAutoApproval = createEndpoint<[customerId: number], AutoApprovalResult>(
    apiClient,
    "POST",
    {
      path: (customerId) => `/admin/customers/${customerId}/check-auto-approval`,
    },
  );

  inviteCustomer = createEndpoint<
    [email: string, message?: string],
    { success: boolean; message: string }
  >(apiClient, "POST", {
    path: "/admin/customers/invite",
    body: (email, message) => ({ email, message }),
  });

  // Supplier Management endpoints

  async listSuppliers(query?: { page?: number; limit?: number; status?: string }): Promise<any> {
    const params = new URLSearchParams();
    if (query?.page) params.append("page", query.page.toString());
    if (query?.limit) params.append("limit", query.limit.toString());
    if (query?.status) params.append("status", query.status);

    const queryString = params.toString();
    return this.request<any>(`/admin/suppliers${queryString ? `?${queryString}` : ""}`);
  }

  getSupplierDetail = createEndpoint<[id: number], any>(apiClient, "GET", {
    path: (id) => `/admin/suppliers/${id}`,
  });

  getPendingReviewSuppliers = createEndpoint<[], any[]>(apiClient, "GET", {
    path: "/admin/suppliers/pending-review",
  });

  reviewSupplierDocument = createEndpoint<
    [supplierId: number, documentId: number, validationStatus: string, validationNotes?: string],
    void
  >(apiClient, "PATCH", {
    path: (supplierId, documentId, _validationStatus, _validationNotes) =>
      `/admin/suppliers/${supplierId}/documents/${documentId}/review`,
    body: (_supplierId, _documentId, validationStatus, validationNotes) => ({
      validationStatus,
      validationNotes,
    }),
  });

  startSupplierReview = createEndpoint<[id: number], void>(apiClient, "POST", {
    path: (id) => `/admin/suppliers/${id}/start-review`,
  });

  approveSupplierOnboarding = createEndpoint<[id: number], void>(apiClient, "POST", {
    path: (id) => `/admin/suppliers/${id}/approve`,
  });

  rejectSupplierOnboarding = createEndpoint<
    [id: number, reason: string, remediationSteps: string],
    void
  >(apiClient, "POST", {
    path: (id, _reason, _remediationSteps) => `/admin/suppliers/${id}/reject`,
    body: (_id, reason, remediationSteps) => ({ reason, remediationSteps }),
  });

  suspendSupplier = createEndpoint<[id: number, reason: string], void>(apiClient, "POST", {
    path: (id, _reason) => `/admin/suppliers/${id}/suspend`,
    body: (_id, reason) => ({ reason }),
  });

  reactivateSupplier = createEndpoint<[id: number], void>(apiClient, "POST", {
    path: (id) => `/admin/suppliers/${id}/reactivate`,
  });

  inviteSupplier = createEndpoint<
    [email: string, message?: string],
    { success: boolean; message: string }
  >(apiClient, "POST", {
    path: "/admin/suppliers/invite",
    body: (email, message) => ({ email, message }),
  });

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

  checkSupplierAutoApproval = createEndpoint<[supplierId: number], AutoApprovalResult>(
    apiClient,
    "POST",
    {
      path: (supplierId) => `/admin/suppliers/${supplierId}/check-auto-approval`,
    },
  );

  async getSupplierDocumentPreviewImages(
    supplierId: number,
    documentId: number,
  ): Promise<DocumentPreviewImages> {
    return this.request<DocumentPreviewImages>(
      `/admin/suppliers/${supplierId}/documents/${documentId}/preview-images`,
    );
  }

  // Secure Documents endpoints

  listSecureDocuments = createEndpoint<[], SecureDocument[]>(apiClient, "GET", {
    path: "/admin/secure-documents",
  });

  getSecureDocument = createEndpoint<[id: string], SecureDocumentWithContent>(apiClient, "GET", {
    path: (id) => `/admin/secure-documents/${id}`,
  });

  createSecureDocument = createEndpoint<[dto: CreateSecureDocumentDto], SecureDocument>(
    apiClient,
    "POST",
    {
      path: "/admin/secure-documents",
      body: (dto) => dto,
    },
  );

  updateSecureDocument = createEndpoint<[id: string, dto: UpdateSecureDocumentDto], SecureDocument>(
    apiClient,
    "PUT",
    {
      path: (id, _dto) => `/admin/secure-documents/${id}`,
      body: (_id, dto) => dto,
    },
  );

  deleteSecureDocument = createEndpoint<[id: string], void>(apiClient, "DELETE", {
    path: (id) => `/admin/secure-documents/${id}`,
  });

  async secureDocumentAttachmentUrl(id: string): Promise<{ url: string; filename: string }> {
    return this.request<{ url: string; filename: string }>(
      `/admin/secure-documents/${id}/attachment-url`,
    );
  }

  listLocalDocuments = createEndpoint<[], LocalDocument[]>(apiClient, "GET", {
    path: "/admin/secure-documents/local",
  });

  async getLocalDocument(filePath: string): Promise<LocalDocumentWithContent> {
    const encodedPath = encodeURIComponent(filePath);
    const response = await this.request<{ content: string; document: LocalDocument }>(
      `/admin/secure-documents/local/${encodedPath}`,
    );
    return { ...response.document, content: response.content };
  }

  listEntityFolders = createEndpoint<[], SecureEntityFolder[]>(apiClient, "GET", {
    path: "/admin/secure-documents/entity-folders/list",
  });

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

  getRfqDetail = createEndpoint<[id: number], any>(apiClient, "GET", {
    path: (id) => `/admin/rfqs/${id}`,
  });

  getRfqItems = createEndpoint<[id: number], any[]>(apiClient, "GET", {
    path: (id) => `/admin/rfqs/${id}/items`,
  });

  getRfqFullDraft = createEndpoint<[id: number], RfqFullDraftResponse>(apiClient, "GET", {
    path: (id) => `/admin/rfqs/${id}/full`,
  });

  updateRfq = createEndpoint<[id: number, data: any], any>(apiClient, "PUT", {
    path: (id, _data) => `/admin/rfqs/${id}/unified`,
    body: (_id, data) => data,
  });

  saveDraft = createEndpoint<[data: any], any>(apiClient, "POST", {
    path: "/admin/rfqs/drafts",
    body: (data) => data,
  });

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

    return apiClient.uploadFile<NixUploadResponse>("/nix/admin/upload-document", file, {
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      processWithNix: processWithNix.toString(),
    });
  }

  listNixDocuments = createEndpoint<[], NixDocumentListResponse>(apiClient, "GET", {
    path: "/nix/admin/documents",
  });

  documentPagesForTraining = createEndpoint<
    [entityType: "customer" | "supplier", documentId: number],
    PdfPagesResponse
  >(apiClient, "GET", {
    path: (entityType, documentId) => `/nix/admin/document-pages/${entityType}/${documentId}`,
  });

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

  saveExtractionRegion = createEndpoint<
    [data: SaveExtractionRegionDto],
    { success: boolean; id: number }
  >(apiClient, "POST", {
    path: "/nix/admin/extraction-regions",
    body: (data) => data,
  });

  async listExtractionRegions(documentCategory?: string): Promise<ExtractionRegion[]> {
    const path = documentCategory
      ? `/nix/admin/extraction-regions/${encodeURIComponent(documentCategory)}`
      : "/nix/admin/extraction-regions";
    return this.request<ExtractionRegion[]>(path);
  }

  deleteExtractionRegion = createEndpoint<[id: number], { success: boolean }>(apiClient, "DELETE", {
    path: (id) => `/nix/admin/extraction-regions/${id}`,
  });

  saveCustomFieldValue = createEndpoint<
    [data: SaveCustomFieldValueDto],
    { success: boolean; id: number }
  >(apiClient, "POST", {
    path: "/nix/admin/custom-field-values",
    body: (data) => data,
  });

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

  referenceDataModules = createEndpoint<[], ReferenceDataModuleInfo[]>(apiClient, "GET", {
    path: "/admin/reference-data/modules",
  });

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

  listFeedback = createEndpoint<[], FeedbackItem[]>(apiClient, "GET", {
    path: "/admin/feedback",
  });

  feedbackById = createEndpoint<[id: number], FeedbackDetail | null>(apiClient, "GET", {
    path: (id) => `/admin/feedback/${id}`,
  });

  async feedbackByConversationId(conversationId: number): Promise<FeedbackDetail | null> {
    const allFeedback = await this.listFeedback();
    return allFeedback.find((f) => f.conversationId === conversationId) ?? null;
  }

  assignFeedback = createEndpoint<[feedbackId: number], FeedbackDetail>(apiClient, "POST", {
    path: (feedbackId) => `/admin/feedback/${feedbackId}/assign`,
  });

  unassignFeedback = createEndpoint<[feedbackId: number], FeedbackDetail>(apiClient, "POST", {
    path: (feedbackId) => `/admin/feedback/${feedbackId}/unassign`,
  });

  updateFeedbackResolution = createEndpoint<
    [feedbackId: number, resolutionStatus: ResolutionStatus | null, testCriteria: string | null],
    FeedbackDetail
  >(apiClient, "PUT", {
    path: (feedbackId, _resolutionStatus, _testCriteria) =>
      `/admin/feedback/${feedbackId}/resolution`,
    body: (_feedbackId, resolutionStatus, testCriteria) => ({ resolutionStatus, testCriteria }),
  });

  feedbackAttachmentUrls = createEndpoint<[feedbackId: number], FeedbackAttachmentUrl[]>(
    apiClient,
    "GET",
    {
      path: (feedbackId) => `/admin/feedback/${feedbackId}/attachments`,
    },
  );

  async conversations(
    filters?: ConversationFilterDto,
  ): Promise<{ conversations: ConversationSummaryDto[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.type) params.append("type", filters.type);
    if (filters?.search) params.append("search", filters.search);
    if (filters?.page) params.append("page", filters.page.toString());
    if (filters?.limit) params.append("limit", filters.limit.toString());

    const queryString = params.toString();
    return this.request<{ conversations: ConversationSummaryDto[]; total: number }>(
      `/admin/messaging/conversations${queryString ? `?${queryString}` : ""}`,
    );
  }

  conversationDetail = createEndpoint<[conversationId: number], ConversationDetailDto>(
    apiClient,
    "GET",
    {
      path: (conversationId) => `/admin/messaging/conversations/${conversationId}`,
    },
  );

  async conversationMessages(
    conversationId: number,
    pagination?: MessagePaginationDto,
  ): Promise<{ messages: MessageDto[]; hasMore: boolean }> {
    const params = new URLSearchParams();
    if (pagination?.before) params.append("before", pagination.before.toString());
    if (pagination?.limit) params.append("limit", pagination.limit.toString());

    const queryString = params.toString();
    return this.request<{ messages: MessageDto[]; hasMore: boolean }>(
      `/admin/messaging/conversations/${conversationId}/messages${queryString ? `?${queryString}` : ""}`,
    );
  }

  sendMessage = createEndpoint<[conversationId: number, dto: SendMessageDto], MessageDto>(
    apiClient,
    "POST",
    {
      path: (conversationId, _dto) => `/admin/messaging/conversations/${conversationId}/messages`,
      body: (_conversationId, dto) => dto,
    },
  );

  deleteConversations = createEndpoint<[ids: number[]], { deleted: number }>(apiClient, "POST", {
    path: "/admin/messaging/conversations/delete",
    body: (ids) => ({ ids }),
  });

  async broadcasts(
    filters?: BroadcastFilterDto,
  ): Promise<{ broadcasts: BroadcastDetailDto[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.includeExpired) params.append("includeExpired", "true");
    if (filters?.priority) params.append("priority", filters.priority);
    if (filters?.unreadOnly) params.append("unreadOnly", "true");
    if (filters?.page) params.append("page", filters.page.toString());
    if (filters?.limit) params.append("limit", filters.limit.toString());

    const queryString = params.toString();
    return this.request<{ broadcasts: BroadcastDetailDto[]; total: number }>(
      `/admin/messaging/broadcasts${queryString ? `?${queryString}` : ""}`,
    );
  }

  broadcastDetail = createEndpoint<[broadcastId: number], BroadcastDetailDto>(apiClient, "GET", {
    path: (broadcastId) => `/admin/messaging/broadcasts/${broadcastId}`,
  });

  createBroadcast = createEndpoint<[dto: CreateBroadcastDto], BroadcastDetailDto>(
    apiClient,
    "POST",
    {
      path: "/admin/messaging/broadcasts",
      body: (dto) => dto,
    },
  );

  async responseMetrics(filters?: MetricsFilterDto): Promise<ResponseMetricsSummaryDto> {
    const params = new URLSearchParams();
    if (filters?.dateFrom) params.append("dateFrom", filters.dateFrom);
    if (filters?.dateTo) params.append("dateTo", filters.dateTo);
    if (filters?.userType) params.append("userType", filters.userType);

    const queryString = params.toString();
    return this.request<ResponseMetricsSummaryDto>(
      `/admin/messaging/response-metrics${queryString ? `?${queryString}` : ""}`,
    );
  }

  rbacApps = createEndpoint<[], RbacApp[]>(apiClient, "GET", {
    path: "/admin/rbac/apps",
  });

  rbacAppDetails = createEndpoint<[code: string], RbacAppDetail>(apiClient, "GET", {
    path: (code) => `/admin/rbac/apps/${encodeURIComponent(code)}`,
  });

  rbacUsersWithAccess = createEndpoint<[appCode: string], RbacUserAccess[]>(apiClient, "GET", {
    path: (appCode) => `/admin/rbac/apps/${encodeURIComponent(appCode)}/users`,
  });

  async rbacSearchUsers(query: string): Promise<RbacSearchUser[]> {
    return this.request<RbacSearchUser[]>(
      `/admin/rbac/users/search?q=${encodeURIComponent(query)}`,
    );
  }

  rbacAllUsers = createEndpoint<[], RbacUserWithAccessSummary[]>(apiClient, "GET", {
    path: "/admin/rbac/users/all",
  });

  ssoIdentityReconciliation = createEndpoint<[], IdentityReconciliationReport>(apiClient, "GET", {
    path: "/admin/sso/identity-reconciliation",
  });

  rbacAssignAccess = createEndpoint<[userId: number, dto: AssignUserAccessDto], RbacUserAccess>(
    apiClient,
    "POST",
    {
      path: (userId, _dto) => `/admin/rbac/users/${userId}/access`,
      body: (_userId, dto) => dto,
    },
  );

  rbacUpdateAccess = createEndpoint<[accessId: number, dto: UpdateUserAccessDto], RbacUserAccess>(
    apiClient,
    "PATCH",
    {
      path: (accessId, _dto) => `/admin/rbac/access/${accessId}`,
      body: (_accessId, dto) => dto,
    },
  );

  rbacRevokeAccess = createEndpoint<[accessId: number], { message: string }>(apiClient, "DELETE", {
    path: (accessId) => `/admin/rbac/access/${accessId}`,
  });

  rbacInviteUser = createEndpoint<[dto: InviteUserDto], InviteUserResponse>(apiClient, "POST", {
    path: "/admin/rbac/invite",
    body: (dto) => dto,
  });

  rbacSendAccessLink = createEndpoint<[userId: number], { message: string }>(apiClient, "POST", {
    path: (userId) => `/admin/rbac/users/${userId}/send-access-link`,
  });

  rbacDeactivateUser = createEndpoint<[userId: number], { message: string }>(apiClient, "POST", {
    path: (userId) => `/admin/rbac/users/${userId}/deactivate`,
  });

  rbacReactivateUser = createEndpoint<[userId: number], { message: string }>(apiClient, "POST", {
    path: (userId) => `/admin/rbac/users/${userId}/reactivate`,
  });

  rbacDeleteUser = createEndpoint<[userId: number], { message: string }>(apiClient, "DELETE", {
    path: (userId) => `/admin/rbac/users/${userId}`,
  });

  rbacCreateRole = createEndpoint<[appCode: string, dto: CreateRoleDto], RbacRoleResponse>(
    apiClient,
    "POST",
    {
      path: (appCode) => `/admin/rbac/apps/${encodeURIComponent(appCode)}/roles`,
      body: (_appCode, dto) => dto,
    },
  );

  rbacRoleById = createEndpoint<[roleId: number], RbacRoleResponse>(apiClient, "GET", {
    path: (roleId) => `/admin/rbac/roles/${roleId}`,
  });

  rbacUpdateRole = createEndpoint<[roleId: number, dto: UpdateRoleDto], RbacRoleResponse>(
    apiClient,
    "PATCH",
    {
      path: (roleId, _dto) => `/admin/rbac/roles/${roleId}`,
      body: (_roleId, dto) => dto,
    },
  );

  rbacDeleteRole = createEndpoint<[roleId: number], RbacDeleteRoleResponse>(apiClient, "DELETE", {
    path: (roleId) => `/admin/rbac/roles/${roleId}`,
  });

  rbacRoleProducts = createEndpoint<[roleId: number], RbacRoleProductsResponse>(apiClient, "GET", {
    path: (roleId) => `/admin/rbac/roles/${roleId}/products`,
  });

  rbacSetRoleProducts = createEndpoint<
    [roleId: number, productKeys: string[]],
    RbacRoleProductsResponse
  >(apiClient, "PUT", {
    path: (roleId, _productKeys) => `/admin/rbac/roles/${roleId}/products`,
    body: (_roleId, productKeys) => ({ productKeys }),
  });

  scheduledJobs = createEndpoint<[], ScheduledJobDto[]>(apiClient, "GET", {
    path: "/admin/scheduled-jobs",
  });

  async pauseScheduledJob(name: string): Promise<ScheduledJobDto> {
    return this.request<ScheduledJobDto>(
      `/admin/scheduled-jobs/${encodeURIComponent(name)}/pause`,
      {
        method: "POST",
      },
    );
  }

  async resumeScheduledJob(name: string): Promise<ScheduledJobDto> {
    return this.request<ScheduledJobDto>(
      `/admin/scheduled-jobs/${encodeURIComponent(name)}/resume`,
      { method: "POST" },
    );
  }

  async updateScheduledJobFrequency(
    name: string,
    cronExpression: string,
  ): Promise<ScheduledJobDto> {
    return this.request<ScheduledJobDto>(
      `/admin/scheduled-jobs/${encodeURIComponent(name)}/frequency`,
      {
        method: "POST",
        body: JSON.stringify({ cronExpression }),
      },
    );
  }

  syncScheduledJobs = createEndpoint<[], SyncResultDto>(apiClient, "POST", {
    path: "/admin/scheduled-jobs/sync",
  });

  scheduledJobsSyncStatus = createEndpoint<[], SyncStatusDto>(apiClient, "GET", {
    path: "/admin/scheduled-jobs/sync-status",
  });

  scheduledJobsGlobalSettings = createEndpoint<[], GlobalSettingsDto>(apiClient, "GET", {
    path: "/admin/scheduled-jobs/global-settings",
  });

  updateScheduledJobsGlobalSettings = createEndpoint<
    [settings: GlobalSettingsDto],
    GlobalSettingsDto
  >(apiClient, "POST", {
    path: "/admin/scheduled-jobs/global-settings",
    body: (settings) => settings,
  });

  async updateScheduledJobNightSuspension(
    name: string,
    nightSuspensionHours: NightSuspensionHours,
  ): Promise<ScheduledJobDto> {
    return this.request<ScheduledJobDto>(
      `/admin/scheduled-jobs/${encodeURIComponent(name)}/night-suspension`,
      {
        method: "POST",
        body: JSON.stringify({ nightSuspensionHours }),
      },
    );
  }

  pollingJobs = createEndpoint<[], PollingJobDto[]>(apiClient, "GET", {
    path: "/admin/polling-jobs",
  });

  pausePollingJob = createEndpoint<[name: string], PollingJobDto>(apiClient, "POST", {
    path: (name) => `/admin/polling-jobs/${encodeURIComponent(name)}/pause`,
  });

  resumePollingJob = createEndpoint<[name: string], PollingJobDto>(apiClient, "POST", {
    path: (name) => `/admin/polling-jobs/${encodeURIComponent(name)}/resume`,
  });

  updatePollingJobInterval = createEndpoint<[name: string, intervalMs: number], PollingJobDto>(
    apiClient,
    "POST",
    {
      path: (name) => `/admin/polling-jobs/${encodeURIComponent(name)}/interval`,
      body: (_name, intervalMs) => ({ intervalMs }),
    },
  );

  async updatePollingJobNightSuspension(
    name: string,
    nightSuspensionHours: NightSuspensionHours,
  ): Promise<PollingJobDto> {
    return this.request<PollingJobDto>(
      `/admin/polling-jobs/${encodeURIComponent(name)}/night-suspension`,
      { method: "POST", body: JSON.stringify({ nightSuspensionHours }) },
    );
  }

  pollingJobsGlobalSettings = createEndpoint<[], PollingJobsGlobalSettingsDto>(apiClient, "GET", {
    path: "/admin/polling-jobs/global-settings",
  });

  updatePollingJobsGlobalSettings = createEndpoint<
    [settings: PollingJobsGlobalSettingsDto],
    PollingJobsGlobalSettingsDto
  >(apiClient, "POST", {
    path: "/admin/polling-jobs/global-settings",
    body: (settings) => settings,
  });

  async aiUsageLogs(params?: AiUsageQueryParams): Promise<AiUsageListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.app) searchParams.append("app", params.app);
    if (params?.provider) searchParams.append("provider", params.provider);
    if (params?.from) searchParams.append("from", params.from);
    if (params?.to) searchParams.append("to", params.to);
    if (params?.page) searchParams.append("page", params.page.toString());
    if (params?.limit) searchParams.append("limit", params.limit.toString());

    const queryString = searchParams.toString();
    return this.request<AiUsageListResponse>(
      `/admin/ai-usage${queryString ? `?${queryString}` : ""}`,
    );
  }

  async aiUsageDailySeries(days = 28): Promise<AiUsageDailySeriesResponse> {
    return this.request<AiUsageDailySeriesResponse>(`/admin/ai-usage/daily-series?days=${days}`);
  }

  companyProfile = createEndpoint<[], CompanyProfileResponse>(apiClient, "GET", {
    path: "/admin/company-profile",
  });

  updateCompanyProfile = createEndpoint<
    [data: UpdateCompanyProfileRequest],
    CompanyProfileResponse
  >(apiClient, "PATCH", {
    path: "/admin/company-profile",
    body: (data) => data,
  });

  inboundEmailConfigs = createEndpoint<[], AdminInboundConfigGroup[]>(apiClient, "GET", {
    path: "/admin/inbound-emails/configs",
  });

  setInboundEmailEnabled = createEndpoint<
    [app: string, companyId: number | null, enabled: boolean],
    { message: string }
  >(apiClient, "PATCH", {
    path: (app) => `/admin/inbound-emails/configs/${app}/enabled`,
    body: (_app, companyId, enabled) => ({ companyId, enabled }),
  });

  async orbitJobMarketProviders(): Promise<JobSourceProviderInfo[]> {
    return this.request("/admin/annix-orbit/job-market/providers");
  }

  async orbitJobMarketSources(): Promise<JobMarketSource[]> {
    return this.request("/admin/annix-orbit/job-market/sources");
  }

  async createOrbitJobMarketSource(data: CreateJobMarketSourceDto): Promise<JobMarketSource> {
    return this.request("/admin/annix-orbit/job-market/sources", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateOrbitJobMarketSource(
    id: number,
    data: UpdateJobMarketSourceDto,
  ): Promise<JobMarketSource> {
    return this.request(`/admin/annix-orbit/job-market/sources/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteOrbitJobMarketSource(id: number): Promise<{ message: string }> {
    return this.request(`/admin/annix-orbit/job-market/sources/${id}`, {
      method: "DELETE",
    });
  }

  async triggerOrbitIngestion(
    sourceId: number,
  ): Promise<{ ingested: number; skipped: number; savedIds: number[] }> {
    return this.request(`/admin/annix-orbit/job-market/sources/${sourceId}/ingest`, {
      method: "POST",
    });
  }

  async fetchOrbitSource(
    sourceId: number,
  ): Promise<{ ingested: number; skipped: number; savedIds: number[]; started?: boolean }> {
    return this.request(`/admin/annix-orbit/job-market/sources/${sourceId}/fetch`, {
      method: "POST",
    });
  }

  async vetOrbitJob(jobId: number): Promise<{ acceptsZa: boolean | null; notes: string }> {
    return this.request(`/admin/annix-orbit/job-market/jobs/${jobId}/vet`, {
      method: "POST",
    });
  }

  async orbitExternalJobs(filters?: {
    country?: string;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ jobs: ExternalJob[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.country) params.append("country", filters.country);
    if (filters?.category) params.append("category", filters.category);
    if (filters?.search) params.append("search", filters.search);
    if (filters?.page) params.append("page", String(filters.page));
    if (filters?.limit) params.append("limit", String(filters.limit));
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/admin/annix-orbit/job-market/jobs${query}`);
  }

  async orbitJobMarketStats(): Promise<JobMarketStats> {
    return this.request("/admin/annix-orbit/job-market/stats");
  }

  orbitSeekerTestingPhases(): Promise<SeekerTestPhase[]> {
    return this.request("/admin/annix-orbit/seeker-testing/phases");
  }

  createOrbitSeekerTestingPhase(body: CreateSeekerTestPhaseInput): Promise<SeekerTestPhase> {
    return this.request("/admin/annix-orbit/seeker-testing/phases", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  updateOrbitSeekerTestingPhase(
    id: string,
    body: UpdateSeekerTestPhaseInput,
  ): Promise<SeekerTestPhase> {
    return this.request(`/admin/annix-orbit/seeker-testing/phases/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  orbitSeekerTestingOverview(): Promise<SeekerTestingOverview> {
    return this.request("/admin/annix-orbit/seeker-testing/overview");
  }

  orbitSeekerTestingErrorsLatency(): Promise<SeekerErrorsLatency> {
    return this.request("/admin/annix-orbit/seeker-testing/errors-latency");
  }

  orbitSeekerTestingUsers(): Promise<SeekerProgressRow[]> {
    return this.request("/admin/annix-orbit/seeker-testing/users");
  }

  orbitSeekerTestingReadiness(): Promise<SeekerReadinessReport> {
    return this.request("/admin/annix-orbit/seeker-testing/readiness");
  }

  recalculateOrbitSeekerTestingReadiness(): Promise<SeekerReadinessSnapshot> {
    return this.request("/admin/annix-orbit/seeker-testing/recalculate", { method: "POST" });
  }

  orbitSeekerTestingIssues(): Promise<SeekerTestingIssue[]> {
    return this.request("/admin/annix-orbit/seeker-testing/issues");
  }

  createOrbitSeekerTestingIssue(body: CreateSeekerTestingIssueInput): Promise<SeekerTestingIssue> {
    return this.request("/admin/annix-orbit/seeker-testing/issues", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  updateOrbitSeekerTestingIssue(
    id: string,
    body: UpdateSeekerTestingIssueInput,
  ): Promise<SeekerTestingIssue> {
    return this.request(`/admin/annix-orbit/seeker-testing/issues/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  async orbitClusterUsage(): Promise<OrbitClusterUsage> {
    return this.request("/admin/annix-orbit/job-market/cluster-usage");
  }

  async orbitRetentionCap(): Promise<{ cap: number }> {
    return this.request("/admin/annix-orbit/job-market/retention-cap");
  }

  async platformLimits(): Promise<PlatformLimitsResponse> {
    return this.request("/admin/platform-limits");
  }

  async platformLimitBreakdown(cardId: string): Promise<PlatformLimitBreakdown> {
    return this.request(`/admin/platform-limits/breakdown/${encodeURIComponent(cardId)}`);
  }

  async setOrbitRetentionCap(cap: number): Promise<{ cap: number }> {
    return this.request("/admin/annix-orbit/job-market/retention-cap", {
      method: "PUT",
      body: JSON.stringify({ cap }),
    });
  }

  async orbitEnabledCountries(): Promise<{ all: string[]; enabled: string[] }> {
    return this.request("/admin/annix-orbit/job-market/enabled-countries");
  }

  async setOrbitEnabledCountries(
    countries: string[],
  ): Promise<{ all: string[]; enabled: string[] }> {
    return this.request("/admin/annix-orbit/job-market/enabled-countries", {
      method: "PUT",
      body: JSON.stringify({ countries }),
    });
  }

  async orbitEarlyAccessStats(): Promise<OrbitEarlyAccessStats> {
    return this.request("/admin/annix-orbit/early-access/stats");
  }

  async orbitEarlyAccessList(): Promise<OrbitEarlyAccessRow[]> {
    return this.request("/admin/annix-orbit/early-access/list");
  }

  async orbitEarlyAccessExportCsv(): Promise<void> {
    return apiClient.downloadBlob(
      "/admin/annix-orbit/early-access/export.csv",
      "orbit-early-access.csv",
    );
  }

  async orbitJobMarketDuplicates(limit?: number): Promise<DuplicateJobPair[]> {
    const query = limit ? `?limit=${limit}` : "";
    return this.request(`/admin/annix-orbit/job-market/duplicates${query}`);
  }

  async deleteOrbitExternalJob(jobId: number): Promise<{ message: string }> {
    return this.request(`/admin/annix-orbit/job-market/jobs/${jobId}`, {
      method: "DELETE",
    });
  }

  async bulkDeleteOrbitExternalJobs(ids: number[]): Promise<{ deleted: number }> {
    return this.request("/admin/annix-orbit/job-market/jobs/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
  }

  async autoResolveOrbitDuplicates(): Promise<{ deleted: number; groups: number }> {
    return this.request("/admin/annix-orbit/job-market/duplicates/auto-resolve", {
      method: "POST",
    });
  }

  async vetPendingOrbitJobs(
    limit?: number,
  ): Promise<{ vetted: number; accepted: number; rejected: number; ambiguous: number }> {
    const query = limit ? `?limit=${limit}` : "";
    return this.request(`/admin/annix-orbit/job-market/vet-pending${query}`, {
      method: "POST",
    });
  }

  async backfillOrbitEmbeddings(): Promise<{ started: boolean; alreadyRunning: boolean }> {
    return this.request("/admin/annix-orbit/job-market/embeddings/backfill", {
      method: "POST",
    });
  }

  async orbitEmbeddingCoverage(): Promise<{
    jobsTotal: number;
    jobsEmbedded: number;
    candidatesTotal: number;
    candidatesEmbedded: number;
    running: boolean;
    lastError: string | null;
  }> {
    return this.request("/admin/annix-orbit/job-market/embeddings/coverage");
  }

  async backfillOrbitCategories(): Promise<{ started: boolean; alreadyRunning: boolean }> {
    return this.request("/admin/annix-orbit/job-market/categories/backfill", {
      method: "POST",
    });
  }

  async orbitCategoryCoverage(): Promise<{
    total: number;
    classified: number;
    running: boolean;
    lastError: string | null;
  }> {
    return this.request("/admin/annix-orbit/job-market/categories/coverage");
  }

  async orbitSeekerMatchTier(email: string): Promise<OrbitSeekerMatchTier> {
    return this.request(`/admin/annix-orbit/seekers/lookup?email=${encodeURIComponent(email)}`);
  }

  async setOrbitSeekerMatchTier(
    email: string,
    tier: string,
  ): Promise<{ candidatesAffected: number; matchTier: string }> {
    return this.request("/admin/annix-orbit/seekers/match-tier", {
      method: "PATCH",
      body: JSON.stringify({ email, tier }),
    });
  }

  async orbitSeekers(params: {
    search?: string | null;
    page?: number;
    limit?: number;
  }): Promise<{ seekers: OrbitSeekerSummary[]; total: number }> {
    const query = new URLSearchParams();
    const search = params.search ? params.search.trim() : "";
    if (search) {
      query.set("search", search);
    }
    if (params.page) {
      query.set("page", String(params.page));
    }
    if (params.limit) {
      query.set("limit", String(params.limit));
    }
    const suffix = query.toString();
    return this.request(`/admin/annix-orbit/seekers${suffix ? `?${suffix}` : ""}`);
  }

  async orbitSeekerDetail(id: number): Promise<OrbitSeekerDetail> {
    return this.request(`/admin/annix-orbit/seekers/${id}`);
  }

  async orbitTierCapabilities(): Promise<OrbitTierCapability[]> {
    return this.request("/admin/annix-orbit/tier-capabilities");
  }

  async updateOrbitTierCapability(
    tier: string,
    data: {
      matchStrictness?: string;
      maxJobResults?: number | null;
      monthlyNixRuns?: number | null;
      monthlyCvBuilds?: number | null;
      features?: Partial<OrbitTierFeatures>;
      pricing?: Partial<OrbitTierPricing>;
    },
  ): Promise<OrbitTierCapability> {
    return this.request(`/admin/annix-orbit/tier-capabilities/${encodeURIComponent(tier)}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async inviteSeekerTrial(
    email: string,
    tier: string,
    freeDays: number,
  ): Promise<{ candidatesAffected: number; trialEndsAt: string | null }> {
    return this.request("/admin/annix-orbit/seekers/invite-trial", {
      method: "POST",
      body: JSON.stringify({ email, tier, freeDays }),
    });
  }

  async setPendingSeekerTier(body: {
    email: string;
    tier: string;
    permanent: boolean;
    trialDays?: number;
  }): Promise<{ saved: boolean }> {
    return this.request("/admin/annix-orbit/seekers/pending-tier", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async orbitUsers(params: {
    type?: string | null;
    search?: string | null;
    page?: number;
    limit?: number;
  }): Promise<OrbitUserListResult> {
    const query = new URLSearchParams();
    const type = params.type ? params.type.trim() : "";
    const search = params.search ? params.search.trim() : "";
    if (type) {
      query.set("type", type);
    }
    if (search) {
      query.set("search", search);
    }
    if (params.page) {
      query.set("page", String(params.page));
    }
    if (params.limit) {
      query.set("limit", String(params.limit));
    }
    const suffix = query.toString();
    return this.request(`/admin/annix-orbit/users${suffix ? `?${suffix}` : ""}`);
  }

  async inviteOrbitUser(input: OrbitUserInviteInput): Promise<{ userId: number; email: string }> {
    return this.request("/admin/annix-orbit/users/invite", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async resendOrbitUserInvite(userId: number): Promise<{ message: string }> {
    return this.request(`/admin/annix-orbit/users/${userId}/resend-invite`, {
      method: "POST",
    });
  }

  async updateOrbitUser(userId: number, input: OrbitUserUpdateInput): Promise<{ message: string }> {
    return this.request(`/admin/annix-orbit/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  async deactivateOrbitUser(userId: number): Promise<{ message: string }> {
    return this.request(`/admin/annix-orbit/users/${userId}/deactivate`, {
      method: "POST",
    });
  }

  async reactivateOrbitUser(userId: number): Promise<{ message: string }> {
    return this.request(`/admin/annix-orbit/users/${userId}/reactivate`, {
      method: "POST",
    });
  }

  async deleteOrbitUser(userId: number): Promise<{ message: string }> {
    return this.request(`/admin/annix-orbit/users/${userId}`, {
      method: "DELETE",
    });
  }

  async appBranding(brand: string): Promise<BrandingAdminView> {
    return this.request(`/admin/branding/${brand}`);
  }

  async updateAppBranding(brand: string, data: BrandingUpdate): Promise<Branding> {
    return this.request(`/admin/branding/${brand}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async uploadAppBrandingAsset(
    brand: string,
    slot: BrandingAssetSlot,
    file: File,
  ): Promise<BrandingUploadResult> {
    return apiClient.uploadFile<BrandingUploadResult>(
      `/admin/branding/${brand}/${slot}/upload`,
      file,
    );
  }

  async brandingImages(brand: string): Promise<BrandingImage[]> {
    return this.request(`/admin/branding/${brand}/images`);
  }

  async addBrandingImage(brand: string, file: File, label: string): Promise<BrandingImage> {
    return apiClient.uploadFile<BrandingImage>(`/admin/branding/${brand}/images`, file, { label });
  }

  async deleteBrandingImage(brand: string, id: string): Promise<{ success: boolean }> {
    return this.request(`/admin/branding/${brand}/images/${id}`, { method: "DELETE" });
  }

  async orbitEeTargets(): Promise<OrbitEeTarget[]> {
    return this.request("/admin/annix-orbit/ee-sectoral-targets");
  }

  async upsertOrbitEeTarget(input: UpsertOrbitEeTargetInput): Promise<OrbitEeTarget> {
    return this.request("/admin/annix-orbit/ee-sectoral-targets", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async deleteOrbitEeTarget(id: number): Promise<{ success: boolean }> {
    return this.request(`/admin/annix-orbit/ee-sectoral-targets/${id}`, { method: "DELETE" });
  }

  async orbitCredentialTypes(): Promise<OrbitCredentialType[]> {
    return this.request("/admin/annix-orbit/credential-types");
  }

  async createOrbitCredentialType(
    input: CreateOrbitCredentialTypeInput,
  ): Promise<OrbitCredentialType> {
    return this.request("/admin/annix-orbit/credential-types", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async updateOrbitCredentialType(
    id: number,
    input: UpdateOrbitCredentialTypeInput,
  ): Promise<OrbitCredentialType> {
    return this.request(`/admin/annix-orbit/credential-types/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  async deleteOrbitCredentialType(id: number): Promise<{ success: boolean }> {
    return this.request(`/admin/annix-orbit/credential-types/${id}`, { method: "DELETE" });
  }

  async orbitDismissReasons(): Promise<OrbitDismissReason[]> {
    return this.request("/admin/annix-orbit/dismiss-reasons");
  }

  async createOrbitDismissReason(
    input: CreateOrbitDismissReasonInput,
  ): Promise<OrbitDismissReason> {
    return this.request("/admin/annix-orbit/dismiss-reasons", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async updateOrbitDismissReason(
    id: number,
    input: UpdateOrbitDismissReasonInput,
  ): Promise<OrbitDismissReason> {
    return this.request(`/admin/annix-orbit/dismiss-reasons/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  async deleteOrbitDismissReason(id: number): Promise<{ success: boolean }> {
    return this.request(`/admin/annix-orbit/dismiss-reasons/${id}`, { method: "DELETE" });
  }

  async orbitDelistReports(): Promise<OrbitDelistReport[]> {
    return this.request("/admin/annix-orbit/delist-reports");
  }

  async orbitDelistReportCount(): Promise<{ count: number }> {
    return this.request("/admin/annix-orbit/delist-reports/count");
  }

  async confirmOrbitDelist(id: number): Promise<{ success: boolean }> {
    return this.request(`/admin/annix-orbit/delist-reports/${id}/confirm`, { method: "POST" });
  }

  async rejectOrbitDelist(id: number): Promise<{ success: boolean }> {
    return this.request(`/admin/annix-orbit/delist-reports/${id}/reject`, { method: "POST" });
  }
}

export interface OrbitEarlyAccessRow {
  id: string;
  position: number;
  firstName: string;
  lastName: string;
  email: string;
  mobileNumber: string;
  currentRole: string | null;
  industry: string | null;
  yearsExperience: string | null;
  ageRange: string | null;
  ethnicBackground: string | null;
  consentToContact: boolean;
  source: string;
  campaign: string | null;
  referralCode: string;
  referredBy: string | null;
  referralCount: number;
  createdAt: string;
}

export interface OrbitEarlyAccessBucket {
  key: string;
  count: number;
}

export interface OrbitEarlyAccessStats {
  total: number;
  today: number;
  thisWeek: number;
  bySource: OrbitEarlyAccessBucket[];
  byCampaign: OrbitEarlyAccessBucket[];
  byIndustry: OrbitEarlyAccessBucket[];
  topReferrers: OrbitEarlyAccessBucket[];
}

export interface OrbitSeekerMatchTier {
  hasCandidate: boolean;
  matchTier: string;
  targetCategories: string[];
  candidateIds: number[];
}

export type OrbitUserType = "company" | "recruiter" | "individual" | "student";

export interface OrbitUserRow {
  userId: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  emailVerified: boolean;
  userType: OrbitUserType;
  tier: string | null;
  companyId: number | null;
  companyName: string | null;
  lastLoginAt: string | null;
  createdAt: string | null;
}

export interface OrbitUserListResult {
  rows: OrbitUserRow[];
  total: number;
  page: number;
  limit: number;
}

export interface OrbitUserInviteInput {
  email: string;
  firstName: string;
  lastName?: string | null;
  userType: OrbitUserType;
  companyName?: string | null;
  tier?: string | null;
}

export interface OrbitUserUpdateInput {
  firstName?: string | null;
  lastName?: string | null;
  status?: string | null;
  tier?: string | null;
}

export interface OrbitClusterUsage {
  capMb: number;
  totalMb: number;
  freeMb: number;
  percentUsed: number;
  databases: Array<{ name: string; logicalMb: number }>;
}

export type PlatformLimitStatus = "ok" | "warn" | "critical" | "info";

export interface PlatformLimitCard {
  id: string;
  label: string;
  value: number;
  unit: string;
  limit: number | null;
  percent: number | null;
  status: PlatformLimitStatus;
  trend: string | null;
  details: string;
  href: string | null;
  limitLabel: string | null;
}

export interface PlatformLimitsResponse {
  generatedAt: string;
  cards: PlatformLimitCard[];
}

export interface PlatformLimitBreakdownRow {
  label: string;
  value: number;
  unit: string;
  percent: number | null;
}

export interface PlatformLimitBreakdown {
  id: string;
  title: string;
  generatedAt: string;
  rows: PlatformLimitBreakdownRow[];
  note: string | null;
}

export interface OrbitSeekerSummary {
  id: number;
  name: string | null;
  email: string | null;
  matchTier: string;
  matchScore: number | null;
  status: string;
  hasCv: boolean;
  lastActiveAt: string | null;
  createdAt: string | null;
}

export interface OrbitSeekerDocument {
  id: number;
  kind: string;
  originalFilename: string;
  sizeBytes: number;
  label: string | null;
  uploadedAt: string | null;
  downloadUrl: string;
  isCv: boolean;
}

export interface OrbitSeekerActivityDay {
  day: string;
  count: number;
}

export interface OrbitSeekerDetail extends OrbitSeekerSummary {
  popiaConsent: boolean;
  popiaConsentedAt: string | null;
  dismissWarningAcknowledgedAt: string | null;
  workProfile: unknown;
  cv: {
    summary: string | null;
    experienceYears: number | null;
    location: string | null;
    skills: string[];
    education: string[];
    certifications: string[];
    professionalRegistrations: string[];
    saQualifications: string[];
  };
  matchAnalysis: {
    overallScore: number;
    recommendation: string;
    reasoning: string | null;
  } | null;
  documents: OrbitSeekerDocument[];
  references: Array<{
    id: number;
    name: string;
    email: string;
    relationship: string | null;
    status: string;
    rating: number | null;
    submittedAt: string | null;
  }>;
  stats: { totalMatches: number; matchesLast7Days: number };
  activity: OrbitSeekerActivityDay[];
}

export interface OrbitTierFeatures {
  applyToJobs: boolean;
  viewSalaries: boolean;
  nixCvBuilder: boolean;
  jobListingSite: boolean;
  multiChannelReminders?: boolean;
  photoCredentialCapture?: boolean;
}

export interface OrbitTierPricing {
  monthlyPrice: number | null;
  perNixRun: number | null;
  perCvBuild: number | null;
}

export interface OrbitTierCapability {
  id: number;
  tier: string;
  label: string;
  matchStrictness: string;
  maxJobResults: number | null;
  monthlyNixRuns: number | null;
  monthlyCvBuilds: number | null;
  features: OrbitTierFeatures;
  pricing: OrbitTierPricing | null;
  displayOrder: number;
}

export type EeTargetMetric =
  | "race_african_black"
  | "race_coloured"
  | "race_indian"
  | "female"
  | "disability";

export type EeTargetOccupationalLevel =
  | "top_management"
  | "senior_management"
  | "professionally_qualified"
  | "skilled"
  | "semi_skilled"
  | "unskilled"
  | "all_levels";

export interface OrbitEeTarget {
  id: number;
  sectorCode: string;
  occupationalLevel: EeTargetOccupationalLevel;
  targetYear: number;
  targetMetric: EeTargetMetric;
  targetPercent: string;
  gazetteReference: string | null;
}

export interface UpsertOrbitEeTargetInput {
  id: number | null;
  sectorCode: string;
  occupationalLevel: EeTargetOccupationalLevel;
  targetYear: number;
  targetMetric: EeTargetMetric;
  targetPercent: number;
  gazetteReference: string | null;
}

export interface OrbitCredentialType {
  id: number;
  code: string;
  label: string;
  description: string | null;
  sortOrder: number;
  active: boolean;
}

export interface CreateOrbitCredentialTypeInput {
  code: string;
  label: string;
  description: string | null;
  sortOrder: number;
  active: boolean;
}

export interface UpdateOrbitCredentialTypeInput {
  label?: string;
  description?: string | null;
  sortOrder?: number;
  active?: boolean;
}

export type DismissReasonMuteAction = "company" | "category";

export interface OrbitDismissReason {
  id: number;
  code: string;
  label: string;
  muteAction: DismissReasonMuteAction | null;
  sortOrder: number;
  active: boolean;
}

export interface OrbitDelistReport {
  id: number;
  title: string;
  company: string | null;
  locationRaw: string | null;
  locationArea: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  sourceUrl: string | null;
  sourceProvider: string | null;
  delistReportedAt: string | null;
  delistReportedBy: string | null;
}

export interface CreateOrbitDismissReasonInput {
  code: string;
  label: string;
  muteAction: DismissReasonMuteAction | null;
  sortOrder: number;
  active: boolean;
}

export interface UpdateOrbitDismissReasonInput {
  label?: string;
  muteAction?: DismissReasonMuteAction | null;
  sortOrder?: number;
  active?: boolean;
}

export interface BrandingImage {
  id: string;
  label: string;
}

export interface AiUsageQueryParams {
  app?: string;
  provider?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface AiUsageGroup {
  date: string;
  app: string;
  actionType: string;
  provider: string;
  model: string | null;
  totalCalls: number;
  totalTokens: number;
  totalPages: number;
  totalTimeMs: number;
}

export interface AiUsageListResponse {
  data: AiUsageGroup[];
  total: number;
  page: number;
  limit: number;
  summary: {
    totalTokens: number;
    totalCalls: number;
  };
}

export interface AiUsageDailyPoint {
  date: string;
  calls: number;
  tokens: number;
}

export interface AiUsageDailySeriesResponse {
  days: AiUsageDailyPoint[];
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

export interface ConversationFilterDto {
  status?: string;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ConversationParticipant {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  type: "customer" | "supplier" | "admin";
}

export interface ConversationSummaryDto {
  id: number;
  subject: string;
  conversationType: string;
  relatedEntityType: string;
  relatedEntityId: number | null;
  participantNames: string[];
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  isArchived: boolean;
  createdAt: string;
  status?: "active" | "archived" | "closed";
  participants?: ConversationParticipant[];
}

export interface ConversationDetailDto extends ConversationSummaryDto {
  messages?: MessageDto[];
}

export interface MessageAttachment {
  id: number;
  filename: string;
  mimeType: string;
  size: number;
  url?: string;
}

export interface MessageDto {
  id: number;
  conversationId: number;
  senderId: number;
  senderName: string;
  senderType: "customer" | "supplier" | "admin";
  content: string;
  attachments: MessageAttachment[];
  readBy: number[];
  createdAt: string;
}

export interface MessagePaginationDto {
  before?: number;
  limit?: number;
}

export interface SendMessageDto {
  content: string;
  attachmentIds?: number[];
}

export interface BroadcastFilterDto {
  includeExpired?: boolean;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  unreadOnly?: boolean;
  page?: number;
  limit?: number;
}

export interface BroadcastDetailDto {
  id: number;
  title: string;
  contentPreview: string;
  content: string;
  targetAudience: "ALL" | "CUSTOMERS" | "SUPPLIERS" | "SPECIFIC";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  expiresAt: string | null;
  isRead: boolean;
  sentByName: string;
  totalRecipients: number;
  readCount: number;
  emailSentCount: number;
  createdAt: string;
}

export interface CreateBroadcastDto {
  title: string;
  content: string;
  targetAudience: "ALL" | "CUSTOMERS" | "SUPPLIERS" | "SPECIFIC";
  specificUserIds?: number[];
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  expiresAt?: string;
  sendEmail?: boolean;
}

export interface MetricsFilterDto {
  dateFrom?: string;
  dateTo?: string;
  userType?: string;
}

export interface ResponseMetricsSummaryDto {
  averageResponseTimeMinutes: number;
  medianResponseTimeMinutes: number;
  totalConversations: number;
  totalMessages: number;
  slaComplianceRate: number;
  responsesByDay: { date: string; count: number }[];
}

export interface RbacApp {
  id: number;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RbacAppPermission {
  id: number;
  appId: number;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
}

export interface RbacAppRole {
  id: number;
  appId: number;
  code: string;
  name: string;
  description: string | null;
  isDefault: boolean;
}

export interface RbacAppDetail extends RbacApp {
  permissions: RbacAppPermission[];
  roles: RbacAppRole[];
}

export interface RbacUserAccess {
  id: number;
  userId: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  appCode: string;
  roleCode: string | null;
  roleName: string | null;
  useCustomPermissions: boolean;
  permissionCodes: string[] | null;
  permissionCount: number | null;
  grantedAt: string;
  expiresAt: string | null;
  grantedById: number | null;
  productKeys: string[] | null;
}

export interface RbacSearchUser {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface RbacAppAccessSummary {
  appCode: string;
  appName: string;
  roleCode: string | null;
  roleName: string | null;
  useCustomPermissions: boolean;
  permissionCodes: string[] | null;
  permissionCount: number | null;
  expiresAt: string | null;
  accessId: number;
  productKeys: string[] | null;
}

export interface RbacUserWithAccessSummary {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
  appAccess: RbacAppAccessSummary[];
}

export interface AssignUserAccessDto {
  appCode: string;
  roleCode?: string | null;
  useCustomPermissions?: boolean;
  permissionCodes?: string[];
  productKeys?: string[];
  expiresAt?: string | null;
}

export interface UpdateUserAccessDto {
  roleCode?: string | null;
  useCustomPermissions?: boolean;
  permissionCodes?: string[];
  productKeys?: string[];
  expiresAt?: string | null;
}

export interface InviteAppGrant {
  appCode: string;
  roleCode?: string | null;
  useCustomPermissions?: boolean;
  permissionCodes?: string[];
  expiresAt?: string | null;
}

export interface InviteUserDto {
  email: string;
  firstName?: string;
  lastName?: string;
  apps?: InviteAppGrant[];
  appCode?: string;
  roleCode?: string | null;
  useCustomPermissions?: boolean;
  permissionCodes?: string[];
  expiresAt?: string | null;
}

export interface InviteUserResponse {
  userId: number;
  email: string;
  accessId: number;
  isNewUser: boolean;
  appNames?: string[];
  emailSent?: boolean;
  message: string;
}

export interface CreateRoleDto {
  code: string;
  name: string;
  description?: string;
  isDefault?: boolean;
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  isDefault?: boolean;
  displayOrder?: number;
}

export interface RbacRoleResponse {
  id: number;
  appId: number;
  code: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface RbacDeleteRoleResponse {
  message: string;
  reassignedUsers: number;
}

export interface RbacRoleProductsResponse {
  roleId: number;
  productKeys: string[];
}

export interface SsoAppAccessCount {
  appCode: string;
  appName: string;
  accessCount: number;
}

export interface SsoProfileCount {
  portal: string;
  table: string;
  profileCount: number;
}

export interface SsoCoverageSection {
  totalCoreUsers: number;
  accessByApp: SsoAppAccessCount[];
  profilesByPortal: SsoProfileCount[];
}

export interface SsoIdentityRef {
  userId: number;
  email: string;
}

export interface SsoAnnixRepGapSection {
  missingAccessCount: number;
  totalRepProfiles: number;
  sample: SsoIdentityRef[];
}

export interface SsoStandaloneIdentity {
  standaloneId: number;
  email: string;
  coreUserId: number | null;
}

export interface SsoTeacherAssistantSection {
  totalStandaloneUsers: number;
  unlinkedDuplicateCount: number;
  fullyStandaloneCount: number;
  unlinkedDuplicateSample: SsoStandaloneIdentity[];
  fullyStandaloneSample: SsoStandaloneIdentity[];
}

export interface SsoUnbridgedTable {
  table: string;
  unbridgedCount: number;
  totalRows: number;
  sample: SsoStandaloneIdentity[];
}

export interface SsoUnbridgedLegacySection {
  tables: SsoUnbridgedTable[];
}

export interface SsoPerAppRole {
  app: string;
  role: string | null;
}

export interface SsoPrivilegeConflict {
  email: string;
  perApp: SsoPerAppRole[];
}

export interface SsoSameEmailDifferentPrivilegeSection {
  conflictCount: number;
  sample: SsoPrivilegeConflict[];
}

export interface IdentityReconciliationReport {
  generatedAt: string;
  coverage: SsoCoverageSection;
  annixRepGap: SsoAnnixRepGapSection;
  teacherAssistant: SsoTeacherAssistantSection;
  unbridgedLegacy: SsoUnbridgedLegacySection;
  sameEmailDifferentPrivilege: SsoSameEmailDifferentPrivilegeSection;
}

export type NightSuspensionHours = 6 | 8 | 12 | null;

export type JobApp = "orbit" | "core" | "pulse" | "insights" | "sentinel" | "forge" | "global";

export interface ScheduledJobDto {
  name: string;
  description: string;
  module: string;
  app: JobApp;
  active: boolean;
  cronTime: string;
  defaultCron: string;
  lastExecution: string | null;
  nextExecution: string | null;
  nightSuspensionHours: NightSuspensionHours;
}

export interface GlobalSettingsDto {
  suspendOnWeekendsAndHolidays: boolean;
  pauseAllJobs: boolean;
}

export interface PollingJobDto {
  name: string;
  description: string;
  module: string;
  active: boolean;
  intervalMs: number;
  defaultIntervalMs: number;
  nightSuspensionHours: NightSuspensionHours;
}

export interface PollingJobsGlobalSettingsDto {
  suspendOnWeekendsAndHolidays: boolean;
}

export interface PollingJobRuntimeConfigDto {
  jobs: Record<
    string,
    {
      active: boolean;
      intervalMs: number;
      nightSuspensionHours: NightSuspensionHours;
      suspendedNow: boolean;
    }
  >;
  suspendOnWeekendsAndHolidays: boolean;
  serverTime: string;
}

export interface SyncResultDto {
  synced: number;
  source: string;
  timestamp: string;
}

export interface SyncStatusDto {
  syncSource: string | null;
  lastSyncTimestamp: string | null;
}

export interface DirectorResponse {
  name: string;
  title: string;
  email: string;
}

export interface CompanyProfileResponse {
  id: number;
  legalName: string;
  tradingName: string;
  registrationNumber: string;
  vatNumber: string | null;
  entityType: string | null;
  streetAddress: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string;
  phone: string | null;
  generalEmail: string | null;
  supportEmail: string | null;
  privacyEmail: string | null;
  demoRequestEmail: string | null;
  websiteUrl: string | null;
  informationOfficerName: string | null;
  informationOfficerEmail: string | null;
  jurisdiction: string;
  primaryDomain: string | null;
  noReplyEmail: string | null;
  mailerName: string | null;
  directors: DirectorResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateCompanyProfileRequest {
  legalName?: string;
  tradingName?: string;
  registrationNumber?: string;
  vatNumber?: string;
  entityType?: string;
  streetAddress?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  generalEmail?: string;
  supportEmail?: string;
  privacyEmail?: string;
  demoRequestEmail?: string;
  websiteUrl?: string;
  informationOfficerName?: string;
  informationOfficerEmail?: string;
  jurisdiction?: string;
  primaryDomain?: string;
  noReplyEmail?: string;
  mailerName?: string;
  directors?: DirectorResponse[];
}

export const adminApiClient = new AdminApiClient();
