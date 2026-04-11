import type {
  CreateProductCategoryInput,
  CreateRubberCompoundInput,
  CreateVarianceCategoryInput,
  LocationCandidateInput,
  LocationClassificationSuggestionDto,
  ProductDatasheetDto,
  ResolveDispositionInput,
  RubberCompoundDto,
  StockHoldItemDto,
  VarianceCategoryDto,
} from "../types/admin";
import type {
  CreateIssuanceSessionDto,
  IssuanceSessionDto,
  IssuanceSessionFiltersDto,
  IssuanceSessionListResultDto,
} from "../types/issuance";
import type {
  StockManagementFeatureKey,
  StockManagementLicenseSnapshot,
  StockManagementTier,
} from "../types/license";
import type {
  IssuableProductDto,
  IssuableProductListResultDto,
  IssuableProductType,
  ProductCategoryDto,
} from "../types/products";

export interface StockManagementApiClientOptions {
  baseUrl: string;
  headers?: () => Record<string, string>;
}

export class StockManagementApiClient {
  constructor(private readonly options: StockManagementApiClientOptions) {}

  async licenseSelf(): Promise<StockManagementLicenseSnapshot> {
    return this.request("GET", "/license/self");
  }

  async licenseByCompany(companyId: number): Promise<StockManagementLicenseSnapshot> {
    return this.request("GET", `/license/${companyId}`);
  }

  async setTier(
    companyId: number,
    tier: StockManagementTier,
    notes?: string,
  ): Promise<StockManagementLicenseSnapshot> {
    return this.request("PATCH", `/license/${companyId}/tier`, { tier, notes });
  }

  async setFeatureOverride(
    companyId: number,
    feature: StockManagementFeatureKey,
    enabled: boolean | null,
  ): Promise<StockManagementLicenseSnapshot> {
    return this.request("PATCH", `/license/${companyId}/feature-override`, { feature, enabled });
  }

  async setValidity(
    companyId: number,
    validFrom: string | null,
    validUntil: string | null,
  ): Promise<StockManagementLicenseSnapshot> {
    return this.request("PATCH", `/license/${companyId}/validity`, { validFrom, validUntil });
  }

  async setActive(companyId: number, active: boolean): Promise<StockManagementLicenseSnapshot> {
    return this.request("PATCH", `/license/${companyId}/active`, { active });
  }

  async listProducts(
    filters: {
      productType?: IssuableProductType;
      categoryId?: number;
      active?: boolean;
      search?: string;
      page?: number;
      pageSize?: number;
    } = {},
  ): Promise<IssuableProductListResultDto> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    }
    const query = params.toString();
    return this.request("GET", `/products${query ? `?${query}` : ""}`);
  }

  async productById(id: number): Promise<IssuableProductDto> {
    return this.request("GET", `/products/${id}`);
  }

  async listProductCategories(productType?: IssuableProductType): Promise<ProductCategoryDto[]> {
    const path = productType
      ? `/product-categories?productType=${productType}`
      : "/product-categories";
    return this.request("GET", path);
  }

  async listIssuanceSessions(
    filters: IssuanceSessionFiltersDto = {},
  ): Promise<IssuanceSessionListResultDto> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    }
    const query = params.toString();
    return this.request("GET", `/issuance/sessions${query ? `?${query}` : ""}`);
  }

  async issuanceSessionById(id: number): Promise<IssuanceSessionDto> {
    return this.request("GET", `/issuance/sessions/${id}`);
  }

  async createIssuanceSession(dto: CreateIssuanceSessionDto): Promise<IssuanceSessionDto> {
    return this.request("POST", "/issuance/sessions", dto);
  }

  async undoIssuanceSession(id: number): Promise<IssuanceSessionDto> {
    return this.request("POST", `/issuance/sessions/${id}/undo`);
  }

  async createProductCategory(dto: CreateProductCategoryInput): Promise<ProductCategoryDto> {
    return this.request("POST", "/product-categories", dto);
  }

  async updateProductCategory(
    id: number,
    dto: Partial<CreateProductCategoryInput>,
  ): Promise<ProductCategoryDto> {
    return this.request("PATCH", `/product-categories/${id}`, dto);
  }

  async deleteProductCategory(id: number): Promise<ProductCategoryDto> {
    return this.request("DELETE", `/product-categories/${id}`);
  }

  async seedProductCategories(): Promise<{ created: number }> {
    return this.request("POST", "/product-categories/seed");
  }

  async listRubberCompounds(includeInactive = false): Promise<RubberCompoundDto[]> {
    return this.request(
      "GET",
      `/rubber-compounds${includeInactive ? "?includeInactive=true" : ""}`,
    );
  }

  async createRubberCompound(dto: CreateRubberCompoundInput): Promise<RubberCompoundDto> {
    return this.request("POST", "/rubber-compounds", dto);
  }

  async updateRubberCompound(
    id: number,
    dto: Partial<CreateRubberCompoundInput> & { active?: boolean },
  ): Promise<RubberCompoundDto> {
    return this.request("PATCH", `/rubber-compounds/${id}`, dto);
  }

  async seedRubberCompounds(): Promise<{ created: number }> {
    return this.request("POST", "/rubber-compounds/seed");
  }

  async listVarianceCategories(includeInactive = false): Promise<VarianceCategoryDto[]> {
    return this.request(
      "GET",
      `/variance-categories${includeInactive ? "?includeInactive=true" : ""}`,
    );
  }

  async createVarianceCategory(dto: CreateVarianceCategoryInput): Promise<VarianceCategoryDto> {
    return this.request("POST", "/variance-categories", dto);
  }

  async updateVarianceCategory(
    id: number,
    dto: Partial<CreateVarianceCategoryInput> & { active?: boolean },
  ): Promise<VarianceCategoryDto> {
    return this.request("PATCH", `/variance-categories/${id}`, dto);
  }

  async seedVarianceCategories(): Promise<{ created: number }> {
    return this.request("POST", "/variance-categories/seed");
  }

  async listStockHold(status?: StockHoldItemDto["dispositionStatus"]): Promise<StockHoldItemDto[]> {
    return this.request("GET", `/stock-hold${status ? `?status=${status}` : ""}`);
  }

  async listPendingStockHold(): Promise<StockHoldItemDto[]> {
    return this.request("GET", "/stock-hold/pending");
  }

  async stockHoldAging(): Promise<{ fresh: number; week: number; month: number; older: number }> {
    return this.request("GET", "/stock-hold/aging");
  }

  async resolveStockHold(id: number, dto: ResolveDispositionInput): Promise<StockHoldItemDto> {
    return this.request("POST", `/stock-hold/${id}/resolve`, dto);
  }

  async flagStockHold(input: {
    productId: number;
    stockTakeId?: number | null;
    quantity?: number | null;
    reason: "damaged" | "expired" | "contaminated" | "recalled" | "wrong_spec" | "other";
    reasonNotes: string;
    photoUrl?: string | null;
    notes?: string | null;
  }): Promise<StockHoldItemDto> {
    return this.request("POST", "/stock-hold/flag", input);
  }

  async ensureUnassignedLocation(): Promise<{ id: number; name: string }> {
    return this.request("GET", "/location-migration/unassigned-location");
  }

  async assignToUnassignedLocation(productIds: number[]): Promise<{ updated: number }> {
    return this.request("POST", "/location-migration/assign-unassigned", { productIds });
  }

  async listProductDatasheets(
    productType?: ProductDatasheetDto["productType"],
  ): Promise<ProductDatasheetDto[]> {
    return this.request("GET", `/datasheets${productType ? `?productType=${productType}` : ""}`);
  }

  async datasheetDownloadUrl(id: number): Promise<{ url: string }> {
    return this.request("GET", `/datasheets/${id}/download-url`);
  }

  async verifyDatasheet(id: number): Promise<ProductDatasheetDto> {
    return this.request("POST", `/datasheets/${id}/verify`);
  }

  async classifyUnassignedLocations(
    locations: LocationCandidateInput[],
  ): Promise<LocationClassificationSuggestionDto[]> {
    return this.request("POST", "/location-migration/classify", { locations });
  }

  async applyLocationClassifications(
    decisions: Array<{ productId: number; locationId: number | null }>,
  ): Promise<{ updated: number }> {
    return this.request("POST", "/location-migration/apply", { decisions });
  }

  async listStockTakes(status?: string): Promise<unknown[]> {
    return this.request("GET", `/stock-take${status ? `?status=${status}` : ""}`);
  }

  async stockTakeById(id: number): Promise<unknown> {
    return this.request("GET", `/stock-take/${id}`);
  }

  async createStockTake(dto: {
    name: string;
    periodLabel?: string | null;
    notes?: string | null;
  }): Promise<unknown> {
    return this.request("POST", "/stock-take", dto);
  }

  async captureStockTakeSnapshot(id: number): Promise<unknown> {
    return this.request("POST", `/stock-take/${id}/snapshot`);
  }

  async recordStockTakeCount(
    id: number,
    dto: {
      productId: number;
      countedQty: number;
      countedByStaffId: number;
      varianceCategoryId?: number | null;
      varianceReason?: string | null;
      photoUrl?: string | null;
    },
  ): Promise<unknown> {
    return this.request("POST", `/stock-take/${id}/count`, dto);
  }

  async submitStockTake(id: number): Promise<unknown> {
    return this.request("POST", `/stock-take/${id}/submit`);
  }

  async approveStockTake(id: number): Promise<unknown> {
    return this.request("POST", `/stock-take/${id}/approve`);
  }

  async rejectStockTake(id: number, reason: string): Promise<unknown> {
    return this.request("POST", `/stock-take/${id}/reject`, { reason });
  }

  async postStockTake(id: number): Promise<unknown> {
    return this.request("POST", `/stock-take/${id}/post`);
  }

  async listOutstandingReturns(): Promise<unknown[]> {
    return this.request("GET", "/returns/outstanding");
  }

  async createOffcutReturn(input: {
    targetIssuanceRowId?: number | null;
    sourceRubberRollId?: number | null;
    offcutNumber?: string | null;
    widthMm: number;
    lengthM: number;
    thicknessMm: number;
    compoundCode?: string | null;
    colour?: string | null;
    photoUrl?: string | null;
    notes?: string | null;
  }): Promise<unknown> {
    return this.request("POST", "/returns/rubber-offcut", input);
  }

  async createPaintReturn(input: {
    targetIssuanceRowId?: number | null;
    sourceProductId?: number | null;
    litresReturned: number;
    condition: "usable" | "contaminated";
    batchNumber?: string | null;
    photoUrl?: string | null;
    notes?: string | null;
  }): Promise<unknown> {
    return this.request("POST", "/returns/paint", input);
  }

  async createConsumableReturn(input: {
    targetIssuanceRowId?: number | null;
    sourceProductId?: number | null;
    quantityReturned: number;
    condition: "usable" | "contaminated";
    batchNumber?: string | null;
    photoUrl?: string | null;
    notes?: string | null;
  }): Promise<unknown> {
    return this.request("POST", "/returns/consumable", input);
  }

  async confirmReturnSession(id: number): Promise<unknown> {
    return this.request("POST", `/returns/sessions/${id}/confirm`);
  }

  async rejectReturnSession(id: number, reason: string): Promise<unknown> {
    return this.request("POST", `/returns/sessions/${id}/reject`, { reason });
  }

  async listWastageBins(): Promise<unknown[]> {
    return this.request("GET", "/returns/wastage-bins");
  }

  async addWastageEntry(input: {
    colour: string;
    weightKgAdded: number;
    sourceOffcutProductId?: number | null;
    sourceIssuanceRowId?: number | null;
    sourcePurchaseBatchId?: number | null;
    costPerKgAtEntry: number;
    notes?: string | null;
  }): Promise<unknown> {
    return this.request("POST", "/returns/wastage-entries", input);
  }

  async emptyWastageBin(id: number): Promise<unknown> {
    return this.request("POST", `/returns/wastage-bins/${id}/empty`);
  }

  async fifoCompanyValuation(): Promise<{
    totalValueR: number;
    legacyValueR: number;
    activeBatchCount: number;
  }> {
    return this.request("GET", "/fifo-batches/valuation/company");
  }

  async fifoProductValuation(productId: number): Promise<{
    productId: number;
    totalQuantity: number;
    totalValueR: number;
    legacyQuantity: number;
    legacyValueR: number;
    realFifoQuantity: number;
    realFifoValueR: number;
    activeBatchCount: number;
  }> {
    return this.request("GET", `/fifo-batches/valuation/by-product/${productId}`);
  }

  async stockTakeVarianceArchive(sinceMonths?: number): Promise<
    Array<{
      productId: number;
      productSku: string;
      productName: string;
      stockTakeCount: number;
      shortageCount: number;
      overageCount: number;
      totalVarianceQty: number;
      totalVarianceValueR: number;
      lastSeenAt: string | null;
    }>
  > {
    return this.request(
      "GET",
      `/stock-take/variance-archive${sinceMonths ? `?sinceMonths=${sinceMonths}` : ""}`,
    );
  }

  async identifyPhoto(file: File): Promise<{
    kind: "paint" | "consumable" | "rubber_roll" | "other";
    extracted: {
      productName: string | null;
      sku: string | null;
      batchNumber: string | null;
      rollNumber: string | null;
      weightKg: number | null;
      widthMm: number | null;
      thicknessMm: number | null;
      lengthM: number | null;
      compoundCode: string | null;
      colour: string | null;
    };
    confidence: number;
    matches: Array<{
      productId: number;
      sku: string;
      name: string;
      productType: string;
      similarity: number;
    }>;
    reasoning: string;
  }> {
    const formData = new FormData();
    formData.append("file", file);
    const rawHeaders = this.options.headers ? this.options.headers() : {};
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawHeaders)) {
      if (key.toLowerCase() !== "content-type") {
        headers[key] = value;
      }
    }
    const response = await fetch(`${this.options.baseUrl}/issuance/identify-photo`, {
      method: "POST",
      headers,
      body: formData,
      credentials: "include",
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Photo identification failed: ${response.status} ${text}`);
    }
    return response.json();
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.options.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(this.options.headers ? this.options.headers() : {}),
    };
    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: "include",
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Stock management API ${method} ${path} failed: ${response.status} ${text}`);
    }
    return response.json() as Promise<T>;
  }
}
