import { API_BASE_URL } from "@/lib/api-config";

export interface StockControlLoginDto {
  email: string;
  password: string;
}

export interface StockControlUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

export interface StockControlLoginResponse {
  accessToken: string;
  refreshToken: string;
  user: StockControlUser;
}

export interface StockControlUserProfile {
  id: number;
  email: string;
  name: string;
  role: string;
  companyId: number;
  companyName: string | null;
  brandingType: string;
  primaryColor: string | null;
  accentColor: string | null;
  logoUrl: string | null;
  heroImageUrl: string | null;
  registrationNumber: string | null;
  vatNumber: string | null;
  streetAddress: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  phone: string | null;
  companyEmail: string | null;
  websiteUrl: string | null;
  createdAt: string;
}

export interface CompanyDetailsUpdate {
  name?: string;
  registrationNumber?: string;
  vatNumber?: string;
  streetAddress?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  websiteUrl?: string;
}

export interface StockControlCompany {
  id: number;
  name: string;
  brandingType: string;
  websiteUrl: string | null;
  brandingAuthorized: boolean;
}

export interface StockControlInvitation {
  id: number;
  companyId: number;
  invitedById: number;
  email: string;
  token: string;
  role: string;
  status: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  invitedBy?: { name: string; email: string };
}

export interface StockControlTeamMember {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface StockItem {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  unitOfMeasure: string;
  costPerUnit: number;
  quantity: number;
  minStockLevel: number;
  location: string | null;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobCardLineItem {
  id: number;
  jobCardId: number;
  itemCode: string | null;
  itemDescription: string | null;
  itemNo: string | null;
  quantity: number | null;
  jtNo: string | null;
  sortOrder: number;
  companyId: number;
  createdAt: string;
}

export interface JobCard {
  id: number;
  jobNumber: string;
  jobName: string;
  customerName: string | null;
  description: string | null;
  poNumber: string | null;
  siteLocation: string | null;
  contactPerson: string | null;
  dueDate: string | null;
  notes: string | null;
  reference: string | null;
  customFields: Record<string, string> | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  allocations?: StockAllocation[];
  lineItems?: JobCardLineItem[];
}

export interface StockAllocation {
  id: number;
  quantityUsed: number;
  photoUrl: string | null;
  notes: string | null;
  allocatedBy: string | null;
  createdAt: string;
  stockItem?: StockItem;
  jobCard?: JobCard;
}

export interface DeliveryNote {
  id: number;
  deliveryNumber: string;
  supplierName: string;
  receivedDate: string;
  notes: string | null;
  photoUrl: string | null;
  receivedBy: string | null;
  createdAt: string;
  items: DeliveryNoteItem[];
}

export interface DeliveryNoteItem {
  id: number;
  quantityReceived: number;
  photoUrl: string | null;
  stockItem?: StockItem;
}

export interface StockMovement {
  id: number;
  movementType: string;
  quantity: number;
  referenceType: string | null;
  referenceId: number | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  stockItem?: StockItem;
}

export interface DashboardStats {
  totalItems: number;
  totalValue: number;
  lowStockCount: number;
  activeJobs: number;
}

export interface SohSummary {
  category: string;
  totalQuantity: number;
  totalValue: number;
}

export interface RecentActivity {
  id: number;
  movementType: string;
  quantity: number;
  itemName: string;
  itemSku: string;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface CostByJob {
  jobCardId: number;
  jobNumber: string;
  jobName: string;
  customerName: string | null;
  totalCost: number;
  totalItemsAllocated: number;
}

export interface StockValuation {
  items: {
    id: number;
    sku: string;
    name: string;
    category: string | null;
    quantity: number;
    costPerUnit: number;
    totalValue: number;
  }[];
  totalValue: number;
}

export interface ImportResult {
  totalRows: number;
  created: number;
  updated: number;
  errors: { row: number; message: string }[];
}

export interface FieldMapping {
  column: number;
  startRow: number;
  endRow: number;
}

export interface CustomFieldMapping {
  fieldName: string;
  column: number;
  startRow: number;
  endRow: number;
}

export interface ImportMappingConfig {
  jobNumber: FieldMapping | null;
  jobName: FieldMapping | null;
  customerName: FieldMapping | null;
  description: FieldMapping | null;
  poNumber: FieldMapping | null;
  siteLocation: FieldMapping | null;
  contactPerson: FieldMapping | null;
  dueDate: FieldMapping | null;
  notes: FieldMapping | null;
  reference: FieldMapping | null;
  customFields: CustomFieldMapping[];
  lineItems: {
    itemCode: FieldMapping | null;
    itemDescription: FieldMapping | null;
    itemNo: FieldMapping | null;
    quantity: FieldMapping | null;
    jtNo: FieldMapping | null;
  };
}

export interface JobCardImportMapping {
  id: number;
  companyId: number;
  mappingConfig: ImportMappingConfig | null;
  createdAt: string;
  updatedAt: string;
}

export interface LineItemImportRow {
  itemCode?: string;
  itemDescription?: string;
  itemNo?: string;
  quantity?: string;
  jtNo?: string;
}

export interface JobCardImportRow {
  jobNumber?: string;
  jobName?: string;
  customerName?: string;
  description?: string;
  poNumber?: string;
  siteLocation?: string;
  contactPerson?: string;
  dueDate?: string;
  notes?: string;
  reference?: string;
  customFields?: Record<string, string>;
  lineItems?: LineItemImportRow[];
}

export interface JobCardImportResult {
  totalRows: number;
  created: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

export interface JobCardImportUploadResponse {
  grid: string[][];
  savedMapping: JobCardImportMapping | null;
}

export interface InvitationValidation {
  valid: boolean;
  email?: string;
  role?: string;
  companyName?: string | null;
  status?: string;
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

export interface ProcessedBrandingResult {
  logoUrl: string | null;
  heroImageUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
}

const TOKEN_KEYS = {
  accessToken: "stockControlAccessToken",
  refreshToken: "stockControlRefreshToken",
} as const;

class StockControlApiClient {
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

  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch(`${this.baseURL}/stock-control/auth/refresh`, {
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

  async login(dto: StockControlLoginDto): Promise<StockControlLoginResponse> {
    const response = await this.request<StockControlLoginResponse>("/stock-control/auth/login", {
      method: "POST",
      body: JSON.stringify(dto),
    });

    this.setTokens(response.accessToken, response.refreshToken);
    return response;
  }

  async register(dto: {
    email: string;
    password: string;
    name: string;
    companyName?: string;
    invitationToken?: string;
  }): Promise<{ message: string; user: StockControlUser; isInvitedUser: boolean }> {
    return this.request("/stock-control/auth/register", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }

  async verifyEmail(
    token: string,
  ): Promise<{ message: string; userId: number; email: string; needsBranding: boolean }> {
    const response = await this.request<{
      message: string;
      userId: number;
      email: string;
      needsBranding: boolean;
      accessToken?: string;
      refreshToken?: string;
    }>(`/stock-control/auth/verify-email?token=${encodeURIComponent(token)}`);

    if (response.accessToken && response.refreshToken) {
      this.setTokens(response.accessToken, response.refreshToken);
    }

    return response;
  }

  async updateCompanyDetails(details: CompanyDetailsUpdate): Promise<{ message: string }> {
    return this.request("/stock-control/auth/company-details", {
      method: "PATCH",
      body: JSON.stringify(details),
    });
  }

  async updateCompanyName(name: string): Promise<{ message: string }> {
    return this.updateCompanyDetails({ name });
  }

  async scrapeBranding(websiteUrl: string): Promise<ScrapedBrandingCandidates> {
    return this.request("/stock-control/auth/scrape-branding", {
      method: "POST",
      body: JSON.stringify({ websiteUrl }),
    });
  }

  async processBrandingSelection(data: {
    logoSourceUrl?: string;
    heroSourceUrl?: string;
    scrapedPrimaryColor?: string;
  }): Promise<ProcessedBrandingResult> {
    return this.request("/stock-control/auth/process-branding-selection", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  proxyImageUrl(url: string): string {
    return `${this.baseURL}/stock-control/auth/proxy-image?url=${encodeURIComponent(url)}`;
  }

  authHeaders(): Record<string, string> {
    return this.headers();
  }

  async setBranding(data: {
    brandingType: string;
    websiteUrl?: string;
    brandingAuthorized?: boolean;
    primaryColor?: string;
    accentColor?: string;
    logoUrl?: string;
    heroImageUrl?: string;
  }): Promise<{ message: string }> {
    return this.request("/stock-control/auth/set-branding", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    return this.request("/stock-control/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    return this.request("/stock-control/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
  }

  async resendVerification(email: string): Promise<{ message: string }> {
    return this.request("/stock-control/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async logout(): Promise<void> {
    try {
      await this.request("/stock-control/auth/logout", { method: "POST" });
    } finally {
      this.clearTokens();
    }
  }

  async currentUser(): Promise<StockControlUserProfile> {
    return this.request<StockControlUserProfile>("/stock-control/auth/me");
  }

  async teamMembers(): Promise<StockControlTeamMember[]> {
    return this.request("/stock-control/auth/team");
  }

  async updateMemberRole(userId: number, role: string): Promise<{ message: string }> {
    return this.request(`/stock-control/auth/team/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  }

  async companyInvitations(): Promise<StockControlInvitation[]> {
    return this.request("/stock-control/invitations");
  }

  async createInvitation(email: string, role: string): Promise<StockControlInvitation> {
    return this.request("/stock-control/invitations", {
      method: "POST",
      body: JSON.stringify({ email, role }),
    });
  }

  async cancelInvitation(id: number): Promise<{ message: string }> {
    return this.request(`/stock-control/invitations/${id}`, { method: "DELETE" });
  }

  async resendInvitation(id: number): Promise<StockControlInvitation> {
    return this.request(`/stock-control/invitations/${id}/resend`, { method: "POST" });
  }

  async validateInvitation(token: string): Promise<InvitationValidation> {
    return this.request(`/stock-control/invitations/validate/${encodeURIComponent(token)}`);
  }

  async stockItems(params?: {
    category?: string;
    belowMinStock?: string;
    search?: string;
    page?: string;
    limit?: string;
  }): Promise<{ items: StockItem[]; total: number }> {
    const query = params
      ? "?" +
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
          .join("&")
      : "";
    return this.request(`/stock-control/inventory${query}`);
  }

  async stockItemById(id: number): Promise<StockItem> {
    return this.request(`/stock-control/inventory/${id}`);
  }

  async createStockItem(data: Partial<StockItem>): Promise<StockItem> {
    return this.request("/stock-control/inventory", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateStockItem(id: number, data: Partial<StockItem>): Promise<StockItem> {
    return this.request(`/stock-control/inventory/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteStockItem(id: number): Promise<void> {
    return this.request(`/stock-control/inventory/${id}`, { method: "DELETE" });
  }

  async lowStockAlerts(): Promise<StockItem[]> {
    return this.request("/stock-control/inventory/low-stock");
  }

  async categories(): Promise<string[]> {
    return this.request("/stock-control/inventory/categories");
  }

  async jobCards(status?: string): Promise<JobCard[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return this.request(`/stock-control/job-cards${query}`);
  }

  async jobCardById(id: number): Promise<JobCard> {
    return this.request(`/stock-control/job-cards/${id}`);
  }

  async createJobCard(data: Partial<JobCard>): Promise<JobCard> {
    return this.request("/stock-control/job-cards", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateJobCard(id: number, data: Partial<JobCard>): Promise<JobCard> {
    return this.request(`/stock-control/job-cards/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteJobCard(id: number): Promise<void> {
    return this.request(`/stock-control/job-cards/${id}`, { method: "DELETE" });
  }

  async allocateStock(
    jobCardId: number,
    data: {
      stockItemId: number;
      quantityUsed: number;
      photoUrl?: string;
      notes?: string;
    },
  ): Promise<StockAllocation> {
    return this.request(`/stock-control/job-cards/${jobCardId}/allocate`, {
      method: "POST",
      body: JSON.stringify({ ...data, jobCardId }),
    });
  }

  async jobCardAllocations(jobCardId: number): Promise<StockAllocation[]> {
    return this.request(`/stock-control/job-cards/${jobCardId}/allocations`);
  }

  async uploadAllocationPhoto(
    jobCardId: number,
    allocationId: number,
    file: File,
  ): Promise<StockAllocation> {
    const formData = new FormData();
    formData.append("file", file);

    const url = `${this.baseURL}/stock-control/job-cards/${jobCardId}/allocations/${allocationId}/photo`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${errorText}`);
    }

    return response.json();
  }

  async deliveryNotes(): Promise<DeliveryNote[]> {
    return this.request("/stock-control/deliveries");
  }

  async deliveryNoteById(id: number): Promise<DeliveryNote> {
    return this.request(`/stock-control/deliveries/${id}`);
  }

  async createDeliveryNote(data: {
    deliveryNumber: string;
    supplierName: string;
    receivedDate?: string;
    notes?: string;
    receivedBy?: string;
    items: { stockItemId: number; quantityReceived: number }[];
  }): Promise<DeliveryNote> {
    return this.request("/stock-control/deliveries", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deleteDeliveryNote(id: number): Promise<void> {
    return this.request(`/stock-control/deliveries/${id}`, { method: "DELETE" });
  }

  async uploadDeliveryPhoto(id: number, file: File): Promise<DeliveryNote> {
    const formData = new FormData();
    formData.append("file", file);

    const url = `${this.baseURL}/stock-control/deliveries/${id}/photo`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${errorText}`);
    }

    return response.json();
  }

  async stockMovements(params?: {
    stockItemId?: number;
    movementType?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<StockMovement[]> {
    const query = params
      ? "?" +
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
          .join("&")
      : "";
    return this.request(`/stock-control/movements${query}`);
  }

  async createManualAdjustment(data: {
    stockItemId: number;
    movementType: string;
    quantity: number;
    notes?: string;
  }): Promise<StockMovement> {
    return this.request("/stock-control/movements/adjustment", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async uploadImportFile(file: File): Promise<unknown[]> {
    const formData = new FormData();
    formData.append("file", file);

    const url = `${this.baseURL}/stock-control/import/upload`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Import failed: ${errorText}`);
    }

    const data = await response.json();
    return data.rows ?? [];
  }

  async confirmImport(rows: unknown[]): Promise<ImportResult> {
    return this.request("/stock-control/import/confirm", {
      method: "POST",
      body: JSON.stringify({ rows }),
    });
  }

  async uploadJobCardImportFile(file: File): Promise<JobCardImportUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const url = `${this.baseURL}/stock-control/job-card-import/upload`;
    const { Authorization } = this.headers();
    let response = await fetch(url, {
      method: "POST",
      headers: { ...(Authorization ? { Authorization } : {}) },
      body: formData,
    });

    if (response.status === 401 && this.refreshToken) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        const { Authorization: newAuth } = this.headers();
        response = await fetch(url, {
          method: "POST",
          headers: { ...(newAuth ? { Authorization: newAuth } : {}) },
          body: formData,
        });
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Import failed: ${errorText}`);
    }

    return response.json();
  }

  async jobCardImportMapping(): Promise<JobCardImportMapping | null> {
    return this.request("/stock-control/job-card-import/mapping");
  }

  async saveJobCardImportMapping(
    mappingConfig: ImportMappingConfig,
  ): Promise<JobCardImportMapping> {
    return this.request("/stock-control/job-card-import/mapping", {
      method: "POST",
      body: JSON.stringify({ mappingConfig }),
    });
  }

  async confirmJobCardImport(rows: JobCardImportRow[]): Promise<JobCardImportResult> {
    return this.request("/stock-control/job-card-import/confirm", {
      method: "POST",
      body: JSON.stringify({ rows }),
    });
  }

  async dashboardStats(): Promise<DashboardStats> {
    return this.request("/stock-control/dashboard/stats");
  }

  async sohSummary(): Promise<SohSummary[]> {
    return this.request("/stock-control/dashboard/soh-summary");
  }

  async recentActivity(): Promise<RecentActivity[]> {
    return this.request("/stock-control/dashboard/recent-activity");
  }

  async reorderAlerts(): Promise<StockItem[]> {
    return this.request("/stock-control/dashboard/reorder-alerts");
  }

  async costByJob(): Promise<CostByJob[]> {
    return this.request("/stock-control/reports/cost-by-job");
  }

  async stockValuation(): Promise<StockValuation> {
    return this.request("/stock-control/reports/stock-valuation");
  }

  async movementHistory(params?: {
    startDate?: string;
    endDate?: string;
    movementType?: string;
    stockItemId?: number;
  }): Promise<StockMovement[]> {
    const query = params
      ? "?" +
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
          .join("&")
      : "";
    return this.request(`/stock-control/reports/movement-history${query}`);
  }
}

export const stockControlApiClient = new StockControlApiClient();
