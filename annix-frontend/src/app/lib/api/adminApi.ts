import { type ApiClient, createApiClient, createEndpoint } from "@/app/lib/api/createApiClient";
import { adminTokenStore } from "@/app/lib/api/portalTokenStores";
import { API_BASE_URL } from "@/lib/api-config";

// Types for admin portal - must match backend DTOs

import type {
  ActivityItem,
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
    path: "/admin/rbac/apps/${encodeURIComponent(code)}",
  });

  rbacUsersWithAccess = createEndpoint<[appCode: string], RbacUserAccess[]>(apiClient, "GET", {
    path: "/admin/rbac/apps/${encodeURIComponent(appCode)}/users",
  });

  async rbacSearchUsers(query: string): Promise<RbacSearchUser[]> {
    return this.request<RbacSearchUser[]>(
      `/admin/rbac/users/search?q=${encodeURIComponent(query)}`,
    );
  }

  rbacAllUsers = createEndpoint<[], RbacUserWithAccessSummary[]>(apiClient, "GET", {
    path: "/admin/rbac/users/all",
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

  rbacCreateRole = createEndpoint<[appCode: string, dto: CreateRoleDto], RbacRoleResponse>(
    apiClient,
    "POST",
    {
      path: "/admin/rbac/apps/${encodeURIComponent(appCode)}/roles",
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
    path: "/admin/polling-jobs/${encodeURIComponent(name)}/pause",
  });

  resumePollingJob = createEndpoint<[name: string], PollingJobDto>(apiClient, "POST", {
    path: "/admin/polling-jobs/${encodeURIComponent(name)}/resume",
  });

  updatePollingJobInterval = createEndpoint<[name: string, intervalMs: number], PollingJobDto>(
    apiClient,
    "POST",
    {
      path: "/admin/polling-jobs/${encodeURIComponent(name)}/interval",
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

export interface InviteUserDto {
  email: string;
  firstName?: string;
  lastName?: string;
  appCode: string;
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

export type NightSuspensionHours = 6 | 8 | 12 | null;

export interface ScheduledJobDto {
  name: string;
  description: string;
  module: string;
  active: boolean;
  cronTime: string;
  defaultCron: string;
  lastExecution: string | null;
  nextExecution: string | null;
  nightSuspensionHours: NightSuspensionHours;
}

export interface GlobalSettingsDto {
  suspendOnWeekendsAndHolidays: boolean;
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
