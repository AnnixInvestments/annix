import { API_BASE_URL } from "@/lib/api-config";
import type {
  CallOff,
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

export type CompoundMovementType = "IN" | "OUT" | "ADJUSTMENT";
export type CompoundMovementReferenceType =
  | "PURCHASE"
  | "PRODUCTION"
  | "MANUAL"
  | "STOCK_TAKE"
  | "COC_RECEIPT"
  | "CALENDARING";
export type RubberProductionStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type RubberCompoundOrderStatus =
  | "PENDING"
  | "APPROVED"
  | "ORDERED"
  | "RECEIVED"
  | "CANCELLED";
export type SupplierCocType = "COMPOUNDER" | "CALENDARER";
export type CocProcessingStatus = "PENDING" | "EXTRACTED" | "NEEDS_REVIEW" | "APPROVED";
export type DeliveryNoteType = "COMPOUND" | "ROLL";
export type DeliveryNoteStatus = "PENDING" | "LINKED" | "STOCK_CREATED";
export type RollStockStatus = "IN_STOCK" | "RESERVED" | "SOLD" | "SCRAPPED";
export type AuCocStatus = "DRAFT" | "GENERATED" | "SENT";
export type RequisitionStatus =
  | "PENDING"
  | "APPROVED"
  | "ORDERED"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";
export type RequisitionSourceType = "LOW_STOCK" | "MANUAL" | "EXTERNAL_PO";
export type RequisitionItemType = "COMPOUND" | "ROLL";
export type QualityAlertType = "DRIFT" | "DROP" | "CV_HIGH";
export type QualityAlertSeverity = "WARNING" | "CRITICAL";
export type TrendDirection = "up" | "down" | "stable";
export type QualityStatus = "normal" | "warning" | "critical";

export interface MetricStats {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  cv: number;
  trend: TrendDirection;
  latestValue: number;
  sampleCount: number;
}

export interface CompoundQualitySummaryDto {
  compoundCode: string;
  batchCount: number;
  lastBatchDate: string | null;
  shoreA: MetricStats | null;
  tc90: MetricStats | null;
  tensile: MetricStats | null;
  elongation: MetricStats | null;
  tearStrength: MetricStats | null;
  specificGravity: MetricStats | null;
  rebound: MetricStats | null;
  status: QualityStatus;
  activeAlertCount: number;
}

export interface BatchMetricData {
  batchId: number;
  batchNumber: string;
  createdAt: string;
  shoreA: number | null;
  specificGravity: number | null;
  rebound: number | null;
  tearStrength: number | null;
  tensile: number | null;
  elongation: number | null;
  sMin: number | null;
  sMax: number | null;
  ts2: number | null;
  tc90: number | null;
  passFailStatus: string | null;
}

export interface QualityConfigDto {
  id: number | null;
  compoundCode: string;
  compoundDescription: string | null;
  windowSize: number;
  shoreADriftThreshold: number;
  specificGravityDriftThreshold: number;
  reboundDriftThreshold: number;
  tearStrengthDropPercent: number;
  tensileStrengthDropPercent: number;
  elongationDropPercent: number;
  tc90CvThreshold: number;
  shoreANominal: number | null;
  shoreAMin: number | null;
  shoreAMax: number | null;
  densityNominal: number | null;
  densityMin: number | null;
  densityMax: number | null;
  reboundNominal: number | null;
  reboundMin: number | null;
  reboundMax: number | null;
  tearStrengthNominal: number | null;
  tearStrengthMin: number | null;
  tearStrengthMax: number | null;
  tensileNominal: number | null;
  tensileMin: number | null;
  tensileMax: number | null;
  elongationNominal: number | null;
  elongationMin: number | null;
  elongationMax: number | null;
}

export interface QualityAlertDto {
  id: number;
  compoundCode: string;
  alertType: QualityAlertType;
  alertTypeLabel: string;
  severity: QualityAlertSeverity;
  severityLabel: string;
  metricName: string;
  title: string;
  message: string;
  metricValue: number;
  thresholdValue: number;
  meanValue: number;
  batchNumber: string;
  batchId: number;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  createdAt: string;
}

export interface CompoundQualityDetailDto {
  compoundCode: string;
  batchCount: number;
  stats: {
    shoreA: MetricStats | null;
    specificGravity: MetricStats | null;
    rebound: MetricStats | null;
    tearStrength: MetricStats | null;
    tensile: MetricStats | null;
    elongation: MetricStats | null;
    tc90: MetricStats | null;
  };
  batches: BatchMetricData[];
  config: QualityConfigDto;
  alerts: QualityAlertDto[];
}

export interface AnalyzedOrderLine {
  lineNumber: number;
  productName: string | null;
  productId: number | null;
  thickness: number | null;
  width: number | null;
  length: number | null;
  quantity: number | null;
  confidence: number;
  rawText: string | null;
}

export type ExtractionMethod = "ai" | "template";

export interface AnalyzedOrderData {
  filename: string;
  fileType: "pdf" | "excel" | "email";
  companyName: string | null;
  companyId: number | null;
  poNumber: string | null;
  orderDate: string | null;
  deliveryDate: string | null;
  lines: AnalyzedOrderLine[];
  confidence: number;
  errors: string[];
  emailSubject?: string | null;
  emailFrom?: string | null;
  extractionMethod: ExtractionMethod;
  templateId: number | null;
  templateName: string | null;
  formatHash: string | null;
  isNewFormat: boolean;
  isNewCustomer: boolean;
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

export interface TemplateRegionDto {
  fieldName: string;
  regionCoordinates: RegionCoordinates;
  labelCoordinates?: RegionCoordinates | null;
  labelText?: string | null;
  sampleValue?: string | null;
  confidenceThreshold?: number;
}

export interface CreateTemplateDto {
  companyId: number;
  formatHash: string;
  templateName?: string;
  regions: TemplateRegionDto[];
}

export interface PoTemplateDto {
  id: number;
  formatHash: string;
  templateName: string | null;
  useCount: number;
  successCount: number;
  successRate: number;
  regionCount: number;
  createdAt: string;
}

export interface AnalyzeOrderFilesResult {
  files: AnalyzedOrderData[];
  totalLines: number;
}

export interface CreateOrderFromAnalysisDto {
  analysis: AnalyzedOrderData;
  overrides?: {
    companyId?: number;
    poNumber?: string;
    lines?: {
      productId?: number;
      thickness?: number;
      width?: number;
      length?: number;
      quantity?: number;
    }[];
  };
}

export interface RubberSupplierCocDto {
  id: number;
  firebaseUid: string;
  cocType: SupplierCocType;
  cocTypeLabel: string;
  supplierCompanyId: number;
  supplierCompanyName: string | null;
  documentPath: string | null;
  graphPdfPath: string | null;
  cocNumber: string | null;
  productionDate: string | null;
  compoundCode: string | null;
  orderNumber: string | null;
  ticketNumber: string | null;
  processingStatus: CocProcessingStatus;
  processingStatusLabel: string;
  extractedData: Record<string, unknown> | null;
  reviewNotes: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  linkedDeliveryNoteId: number | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RubberCompoundBatchDto {
  id: number;
  firebaseUid: string;
  supplierCocId: number;
  supplierCocNumber: string | null;
  batchNumber: string;
  compoundStockId: number | null;
  shoreAHardness: number | null;
  specificGravity: number | null;
  reboundPercent: number | null;
  tearStrengthKnM: number | null;
  tensileStrengthMpa: number | null;
  elongationPercent: number | null;
  rheometerSMin: number | null;
  rheometerSMax: number | null;
  rheometerTs2: number | null;
  rheometerTc90: number | null;
  passFailStatus: string;
  passFailStatusLabel: string;
  createdAt: string;
  updatedAt: string;
}

export interface RubberDeliveryNoteDto {
  id: number;
  firebaseUid: string;
  deliveryNoteType: DeliveryNoteType;
  deliveryNoteTypeLabel: string;
  deliveryNoteNumber: string | null;
  supplierCompanyId: number;
  supplierCompanyName: string | null;
  deliveryDate: string | null;
  documentPath: string | null;
  status: DeliveryNoteStatus;
  statusLabel: string;
  extractedData: Record<string, unknown> | null;
  linkedCocId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface RubberDeliveryNoteItemDto {
  id: number;
  deliveryNoteId: number;
  batchNumberStart: string | null;
  batchNumberEnd: string | null;
  weightKg: number | null;
  rollNumber: string | null;
  rollWeightKg: number | null;
  widthMm: number | null;
  thicknessMm: number | null;
  lengthM: number | null;
  linkedBatchIds: number[] | null;
  createdAt: string;
}

export interface RubberRollStockDto {
  id: number;
  firebaseUid: string;
  rollNumber: string;
  compoundCodingId: number;
  compoundName: string | null;
  compoundCode: string | null;
  weightKg: number;
  widthMm: number | null;
  thicknessMm: number | null;
  lengthM: number | null;
  status: RollStockStatus;
  statusLabel: string;
  linkedBatchIds: number[] | null;
  deliveryNoteItemId: number | null;
  soldToCompanyId: number | null;
  soldToCompanyName: string | null;
  auCocId: number | null;
  soldAt: string | null;
  location: string | null;
  notes: string | null;
  costZar: number | null;
  priceZar: number | null;
  productionDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOpeningStockDto {
  rollNumber: string;
  compoundCodingId: number;
  weightKg: number;
  costZar?: number | null;
  priceZar?: number | null;
  notes?: string | null;
}

export interface ImportOpeningStockRowDto {
  rollNumber: string;
  compoundCode: string;
  weightKg: number;
  costZar?: number | null;
  priceZar?: number | null;
}

export interface ImportOpeningStockResultDto {
  totalRows: number;
  created: number;
  errors: { row: number; rollNumber: string; error: string }[];
}

export interface RubberAuCocDto {
  id: number;
  firebaseUid: string;
  cocNumber: string;
  customerCompanyId: number;
  customerCompanyName: string | null;
  poNumber: string | null;
  deliveryNoteRef: string | null;
  status: AuCocStatus;
  statusLabel: string;
  generatedPdfPath: string | null;
  sentAt: string | null;
  sentTo: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  items: RubberAuCocItemDto[];
}

export interface RubberAuCocItemDto {
  id: number;
  auCocId: number;
  rollStockId: number;
  rollNumber: string | null;
  testDataSummary: Record<string, unknown> | null;
}

export interface RollTraceabilityDto {
  roll: RubberRollStockDto;
  batches: RubberCompoundBatchDto[];
  supplierCocs: RubberSupplierCocDto[];
  auCoc: RubberAuCocDto | null;
}

export interface StockLocationDto {
  id: number;
  name: string;
  description: string | null;
  displayOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RequisitionItemDto {
  id: number;
  requisitionId: number;
  itemType: RequisitionItemType;
  compoundStockId: number | null;
  compoundCodingId: number | null;
  compoundName: string | null;
  quantityKg: number;
  quantityReceivedKg: number;
  unitPrice: number | null;
  notes: string | null;
  createdAt: string;
}

export interface RequisitionDto {
  id: number;
  firebaseUid: string;
  requisitionNumber: string;
  sourceType: RequisitionSourceType;
  sourceTypeLabel: string;
  status: RequisitionStatus;
  statusLabel: string;
  supplierCompanyId: number | null;
  supplierCompanyName: string | null;
  externalPoNumber: string | null;
  externalPoDocumentPath: string | null;
  expectedDeliveryDate: string | null;
  notes: string | null;
  createdBy: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  orderedAt: string | null;
  receivedAt: string | null;
  items: RequisitionItemDto[];
  totalQuantityKg: number;
  totalReceivedKg: number;
  createdAt: string;
  updatedAt: string;
}

export interface RubberCompoundStockDto {
  id: number;
  firebaseUid: string;
  compoundCodingId: number;
  compoundName: string | null;
  compoundCode: string | null;
  quantityKg: number;
  minStockLevelKg: number;
  reorderPointKg: number;
  costPerKg: number | null;
  location: string | null;
  batchNumber: string | null;
  isLowStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RubberCompoundMovementDto {
  id: number;
  compoundStockId: number;
  compoundName: string | null;
  movementType: CompoundMovementType;
  quantityKg: number;
  referenceType: CompoundMovementReferenceType;
  referenceId: number | null;
  batchNumber: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface RubberProductionDto {
  id: number;
  firebaseUid: string;
  productionNumber: string;
  productId: number;
  productTitle: string | null;
  compoundStockId: number;
  compoundName: string | null;
  thicknessMm: number;
  widthMm: number;
  lengthM: number;
  quantity: number;
  compoundRequiredKg: number;
  compoundUsedKg: number | null;
  status: RubberProductionStatus;
  statusLabel: string;
  orderId: number | null;
  notes: string | null;
  createdBy: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RubberCompoundOrderDto {
  id: number;
  firebaseUid: string;
  orderNumber: string;
  compoundStockId: number;
  compoundName: string | null;
  quantityKg: number;
  status: RubberCompoundOrderStatus;
  statusLabel: string;
  isAutoGenerated: boolean;
  supplierName: string | null;
  expectedDelivery: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompoundCalculationResultDto {
  productTitle: string | null;
  specificGravity: number;
  compoundRequiredKg: number;
  kgPerUnit: number;
}

export interface CandidateImage {
  url: string;
  source: string;
  width: number | null;
  height: number | null;
}

export interface ScrapedBrandingCandidates {
  logoCandidates: CandidateImage[];
  heroCandidates: CandidateImage[];
  primaryColor: string | null;
}

export interface AuRubberLoginDto {
  email: string;
  password: string;
  appCode?: string;
}

export interface AuRubberUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

export interface AuRubberLoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuRubberUser;
}

export interface AuRubberUserProfile {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  createdAt: string;
  lastActiveAt?: string;
}

export interface AuRubberAccessInfo {
  roleCode: string | null;
  roleName: string | null;
  permissions: string[];
  isAdmin: boolean;
}

export type RoleTargetType = "CUSTOMER" | "SUPPLIER";

export interface AuRubberRoleDto {
  id: number;
  appId: number;
  code: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  displayOrder: number;
  targetType: RoleTargetType | null;
  permissions: string[];
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuRubberPermissionDto {
  id: number;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  displayOrder: number;
}

export interface AuRubberUserAccessDto {
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

export interface AuRubberInviteUserResponse {
  userId: number;
  email: string;
  accessId: number;
  isNewUser: boolean;
  message: string;
}

const TOKEN_KEYS = {
  accessToken: "auRubberAccessToken",
  refreshToken: "auRubberRefreshToken",
} as const;

class AuRubberApiClient {
  private baseURL: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private rememberMe: boolean = true;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;

    if (typeof window !== "undefined") {
      this.accessToken =
        localStorage.getItem(TOKEN_KEYS.accessToken) ??
        sessionStorage.getItem(TOKEN_KEYS.accessToken);
      this.refreshToken =
        localStorage.getItem(TOKEN_KEYS.refreshToken) ??
        sessionStorage.getItem(TOKEN_KEYS.refreshToken);
    }
  }

  setRememberMe(remember: boolean) {
    this.rememberMe = remember;
  }

  private headers(): Record<string, string> {
    if (!this.accessToken && typeof window !== "undefined") {
      this.accessToken =
        localStorage.getItem(TOKEN_KEYS.accessToken) ??
        sessionStorage.getItem(TOKEN_KEYS.accessToken);
      this.refreshToken =
        localStorage.getItem(TOKEN_KEYS.refreshToken) ??
        sessionStorage.getItem(TOKEN_KEYS.refreshToken);
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
      const storage = this.rememberMe ? localStorage : sessionStorage;
      storage.setItem(TOKEN_KEYS.accessToken, accessToken);
      storage.setItem(TOKEN_KEYS.refreshToken, refreshToken);
    }
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEYS.accessToken);
      localStorage.removeItem(TOKEN_KEYS.refreshToken);
      sessionStorage.removeItem(TOKEN_KEYS.accessToken);
      sessionStorage.removeItem(TOKEN_KEYS.refreshToken);
    }
  }

  isAuthenticated(): boolean {
    if (!this.accessToken && typeof window !== "undefined") {
      this.accessToken =
        localStorage.getItem(TOKEN_KEYS.accessToken) ??
        sessionStorage.getItem(TOKEN_KEYS.accessToken);
      this.refreshToken =
        localStorage.getItem(TOKEN_KEYS.refreshToken) ??
        sessionStorage.getItem(TOKEN_KEYS.refreshToken);
    }
    return !!this.accessToken;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const config: RequestInit = {
      ...options,
      headers: {
        ...this.headers(),
        ...(options.headers as Record<string, string>),
      },
    };

    const response = await fetch(url, config);

    if (response.status === 401 && this.refreshToken) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        config.headers = {
          ...this.headers(),
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

    const text = await response.text();
    if (!text || text.trim() === "") {
      return {} as T;
    }

    return JSON.parse(text) as T;
  }

  private async requestWithFiles<T>(
    endpoint: string,
    files: File[],
    data?: Record<string, string | number | undefined>,
    fieldName: string = "files",
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const formData = new FormData();

    files.forEach((file) => {
      formData.append(fieldName, file);
    });

    if (data) {
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          formData.append(key, String(value));
        }
      });
    }

    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
    });

    if (response.status === 401 && this.refreshToken) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        headers["Authorization"] = `Bearer ${this.accessToken}`;
        const retryResponse = await fetch(url, {
          method: "POST",
          headers,
          body: formData,
        });
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

    const text = await response.text();
    if (!text || text.trim() === "") {
      return {} as T;
    }

    return JSON.parse(text) as T;
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
        if (localStorage.getItem(TOKEN_KEYS.refreshToken)) {
          localStorage.setItem(TOKEN_KEYS.accessToken, data.accessToken);
        } else {
          sessionStorage.setItem(TOKEN_KEYS.accessToken, data.accessToken);
        }
      }
      return true;
    } catch {
      this.clearTokens();
      return false;
    }
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

  async currentUser(): Promise<AuRubberUserProfile> {
    return this.request<AuRubberUserProfile>("/admin/auth/me");
  }

  async productCodings(codingType?: string): Promise<RubberProductCodingDto[]> {
    const query = codingType ? `?codingType=${codingType}` : "";
    return this.request(`/rubber-lining/portal/product-codings${query}`);
  }

  async productCodingById(id: number): Promise<RubberProductCodingDto> {
    return this.request(`/rubber-lining/portal/product-codings/${id}`);
  }

  async createProductCoding(
    data: Omit<RubberProductCodingDto, "id" | "firebaseUid">,
  ): Promise<RubberProductCodingDto> {
    return this.request("/rubber-lining/portal/product-codings", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateProductCoding(
    id: number,
    data: Partial<RubberProductCodingDto>,
  ): Promise<RubberProductCodingDto> {
    return this.request(`/rubber-lining/portal/product-codings/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteProductCoding(id: number): Promise<void> {
    return this.request(`/rubber-lining/portal/product-codings/${id}`, {
      method: "DELETE",
    });
  }

  async pricingTiers(): Promise<RubberPricingTierDto[]> {
    return this.request("/rubber-lining/portal/pricing-tiers");
  }

  async pricingTierById(id: number): Promise<RubberPricingTierDto> {
    return this.request(`/rubber-lining/portal/pricing-tiers/${id}`);
  }

  async createPricingTier(data: Omit<RubberPricingTierDto, "id">): Promise<RubberPricingTierDto> {
    return this.request("/rubber-lining/portal/pricing-tiers", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updatePricingTier(
    id: number,
    data: Partial<RubberPricingTierDto>,
  ): Promise<RubberPricingTierDto> {
    return this.request(`/rubber-lining/portal/pricing-tiers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deletePricingTier(id: number): Promise<void> {
    return this.request(`/rubber-lining/portal/pricing-tiers/${id}`, {
      method: "DELETE",
    });
  }

  async companies(): Promise<RubberCompanyDto[]> {
    return this.request("/rubber-lining/portal/companies");
  }

  async companyById(id: number): Promise<RubberCompanyDto> {
    return this.request(`/rubber-lining/portal/companies/${id}`);
  }

  async createCompany(data: {
    name: string;
    code?: string;
    pricingTierId?: number;
    availableProducts?: string[];
    isCompoundOwner?: boolean;
    vatNumber?: string;
    registrationNumber?: string;
    address?: Record<string, string>;
    notes?: string;
  }): Promise<RubberCompanyDto> {
    return this.request("/rubber-lining/portal/companies", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateCompany(
    id: number,
    data: Partial<{
      name: string;
      code?: string;
      pricingTierId?: number;
      availableProducts?: string[];
      isCompoundOwner?: boolean;
      vatNumber?: string;
      registrationNumber?: string;
      address?: Record<string, string>;
      notes?: string;
    }>,
  ): Promise<RubberCompanyDto> {
    return this.request(`/rubber-lining/portal/companies/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteCompany(id: number): Promise<void> {
    return this.request(`/rubber-lining/portal/companies/${id}`, {
      method: "DELETE",
    });
  }

  async products(): Promise<RubberProductDto[]> {
    return this.request("/rubber-lining/portal/products");
  }

  async productById(id: number): Promise<RubberProductDto> {
    return this.request(`/rubber-lining/portal/products/${id}`);
  }

  async createProduct(data: CreateRubberProductDto): Promise<RubberProductDto> {
    return this.request("/rubber-lining/portal/products", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateProduct(
    id: number,
    data: Partial<CreateRubberProductDto>,
  ): Promise<RubberProductDto> {
    return this.request(`/rubber-lining/portal/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(id: number): Promise<void> {
    return this.request(`/rubber-lining/portal/products/${id}`, {
      method: "DELETE",
    });
  }

  async orders(status?: number): Promise<RubberOrderDto[]> {
    const query = status !== undefined ? `?status=${status}` : "";
    return this.request(`/rubber-lining/portal/orders${query}`);
  }

  async orderById(id: number): Promise<RubberOrderDto> {
    return this.request(`/rubber-lining/portal/orders/${id}`);
  }

  async createOrder(data: {
    orderNumber?: string;
    companyOrderNumber?: string;
    companyId?: number;
    items?: {
      productId?: number;
      thickness?: number;
      width?: number;
      length?: number;
      quantity?: number;
      callOffs?: CallOff[];
    }[];
  }): Promise<RubberOrderDto> {
    return this.request("/rubber-lining/portal/orders", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateOrder(
    id: number,
    data: {
      companyOrderNumber?: string;
      status?: number;
      companyId?: number;
      items?: {
        productId?: number;
        thickness?: number;
        width?: number;
        length?: number;
        quantity?: number;
        callOffs?: CallOff[];
      }[];
    },
  ): Promise<RubberOrderDto> {
    return this.request(`/rubber-lining/portal/orders/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteOrder(id: number): Promise<void> {
    return this.request(`/rubber-lining/portal/orders/${id}`, {
      method: "DELETE",
    });
  }

  async orderStatuses(): Promise<{ value: number; label: string }[]> {
    return this.request("/rubber-lining/portal/order-statuses");
  }

  async codingTypes(): Promise<{ value: string; label: string }[]> {
    return this.request("/rubber-lining/portal/coding-types");
  }

  async calculatePrice(data: {
    productId: number;
    companyId: number;
    thickness: number;
    width: number;
    length: number;
    quantity: number;
  }): Promise<RubberPriceCalculationDto> {
    return this.request("/rubber-lining/portal/calculate-price", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async importProducts(data: {
    rows: ImportProductRowDto[];
    updateExisting?: boolean;
  }): Promise<ImportProductsResultDto> {
    return this.request("/rubber-lining/portal/products/import", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async compoundStocks(): Promise<RubberCompoundStockDto[]> {
    return this.request("/rubber-lining/portal/compound-stocks");
  }

  async lowStockCompounds(): Promise<RubberCompoundStockDto[]> {
    return this.request("/rubber-lining/portal/compound-stocks/low-stock");
  }

  async compoundStockById(id: number): Promise<RubberCompoundStockDto> {
    return this.request(`/rubber-lining/portal/compound-stocks/${id}`);
  }

  async createCompoundStock(data: {
    compoundCodingId: number;
    quantityKg?: number;
    minStockLevelKg?: number;
    reorderPointKg?: number;
    costPerKg?: number;
    location?: string;
    batchNumber?: string;
  }): Promise<RubberCompoundStockDto> {
    return this.request("/rubber-lining/portal/compound-stocks", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateCompoundStock(
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
  ): Promise<RubberCompoundStockDto> {
    return this.request(`/rubber-lining/portal/compound-stocks/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteCompoundStock(id: number): Promise<void> {
    return this.request(`/rubber-lining/portal/compound-stocks/${id}`, {
      method: "DELETE",
    });
  }

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

  async receiveCompound(data: {
    compoundStockId: number;
    quantityKg: number;
    batchNumber?: string;
    notes?: string;
  }): Promise<RubberCompoundMovementDto> {
    return this.request("/rubber-lining/portal/compound-movements/receive", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async adjustCompound(data: {
    compoundStockId: number;
    quantityKg: number;
    notes?: string;
  }): Promise<RubberCompoundMovementDto> {
    return this.request("/rubber-lining/portal/compound-movements/adjust", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async productions(status?: RubberProductionStatus): Promise<RubberProductionDto[]> {
    const query = status ? `?status=${status}` : "";
    return this.request(`/rubber-lining/portal/productions${query}`);
  }

  async productionById(id: number): Promise<RubberProductionDto> {
    return this.request(`/rubber-lining/portal/productions/${id}`);
  }

  async createProduction(data: {
    productId: number;
    compoundStockId: number;
    thicknessMm: number;
    widthMm: number;
    lengthM: number;
    quantity: number;
    orderId?: number;
    notes?: string;
  }): Promise<RubberProductionDto> {
    return this.request("/rubber-lining/portal/productions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async startProduction(id: number): Promise<RubberProductionDto> {
    return this.request(`/rubber-lining/portal/productions/${id}/start`, {
      method: "PUT",
    });
  }

  async completeProduction(id: number): Promise<RubberProductionDto> {
    return this.request(`/rubber-lining/portal/productions/${id}/complete`, {
      method: "PUT",
    });
  }

  async cancelProduction(id: number): Promise<RubberProductionDto> {
    return this.request(`/rubber-lining/portal/productions/${id}/cancel`, {
      method: "PUT",
    });
  }

  async calculateCompoundRequired(data: {
    productId: number;
    thicknessMm: number;
    widthMm: number;
    lengthM: number;
    quantity: number;
  }): Promise<CompoundCalculationResultDto> {
    return this.request("/rubber-lining/portal/productions/calculate-compound", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async compoundOrders(status?: RubberCompoundOrderStatus): Promise<RubberCompoundOrderDto[]> {
    const query = status ? `?status=${status}` : "";
    return this.request(`/rubber-lining/portal/compound-orders${query}`);
  }

  async compoundOrderById(id: number): Promise<RubberCompoundOrderDto> {
    return this.request(`/rubber-lining/portal/compound-orders/${id}`);
  }

  async createCompoundOrder(data: {
    compoundStockId: number;
    quantityKg: number;
    supplierName?: string;
    expectedDelivery?: string;
    notes?: string;
  }): Promise<RubberCompoundOrderDto> {
    return this.request("/rubber-lining/portal/compound-orders", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateCompoundOrderStatus(
    id: number,
    status: RubberCompoundOrderStatus,
  ): Promise<RubberCompoundOrderDto> {
    return this.request(`/rubber-lining/portal/compound-orders/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  }

  async receiveCompoundOrder(
    id: number,
    data: {
      actualQuantityKg: number;
      batchNumber?: string;
      notes?: string;
    },
  ): Promise<RubberCompoundOrderDto> {
    return this.request(`/rubber-lining/portal/compound-orders/${id}/receive`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async productionStatuses(): Promise<{ value: string; label: string }[]> {
    return this.request("/rubber-lining/portal/production-statuses");
  }

  async compoundOrderStatuses(): Promise<{ value: string; label: string }[]> {
    return this.request("/rubber-lining/portal/compound-order-statuses");
  }

  async scrapeBranding(websiteUrl: string): Promise<ScrapedBrandingCandidates> {
    return this.request("/rubber-lining/portal/scrape-branding", {
      method: "POST",
      body: JSON.stringify({ websiteUrl }),
    });
  }

  proxyImageUrl(url: string): string {
    return `${this.baseURL}/rubber-lining/portal/proxy-image?url=${encodeURIComponent(url)}`;
  }

  authHeaders(): Record<string, string> {
    return this.headers();
  }

  async myAccess(): Promise<AuRubberAccessInfo> {
    return this.request("/rubber-lining/admin/access/me");
  }

  async accessUsers(): Promise<AuRubberUserAccessDto[]> {
    return this.request("/rubber-lining/admin/access/users");
  }

  async accessRoles(): Promise<AuRubberRoleDto[]> {
    return this.request("/rubber-lining/admin/access/roles");
  }

  async accessPermissions(): Promise<AuRubberPermissionDto[]> {
    return this.request("/rubber-lining/admin/access/permissions");
  }

  async createRole(data: {
    code: string;
    name: string;
    description?: string;
    isDefault?: boolean;
    targetType?: RoleTargetType | null;
  }): Promise<AuRubberRoleDto> {
    return this.request("/rubber-lining/admin/access/roles", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateRole(
    roleId: number,
    data: { name?: string; description?: string; isDefault?: boolean },
  ): Promise<AuRubberRoleDto> {
    return this.request(`/rubber-lining/admin/access/roles/${roleId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async setRolePermissions(roleId: number, permissionCodes: string[]): Promise<void> {
    return this.request(`/rubber-lining/admin/access/roles/${roleId}/permissions`, {
      method: "PUT",
      body: JSON.stringify({ permissionCodes }),
    });
  }

  async deleteRole(roleId: number): Promise<{ message: string; reassignedUsers: number }> {
    return this.request(`/rubber-lining/admin/access/roles/${roleId}`, {
      method: "DELETE",
    });
  }

  async grantUserAccess(userId: number, roleCode: string): Promise<AuRubberUserAccessDto> {
    return this.request(`/rubber-lining/admin/access/users/${userId}`, {
      method: "POST",
      body: JSON.stringify({ roleCode }),
    });
  }

  async updateUserAccess(accessId: number, roleCode: string): Promise<AuRubberUserAccessDto> {
    return this.request(`/rubber-lining/admin/access/users/${accessId}`, {
      method: "PATCH",
      body: JSON.stringify({ roleCode }),
    });
  }

  async revokeUserAccess(accessId: number): Promise<void> {
    return this.request(`/rubber-lining/admin/access/users/${accessId}`, {
      method: "DELETE",
    });
  }

  async inviteUser(data: {
    email: string;
    firstName?: string;
    lastName?: string;
    roleCode: string;
  }): Promise<AuRubberInviteUserResponse> {
    return this.request("/rubber-lining/admin/access/invite", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async searchUsers(
    query: string,
  ): Promise<{ id: number; email: string; firstName: string | null; lastName: string | null }[]> {
    return this.request(`/rubber-lining/admin/users/search?q=${encodeURIComponent(query)}`);
  }

  async supplierCocs(filters?: {
    cocType?: SupplierCocType;
    processingStatus?: CocProcessingStatus;
    supplierId?: number;
  }): Promise<RubberSupplierCocDto[]> {
    const params = new URLSearchParams();
    if (filters?.cocType) params.set("cocType", filters.cocType);
    if (filters?.processingStatus) params.set("processingStatus", filters.processingStatus);
    if (filters?.supplierId) params.set("supplierId", String(filters.supplierId));
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/rubber-lining/portal/supplier-cocs${query}`);
  }

  async supplierCocById(id: number): Promise<RubberSupplierCocDto> {
    return this.request(`/rubber-lining/portal/supplier-cocs/${id}`);
  }

  async uploadSupplierCoc(data: {
    cocType: SupplierCocType;
    supplierCompanyId?: number;
    cocNumber?: string;
    productionDate?: string;
    compoundCode?: string;
    orderNumber?: string;
    ticketNumber?: string;
  }): Promise<RubberSupplierCocDto> {
    return this.request("/rubber-lining/portal/supplier-cocs", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

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

  async analyzeSupplierCocs(files: File[]): Promise<{
    files: Array<{
      filename: string;
      isGraph: boolean;
      cocType: SupplierCocType | null;
      companyId: number | null;
      companyName: string | null;
      batchNumbers: string[];
      linkedToIndex: number | null;
      compoundCode: string | null;
      extractedData: Record<string, unknown> | null;
    }>;
    dataPdfs: number[];
    graphPdfs: number[];
  }> {
    return this.requestWithFiles("/rubber-lining/portal/supplier-cocs/analyze", files);
  }

  async createCocsFromAnalysis(
    files: File[],
    analysis: {
      files: Array<{
        filename: string;
        isGraph: boolean;
        cocType: SupplierCocType | null;
        companyId: number | null;
        companyName: string | null;
        batchNumbers: string[];
        linkedToIndex: number | null;
        compoundCode: string | null;
        extractedData: Record<string, unknown> | null;
      }>;
      dataPdfs: number[];
      graphPdfs: number[];
    },
  ): Promise<{ cocIds: number[] }> {
    const url = `${this.baseURL}/rubber-lining/portal/supplier-cocs/create-from-analysis`;
    const formData = new FormData();

    files.forEach((file) => {
      formData.append("files", file);
    });

    formData.append("analysis", JSON.stringify(analysis));

    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  async extractSupplierCoc(id: number): Promise<RubberSupplierCocDto> {
    return this.request(`/rubber-lining/portal/supplier-cocs/${id}/extract`, {
      method: "POST",
    });
  }

  async reviewSupplierCoc(
    id: number,
    data: { extractedData?: Record<string, unknown>; reviewNotes?: string },
  ): Promise<RubberSupplierCocDto> {
    return this.request(`/rubber-lining/portal/supplier-cocs/${id}/review`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async approveSupplierCoc(id: number): Promise<RubberSupplierCocDto> {
    return this.request(`/rubber-lining/portal/supplier-cocs/${id}/approve`, {
      method: "PUT",
    });
  }

  async linkCocToDeliveryNote(
    cocId: number,
    deliveryNoteId: number,
  ): Promise<RubberSupplierCocDto> {
    return this.request(`/rubber-lining/portal/supplier-cocs/${cocId}/link-dn`, {
      method: "PUT",
      body: JSON.stringify({ deliveryNoteId }),
    });
  }

  async compoundBatchesByCocId(cocId: number): Promise<RubberCompoundBatchDto[]> {
    return this.request(`/rubber-lining/portal/supplier-cocs/${cocId}/batches`);
  }

  async createCompoundBatch(data: {
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
  }): Promise<RubberCompoundBatchDto> {
    return this.request("/rubber-lining/portal/compound-batches", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deliveryNotes(filters?: {
    deliveryNoteType?: DeliveryNoteType;
    status?: DeliveryNoteStatus;
    supplierId?: number;
  }): Promise<RubberDeliveryNoteDto[]> {
    const params = new URLSearchParams();
    if (filters?.deliveryNoteType) params.set("deliveryNoteType", filters.deliveryNoteType);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.supplierId) params.set("supplierId", String(filters.supplierId));
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/rubber-lining/portal/delivery-notes${query}`);
  }

  async deliveryNoteById(id: number): Promise<RubberDeliveryNoteDto> {
    return this.request(`/rubber-lining/portal/delivery-notes/${id}`);
  }

  async uploadDeliveryNote(data: {
    deliveryNoteType: DeliveryNoteType;
    supplierCompanyId: number;
    deliveryNoteNumber?: string;
    deliveryDate?: string;
  }): Promise<RubberDeliveryNoteDto> {
    return this.request("/rubber-lining/portal/delivery-notes", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async uploadDeliveryNoteWithFiles(
    files: File[],
    data: {
      deliveryNoteType: DeliveryNoteType;
      supplierCompanyId: number;
      deliveryNoteNumber?: string;
      deliveryDate?: string;
    },
  ): Promise<RubberDeliveryNoteDto[]> {
    return this.requestWithFiles("/rubber-lining/portal/delivery-notes/upload", files, {
      deliveryNoteType: data.deliveryNoteType,
      supplierCompanyId: data.supplierCompanyId,
      deliveryNoteNumber: data.deliveryNoteNumber,
      deliveryDate: data.deliveryDate,
    });
  }

  async extractDeliveryNote(id: number): Promise<RubberDeliveryNoteDto> {
    return this.request(`/rubber-lining/portal/delivery-notes/${id}/extract`, {
      method: "POST",
    });
  }

  async linkDeliveryNoteToCoc(
    deliveryNoteId: number,
    cocId: number,
  ): Promise<RubberDeliveryNoteDto> {
    return this.request(`/rubber-lining/portal/delivery-notes/${deliveryNoteId}/link-coc`, {
      method: "PUT",
      body: JSON.stringify({ cocId }),
    });
  }

  async finalizeDeliveryNote(id: number): Promise<RubberDeliveryNoteDto> {
    return this.request(`/rubber-lining/portal/delivery-notes/${id}/finalize`, {
      method: "PUT",
    });
  }

  async deliveryNoteItems(deliveryNoteId: number): Promise<RubberDeliveryNoteItemDto[]> {
    return this.request(`/rubber-lining/portal/delivery-notes/${deliveryNoteId}/items`);
  }

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

  async rollStockById(id: number): Promise<RubberRollStockDto> {
    return this.request(`/rubber-lining/portal/roll-stock/${id}`);
  }

  async rollTraceability(id: number): Promise<RollTraceabilityDto> {
    return this.request(`/rubber-lining/portal/roll-stock/${id}/traceability`);
  }

  async reserveRoll(id: number, customerId: number): Promise<RubberRollStockDto> {
    return this.request(`/rubber-lining/portal/roll-stock/${id}/reserve`, {
      method: "PUT",
      body: JSON.stringify({ customerId }),
    });
  }

  async unreserveRoll(id: number): Promise<RubberRollStockDto> {
    return this.request(`/rubber-lining/portal/roll-stock/${id}/unreserve`, {
      method: "PUT",
    });
  }

  async sellRoll(
    id: number,
    data: { customerId: number; poNumber?: string; auCocId?: number },
  ): Promise<RubberRollStockDto> {
    return this.request(`/rubber-lining/portal/roll-stock/${id}/sell`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async scrapRoll(id: number, reason?: string): Promise<RubberRollStockDto> {
    return this.request(`/rubber-lining/portal/roll-stock/${id}/scrap`, {
      method: "PUT",
      body: JSON.stringify({ reason }),
    });
  }

  async createOpeningStock(data: CreateOpeningStockDto): Promise<RubberRollStockDto> {
    return this.request("/rubber-lining/portal/roll-stock/opening-stock", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async importOpeningStock(rows: ImportOpeningStockRowDto[]): Promise<ImportOpeningStockResultDto> {
    return this.request("/rubber-lining/portal/roll-stock/import-opening", {
      method: "POST",
      body: JSON.stringify({ rows }),
    });
  }

  async auCocs(filters?: { status?: AuCocStatus; customerId?: number }): Promise<RubberAuCocDto[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.customerId) params.set("customerId", String(filters.customerId));
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request(`/rubber-lining/portal/au-cocs${query}`);
  }

  async auCocById(id: number): Promise<RubberAuCocDto> {
    return this.request(`/rubber-lining/portal/au-cocs/${id}`);
  }

  async createAuCoc(data: {
    customerCompanyId: number;
    rollIds: number[];
    poNumber?: string;
    deliveryNoteRef?: string;
  }): Promise<RubberAuCocDto> {
    return this.request("/rubber-lining/portal/au-cocs", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async generateAuCocPdf(id: number): Promise<RubberAuCocDto> {
    return this.request(`/rubber-lining/portal/au-cocs/${id}/generate-pdf`, {
      method: "POST",
    });
  }

  async sendAuCoc(id: number, recipientEmail: string): Promise<RubberAuCocDto> {
    return this.request(`/rubber-lining/portal/au-cocs/${id}/send`, {
      method: "POST",
      body: JSON.stringify({ recipientEmail }),
    });
  }

  auCocPdfUrl(id: number): string {
    return `${this.baseURL}/rubber-lining/portal/au-cocs/${id}/pdf`;
  }

  async downloadAuCocPdf(id: number, cocNumber: string): Promise<void> {
    const response = await fetch(`${this.baseURL}/rubber-lining/portal/au-cocs/${id}/pdf`, {
      headers: this.authHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.statusText}`);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cocNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  async stockLocations(includeInactive = false): Promise<StockLocationDto[]> {
    const query = includeInactive ? "?includeInactive=true" : "";
    return this.request(`/rubber-lining/portal/stock-locations${query}`);
  }

  async stockLocationById(id: number): Promise<StockLocationDto> {
    return this.request(`/rubber-lining/portal/stock-locations/${id}`);
  }

  async createStockLocation(data: {
    name: string;
    description?: string;
    displayOrder?: number;
  }): Promise<StockLocationDto> {
    return this.request("/rubber-lining/portal/stock-locations", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateStockLocation(
    id: number,
    data: { name?: string; description?: string; displayOrder?: number; active?: boolean },
  ): Promise<StockLocationDto> {
    return this.request(`/rubber-lining/portal/stock-locations/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteStockLocation(id: number): Promise<void> {
    return this.request(`/rubber-lining/portal/stock-locations/${id}`, {
      method: "DELETE",
    });
  }

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

  async purchaseRequisitionById(id: number): Promise<RequisitionDto> {
    return this.request(`/rubber-lining/portal/purchase-requisitions/${id}`);
  }

  async pendingRequisitions(): Promise<RequisitionDto[]> {
    return this.request("/rubber-lining/portal/purchase-requisitions/pending");
  }

  async createManualRequisition(data: {
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
  }): Promise<RequisitionDto> {
    return this.request("/rubber-lining/portal/purchase-requisitions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async createExternalPoRequisition(data: {
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
  }): Promise<RequisitionDto> {
    return this.request("/rubber-lining/portal/purchase-requisitions/external-po", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async checkLowStockRequisitions(): Promise<RequisitionDto[]> {
    return this.request("/rubber-lining/portal/purchase-requisitions/check-low-stock", {
      method: "POST",
    });
  }

  async approveRequisition(id: number, approvedBy: string): Promise<RequisitionDto> {
    return this.request(`/rubber-lining/portal/purchase-requisitions/${id}/approve`, {
      method: "PUT",
      body: JSON.stringify({ approvedBy }),
    });
  }

  async rejectRequisition(id: number, rejectedBy: string, reason: string): Promise<RequisitionDto> {
    return this.request(`/rubber-lining/portal/purchase-requisitions/${id}/reject`, {
      method: "PUT",
      body: JSON.stringify({ rejectedBy, reason }),
    });
  }

  async markRequisitionOrdered(
    id: number,
    data?: { externalPoNumber?: string; expectedDeliveryDate?: string },
  ): Promise<RequisitionDto> {
    return this.request(`/rubber-lining/portal/purchase-requisitions/${id}/mark-ordered`, {
      method: "PUT",
      body: JSON.stringify(data || {}),
    });
  }

  async receiveRequisitionItems(
    id: number,
    itemReceipts: { itemId: number; quantityReceivedKg: number }[],
  ): Promise<RequisitionDto> {
    return this.request(`/rubber-lining/portal/purchase-requisitions/${id}/receive`, {
      method: "PUT",
      body: JSON.stringify({ itemReceipts }),
    });
  }

  async cancelRequisition(id: number): Promise<RequisitionDto> {
    return this.request(`/rubber-lining/portal/purchase-requisitions/${id}/cancel`, {
      method: "PUT",
    });
  }

  requisitionStatuses(): Promise<{ value: string; label: string }[]> {
    return this.request("/rubber-lining/portal/requisition-statuses");
  }

  requisitionSourceTypes(): Promise<{ value: string; label: string }[]> {
    return this.request("/rubber-lining/portal/requisition-source-types");
  }

  async qualityTrackingSummary(): Promise<CompoundQualitySummaryDto[]> {
    return this.request("/rubber-lining/portal/quality-tracking");
  }

  async qualityTrackingDetail(compoundCode: string): Promise<CompoundQualityDetailDto> {
    return this.request(
      `/rubber-lining/portal/quality-tracking/${encodeURIComponent(compoundCode)}`,
    );
  }

  async qualityAlerts(): Promise<QualityAlertDto[]> {
    return this.request("/rubber-lining/portal/quality-alerts");
  }

  async acknowledgeQualityAlert(id: number, acknowledgedBy: string): Promise<QualityAlertDto> {
    return this.request(`/rubber-lining/portal/quality-alerts/${id}/acknowledge`, {
      method: "PUT",
      body: JSON.stringify({ acknowledgedBy }),
    });
  }

  async qualityConfigs(): Promise<QualityConfigDto[]> {
    return this.request("/rubber-lining/portal/quality-configs");
  }

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

  async createOrderFromAnalysis(
    data: CreateOrderFromAnalysisDto,
  ): Promise<{ orderId: number; orderNumber: string }> {
    return this.request("/rubber-lining/portal/orders/from-analysis", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async orderDocumentPages(file: File): Promise<{ pages: PdfPageImage[] }> {
    return this.requestWithFiles("/rubber-lining/portal/orders/document-pages", [file], {}, "file");
  }

  async extractOrderRegion(
    file: File,
    coordinates: RegionCoordinates,
    fieldName: string,
  ): Promise<{ text: string; confidence: number }> {
    const url = `${this.baseURL}/rubber-lining/portal/orders/extract-region`;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("coordinates", JSON.stringify(coordinates));
    formData.append("fieldName", fieldName);

    const headers: Record<string, string> = {};
    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  async savePoTemplate(dto: CreateTemplateDto): Promise<{ templateId: number }> {
    return this.request("/rubber-lining/portal/orders/templates", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }

  async companyPoTemplates(companyId: number): Promise<{ templates: PoTemplateDto[] }> {
    return this.request(`/rubber-lining/portal/orders/templates/${companyId}`);
  }

  async deletePoTemplate(templateId: number): Promise<{ success: boolean }> {
    return this.request(`/rubber-lining/portal/orders/templates/${templateId}`, {
      method: "DELETE",
    });
  }

  async computeOrderFormatHash(file: File): Promise<{ formatHash: string }> {
    return this.requestWithFiles(
      "/rubber-lining/portal/orders/compute-format-hash",
      [file],
      {},
      "file",
    );
  }
}

export const auRubberApiClient = new AuRubberApiClient();
