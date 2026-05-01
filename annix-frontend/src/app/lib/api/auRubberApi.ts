import { toPairs as entries } from "es-toolkit/compat";
import {
  type ApiClient,
  createApiClient,
  createEndpoint,
  type QueryParamValue,
} from "@/app/lib/api/createApiClient";
import { auRubberTokenStore } from "@/app/lib/api/portalTokenStores";
import type { RubberAppProfileDto } from "@/app/lib/api/rubberPortalApi";
import { API_BASE_URL } from "@/lib/api-config";
import type {
  AdjustOtherStockDto,
  AnalyzeCustomerDnsResult,
  AnalyzedDeliveryNoteResult,
  AnalyzeOrderFilesResult,
  AnalyzeProductFilesResult,
  AnalyzeSupplierCocsResult,
  AuCocStatus,
  AuRubberAccessInfo,
  AuRubberInviteUserResponse,
  AuRubberLoginDto,
  AuRubberLoginResponse,
  AuRubberPermissionDto,
  AuRubberRoleDto,
  AuRubberUserAccessDto,
  AuRubberUserProfile,
  CocProcessingStatus,
  CompoundCalculationResultDto,
  CompoundMovementReferenceType,
  CompoundMovementType,
  CompoundQualityDetailDto,
  CompoundQualitySummaryDto,
  CreateCompoundOpeningStockDto,
  CreateOpeningStockDto,
  CreateOrderFromAnalysisDto,
  CreateOtherStockDto,
  CreateRollFromPhotoDto,
  CreateRollIssuanceDto,
  CreateRubberCompanyInput,
  CreateRubberOrderInput,
  CreateTemplateDto,
  CustomerDnOverride,
  DeliveryNoteStatus,
  DeliveryNoteType,
  ExtractedDeliveryNoteData,
  ImportCompoundOpeningStockResultDto,
  ImportCompoundOpeningStockRowDto,
  ImportOpeningStockResultDto,
  ImportOpeningStockRowDto,
  ImportOtherStockResultDto,
  ImportOtherStockRowDto,
  JcLineItemDto,
  JcSearchResultDto,
  PaginatedResult,
  PdfPageImage,
  PoTemplateDto,
  QualityAlertDto,
  QualityConfigDto,
  ReceiveOtherStockDto,
  RegionCoordinates,
  RequisitionDto,
  RequisitionItemType,
  RequisitionSourceType,
  RequisitionStatus,
  RoleTargetType,
  RollIssuanceDto,
  RollIssuanceRollDto,
  RollPhotoIdentifyResponse,
  RollRejectionDto,
  RollRejectionStatus,
  RollStockStatus,
  RollTraceabilityDto,
  RubberAuCocDto,
  RubberCompoundBatchDto,
  RubberCompoundMovementDto,
  RubberCompoundOrderDto,
  RubberCompoundOrderStatus,
  RubberCompoundStockDto,
  RubberDeliveryNoteDto,
  RubberDeliveryNoteItemDto,
  RubberOtherStockDto,
  RubberProductionDto,
  RubberProductionStatus,
  RubberRollStockDto,
  RubberSpecificationDto,
  RubberSupplierCocDto,
  RubberTaxInvoiceDto,
  RubberTaxInvoiceStatementDto,
  SageContactMappingStatus,
  SageContactSyncResult,
  SageExportFilter,
  ScrapedBrandingCandidates,
  StockLocationDto,
  SupplierCocType,
  TaxInvoiceStatus,
  TaxInvoiceType,
  UpdateOtherStockDto,
  UpdateRubberOrderInput,
} from "./auRubberApi.types";
import type {
  CreateRubberProductDto,
  ImportProductRowDto,
  ImportProductsResultDto,
  RubberCompanyDto,
  RubberOrderDto,
  RubberPriceCalculationDto,
  RubberPricingTierDto,
  RubberProductCodingDto,
  RubberProductDto,
} from "./rubberPortalApi";

export type * from "./auRubberApi.types";

const apiClient: ApiClient = createApiClient({
  baseURL: API_BASE_URL,
  tokenStore: auRubberTokenStore,
  refreshUrl: `${API_BASE_URL}/admin/auth/refresh`,
});

class AuRubberApiClient {
  baseURL = API_BASE_URL;

  get accessToken(): string | null {
    return auRubberTokenStore.accessToken();
  }

  protected headers(): Record<string, string> {
    return auRubberTokenStore.authHeaders();
  }

  setRememberMe(_remember: boolean) {
    // PortalTokenStore tracks rememberMe via setTokens
  }

  private setTokens(accessToken: string, refreshToken: string) {
    auRubberTokenStore.setTokens(accessToken, refreshToken, auRubberTokenStore.rememberMe());
  }

  clearTokens() {
    auRubberTokenStore.clear();
  }

  isAuthenticated(): boolean {
    return auRubberTokenStore.isAuthenticated();
  }

  private request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return apiClient.request<T>(endpoint, options);
  }

  requestBlob(endpoint: string, options: RequestInit = {}): Promise<Blob> {
    return apiClient.requestBlob(endpoint, options);
  }

  private requestWithFiles<T>(
    endpoint: string,
    files: File[],
    data?: Record<string, string | number | undefined>,
    fieldName: string = "files",
  ): Promise<T> {
    const formData = new FormData();
    files.forEach((file) => formData.append(fieldName, file));
    if (data) {
      entries(data).forEach(([key, value]) => {
        if (value !== undefined) formData.append(key, String(value));
      });
    }
    return apiClient.request<T>(endpoint, { method: "POST", body: formData });
  }

  refreshAccessToken(): Promise<boolean> {
    return apiClient.refreshAccessToken();
  }

  async login(dto: AuRubberLoginDto): Promise<AuRubberLoginResponse> {
    const response = await this.request<AuRubberLoginResponse>("/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ ...dto, appCode: "au-rubber" }),
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

  currentUser = createEndpoint<[], AuRubberUserProfile>(apiClient, "GET", {
    path: "/admin/auth/me",
  });

  productCodings = createEndpoint<[codingType?: string], RubberProductCodingDto[]>(
    apiClient,
    "GET",
    {
      path: "/rubber-lining/portal/product-codings",
      query: (codingType) => ({ codingType }),
    },
  );

  productCodingsNeedsReviewCount = createEndpoint<[], { count: number }>(apiClient, "GET", {
    path: "/rubber-lining/portal/product-codings/needs-review-count",
  });

  productCodingById = createEndpoint<[id: number], RubberProductCodingDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/product-codings/${id}`,
  });

  createProductCoding = createEndpoint<
    [data: Omit<RubberProductCodingDto, "id" | "firebaseUid">],
    RubberProductCodingDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/product-codings",
    body: (data) => data,
  });

  updateProductCoding = createEndpoint<
    [id: number, data: Partial<RubberProductCodingDto>],
    RubberProductCodingDto
  >(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/product-codings/${id}`,
    body: (_id, data) => data,
  });

  deleteProductCoding = createEndpoint<[id: number], void>(apiClient, "DELETE", {
    path: (id) => `/rubber-lining/portal/product-codings/${id}`,
  });

  pricingTiers = createEndpoint<[], RubberPricingTierDto[]>(apiClient, "GET", {
    path: "/rubber-lining/portal/pricing-tiers",
  });

  pricingTierById = createEndpoint<[id: number], RubberPricingTierDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/pricing-tiers/${id}`,
  });

  createPricingTier = createEndpoint<
    [data: Omit<RubberPricingTierDto, "id">],
    RubberPricingTierDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/pricing-tiers",
    body: (data) => data,
  });

  updatePricingTier = createEndpoint<
    [id: number, data: Partial<RubberPricingTierDto>],
    RubberPricingTierDto
  >(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/pricing-tiers/${id}`,
    body: (_id, data) => data,
  });

  deletePricingTier = createEndpoint<[id: number], void>(apiClient, "DELETE", {
    path: (id) => `/rubber-lining/portal/pricing-tiers/${id}`,
  });

  companies = createEndpoint<[], RubberCompanyDto[]>(apiClient, "GET", {
    path: "/rubber-lining/portal/companies",
  });

  companyById = createEndpoint<[id: number], RubberCompanyDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/companies/${id}`,
  });

  createCompany = createEndpoint<[data: CreateRubberCompanyInput], RubberCompanyDto>(
    apiClient,
    "POST",
    {
      path: "/rubber-lining/portal/companies",
      body: (data) => data,
    },
  );

  updateCompany = createEndpoint<
    [id: number, data: Partial<CreateRubberCompanyInput>],
    RubberCompanyDto
  >(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/companies/${id}`,
    body: (_id, data) => data,
  });

  deleteCompany = createEndpoint<[id: number], void>(apiClient, "DELETE", {
    path: (id) => `/rubber-lining/portal/companies/${id}`,
  });

  products = createEndpoint<[], RubberProductDto[]>(apiClient, "GET", {
    path: "/rubber-lining/portal/products",
  });

  productById = createEndpoint<[id: number], RubberProductDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/products/${id}`,
  });

  createProduct = createEndpoint<[data: CreateRubberProductDto], RubberProductDto>(
    apiClient,
    "POST",
    {
      path: "/rubber-lining/portal/products",
      body: (data) => data,
    },
  );

  updateProduct = createEndpoint<
    [id: number, data: Partial<CreateRubberProductDto>],
    RubberProductDto
  >(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/products/${id}`,
    body: (_id, data) => data,
  });

  deleteProduct = createEndpoint<[id: number], void>(apiClient, "DELETE", {
    path: (id) => `/rubber-lining/portal/products/${id}`,
  });

  orders = createEndpoint<[status?: number], RubberOrderDto[]>(apiClient, "GET", {
    path: "/rubber-lining/portal/orders",
    query: (status) => ({ status }),
  });

  orderById = createEndpoint<[id: number], RubberOrderDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/orders/${id}`,
  });

  createOrder = createEndpoint<[data: CreateRubberOrderInput], RubberOrderDto>(apiClient, "POST", {
    path: "/rubber-lining/portal/orders",
    body: (data) => data,
  });

  updateOrder = createEndpoint<[id: number, data: UpdateRubberOrderInput], RubberOrderDto>(
    apiClient,
    "PUT",
    {
      path: (id) => `/rubber-lining/portal/orders/${id}`,
      body: (_id, data) => data,
    },
  );

  deleteOrder = createEndpoint<[id: number], void>(apiClient, "DELETE", {
    path: (id) => `/rubber-lining/portal/orders/${id}`,
  });

  orderConfirmationPdfBlob = createEndpoint<[orderId: number], Blob>(apiClient, "GET", {
    path: (orderId) => `/rubber-lining/portal/orders/${orderId}/confirmation-pdf`,
    responseType: "blob",
  });

  sendOrderConfirmation = createEndpoint<
    [orderId: number, email: string, cc?: string, bcc?: string],
    { success: boolean }
  >(apiClient, "POST", {
    path: (orderId) => `/rubber-lining/portal/orders/${orderId}/send-confirmation`,
    body: (_orderId, email, cc, bcc) => ({ email, cc, bcc }),
  });

  appProfile = createEndpoint<[], RubberAppProfileDto>(apiClient, "GET", {
    path: "/rubber-lining/portal/app-profile",
  });

  updateAppProfile = createEndpoint<[data: Partial<RubberAppProfileDto>], RubberAppProfileDto>(
    apiClient,
    "PUT",
    {
      path: "/rubber-lining/portal/app-profile",
      body: (data) => data,
    },
  );

  orderStatuses = createEndpoint<[], { value: number; label: string }[]>(apiClient, "GET", {
    path: "/rubber-lining/portal/order-statuses",
  });

  codingTypes = createEndpoint<[], { value: string; label: string }[]>(apiClient, "GET", {
    path: "/rubber-lining/portal/coding-types",
  });

  calculatePrice = createEndpoint<
    [
      data: {
        productId: number;
        companyId: number;
        thickness: number;
        width: number;
        length: number;
        quantity: number;
      },
    ],
    RubberPriceCalculationDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/calculate-price",
    body: (data) => data,
  });

  importProducts = createEndpoint<
    [
      data: {
        rows: ImportProductRowDto[];
        updateExisting?: boolean;
      },
    ],
    ImportProductsResultDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/products/import",
    body: (data) => data,
  });

  async analyzeProductFiles(files: File[]): Promise<AnalyzeProductFilesResult> {
    return this.requestWithFiles("/rubber-lining/portal/products/analyze", files);
  }

  compoundStocks = createEndpoint<[], RubberCompoundStockDto[]>(apiClient, "GET", {
    path: "/rubber-lining/portal/compound-stocks",
  });

  lowStockCompounds = createEndpoint<[], RubberCompoundStockDto[]>(apiClient, "GET", {
    path: "/rubber-lining/portal/compound-stocks/low-stock",
  });

  compoundStockById = createEndpoint<[id: number], RubberCompoundStockDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/compound-stocks/${id}`,
  });

  createCompoundStock = createEndpoint<
    [
      data: {
        compoundCodingId: number;
        quantityKg?: number;
        minStockLevelKg?: number;
        reorderPointKg?: number;
        costPerKg?: number;
        location?: string;
        batchNumber?: string;
      },
    ],
    RubberCompoundStockDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/compound-stocks",
    body: (data) => data,
  });

  createCompoundOpeningStock = createEndpoint<
    [data: CreateCompoundOpeningStockDto],
    RubberCompoundStockDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/compound-stocks/opening",
    body: (data) => data,
  });

  importCompoundOpeningStock = createEndpoint<
    [rows: ImportCompoundOpeningStockRowDto[]],
    ImportCompoundOpeningStockResultDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/compound-stocks/import-opening",
    body: (rows) => rows,
  });

  updateCompoundStock = createEndpoint<
    [
      id: number,
      data: {
        compoundCodingId?: number;
        quantityKg?: number;
        minStockLevelKg?: number;
        reorderPointKg?: number;
        costPerKg?: number;
        location?: string;
        batchNumber?: string;
      },
    ],
    RubberCompoundStockDto
  >(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/compound-stocks/${id}`,
    body: (_id, data) => data,
  });

  deleteCompoundStock = createEndpoint<[id: number], void>(apiClient, "DELETE", {
    path: (id) => `/rubber-lining/portal/compound-stocks/${id}`,
  });

  async compoundMovements(filters?: {
    compoundStockId?: number;
    movementType?: CompoundMovementType;
    referenceType?: CompoundMovementReferenceType;
  }): Promise<RubberCompoundMovementDto[]> {
    const params = new URLSearchParams();
    if (filters?.compoundStockId) params.set("compoundStockId", String(filters.compoundStockId));
    if (filters?.movementType) params.set("movementType", filters.movementType);
    if (filters?.referenceType) params.set("referenceType", filters.referenceType);
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/rubber-lining/portal/compound-movements${query}`);
  }

  receiveCompound = createEndpoint<
    [
      data: {
        compoundStockId: number;
        quantityKg: number;
        batchNumber?: string;
        notes?: string;
      },
    ],
    RubberCompoundMovementDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/compound-movements/receive",
    body: (data) => data,
  });

  adjustCompound = createEndpoint<
    [
      data: {
        compoundStockId: number;
        quantityKg: number;
        notes?: string;
      },
    ],
    RubberCompoundMovementDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/compound-movements/adjust",
    body: (data) => data,
  });

  productions = createEndpoint<[status?: RubberProductionStatus], RubberProductionDto[]>(
    apiClient,
    "GET",
    {
      path: "/rubber-lining/portal/productions",
      query: (status) => ({ status: status }),
    },
  );

  productionById = createEndpoint<[id: number], RubberProductionDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/productions/${id}`,
  });

  createProduction = createEndpoint<
    [
      data: {
        productId: number;
        compoundStockId: number;
        thicknessMm: number;
        widthMm: number;
        lengthM: number;
        quantity: number;
        orderId?: number;
        notes?: string;
      },
    ],
    RubberProductionDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/productions",
    body: (data) => data,
  });

  startProduction = createEndpoint<[id: number], RubberProductionDto>(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/productions/${id}/start`,
  });

  completeProduction = createEndpoint<[id: number], RubberProductionDto>(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/productions/${id}/complete`,
  });

  cancelProduction = createEndpoint<[id: number], RubberProductionDto>(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/productions/${id}/cancel`,
  });

  calculateCompoundRequired = createEndpoint<
    [
      data: {
        productId: number;
        thicknessMm: number;
        widthMm: number;
        lengthM: number;
        quantity: number;
      },
    ],
    CompoundCalculationResultDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/productions/calculate-compound",
    body: (data) => data,
  });

  async compoundOrders(
    status?: RubberCompoundOrderStatus | null,
  ): Promise<RubberCompoundOrderDto[]> {
    const query = status ? `?status=${status}` : "";
    return this.request(`/rubber-lining/portal/compound-orders${query}`);
  }

  compoundOrderById = createEndpoint<[id: number], RubberCompoundOrderDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/compound-orders/${id}`,
  });

  createCompoundOrder = createEndpoint<
    [
      data: {
        compoundStockId: number;
        quantityKg: number;
        supplierName?: string | null;
        expectedDelivery?: string | null;
        notes?: string | null;
      },
    ],
    RubberCompoundOrderDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/compound-orders",
    body: (data) => data,
  });

  updateCompoundOrderStatus = createEndpoint<
    [id: number, status: RubberCompoundOrderStatus],
    RubberCompoundOrderDto
  >(apiClient, "PUT", {
    path: (id, _status) => `/rubber-lining/portal/compound-orders/${id}/status`,
    body: (_id, status) => ({ status }),
  });

  receiveCompoundOrder = createEndpoint<
    [
      id: number,
      data: {
        actualQuantityKg: number;
        batchNumber?: string | null;
        notes?: string | null;
      },
    ],
    RubberCompoundOrderDto
  >(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/compound-orders/${id}/receive`,
    body: (_id, data) => data,
  });

  productionStatuses = createEndpoint<[], { value: string; label: string }[]>(apiClient, "GET", {
    path: "/rubber-lining/portal/production-statuses",
  });

  compoundOrderStatuses = createEndpoint<[], { value: string; label: string }[]>(apiClient, "GET", {
    path: "/rubber-lining/portal/compound-order-statuses",
  });

  scrapeBranding = createEndpoint<[websiteUrl: string], ScrapedBrandingCandidates>(
    apiClient,
    "POST",
    {
      path: "/rubber-lining/portal/scrape-branding",
      body: (websiteUrl) => ({ websiteUrl }),
    },
  );

  proxyImageUrl(url: string): string {
    return `${this.baseURL}/rubber-lining/portal/proxy-image?url=${encodeURIComponent(url)}`;
  }

  authHeaders(): Record<string, string> {
    return this.headers();
  }

  myAccess = createEndpoint<[], AuRubberAccessInfo>(apiClient, "GET", {
    path: "/rubber-lining/admin/access/me",
  });

  accessUsers = createEndpoint<[], AuRubberUserAccessDto[]>(apiClient, "GET", {
    path: "/rubber-lining/admin/access/users",
  });

  accessRoles = createEndpoint<[], AuRubberRoleDto[]>(apiClient, "GET", {
    path: "/rubber-lining/admin/access/roles",
  });

  accessPermissions = createEndpoint<[], AuRubberPermissionDto[]>(apiClient, "GET", {
    path: "/rubber-lining/admin/access/permissions",
  });

  createRole = createEndpoint<
    [
      data: {
        code: string;
        name: string;
        description?: string;
        isDefault?: boolean;
        targetType?: RoleTargetType | null;
      },
    ],
    AuRubberRoleDto
  >(apiClient, "POST", {
    path: "/rubber-lining/admin/access/roles",
    body: (data) => data,
  });

  updateRole = createEndpoint<
    [roleId: number, data: { name?: string; description?: string; isDefault?: boolean }],
    AuRubberRoleDto
  >(apiClient, "PATCH", {
    path: (roleId) => `/rubber-lining/admin/access/roles/${roleId}`,
    body: (_roleId, data) => data,
  });

  setRolePermissions = createEndpoint<[roleId: number, permissionCodes: string[]], void>(
    apiClient,
    "PUT",
    {
      path: (roleId, _permissionCodes) => `/rubber-lining/admin/access/roles/${roleId}/permissions`,
      body: (_roleId, permissionCodes) => ({ permissionCodes }),
    },
  );

  deleteRole = createEndpoint<[roleId: number], { message: string; reassignedUsers: number }>(
    apiClient,
    "DELETE",
    {
      path: (roleId) => `/rubber-lining/admin/access/roles/${roleId}`,
    },
  );

  grantUserAccess = createEndpoint<[userId: number, roleCode: string], AuRubberUserAccessDto>(
    apiClient,
    "POST",
    {
      path: (userId, _roleCode) => `/rubber-lining/admin/access/users/${userId}`,
      body: (_userId, roleCode) => ({ roleCode }),
    },
  );

  updateUserAccess = createEndpoint<[accessId: number, roleCode: string], AuRubberUserAccessDto>(
    apiClient,
    "PATCH",
    {
      path: (accessId, _roleCode) => `/rubber-lining/admin/access/users/${accessId}`,
      body: (_accessId, roleCode) => ({ roleCode }),
    },
  );

  revokeUserAccess = createEndpoint<[accessId: number], void>(apiClient, "DELETE", {
    path: (accessId) => `/rubber-lining/admin/access/users/${accessId}`,
  });

  inviteUser = createEndpoint<
    [
      data: {
        email: string;
        firstName?: string;
        lastName?: string;
        roleCode: string;
      },
    ],
    AuRubberInviteUserResponse
  >(apiClient, "POST", {
    path: "/rubber-lining/admin/access/invite",
    body: (data) => data,
  });

  async searchUsers(
    query: string,
  ): Promise<{ id: number; email: string; firstName: string | null; lastName: string | null }[]> {
    return this.request(`/rubber-lining/admin/users/search?q=${encodeURIComponent(query)}`);
  }

  async supplierCocs(filters?: {
    cocType?: SupplierCocType;
    processingStatus?: CocProcessingStatus;
    supplierId?: number;
    includeAllVersions?: boolean;
  }): Promise<RubberSupplierCocDto[]> {
    const params = new URLSearchParams();
    if (filters?.cocType) params.set("cocType", filters.cocType);
    if (filters?.processingStatus) params.set("processingStatus", filters.processingStatus);
    if (filters?.supplierId) params.set("supplierId", String(filters.supplierId));
    if (filters?.includeAllVersions) params.set("includeAllVersions", "true");
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/rubber-lining/portal/supplier-cocs${query}`);
  }

  supplierCocById = createEndpoint<[id: number], RubberSupplierCocDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/supplier-cocs/${id}`,
  });

  uploadSupplierCoc = createEndpoint<
    [
      data: {
        cocType: SupplierCocType;
        supplierCompanyId?: number;
        cocNumber?: string;
        productionDate?: string;
        compoundCode?: string;
        orderNumber?: string;
        ticketNumber?: string;
      },
    ],
    RubberSupplierCocDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/supplier-cocs",
    body: (data) => data,
  });

  async uploadSupplierCocWithFiles(
    files: File[],
    data: {
      cocType: SupplierCocType;
      supplierCompanyId?: number;
      cocNumber?: string;
      productionDate?: string;
      compoundCode?: string;
      orderNumber?: string;
      ticketNumber?: string;
    },
  ): Promise<RubberSupplierCocDto[]> {
    return this.requestWithFiles("/rubber-lining/portal/supplier-cocs/upload", files, {
      cocType: data.cocType,
      supplierCompanyId: data.supplierCompanyId,
      cocNumber: data.cocNumber,
      productionDate: data.productionDate,
      compoundCode: data.compoundCode,
      orderNumber: data.orderNumber,
      ticketNumber: data.ticketNumber,
    });
  }

  analyzeSupplierCocs(files: File[]): Promise<AnalyzeSupplierCocsResult> {
    return this.requestWithFiles("/rubber-lining/portal/supplier-cocs/analyze", files);
  }

  createCocsFromAnalysis = createEndpoint<
    [files: File[], analysis: AnalyzeSupplierCocsResult],
    { cocIds: number[] }
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/supplier-cocs/create-from-analysis",
    formData: (files, analysis) => {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      fd.append("analysis", JSON.stringify(analysis));
      return fd;
    },
  });

  updateSupplierCoc = createEndpoint<
    [
      id: number,
      data: {
        cocType?: SupplierCocType;
        cocNumber?: string | null;
        compoundCode?: string | null;
        productionDate?: string | null;
        orderNumber?: string | null;
        ticketNumber?: string | null;
        createdAt?: string | null;
      },
    ],
    RubberSupplierCocDto
  >(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/supplier-cocs/${id}`,
    body: (_id, data) => data,
  });

  extractSupplierCoc = createEndpoint<[id: number], RubberSupplierCocDto>(apiClient, "POST", {
    path: (id) => `/rubber-lining/portal/supplier-cocs/${id}/extract`,
  });

  reviewSupplierCoc = createEndpoint<
    [id: number, data: { extractedData?: Record<string, unknown>; reviewNotes?: string }],
    RubberSupplierCocDto
  >(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/supplier-cocs/${id}/review`,
    body: (_id, data) => data,
  });

  approveSupplierCoc = createEndpoint<[id: number], RubberSupplierCocDto>(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/supplier-cocs/${id}/approve`,
  });

  deleteSupplierCoc = createEndpoint<[id: number], void>(apiClient, "DELETE", {
    path: (id) => `/rubber-lining/portal/supplier-cocs/${id}`,
  });

  linkCocToDeliveryNote = createEndpoint<
    [cocId: number, deliveryNoteId: number],
    RubberSupplierCocDto
  >(apiClient, "PUT", {
    path: (cocId, _deliveryNoteId) => `/rubber-lining/portal/supplier-cocs/${cocId}/link-dn`,
    body: (_cocId, deliveryNoteId) => ({ deliveryNoteId }),
  });

  compoundBatchesByCocId = createEndpoint<[cocId: number], RubberCompoundBatchDto[]>(
    apiClient,
    "GET",
    {
      path: (cocId) => `/rubber-lining/portal/supplier-cocs/${cocId}/batches`,
    },
  );

  createCompoundBatch = createEndpoint<
    [
      data: {
        supplierCocId: number;
        batchNumber: string;
        compoundStockId?: number;
        shoreAHardness?: number;
        specificGravity?: number;
        reboundPercent?: number;
        tearStrengthKnM?: number;
        tensileStrengthMpa?: number;
        elongationPercent?: number;
        rheometerSMin?: number;
        rheometerSMax?: number;
        rheometerTs2?: number;
        rheometerTc90?: number;
        passFailStatus?: string;
      },
    ],
    RubberCompoundBatchDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/compound-batches",
    body: (data) => data,
  });

  updateCompoundBatch = createEndpoint<
    [
      id: number,
      data: {
        batchNumber?: string;
        shoreAHardness?: number | null;
        specificGravity?: number | null;
        reboundPercent?: number | null;
        tearStrengthKnM?: number | null;
        tensileStrengthMpa?: number | null;
        elongationPercent?: number | null;
        rheometerSMin?: number | null;
        rheometerSMax?: number | null;
        rheometerTs2?: number | null;
        rheometerTc90?: number | null;
        passFailStatus?: string | null;
      },
    ],
    RubberCompoundBatchDto
  >(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/compound-batches/${id}`,
    body: (_id, data) => data,
  });

  deleteCompoundBatch = createEndpoint<[id: number], void>(apiClient, "DELETE", {
    path: (id) => `/rubber-lining/portal/compound-batches/${id}`,
  });

  async deliveryNotes(filters?: {
    deliveryNoteType?: DeliveryNoteType;
    status?: DeliveryNoteStatus;
    supplierId?: number;
    companyType?: "SUPPLIER" | "CUSTOMER";
    includeAllVersions?: boolean;
    search?: string;
    sortColumn?: string;
    sortDirection?: "asc" | "desc";
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResult<RubberDeliveryNoteDto>> {
    const params = new URLSearchParams();
    if (filters?.deliveryNoteType) params.set("deliveryNoteType", filters.deliveryNoteType);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.supplierId) params.set("supplierId", String(filters.supplierId));
    if (filters?.companyType) params.set("companyType", filters.companyType);
    if (filters?.includeAllVersions) params.set("includeAllVersions", "true");
    if (filters?.search) params.set("search", filters.search);
    if (filters?.sortColumn) params.set("sortColumn", filters.sortColumn);
    if (filters?.sortDirection) params.set("sortDirection", filters.sortDirection);
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.pageSize) params.set("pageSize", String(filters.pageSize));
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/rubber-lining/portal/delivery-notes${query}`);
  }

  deliveryNoteById = createEndpoint<[id: number], RubberDeliveryNoteDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/delivery-notes/${id}`,
  });

  deleteDeliveryNote = createEndpoint<[id: number], void>(apiClient, "DELETE", {
    path: (id) => `/rubber-lining/portal/delivery-notes/${id}`,
  });

  uploadDeliveryNote = createEndpoint<
    [
      data: {
        deliveryNoteType: DeliveryNoteType;
        supplierCompanyId: number;
        deliveryNoteNumber?: string;
        deliveryDate?: string;
      },
    ],
    RubberDeliveryNoteDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/delivery-notes",
    body: (data) => data,
  });

  async uploadDeliveryNoteWithFiles(
    files: File[],
    data: {
      deliveryNoteType: DeliveryNoteType;
      supplierCompanyId?: number;
      deliveryNoteNumber?: string;
      deliveryDate?: string;
    },
  ): Promise<RubberDeliveryNoteDto[]> {
    return this.requestWithFiles("/rubber-lining/portal/delivery-notes/upload", files, {
      deliveryNoteType: data.deliveryNoteType,
      ...(data.supplierCompanyId ? { supplierCompanyId: data.supplierCompanyId } : {}),
      deliveryNoteNumber: data.deliveryNoteNumber,
      deliveryDate: data.deliveryDate,
    });
  }

  async bulkAutoLinkDeliveryNotes(): Promise<{ linked: number; details: string[] }> {
    return this.request("/rubber-lining/portal/delivery-notes/bulk-auto-link", {
      method: "POST",
    });
  }

  async bulkLinkCustomerDns(): Promise<{ linked: number; details: string[] }> {
    return this.request("/rubber-lining/portal/delivery-notes/bulk-link-customer-dns", {
      method: "POST",
    });
  }

  async bulkAutoGenerateAuCocs(): Promise<{
    checked: number;
    generated: number;
    details: string[];
  }> {
    return this.request("/rubber-lining/portal/au-cocs/bulk-auto-generate", {
      method: "POST",
    });
  }

  async regenerateAllGeneratedCocs(): Promise<{
    regenerated: number;
    failed: number;
    total: number;
    errors: string[];
  }> {
    return this.request("/rubber-lining/portal/au-cocs/bulk-regenerate", {
      method: "POST",
    });
  }

  extractDeliveryNote = createEndpoint<[id: number], RubberDeliveryNoteDto>(apiClient, "POST", {
    path: (id) => `/rubber-lining/portal/delivery-notes/${id}/extract`,
  });

  saveExtractedDataCorrections = createEndpoint<
    [id: number, corrections: ExtractedDeliveryNoteData],
    RubberDeliveryNoteDto
  >(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/delivery-notes/${id}/extracted-data`,
    body: (_id, corrections) => corrections,
  });

  analyzeDeliveryNotePhoto = createEndpoint<[file: File], AnalyzedDeliveryNoteResult>(
    apiClient,
    "POST",
    {
      path: "/rubber-lining/portal/delivery-notes/analyze",
      formData: (file) => {
        const fd = new FormData();
        fd.append("file", file);
        return fd;
      },
    },
  );

  acceptAnalyzedDeliveryNote = createEndpoint<
    [file: File, analyzedData: AnalyzedDeliveryNoteResult["data"]],
    RubberDeliveryNoteDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/delivery-notes/accept-analyzed",
    formData: (file, analyzedData) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("analyzedData", JSON.stringify(analyzedData));
      return fd;
    },
  });

  linkDeliveryNoteToCoc = createEndpoint<
    [deliveryNoteId: number, cocId: number],
    RubberDeliveryNoteDto
  >(apiClient, "PUT", {
    path: (deliveryNoteId, _cocId) =>
      `/rubber-lining/portal/delivery-notes/${deliveryNoteId}/link-coc`,
    body: (_deliveryNoteId, cocId) => ({ cocId }),
  });

  finalizeDeliveryNote = createEndpoint<[id: number], RubberDeliveryNoteDto>(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/delivery-notes/${id}/finalize`,
  });

  approveDeliveryNote = createEndpoint<[id: number], RubberDeliveryNoteDto>(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/delivery-notes/${id}/approve`,
  });

  refileDeliveryNoteStock = createEndpoint<[id: number], RubberDeliveryNoteDto>(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/delivery-notes/${id}/refile-stock`,
  });

  backfillDeliveryNoteSiblings = createEndpoint<
    [id: number],
    {
      created: number;
      deliveryNoteIds: number[];
      skipped: { dnNumber: string; reason: string }[];
    }
  >(apiClient, "POST", {
    path: (id) => `/rubber-lining/portal/delivery-notes/${id}/backfill-siblings`,
  });

  deliveryNoteItems = createEndpoint<[deliveryNoteId: number], RubberDeliveryNoteItemDto[]>(
    apiClient,
    "GET",
    {
      path: (deliveryNoteId) => `/rubber-lining/portal/delivery-notes/${deliveryNoteId}/items`,
    },
  );

  acceptDeliveryNoteExtract = createEndpoint<[id: number], { deliveryNoteIds: number[] }>(
    apiClient,
    "PUT",
    {
      path: (id) => `/rubber-lining/portal/delivery-notes/${id}/accept-extract`,
    },
  );

  async deliveryNotePageUrl(
    id: number,
    pageNumber: number,
  ): Promise<{ url: string; totalPages: number }> {
    return this.request<{ url: string; totalPages: number }>(
      `/rubber-lining/portal/delivery-notes/${id}/page/${pageNumber}`,
    );
  }

  replaceDeliveryNoteDocument = createEndpoint<[id: number, file: File], RubberDeliveryNoteDto>(
    apiClient,
    "PUT",
    {
      path: (id) => `/rubber-lining/portal/delivery-notes/${id}/document`,
      formData: (_id, file) => {
        const fd = new FormData();
        fd.append("file", file);
        return fd;
      },
    },
  );

  async analyzeCustomerDeliveryNotes(files: File[]): Promise<AnalyzeCustomerDnsResult> {
    return this.requestWithFiles("/rubber-lining/portal/customer-delivery-notes/analyze", files);
  }

  createCustomerDnsFromAnalysis = createEndpoint<
    [files: File[], analysis: AnalyzeCustomerDnsResult, overrides: CustomerDnOverride[]],
    { deliveryNoteIds: number[] }
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/customer-delivery-notes/create-from-analysis",
    formData: (files, analysis, overrides) => {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      fd.append("analysis", JSON.stringify(analysis));
      fd.append("overrides", JSON.stringify(overrides));
      return fd;
    },
  });

  async rollStock(filters?: {
    status?: RollStockStatus;
    compoundCodingId?: number;
    customerId?: number;
  }): Promise<RubberRollStockDto[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.compoundCodingId) params.set("compoundCodingId", String(filters.compoundCodingId));
    if (filters?.customerId) params.set("customerId", String(filters.customerId));
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/rubber-lining/portal/roll-stock${query}`);
  }

  rollStockById = createEndpoint<[id: number], RubberRollStockDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/roll-stock/${id}`,
  });

  rollTraceability = createEndpoint<[id: number], RollTraceabilityDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/roll-stock/${id}/traceability`,
  });

  reserveRoll = createEndpoint<[id: number, customerId: number], RubberRollStockDto>(
    apiClient,
    "PUT",
    {
      path: (id, _customerId) => `/rubber-lining/portal/roll-stock/${id}/reserve`,
      body: (_id, customerId) => ({ customerId }),
    },
  );

  unreserveRoll = createEndpoint<[id: number], RubberRollStockDto>(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/roll-stock/${id}/unreserve`,
  });

  sellRoll = createEndpoint<
    [id: number, data: { customerId: number; poNumber?: string; auCocId?: number }],
    RubberRollStockDto
  >(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/roll-stock/${id}/sell`,
    body: (_id, data) => data,
  });

  scrapRoll = createEndpoint<[id: number, reason?: string], RubberRollStockDto>(apiClient, "PUT", {
    path: (id, _reason) => `/rubber-lining/portal/roll-stock/${id}/scrap`,
    body: (_id, reason) => ({ reason }),
  });

  createOpeningStock = createEndpoint<[data: CreateOpeningStockDto], RubberRollStockDto>(
    apiClient,
    "POST",
    {
      path: "/rubber-lining/portal/roll-stock/opening-stock",
      body: (data) => data,
    },
  );

  importOpeningStock = createEndpoint<
    [rows: ImportOpeningStockRowDto[]],
    ImportOpeningStockResultDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/roll-stock/import-opening",
    body: (rows) => ({ rows }),
  });

  rollRejectionsBySupplierCoc = createEndpoint<[supplierCocId: number], RollRejectionDto[]>(
    apiClient,
    "GET",
    {
      path: (supplierCocId) =>
        `/rubber-lining/portal/supplier-cocs/${supplierCocId}/roll-rejections`,
    },
  );

  allRollRejections = createEndpoint<[statusFilter?: RollRejectionStatus], RollRejectionDto[]>(
    apiClient,
    "GET",
    {
      path: "/rubber-lining/portal/roll-rejections",
      query: (statusFilter) => ({ status: statusFilter }),
    },
  );

  createRollRejection = createEndpoint<
    [
      data: {
        originalSupplierCocId: number;
        rollNumber: string;
        rejectionReason: string;
        rejectedBy: string;
        notes?: string | null;
      },
    ],
    RollRejectionDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/roll-rejections",
    body: (data) => data,
  });

  async uploadRollRejectionReturnDocument(
    rejectionId: number,
    file: File,
  ): Promise<RollRejectionDto> {
    return this.requestWithFiles<RollRejectionDto>(
      `/rubber-lining/portal/roll-rejections/${rejectionId}/return-document`,
      [file],
      undefined,
      "file",
    );
  }

  linkReplacementCoc = createEndpoint<
    [rejectionId: number, data: { replacementCocId: number; replacementRollNumber?: string }],
    RollRejectionDto
  >(apiClient, "PUT", {
    path: (rejectionId) => `/rubber-lining/portal/roll-rejections/${rejectionId}/link-replacement`,
    body: (_rejectionId, data) => data,
  });

  closeRollRejection = createEndpoint<[rejectionId: number], RollRejectionDto>(apiClient, "PUT", {
    path: (rejectionId) => `/rubber-lining/portal/roll-rejections/${rejectionId}/close`,
  });

  rollRejectionReturnDocumentUrl = createEndpoint<[rejectionId: number], { url: string | null }>(
    apiClient,
    "GET",
    {
      path: (rejectionId) =>
        `/rubber-lining/portal/roll-rejections/${rejectionId}/return-document-url`,
    },
  );

  async auCocs(filters?: { status?: AuCocStatus; customerId?: number }): Promise<RubberAuCocDto[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.customerId) params.set("customerId", String(filters.customerId));
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/rubber-lining/portal/au-cocs${query}`);
  }

  auCocById = createEndpoint<[id: number], RubberAuCocDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/au-cocs/${id}`,
  });

  createAuCoc = createEndpoint<
    [
      data: {
        customerCompanyId: number;
        rollIds: number[];
        poNumber?: string;
        deliveryNoteRef?: string;
      },
    ],
    RubberAuCocDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/au-cocs",
    body: (data) => data,
  });

  generateAuCocPdf = createEndpoint<[id: number], RubberAuCocDto>(apiClient, "POST", {
    path: (id) => `/rubber-lining/portal/au-cocs/${id}/generate-pdf`,
  });

  sendAuCoc = createEndpoint<
    [id: number, email: string, options?: { cc?: string; bcc?: string }],
    RubberAuCocDto
  >(apiClient, "POST", {
    path: (id, _email, _options) => `/rubber-lining/portal/au-cocs/${id}/send`,
    body: (_id, email, options) => ({ email, cc: options?.cc, bcc: options?.bcc }),
  });

  bulkSendAuCocs = createEndpoint<
    [email: string, options?: { cc?: string; bcc?: string }],
    { sent: number; total: number; cocNumbers: string[] }
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/au-cocs/bulk-send",
    body: (email, options) => ({ email, cc: options?.cc, bcc: options?.bcc }),
  });

  async createAuCocFromDeliveryNote(deliveryNoteId: number): Promise<RubberAuCocDto> {
    return this.request(
      `/rubber-lining/portal/au-cocs/create-from-delivery-note/${deliveryNoteId}`,
      {
        method: "POST",
      },
    );
  }

  auCocPdfUrl(id: number): string {
    return `${this.baseURL}/rubber-lining/portal/au-cocs/${id}/pdf`;
  }

  auCocPdfBlob = createEndpoint<[id: number], Blob>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/au-cocs/${id}/pdf`,
    responseType: "blob",
  });

  downloadAuCocPdf = createEndpoint<[id: number], Blob>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/au-cocs/${id}/pdf`,
    responseType: "blob",
  });

  deleteAuCoc = createEndpoint<[id: number], void>(apiClient, "DELETE", {
    path: (id) => `/rubber-lining/portal/au-cocs/${id}`,
  });

  autoCreateAuCocFromDeliveryNote = createEndpoint<
    [deliveryNoteId: number, customerCompanyId: number],
    {
      auCoc: RubberAuCocDto | null;
      matchedSupplierCocs: { id: number; cocNumber: string | null; orderNumber: string | null }[];
      message: string;
    }
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/au-cocs/auto-create-from-dn",
    body: (deliveryNoteId, customerCompanyId) => ({ deliveryNoteId, customerCompanyId }),
  });

  auCocPdfWithGraphUrl(id: number, supplierCocId: number): string {
    return `${this.baseURL}/rubber-lining/portal/au-cocs/${id}/pdf-with-graph/${supplierCocId}`;
  }

  async documentUrl(documentPath: string): Promise<string> {
    const response = await this.request<{ url: string }>(
      `/rubber-lining/portal/documents/url?path=${encodeURIComponent(documentPath)}`,
    );
    return response.url;
  }

  cocProcessingStatuses(): Promise<{ value: string; label: string }[]> {
    return this.request("/rubber-lining/portal/coc-processing-statuses");
  }

  deliveryNoteStatuses(): Promise<{ value: string; label: string }[]> {
    return this.request("/rubber-lining/portal/delivery-note-statuses");
  }

  rollStockStatuses(): Promise<{ value: string; label: string }[]> {
    return this.request("/rubber-lining/portal/roll-stock-statuses");
  }

  auCocStatuses(): Promise<{ value: string; label: string }[]> {
    return this.request("/rubber-lining/portal/au-coc-statuses");
  }

  pendingAuCocs(): Promise<RubberAuCocDto[]> {
    return this.request("/rubber-lining/portal/au-cocs/pending");
  }

  auCocReadiness(id: number): Promise<{
    ready: boolean;
    readinessStatus: string;
    calendererCocId: number | null;
    compounderCocId: number | null;
    graphPdfPath: string | null;
    missingDocuments: string[];
  }> {
    return this.request(`/rubber-lining/portal/au-cocs/${id}/readiness`);
  }

  autoGenerateAuCoc(id: number): Promise<{ generated: boolean; auCocId: number; reason: string }> {
    return this.request(`/rubber-lining/portal/au-cocs/${id}/auto-generate`, {
      method: "POST",
    });
  }

  async stockLocations(includeInactive = false): Promise<StockLocationDto[]> {
    const query = includeInactive ? "?includeInactive=true" : "";
    return this.request(`/rubber-lining/portal/stock-locations${query}`);
  }

  stockLocationById = createEndpoint<[id: number], StockLocationDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/stock-locations/${id}`,
  });

  createStockLocation = createEndpoint<
    [
      data: {
        name: string;
        description?: string;
        displayOrder?: number;
      },
    ],
    StockLocationDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/stock-locations",
    body: (data) => data,
  });

  updateStockLocation = createEndpoint<
    [
      id: number,
      data: { name?: string; description?: string; displayOrder?: number; active?: boolean },
    ],
    StockLocationDto
  >(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/stock-locations/${id}`,
    body: (_id, data) => data,
  });

  deleteStockLocation = createEndpoint<[id: number], void>(apiClient, "DELETE", {
    path: (id) => `/rubber-lining/portal/stock-locations/${id}`,
  });

  async purchaseRequisitions(filters?: {
    status?: RequisitionStatus;
    sourceType?: RequisitionSourceType;
  }): Promise<RequisitionDto[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.sourceType) params.set("sourceType", filters.sourceType);
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/rubber-lining/portal/purchase-requisitions${query}`);
  }

  purchaseRequisitionById = createEndpoint<[id: number], RequisitionDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/purchase-requisitions/${id}`,
  });

  pendingRequisitions = createEndpoint<[], RequisitionDto[]>(apiClient, "GET", {
    path: "/rubber-lining/portal/purchase-requisitions/pending",
  });

  createManualRequisition = createEndpoint<
    [
      data: {
        supplierCompanyId?: number;
        externalPoNumber?: string;
        expectedDeliveryDate?: string;
        notes?: string;
        createdBy?: string;
        items: {
          itemType: RequisitionItemType;
          compoundStockId?: number;
          compoundCodingId?: number;
          compoundName?: string;
          quantityKg: number;
          unitPrice?: number;
          notes?: string;
        }[];
      },
    ],
    RequisitionDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/purchase-requisitions",
    body: (data) => data,
  });

  createExternalPoRequisition = createEndpoint<
    [
      data: {
        supplierCompanyId?: number;
        externalPoNumber: string;
        externalPoDocumentPath?: string;
        expectedDeliveryDate?: string;
        notes?: string;
        createdBy?: string;
        items: {
          itemType: RequisitionItemType;
          compoundStockId?: number;
          compoundCodingId?: number;
          compoundName?: string;
          quantityKg: number;
          unitPrice?: number;
          notes?: string;
        }[];
      },
    ],
    RequisitionDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/purchase-requisitions/external-po",
    body: (data) => data,
  });

  async checkLowStockRequisitions(): Promise<RequisitionDto[]> {
    return this.request("/rubber-lining/portal/purchase-requisitions/check-low-stock", {
      method: "POST",
    });
  }

  approveRequisition = createEndpoint<[id: number, approvedBy: string], RequisitionDto>(
    apiClient,
    "PUT",
    {
      path: (id, _approvedBy) => `/rubber-lining/portal/purchase-requisitions/${id}/approve`,
      body: (_id, approvedBy) => ({ approvedBy }),
    },
  );

  rejectRequisition = createEndpoint<
    [id: number, rejectedBy: string, reason: string],
    RequisitionDto
  >(apiClient, "PUT", {
    path: (id, _rejectedBy, _reason) => `/rubber-lining/portal/purchase-requisitions/${id}/reject`,
    body: (_id, rejectedBy, reason) => ({ rejectedBy, reason }),
  });

  async markRequisitionOrdered(
    id: number,
    data?: { externalPoNumber?: string; expectedDeliveryDate?: string },
  ): Promise<RequisitionDto> {
    return this.request(`/rubber-lining/portal/purchase-requisitions/${id}/mark-ordered`, {
      method: "PUT",
      body: JSON.stringify(data || {}),
    });
  }

  receiveRequisitionItems = createEndpoint<
    [id: number, itemReceipts: { itemId: number; quantityReceivedKg: number }[]],
    RequisitionDto
  >(apiClient, "PUT", {
    path: (id, _itemReceipts) => `/rubber-lining/portal/purchase-requisitions/${id}/receive`,
    body: (_id, itemReceipts) => ({ itemReceipts }),
  });

  cancelRequisition = createEndpoint<[id: number], RequisitionDto>(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/purchase-requisitions/${id}/cancel`,
  });

  requisitionStatuses(): Promise<{ value: string; label: string }[]> {
    return this.request("/rubber-lining/portal/requisition-statuses");
  }

  requisitionSourceTypes(): Promise<{ value: string; label: string }[]> {
    return this.request("/rubber-lining/portal/requisition-source-types");
  }

  qualityTrackingSummary = createEndpoint<[], CompoundQualitySummaryDto[]>(apiClient, "GET", {
    path: "/rubber-lining/portal/quality-tracking",
  });

  async qualityTrackingDetail(compoundCode: string): Promise<CompoundQualityDetailDto> {
    return this.request(
      `/rubber-lining/portal/quality-tracking/${encodeURIComponent(compoundCode)}`,
    );
  }

  qualityAlerts = createEndpoint<[], QualityAlertDto[]>(apiClient, "GET", {
    path: "/rubber-lining/portal/quality-alerts",
  });

  acknowledgeQualityAlert = createEndpoint<[id: number, acknowledgedBy: string], QualityAlertDto>(
    apiClient,
    "PUT",
    {
      path: (id, _acknowledgedBy) => `/rubber-lining/portal/quality-alerts/${id}/acknowledge`,
      body: (_id, acknowledgedBy) => ({ acknowledgedBy }),
    },
  );

  qualityConfigs = createEndpoint<[], QualityConfigDto[]>(apiClient, "GET", {
    path: "/rubber-lining/portal/quality-configs",
  });

  async updateQualityConfig(
    compoundCode: string,
    data: Partial<QualityConfigDto>,
  ): Promise<QualityConfigDto> {
    return this.request(
      `/rubber-lining/portal/quality-configs/${encodeURIComponent(compoundCode)}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    );
  }

  async analyzeOrderFiles(files: File[]): Promise<AnalyzeOrderFilesResult> {
    return this.requestWithFiles("/rubber-lining/portal/orders/analyze", files);
  }

  createOrderFromAnalysis = createEndpoint<
    [data: CreateOrderFromAnalysisDto],
    { orderId: number; orderNumber: string }
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/orders/from-analysis",
    body: (data) => data,
  });

  async orderDocumentPages(file: File): Promise<{ pages: PdfPageImage[] }> {
    return this.requestWithFiles("/rubber-lining/portal/orders/document-pages", [file], {}, "file");
  }

  extractOrderRegion = createEndpoint<
    [file: File, coordinates: RegionCoordinates, fieldName: string],
    { text: string; confidence: number }
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/orders/extract-region",
    formData: (file, coordinates, fieldName) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("coordinates", JSON.stringify(coordinates));
      fd.append("fieldName", fieldName);
      return fd;
    },
  });

  savePoTemplate = createEndpoint<[dto: CreateTemplateDto], { templateId: number }>(
    apiClient,
    "POST",
    {
      path: "/rubber-lining/portal/orders/templates",
      body: (dto) => dto,
    },
  );

  companyPoTemplates = createEndpoint<[companyId: number], { templates: PoTemplateDto[] }>(
    apiClient,
    "GET",
    {
      path: (companyId) => `/rubber-lining/portal/orders/templates/${companyId}`,
    },
  );

  deletePoTemplate = createEndpoint<[templateId: number], { success: boolean }>(
    apiClient,
    "DELETE",
    {
      path: (templateId) => `/rubber-lining/portal/orders/templates/${templateId}`,
    },
  );

  async computeOrderFormatHash(file: File): Promise<{ formatHash: string }> {
    return this.requestWithFiles(
      "/rubber-lining/portal/orders/compute-format-hash",
      [file],
      {},
      "file",
    );
  }

  async otherStocks(includeInactive = false): Promise<RubberOtherStockDto[]> {
    const params = includeInactive ? "?includeInactive=true" : "";
    return this.request(`/rubber-lining/portal/other-stocks${params}`);
  }

  lowStockItems = createEndpoint<[], RubberOtherStockDto[]>(apiClient, "GET", {
    path: "/rubber-lining/portal/other-stocks/low",
  });

  otherStockById = createEndpoint<[id: number], RubberOtherStockDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/other-stocks/${id}`,
  });

  createOtherStock = createEndpoint<[data: CreateOtherStockDto], RubberOtherStockDto>(
    apiClient,
    "POST",
    {
      path: "/rubber-lining/portal/other-stocks",
      body: (data) => data,
    },
  );

  updateOtherStock = createEndpoint<[id: number, data: UpdateOtherStockDto], RubberOtherStockDto>(
    apiClient,
    "PUT",
    {
      path: (id) => `/rubber-lining/portal/other-stocks/${id}`,
      body: (_id, data) => data,
    },
  );

  deleteOtherStock = createEndpoint<[id: number], void>(apiClient, "DELETE", {
    path: (id) => `/rubber-lining/portal/other-stocks/${id}`,
  });

  receiveOtherStock = createEndpoint<[data: ReceiveOtherStockDto], RubberOtherStockDto>(
    apiClient,
    "POST",
    {
      path: "/rubber-lining/portal/other-stocks/receive",
      body: (data) => data,
    },
  );

  adjustOtherStock = createEndpoint<[data: AdjustOtherStockDto], RubberOtherStockDto>(
    apiClient,
    "POST",
    {
      path: "/rubber-lining/portal/other-stocks/adjust",
      body: (data) => data,
    },
  );

  importOtherStock = createEndpoint<[rows: ImportOtherStockRowDto[]], ImportOtherStockResultDto>(
    apiClient,
    "POST",
    {
      path: "/rubber-lining/portal/other-stocks/import",
      body: (rows) => rows,
    },
  );

  rubberSpecifications = createEndpoint<[], RubberSpecificationDto[]>(apiClient, "GET", {
    path: "/rubber-lining/specifications",
  });

  async taxInvoices(filters?: {
    invoiceType?: TaxInvoiceType;
    status?: TaxInvoiceStatus;
    companyId?: number;
    includeAllVersions?: boolean;
    isCreditNote?: boolean;
    search?: string;
    sortColumn?: string;
    sortDirection?: "asc" | "desc";
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResult<RubberTaxInvoiceDto>> {
    const params = new URLSearchParams();
    if (filters?.invoiceType) params.set("invoiceType", filters.invoiceType);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.companyId) params.set("companyId", String(filters.companyId));
    if (filters?.includeAllVersions) params.set("includeAllVersions", "true");
    if (filters?.isCreditNote !== undefined)
      params.set("isCreditNote", String(filters.isCreditNote));
    if (filters?.search) params.set("search", filters.search);
    if (filters?.sortColumn) params.set("sortColumn", filters.sortColumn);
    if (filters?.sortDirection) params.set("sortDirection", filters.sortDirection);
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.pageSize) params.set("pageSize", String(filters.pageSize));
    const qs = params.toString();
    return this.request(`/rubber-lining/portal/tax-invoices${qs ? `?${qs}` : ""}`);
  }

  taxInvoiceById = createEndpoint<[id: number], RubberTaxInvoiceDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/tax-invoices/${id}`,
  });

  async taxInvoiceStatements(filters: {
    invoiceType: TaxInvoiceType;
  }): Promise<RubberTaxInvoiceStatementDto[]> {
    const params = new URLSearchParams();
    params.set("invoiceType", filters.invoiceType);
    return this.request(`/rubber-lining/portal/tax-invoices/statements?${params.toString()}`);
  }

  extractTaxInvoice = createEndpoint<[id: number], RubberTaxInvoiceDto>(apiClient, "POST", {
    path: (id) => `/rubber-lining/portal/tax-invoices/${id}/extract`,
  });

  createTaxInvoice = createEndpoint<
    [
      data: {
        invoiceNumber: string;
        invoiceDate?: string;
        invoiceType: TaxInvoiceType;
        companyId: number;
        totalAmount?: number;
        vatAmount?: number;
        isCreditNote?: boolean;
      },
    ],
    RubberTaxInvoiceDto
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/tax-invoices",
    body: (data) => data,
  });

  updateTaxInvoice = createEndpoint<
    [
      id: number,
      data: {
        invoiceNumber?: string;
        invoiceDate?: string;
        status?: TaxInvoiceStatus;
        totalAmount?: number;
        vatAmount?: number;
        productDescription?: string;
        orderNumber?: string;
        deliveryNoteRef?: string;
        quantity?: number;
        unit?: string;
        costPerUnit?: number;
        subtotal?: number;
      },
    ],
    RubberTaxInvoiceDto
  >(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/tax-invoices/${id}`,
    body: (_id, data) => data,
  });

  approveTaxInvoice = createEndpoint<[id: number], RubberTaxInvoiceDto>(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/tax-invoices/${id}/approve`,
  });

  refileTaxInvoiceStock = createEndpoint<[id: number], RubberTaxInvoiceDto>(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/tax-invoices/${id}/refile-stock`,
  });

  updateTaxInvoiceLineItemRolls = createEndpoint<
    [id: number, lineIdx: number, rolls: Array<{ rollNumber: string; weightKg: number | null }>],
    RubberTaxInvoiceDto
  >(apiClient, "PUT", {
    path: (id, lineIdx, _rolls) =>
      `/rubber-lining/portal/tax-invoices/${id}/line-items/${lineIdx}/rolls`,
    body: (_id, _lineIdx, rolls) => ({ rolls }),
  });

  async availableRollsForProductCode(productCode: string): Promise<
    Array<{
      id: number;
      rollNumber: string;
      weightKg: number;
      compoundCode: string | null;
      thicknessMm: number | null;
      widthMm: number | null;
      lengthM: number | null;
    }>
  > {
    const params = new URLSearchParams({ productCode });
    return this.request(`/rubber-lining/portal/roll-stock/available?${params.toString()}`);
  }

  async recomputeCompoundCosts(
    invoiceId: number,
  ): Promise<{ updated: number; unitPrice: number | null }> {
    return this.request(
      `/rubber-lining/portal/tax-invoices/${invoiceId}/recompute-compound-costs`,
      { method: "POST" },
    );
  }

  async rollsByNumbers(rollNumbers: string[]): Promise<
    Array<{
      id: number;
      rollNumber: string;
      weightKg: number;
      tollCostR: number | null;
      compoundCostR: number | null;
      totalCostR: number | null;
      status: string;
      statusLabel: string;
      soldToCompanyId: number | null;
      soldToCompanyName: string | null;
      customerTaxInvoiceId: number | null;
      supplierTaxInvoiceId: number | null;
    }>
  > {
    if (rollNumbers.length === 0) return [];
    const params = new URLSearchParams({ rollNumbers: rollNumbers.join(",") });
    return this.request(`/rubber-lining/portal/roll-stock/by-numbers?${params.toString()}`);
  }

  deleteTaxInvoice = createEndpoint<[id: number], void>(apiClient, "DELETE", {
    path: (id) => `/rubber-lining/portal/tax-invoices/${id}`,
  });

  async uploadTaxInvoiceDocument(id: number, file: File): Promise<RubberTaxInvoiceDto> {
    return this.requestWithFiles(
      `/rubber-lining/portal/tax-invoices/${id}/document`,
      [file],
      {},
      "file",
    );
  }

  async uploadTaxInvoiceWithFiles(
    files: File[],
    data: {
      invoiceType: TaxInvoiceType;
      companyId?: number;
      invoiceNumber?: string;
      invoiceDate?: string;
    },
  ): Promise<{ taxInvoiceIds: number[] }> {
    return this.requestWithFiles("/rubber-lining/portal/tax-invoices/upload", files, {
      invoiceType: data.invoiceType,
      companyId: data.companyId,
      invoiceNumber: data.invoiceNumber,
      invoiceDate: data.invoiceDate,
    });
  }

  cocSageExportPreview = createEndpoint<
    [params: SageExportFilter],
    { cocCount: number; batchCount: number; totalBatches: number }
  >(apiClient, "GET", {
    path: "/rubber-lining/portal/supplier-cocs/export/sage-preview",
    query: (params) => params as Record<string, QueryParamValue>,
  });

  cocSageExportCsv = createEndpoint<[params: SageExportFilter], Blob>(apiClient, "GET", {
    path: "/rubber-lining/portal/supplier-cocs/export/sage-csv",
    query: (params) => params as Record<string, QueryParamValue>,
    responseType: "blob",
  });

  sageExportPreview = createEndpoint<
    [params: SageExportFilter & { invoiceId?: number }],
    { invoiceCount: number; lineItemCount: number; totalAmount: number }
  >(apiClient, "GET", {
    path: "/rubber-lining/portal/tax-invoices/export/sage-preview",
    query: (params) => params as Record<string, QueryParamValue>,
  });

  sageExportCsv = createEndpoint<[params: SageExportFilter & { invoiceId?: number }], Blob>(
    apiClient,
    "GET",
    {
      path: "/rubber-lining/portal/tax-invoices/export/sage-csv",
      query: (params) => params as Record<string, QueryParamValue>,
      responseType: "blob",
    },
  );

  async reExtractAllTaxInvoices(
    invoiceType?: TaxInvoiceType,
  ): Promise<{ triggered: number; invoiceIds: number[]; startedAt: string }> {
    const query = invoiceType ? `?invoiceType=${invoiceType}` : "";
    return this.request(`/rubber-lining/portal/tax-invoices/re-extract-all${query}`, {
      method: "POST",
    });
  }

  async reExtractAllDeliveryNotes(
    partyType: "SUPPLIER" | "CUSTOMER",
  ): Promise<{ triggered: number; deliveryNoteIds: number[]; startedAt: string }> {
    return this.request(
      `/rubber-lining/portal/delivery-notes/re-extract-all?partyType=${partyType}`,
      {
        method: "POST",
      },
    );
  }

  async dedupeDeliveryNotes(): Promise<{ deleted: number; kept: number; groups: number }> {
    return this.request("/rubber-lining/portal/delivery-notes/dedupe", {
      method: "POST",
    });
  }

  async dedupeTaxInvoices(): Promise<{ deleted: number; kept: number; groups: number }> {
    return this.request("/rubber-lining/portal/tax-invoices/dedupe", {
      method: "POST",
    });
  }

  async rematchAllRolls(): Promise<{
    customerInvoicesDispatched: number;
    customerDeliveryNotesDispatched: number;
    orphansDeleted: number;
    orphansMerged: number;
  }> {
    return this.request("/rubber-lining/portal/admin/rematch-rolls", {
      method: "POST",
    });
  }

  async reExtractCtisMissingRolls(): Promise<{
    triggered: number;
    invoiceIds: number[];
  }> {
    return this.request("/rubber-lining/portal/admin/re-extract-ctis-missing-rolls", {
      method: "POST",
    });
  }

  customerSageExportPreview = createEndpoint<
    [params: SageExportFilter],
    { invoiceCount: number; lineItemCount: number; totalAmount: number }
  >(apiClient, "GET", {
    path: "/rubber-lining/portal/tax-invoices/export/customer-sage-preview",
    query: (params) => params as Record<string, QueryParamValue>,
  });

  customerSageExportCsv = createEndpoint<[params: SageExportFilter], Blob>(apiClient, "GET", {
    path: "/rubber-lining/portal/tax-invoices/export/customer-sage-csv",
    query: (params) => params as Record<string, QueryParamValue>,
    responseType: "blob",
  });

  sageConnectionStatus = createEndpoint<
    [],
    {
      connected: boolean;
      enabled: boolean;
      sageUsername: string | null;
      sagePasswordSet: boolean;
      sageCompanyId: number | null;
      sageCompanyName: string | null;
      connectedAt: string | null;
    }
  >(apiClient, "GET", {
    path: "/rubber-lining/portal/sage/status",
  });

  updateSageConfig = createEndpoint<
    [
      dto: {
        sageUsername: string | null;
        sagePassword: string | null;
        sageCompanyId: number | null;
        sageCompanyName: string | null;
      },
    ],
    { message: string }
  >(apiClient, "PATCH", {
    path: "/rubber-lining/portal/sage/config",
    body: (dto) => dto,
  });

  async disconnectSage(): Promise<{ message: string }> {
    return this.request("/rubber-lining/portal/sage/config", {
      method: "DELETE",
    });
  }

  testSageConnection = createEndpoint<
    [username?: string, password?: string],
    {
      success: boolean;
      companies: Array<{ ID: number; Name: string; TaxNumber: string }>;
    }
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/sage/test",
    body: (username, password) => ({ username, password }),
  });

  async sageContactSync(): Promise<SageContactSyncResult> {
    return this.request("/rubber-lining/portal/sage/contact-sync", {
      method: "POST",
    });
  }

  sageContactMappings = createEndpoint<[], SageContactMappingStatus>(apiClient, "GET", {
    path: "/rubber-lining/portal/sage/contact-mappings",
  });

  mapSageContact = createEndpoint<
    [companyId: number, sageContactId: number, sageContactType: string],
    unknown
  >(apiClient, "PATCH", {
    path: (companyId, _sageContactId, _sageContactType) =>
      `/rubber-lining/portal/sage/contact-mappings/${companyId}`,
    body: (_companyId, sageContactId, sageContactType) => ({ sageContactId, sageContactType }),
  });

  unmapSageContact = createEndpoint<[companyId: number], unknown>(apiClient, "DELETE", {
    path: (companyId) => `/rubber-lining/portal/sage/contact-mappings/${companyId}`,
  });

  async postInvoiceToSage(
    invoiceId: number,
  ): Promise<{ sageInvoiceId: number; invoiceId: number; invoiceNumber: string }> {
    return this.request(`/rubber-lining/portal/tax-invoices/${invoiceId}/post-to-sage`, {
      method: "POST",
    });
  }

  postInvoicesToSageBulk = createEndpoint<
    [invoiceIds: number[]],
    {
      successful: Array<{ sageInvoiceId: number; invoiceId: number; invoiceNumber: string }>;
      failed: Array<{ invoiceId: number; invoiceNumber: string; error: string }>;
    }
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/tax-invoices/post-to-sage/bulk",
    body: (invoiceIds) => ({ invoiceIds }),
  });

  postInvoicesToSageBulkByFilter = createEndpoint<
    [
      filter: {
        invoiceType: TaxInvoiceType;
        search?: string;
        includeAllVersions?: boolean;
      },
    ],
    {
      successful: Array<{ sageInvoiceId: number; invoiceId: number; invoiceNumber: string }>;
      failed: Array<{ invoiceId: number; invoiceNumber: string; error: string }>;
    }
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/tax-invoices/post-to-sage/bulk-by-filter",
    body: (filter) => filter,
  });

  async authorizeVersion(
    entityType: "tax-invoices" | "delivery-notes" | "supplier-cocs",
    id: number,
  ): Promise<{ authorizedId: number; supersededId: number | null }> {
    return this.request(`/rubber-lining/portal/${entityType}/${id}/authorize-version`, {
      method: "PUT",
    });
  }

  async rejectVersion(
    entityType: "tax-invoices" | "delivery-notes" | "supplier-cocs",
    id: number,
  ): Promise<void> {
    return this.request(`/rubber-lining/portal/${entityType}/${id}/reject-version`, {
      method: "PUT",
    });
  }

  async versionHistory(
    entityType: "tax-invoices" | "delivery-notes" | "supplier-cocs",
    id: number,
  ): Promise<
    Array<{
      id: number;
      version: number;
      versionStatus: string;
      versionStatusLabel: string;
      createdAt: string;
      updatedAt: string;
    }>
  > {
    return this.request(`/rubber-lining/portal/${entityType}/${id}/version-history`);
  }

  accountingDirectors = createEndpoint<
    [],
    Array<{
      id: number;
      name: string;
      title: string;
      email: string;
      isActive: boolean;
      createdAt: string;
    }>
  >(apiClient, "GET", {
    path: "/rubber-lining/portal/accounting/directors",
  });

  createAccountingDirector = createEndpoint<
    [
      data: {
        name: string;
        title: string;
        email: string;
      },
    ],
    { id: number; name: string; title: string; email: string }
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/accounting/directors",
    body: (data) => data,
  });

  updateAccountingDirector = createEndpoint<
    [id: number, data: { name?: string; title?: string; email?: string; isActive?: boolean }],
    { id: number; name: string; title: string; email: string }
  >(apiClient, "PUT", {
    path: (id) => `/rubber-lining/portal/accounting/directors/${id}`,
    body: (_id, data) => data,
  });

  deleteAccountingDirector = createEndpoint<[id: number], void>(apiClient, "DELETE", {
    path: (id) => `/rubber-lining/portal/accounting/directors/${id}`,
  });

  async accountingPayable(
    year: number,
    month: number,
    companyId?: number,
  ): Promise<{
    year: number;
    month: number;
    accountType: string;
    companies: Array<unknown>;
    grandTotal: number;
    grandVat: number;
    grandPayable: number;
  }> {
    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
    });
    if (companyId) params.set("companyId", String(companyId));
    return this.request(`/rubber-lining/portal/accounting/payable?${params.toString()}`);
  }

  async accountingReceivable(
    year: number,
    month: number,
    companyId?: number,
  ): Promise<{
    year: number;
    month: number;
    accountType: string;
    companies: Array<unknown>;
    grandTotal: number;
    grandVat: number;
    grandPayable: number;
  }> {
    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
    });
    if (companyId) params.set("companyId", String(companyId));
    return this.request(`/rubber-lining/portal/accounting/receivable?${params.toString()}`);
  }

  async accountingMonthlyAccounts(filters?: {
    accountType?: string;
    status?: string;
    year?: number;
  }): Promise<Array<unknown>> {
    const params = new URLSearchParams();
    if (filters?.accountType) params.set("accountType", filters.accountType);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.year) params.set("year", String(filters.year));
    const qs = params.toString();
    return this.request(`/rubber-lining/portal/accounting${qs ? `?${qs}` : ""}`);
  }

  accountingGenerate = createEndpoint<
    [year: number, month: number, accountType: string],
    Record<string, unknown>
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/accounting/generate",
    body: (year, month, accountType) => ({ year, month, accountType }),
  });

  accountingDownloadPdf(id: number): Promise<void> {
    return apiClient.downloadBlob(
      `/rubber-lining/portal/accounting/${id}/pdf`,
      `account-${id}.pdf`,
    );
  }

  accountingRequestSignOff = createEndpoint<[id: number], Record<string, unknown>>(
    apiClient,
    "POST",
    {
      path: (id) => `/rubber-lining/portal/accounting/${id}/request-signoff`,
    },
  );

  async accountingReconciliations(filters?: {
    companyId?: number;
    status?: string;
    year?: number;
    month?: number;
  }): Promise<Array<unknown>> {
    const params = new URLSearchParams();
    if (filters?.companyId) params.set("companyId", String(filters.companyId));
    if (filters?.status) params.set("status", filters.status);
    if (filters?.year) params.set("year", String(filters.year));
    if (filters?.month) params.set("month", String(filters.month));
    const qs = params.toString();
    return this.request(`/rubber-lining/portal/accounting/reconciliation${qs ? `?${qs}` : ""}`);
  }

  accountingReconciliationById = createEndpoint<[id: number], unknown>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/accounting/reconciliation/${id}`,
  });

  async accountingUploadStatement(
    companyId: number,
    file: File,
    year: number,
    month: number,
  ): Promise<Record<string, unknown>> {
    return this.requestWithFiles(
      "/rubber-lining/portal/accounting/reconciliation/upload",
      [file],
      {
        companyId,
        year,
        month,
      },
      "file",
    );
  }

  accountingExtractStatement = createEndpoint<[id: number], unknown>(apiClient, "POST", {
    path: (id) => `/rubber-lining/portal/accounting/reconciliation/${id}/extract`,
  });

  accountingReconcileStatement = createEndpoint<[id: number], unknown>(apiClient, "POST", {
    path: (id) => `/rubber-lining/portal/accounting/reconciliation/${id}/reconcile`,
  });

  accountingResolveDiscrepancy = createEndpoint<
    [id: number, resolvedBy: string, notes: string],
    unknown
  >(apiClient, "PUT", {
    path: (id, _resolvedBy, _notes) =>
      `/rubber-lining/portal/accounting/reconciliation/${id}/resolve`,
    body: (_id, resolvedBy, notes) => ({ resolvedBy, notes }),
  });

  featureFlagsDetailed = createEndpoint<
    [],
    {
      flags: Array<{
        flagKey: string;
        enabled: boolean;
        description: string | null;
        category: string;
      }>;
    }
  >(apiClient, "GET", {
    path: "/rubber-lining/admin/feature-flags/detailed",
  });

  updateFeatureFlag = createEndpoint<
    [flagKey: string, enabled: boolean],
    { flagKey: string; enabled: boolean; description: string | null; category: string }
  >(apiClient, "PUT", {
    path: "/rubber-lining/admin/feature-flags",
    body: (flagKey, enabled) => ({ flagKey, enabled }),
  });

  identifyRollPhoto = createEndpoint<
    [imageBase64: string, mediaType: "image/jpeg" | "image/png" | "image/webp"],
    RollPhotoIdentifyResponse
  >(apiClient, "POST", {
    path: "/rubber-lining/portal/roll-issuances/identify-photo",
    body: (imageBase64, mediaType) => ({ imageBase64, mediaType }),
  });

  createRollFromPhoto = createEndpoint<[dto: CreateRollFromPhotoDto], RollIssuanceRollDto>(
    apiClient,
    "POST",
    {
      path: "/rubber-lining/portal/roll-issuances/create-from-photo",
      body: (dto) => dto,
    },
  );

  async searchJobCardsForIssuing(query: string): Promise<JcSearchResultDto[]> {
    return this.request(
      `/rubber-lining/portal/roll-issuances/jc-search?q=${encodeURIComponent(query)}`,
    );
  }

  jobCardLineItems = createEndpoint<[jobCardId: number], JcLineItemDto[]>(apiClient, "GET", {
    path: (jobCardId) => `/rubber-lining/portal/roll-issuances/jc/${jobCardId}/line-items`,
  });

  createRollIssuance = createEndpoint<[dto: CreateRollIssuanceDto], RollIssuanceDto>(
    apiClient,
    "POST",
    {
      path: "/rubber-lining/portal/roll-issuances",
      body: (dto) => dto,
    },
  );

  rollIssuances = createEndpoint<[], RollIssuanceDto[]>(apiClient, "GET", {
    path: "/rubber-lining/portal/roll-issuances",
  });

  rollIssuanceById = createEndpoint<[id: number], RollIssuanceDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/portal/roll-issuances/${id}`,
  });

  cancelRollIssuance = createEndpoint<[id: number], RollIssuanceDto>(apiClient, "POST", {
    path: (id) => `/rubber-lining/portal/roll-issuances/${id}/cancel`,
  });
  websitePages = createEndpoint<[], WebsitePageDto[]>(apiClient, "GET", {
    path: "/rubber-lining/website-pages",
  });

  websitePage = createEndpoint<[id: string], WebsitePageDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/website-pages/${id}`,
  });

  createWebsitePage = createEndpoint<[data: CreateWebsitePageDto], WebsitePageDto>(
    apiClient,
    "POST",
    {
      path: "/rubber-lining/website-pages",
      body: (data) => data,
    },
  );

  updateWebsitePage = createEndpoint<[id: string, data: UpdateWebsitePageDto], WebsitePageDto>(
    apiClient,
    "PATCH",
    {
      path: (id, _data) => `/rubber-lining/website-pages/${id}`,
      body: (_id, data) => data,
    },
  );

  async deleteWebsitePage(id: string): Promise<void> {
    return this.request(`/rubber-lining/website-pages/${id}`, {
      method: "DELETE",
    });
  }

  reorderWebsitePage = createEndpoint<[id: string, sortOrder: number], WebsitePageDto>(
    apiClient,
    "PATCH",
    {
      path: (id, _sortOrder) => `/rubber-lining/website-pages/${id}/reorder`,
      body: (_id, sortOrder) => ({ sortOrder }),
    },
  );

  async uploadWebsiteImage(file: File): Promise<{ url: string }> {
    return this.requestWithFiles("/rubber-lining/website-pages/upload-image", [file], {}, "file");
  }

  testimonials = createEndpoint<[], TestimonialDto[]>(apiClient, "GET", {
    path: "/rubber-lining/testimonials",
  });

  testimonial = createEndpoint<[id: string], TestimonialDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/testimonials/${id}`,
  });

  createTestimonial = createEndpoint<[data: CreateTestimonialDto], TestimonialDto>(
    apiClient,
    "POST",
    {
      path: "/rubber-lining/testimonials",
      body: (data) => data,
    },
  );

  updateTestimonial = createEndpoint<[id: string, data: UpdateTestimonialDto], TestimonialDto>(
    apiClient,
    "PATCH",
    {
      path: (id, _data) => `/rubber-lining/testimonials/${id}`,
      body: (_id, data) => data,
    },
  );

  async deleteTestimonial(id: string): Promise<void> {
    return this.request(`/rubber-lining/testimonials/${id}`, {
      method: "DELETE",
    });
  }

  blogPosts = createEndpoint<[], BlogPostDto[]>(apiClient, "GET", {
    path: "/rubber-lining/blog-posts",
  });

  blogPost = createEndpoint<[id: string], BlogPostDto>(apiClient, "GET", {
    path: (id) => `/rubber-lining/blog-posts/${id}`,
  });

  createBlogPost = createEndpoint<[data: CreateBlogPostDto], BlogPostDto>(apiClient, "POST", {
    path: "/rubber-lining/blog-posts",
    body: (data) => data,
  });

  updateBlogPost = createEndpoint<[id: string, data: UpdateBlogPostDto], BlogPostDto>(
    apiClient,
    "PATCH",
    {
      path: (id, _data) => `/rubber-lining/blog-posts/${id}`,
      body: (_id, data) => data,
    },
  );

  async deleteBlogPost(id: string): Promise<void> {
    return this.request(`/rubber-lining/blog-posts/${id}`, {
      method: "DELETE",
    });
  }
}

export interface WebsitePageDto {
  id: string;
  slug: string;
  title: string;
  metaTitle: string | null;
  metaDescription: string | null;
  content: string;
  heroImageUrl: string | null;
  sortOrder: number;
  isPublished: boolean;
  isHomePage: boolean;
  showInNav: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebsitePageDto {
  title: string;
  slug: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  content?: string;
  heroImageUrl?: string | null;
  sortOrder?: number;
  isPublished?: boolean;
  isHomePage?: boolean;
  showInNav?: boolean;
}

export interface UpdateWebsitePageDto {
  title?: string;
  slug?: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  content?: string;
  heroImageUrl?: string | null;
  sortOrder?: number;
  isPublished?: boolean;
  isHomePage?: boolean;
  showInNav?: boolean;
}

export type TestimonialSource = "google" | "manual" | "email" | "whatsapp";

export interface TestimonialDto {
  id: string;
  authorName: string;
  authorRole: string | null;
  authorCompany: string | null;
  rating: number;
  body: string;
  datePublished: string;
  source: TestimonialSource;
  highlight: boolean;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTestimonialDto {
  authorName: string;
  authorRole?: string | null;
  authorCompany?: string | null;
  rating: number;
  body: string;
  datePublished: string;
  source?: TestimonialSource;
  highlight?: boolean;
  isPublished?: boolean;
  sortOrder?: number;
}

export interface UpdateTestimonialDto {
  authorName?: string;
  authorRole?: string | null;
  authorCompany?: string | null;
  rating?: number;
  body?: string;
  datePublished?: string;
  source?: TestimonialSource;
  highlight?: boolean;
  isPublished?: boolean;
  sortOrder?: number;
}

export interface BlogPostDto {
  id: string;
  slug: string;
  title: string;
  metaTitle: string | null;
  metaDescription: string | null;
  excerpt: string;
  content: string;
  heroImageUrl: string | null;
  author: string;
  publishedAt: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBlogPostDto {
  slug: string;
  title: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  excerpt?: string;
  content?: string;
  heroImageUrl?: string | null;
  author?: string;
  publishedAt?: string | null;
  isPublished?: boolean;
}

export interface UpdateBlogPostDto {
  slug?: string;
  title?: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  excerpt?: string;
  content?: string;
  heroImageUrl?: string | null;
  author?: string;
  publishedAt?: string | null;
  isPublished?: boolean;
}

export const auRubberApiClient = new AuRubberApiClient();
