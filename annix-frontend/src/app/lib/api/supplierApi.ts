import { getStoredFingerprint } from "@/app/hooks/useDeviceFingerprint";
import { throwIfNotOk } from "@/app/lib/api/apiError";
import { type ApiClient, createApiClient } from "@/app/lib/api/createApiClient";
import { supplierTokenStore } from "@/app/lib/api/portalTokenStores";
import { API_BASE_URL } from "@/lib/api-config";

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
  currencyCode?: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  primaryPhone?: string;
  faxNumber?: string;
  generalEmail?: string;
  website?: string;
  operationalRegions?: string[];
  industryType?: string;
  companySize?: "micro" | "small" | "medium" | "large" | "enterprise";
  // BEE fields
  // 1-8
  beeLevel?: number;
  beeCertificateExpiry?: string;
  beeVerificationAgency?: string;
  isExemptMicroEnterprise?: boolean;
}

export interface SupplierFullRegistrationDto {
  email: string;
  password: string;
  company: SupplierCompanyDto;
  profile: SupplierProfileDto;
  deviceFingerprint: string;
  browserInfo?: Record<string, any>;
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
  status: "draft" | "submitted" | "under_review" | "approved" | "rejected";
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

// BOQ Types
export type SupplierBoqStatus = "pending" | "viewed" | "quoted" | "declined" | "expired";

// Pump Quote Types
export type SupplierPumpQuoteStatus = "pending" | "viewed" | "quoted" | "declined" | "expired";

export interface SupplierPumpQuoteListItem {
  id: number;
  rfqNumber: string;
  projectName: string;
  customerName: string;
  pumpType: string;
  flowRate: number | null;
  totalHead: number | null;
  quantity: number;
  status: SupplierPumpQuoteStatus;
  requiredDate: string | null;
  createdAt: string;
  viewedAt: string | null;
  quotedAt: string | null;
}

export interface SupplierPumpQuoteDetailResponse {
  rfq: {
    id: number;
    rfqNumber: string;
    projectName: string;
    description?: string;
    status: string;
    requiredDate?: string;
    notes?: string;
  };
  customer: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
  };
  pump: {
    serviceType: string;
    pumpType: string;
    pumpCategory?: string;
    flowRate?: number;
    totalHead?: number;
    npshAvailable?: number;
    operatingTemp?: number;
    fluidType?: string;
    specificGravity?: number;
    viscosity?: number;
    casingMaterial?: string;
    impellerMaterial?: string;
    shaftMaterial?: string;
    sealType?: string;
    motorType?: string;
    voltage?: string;
    frequency?: string;
    quantity: number;
    existingPumpModel?: string;
    existingPumpSerial?: string;
    spareParts?: Array<{ partNumber: string; description: string; quantity: number }>;
    rentalDurationDays?: number;
  } | null;
  item: {
    id: number;
    description: string;
    quantity: number;
    notes?: string;
  } | null;
  accessStatus: SupplierPumpQuoteStatus;
  viewedAt: string;
}

export interface SupplierBoqListItem {
  id: number;
  boqNumber: string;
  title: string;
  status: SupplierBoqStatus;
  projectInfo?: {
    name: string;
    description?: string;
    requiredDate?: string;
  };
  customerInfo?: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
  };
  sections: {
    type: string;
    title: string;
    itemCount: number;
  }[];
  viewedAt?: string;
  respondedAt?: string;
  notificationSentAt?: string;
  createdAt: string;
}

export interface ConsolidatedItem {
  description: string;
  qty: number;
  unit: string;
  weightKg: number;
  entries: number[];
  welds?: {
    pipeWeld?: number;
    flangeWeld?: number;
    mitreWeld?: number;
    teeWeld?: number;
    gussetTeeWeld?: number;
    latWeld45Plus?: number;
    latWeldUnder45?: number;
  };
  areas?: {
    intAreaM2?: number;
    extAreaM2?: number;
  };
}

export interface BoqSection {
  id: number;
  sectionType: string;
  sectionTitle: string;
  items: ConsolidatedItem[];
  totalWeightKg: number;
  itemCount: number;
}

export interface SupplierBoqDetailResponse {
  boq: {
    id: number;
    boqNumber: string;
    title: string;
    description?: string;
    status: string;
  };
  projectInfo?: {
    name: string;
    description?: string;
    requiredDate?: string;
  };
  customerInfo?: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
  };
  accessStatus: SupplierBoqStatus;
  viewedAt: string;
  sections: BoqSection[];
}

export interface RfqItemDetail {
  id: number;
  lineNumber: number;
  itemType: string;
  description: string;
  quantity: number;
  totalWeightKg: number;
  weightPerUnitKg?: number;
  notes?: string;
  flangeStandardCode?: string;
  flangePressureClassDesignation?: string;
  straightPipeDetails?: {
    nominalBoreMm: number;
    scheduleNumber?: string;
    wallThicknessMm?: number;
    pipeStandard?: string;
    individualPipeLength?: number;
    totalLength?: number;
    quantityType?: string;
    quantityValue?: number;
    pipeEndConfiguration?: string;
    calculatedOdMm?: number;
    numberOfButtWelds?: number;
    totalButtWeldLengthM?: number;
    numberOfFlangeWelds?: number;
    totalFlangeWeldLengthM?: number;
    calculationData?: Record<string, any>;
  };
  bendDetails?: {
    nominalBoreMm: number;
    scheduleNumber?: string;
    wallThicknessMm?: number;
    pipeStandard?: string;
    bendDegrees?: number;
    bendType?: string;
    bendRadiusType?: string;
    bendEndConfiguration?: string;
    numberOfTangents?: number;
    tangentLengths?: number[];
    centerToFaceMm?: number;
    numberOfSegments?: number;
    stubLengths?: number[];
    numberOfFlangeWelds?: number;
    totalFlangeWeldLengthM?: number;
    numberOfButtWelds?: number;
    totalButtWeldLengthM?: number;
    calculationData?: Record<string, any>;
  };
  fittingDetails?: {
    nominalDiameterMm: number;
    branchNominalDiameterMm?: number;
    scheduleNumber?: string;
    wallThicknessMm?: number;
    fittingType?: string;
    fittingStandard?: string;
    pipeLengthAMm?: number;
    pipeLengthBMm?: number;
    pipeEndConfiguration?: string;
    addBlankFlange?: boolean;
    blankFlangeCount?: number;
    numberOfFlangeWelds?: number;
    numberOfTeeWelds?: number;
    numberOfFlanges?: number;
    calculationData?: Record<string, any>;
  };
}

const supplierRefreshHandler = async (): Promise<boolean> => {
  const currentRefreshToken = supplierTokenStore.refreshToken();
  if (!currentRefreshToken) return false;

  try {
    const fingerprint = getStoredFingerprint();
    const result = await fetch(`${API_BASE_URL}/supplier/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: currentRefreshToken, deviceFingerprint: fingerprint }),
    });

    if (!result.ok) {
      supplierTokenStore.clear();
      return false;
    }

    const data = await result.json();
    supplierTokenStore.setTokens(
      data.accessToken,
      data.refreshToken,
      supplierTokenStore.rememberMe(),
    );
    return true;
  } catch {
    supplierTokenStore.clear();
    return false;
  }
};

const apiClient: ApiClient = createApiClient({
  baseURL: API_BASE_URL,
  tokenStore: supplierTokenStore,
  refreshHandler: supplierRefreshHandler,
});

class SupplierApiClient {
  baseURL = API_BASE_URL;
  tokens = supplierTokenStore;

  private setTokens(accessToken: string, refreshToken: string, rememberMe = false) {
    this.tokens.setTokens(accessToken, refreshToken, rememberMe);
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

  async register(data: SupplierRegistrationDto): Promise<{ success: boolean; message: string }> {
    return apiClient.post("/supplier/auth/register", data);
  }

  async registerFull(formData: FormData): Promise<SupplierAuthResponse> {
    const response = await fetch(`${API_BASE_URL}/supplier/auth/register-full`, {
      method: "POST",
      body: formData,
    });

    await throwIfNotOk(response);

    const result = await response.json();
    this.setTokens(result.accessToken, result.refreshToken);
    return result;
  }

  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    return apiClient.get(`/supplier/auth/verify-email/${token}`);
  }

  async resendVerification(email: string): Promise<{ success: boolean; message: string }> {
    return apiClient.post("/supplier/auth/resend-verification", { email });
  }

  async login(data: SupplierLoginDto, rememberMe: boolean = false): Promise<SupplierAuthResponse> {
    const result = await apiClient.post<SupplierAuthResponse>("/supplier/auth/login", data);
    this.setTokens(result.accessToken, result.refreshToken, rememberMe);
    return result;
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post("/supplier/auth/logout");
    } finally {
      this.clearTokens();
    }
  }

  refreshAccessToken(): Promise<boolean> {
    return apiClient.refreshAccessToken();
  }

  // Profile endpoints
  async getProfile(): Promise<any> {
    return this.request("/supplier/profile");
  }

  async updateProfile(data: SupplierProfileDto): Promise<any> {
    return this.request("/supplier/profile", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // Dashboard
  async getDashboard(): Promise<SupplierDashboardResponse> {
    return this.request<SupplierDashboardResponse>("/supplier/dashboard");
  }

  // Onboarding
  async getOnboardingStatus(): Promise<OnboardingStatusResponse> {
    return this.request<OnboardingStatusResponse>("/supplier/onboarding/status");
  }

  async saveCompanyDetails(data: SupplierCompanyDto): Promise<any> {
    return this.request("/supplier/onboarding/company", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getDocuments(): Promise<SupplierDocumentDto[]> {
    return this.request<SupplierDocumentDto[]>("/supplier/onboarding/documents");
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
  ): Promise<SupplierDocumentDto> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("documentType", documentType);
    if (expiryDate) {
      formData.append("expiryDate", expiryDate);
    }
    if (verificationResult) {
      formData.append("verificationResult", JSON.stringify(verificationResult));
    }

    const headers: Record<string, string> = {};
    const token = this.tokens.accessToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}/supplier/onboarding/documents`, {
      method: "POST",
      headers,
      body: formData,
    });

    await throwIfNotOk(response);

    return response.json();
  }

  async deleteDocument(documentId: number): Promise<void> {
    await this.request(`/supplier/onboarding/documents/${documentId}`, {
      method: "DELETE",
    });
  }

  async downloadDocument(documentId: number): Promise<void> {
    const { blob, filename } = await this.fetchDocumentBlob(documentId);

    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  }

  async previewDocument(
    documentId: number,
  ): Promise<{ url: string; mimeType: string; filename: string }> {
    const { blob, filename } = await this.fetchDocumentBlob(documentId);
    const url = URL.createObjectURL(blob);
    return { url, mimeType: blob.type, filename };
  }

  private async fetchDocumentBlob(documentId: number): Promise<{ blob: Blob; filename: string }> {
    const url = `${this.baseURL}/supplier/onboarding/documents/${documentId}/download`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.tokens.accessToken()}`,
      },
    });

    await throwIfNotOk(response);

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

  async submitOnboarding(): Promise<{ success: boolean; message: string }> {
    return this.request("/supplier/onboarding/submit", {
      method: "POST",
    });
  }

  async getCapabilities(): Promise<{ capabilities: string[] }> {
    return this.request("/supplier/onboarding/capabilities");
  }

  async saveCapabilities(
    capabilities: string[],
  ): Promise<{ capabilities: string[]; message: string }> {
    return this.request("/supplier/onboarding/capabilities", {
      method: "POST",
      body: JSON.stringify({ capabilities }),
    });
  }

  // BOQ endpoints
  async getMyBoqs(status?: SupplierBoqStatus): Promise<SupplierBoqListItem[]> {
    const queryString = status ? `?status=${status}` : "";
    return this.request<SupplierBoqListItem[]>(`/supplier/boqs${queryString}`);
  }

  async getBoqDetails(boqId: number): Promise<SupplierBoqDetailResponse> {
    return this.request<SupplierBoqDetailResponse>(`/supplier/boqs/${boqId}`);
  }

  async markBoqViewed(
    boqId: number,
  ): Promise<{ success: boolean; viewedAt: string; status: string }> {
    return this.request(`/supplier/boqs/${boqId}/view`, {
      method: "POST",
    });
  }

  async declineBoq(
    boqId: number,
    reason: string,
  ): Promise<{ success: boolean; status: string; respondedAt: string }> {
    return this.request(`/supplier/boqs/${boqId}/decline`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }

  async setBoqReminder(
    boqId: number,
    reminderDays: string,
  ): Promise<{ success: boolean; reminderDays: string | null }> {
    return this.request(`/supplier/boqs/${boqId}/reminder`, {
      method: "POST",
      body: JSON.stringify({
        reminderDays: reminderDays === "none" ? null : parseInt(reminderDays, 10),
      }),
    });
  }

  async getRfqItems(boqId: number): Promise<RfqItemDetail[]> {
    return this.request<RfqItemDetail[]>(`/supplier/boqs/${boqId}/rfq-items`);
  }

  async saveQuoteProgress(
    boqId: number,
    data: {
      pricingInputs: Record<string, any>;
      unitPrices: Record<string, Record<number, number>>;
      weldUnitPrices: Record<string, number>;
    },
  ): Promise<{ success: boolean; savedAt: string }> {
    return this.request(`/supplier/boqs/${boqId}/quote/save`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async submitQuote(
    boqId: number,
    data: {
      pricingInputs: Record<string, any>;
      unitPrices: Record<string, Record<number, number>>;
      weldUnitPrices: Record<string, number>;
      notes?: string;
    },
  ): Promise<{ success: boolean; status: string; submittedAt: string }> {
    return this.request(`/supplier/boqs/${boqId}/quote/submit`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Pump quote endpoints
  async getMyPumpQuotes(status?: SupplierPumpQuoteStatus): Promise<SupplierPumpQuoteListItem[]> {
    const queryString = status ? `?status=${status}` : "";
    return this.request<SupplierPumpQuoteListItem[]>(`/supplier/pump-quotes${queryString}`);
  }

  async getPumpQuoteDetails(rfqId: number): Promise<SupplierPumpQuoteDetailResponse> {
    return this.request<SupplierPumpQuoteDetailResponse>(`/supplier/pump-quotes/${rfqId}`);
  }

  async markPumpQuoteViewed(
    rfqId: number,
  ): Promise<{ success: boolean; viewedAt: string; status: string }> {
    return this.request(`/supplier/pump-quotes/${rfqId}/view`, {
      method: "POST",
    });
  }

  async declinePumpQuote(
    rfqId: number,
    reason: string,
  ): Promise<{ success: boolean; status: string; respondedAt: string }> {
    return this.request(`/supplier/pump-quotes/${rfqId}/decline`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }

  async submitPumpQuote(
    rfqId: number,
    data: {
      unitPrice: number;
      totalPrice: number;
      leadTimeDays?: number;
      notes?: string;
      breakdown?: Record<string, number>;
    },
  ): Promise<{ success: boolean; status: string; quotedAt: string }> {
    return this.request(`/supplier/pump-quotes/${rfqId}/quote`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
}

export const supplierApiClient = new SupplierApiClient();

export const supplierAuthApi = {
  register: (data: SupplierRegistrationDto) => supplierApiClient.register(data),
  registerFull: (formData: FormData) => supplierApiClient.registerFull(formData),
  verifyEmail: (token: string) => supplierApiClient.verifyEmail(token),
  resendVerification: (email: string) => supplierApiClient.resendVerification(email),
  login: (data: SupplierLoginDto, rememberMe: boolean = false) =>
    supplierApiClient.login(data, rememberMe),
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
  uploadDocument: (
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
  ) => supplierApiClient.uploadDocument(file, documentType, expiryDate, verificationResult),
  deleteDocument: (documentId: number) => supplierApiClient.deleteDocument(documentId),
  downloadDocument: (documentId: number) => supplierApiClient.downloadDocument(documentId),
  previewDocument: (documentId: number) => supplierApiClient.previewDocument(documentId),
  submitOnboarding: () => supplierApiClient.submitOnboarding(),
  getCapabilities: () => supplierApiClient.getCapabilities(),
  saveCapabilities: (capabilities: string[]) => supplierApiClient.saveCapabilities(capabilities),
  // BOQ methods
  getMyBoqs: (status?: SupplierBoqStatus) => supplierApiClient.getMyBoqs(status),
  getBoqDetails: (boqId: number) => supplierApiClient.getBoqDetails(boqId),
  markBoqViewed: (boqId: number) => supplierApiClient.markBoqViewed(boqId),
  declineBoq: (boqId: number, reason: string) => supplierApiClient.declineBoq(boqId, reason),
  setBoqReminder: (boqId: number, reminderDays: string) =>
    supplierApiClient.setBoqReminder(boqId, reminderDays),
  getRfqItems: (boqId: number) => supplierApiClient.getRfqItems(boqId),
  saveQuoteProgress: (
    boqId: number,
    data: {
      pricingInputs: Record<string, any>;
      unitPrices: Record<string, Record<number, number>>;
      weldUnitPrices: Record<string, number>;
    },
  ) => supplierApiClient.saveQuoteProgress(boqId, data),
  submitQuote: (
    boqId: number,
    data: {
      pricingInputs: Record<string, any>;
      unitPrices: Record<string, Record<number, number>>;
      weldUnitPrices: Record<string, number>;
      notes?: string;
    },
  ) => supplierApiClient.submitQuote(boqId, data),
  // Pump quote methods
  getMyPumpQuotes: (status?: SupplierPumpQuoteStatus) => supplierApiClient.getMyPumpQuotes(status),
  getPumpQuoteDetails: (rfqId: number) => supplierApiClient.getPumpQuoteDetails(rfqId),
  markPumpQuoteViewed: (rfqId: number) => supplierApiClient.markPumpQuoteViewed(rfqId),
  declinePumpQuote: (rfqId: number, reason: string) =>
    supplierApiClient.declinePumpQuote(rfqId, reason),
  submitPumpQuote: (
    rfqId: number,
    data: {
      unitPrice: number;
      totalPrice: number;
      leadTimeDays?: number;
      notes?: string;
      breakdown?: Record<string, number>;
    },
  ) => supplierApiClient.submitPumpQuote(rfqId, data),
};
