import { NB_MM_TO_NPS } from "@annix/product-data/pipe";
import type {
  AnonymousDraftFullResponse,
  AnonymousDraftResponse,
  BendCalculationResult,
  BnwSetInfoResult,
  BnwSetWeightRecord,
  BoqResponse,
  Commodity,
  ConsolidatedBoqDataDto,
  ConsolidatedItemDto,
  CreateBendRfqDto,
  CreateBendRfqWithItemDto,
  CreateBoqDto,
  CreateRfqDto,
  CreateSaMineDto,
  CreateStraightPipeRfqDto,
  CreateStraightPipeRfqWithItemDto,
  CreateUnifiedRfqDto,
  FlangeDimensionLookup,
  FlangePressureClass,
  FlangeStandard,
  FlangeType,
  FlangeTypeWeightRecord,
  FlangeTypeWeightResult,
  GasketWeightRecord,
  ISO12944DurabilityOption,
  ISO12944System,
  ISO12944SystemsByDurabilityResult,
  LiningCoatingRule,
  MaterialLimit,
  MaterialSuitabilityResult,
  MineWithEnvironmentalData,
  NbOdLookupRecord,
  NbOdLookupResult,
  NominalOutsideDiameter,
  PipeDimension,
  PipeEndConfiguration,
  PipePressure,
  PipeWallThicknessResult,
  PtRecommendationResult,
  PtValidationResult,
  PumpCalculationParams,
  PumpCalculationResult,
  PumpProduct,
  PumpProductListParams,
  PumpProductListResponse,
  RecoveryEmailResponse,
  RetainingRingWeightRecord,
  RetainingRingWeightResult,
  RfqDocument,
  RfqDraftFullResponse,
  RfqDraftResponse,
  RfqDraftStatus,
  RfqResponse,
  SaMine,
  SaveAnonymousDraftDto,
  SaveRfqDraftDto,
  SlurryProfile,
  SteelSpecification,
  StraightPipeCalculationResult,
  SubmitBoqDto,
  SubmitBoqResponseDto,
  SupplierCounts,
  UnifiedRfqItemDto,
  UnifiedTankChuteDto,
  ValidPressureClassInfo,
  WeldThicknessResult,
  WeldType,
} from "@annix/product-data/rfq";
import { sessionExpiredEvent } from "@/app/components/SessionExpiredModal";
import { log } from "@/app/lib/logger";
import { API_BASE_URL } from "@/lib/api-config";

export type {
  AnonymousDraftFullResponse,
  AnonymousDraftResponse,
  BendCalculationResult,
  BnwSetInfoResult,
  BnwSetWeightRecord,
  BoqResponse,
  Commodity,
  ConsolidatedBoqDataDto,
  ConsolidatedItemDto,
  CreateBendRfqDto,
  CreateBendRfqWithItemDto,
  CreateBoqDto,
  CreateRfqDto,
  CreateSaMineDto,
  CreateStraightPipeRfqDto,
  CreateStraightPipeRfqWithItemDto,
  CreateUnifiedRfqDto,
  FlangeDimensionLookup,
  FlangePressureClass,
  FlangeStandard,
  FlangeType,
  FlangeTypeWeightRecord,
  FlangeTypeWeightResult,
  GasketWeightRecord,
  ISO12944DurabilityOption,
  ISO12944System,
  ISO12944SystemsByDurabilityResult,
  LiningCoatingRule,
  MaterialLimit,
  MaterialSuitabilityResult,
  MineWithEnvironmentalData,
  NbOdLookupRecord,
  NbOdLookupResult,
  NominalOutsideDiameter,
  PipeEndConfiguration,
  PipeDimension,
  PipePressure,
  PipeWallThicknessResult,
  PtRecommendationResult,
  PtValidationResult,
  PumpCalculationParams,
  PumpCalculationResult,
  PumpProduct,
  PumpProductListParams,
  PumpProductListResponse,
  RecoveryEmailResponse,
  RetainingRingWeightRecord,
  RetainingRingWeightResult,
  RfqDocument,
  RfqDraftFullResponse,
  RfqDraftResponse,
  RfqDraftStatus,
  RfqResponse,
  SaMine,
  SaveAnonymousDraftDto,
  SaveRfqDraftDto,
  SlurryProfile,
  SteelSpecification,
  StraightPipeCalculationResult,
  SubmitBoqDto,
  SubmitBoqResponseDto,
  SupplierCounts,
  UnifiedRfqItemDto,
  UnifiedTankChuteDto,
  ValidPressureClassInfo,
  WeldThicknessResult,
  WeldType,
};

export class SessionExpiredError extends Error {
  constructor() {
    super("Session expired");
    this.name = "SessionExpiredError";
  }
}

function authToken(): string | null {
  if (typeof window === "undefined") return null;

  const customerToken = localStorage.getItem("customerAccessToken");
  if (customerToken) return customerToken;

  const supplierToken = localStorage.getItem("supplierAccessToken");
  if (supplierToken) return supplierToken;

  const adminToken = localStorage.getItem("adminAccessToken");
  if (adminToken) return adminToken;

  return localStorage.getItem("authToken") || localStorage.getItem("token");
}

function authHeaders(): Record<string, string> {
  const token = authToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private getAuthToken(): string | null {
    return authToken();
  }

  setToken(token: string) {
    if (typeof window !== "undefined") {
      localStorage.setItem("authToken", token);
    }
  }

  clearToken() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("authToken");
    }
  }

  // Attempt to refresh the customer access token using the refresh token
  private async refreshCustomerToken(): Promise<boolean> {
    if (typeof window === "undefined") return false;

    const refreshToken = localStorage.getItem("customerRefreshToken");
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseURL}/customer/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        // Refresh failed - clear tokens
        localStorage.removeItem("customerAccessToken");
        localStorage.removeItem("customerRefreshToken");
        return false;
      }

      const data = await response.json();
      if (data.access_token && data.refresh_token) {
        localStorage.setItem("customerAccessToken", data.access_token);
        localStorage.setItem("customerRefreshToken", data.refresh_token);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    // Include auth token if available
    const token = this.getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      let response = await fetch(url, config);

      // Handle 401 by attempting token refresh (only if user had a token)
      if (response.status === 401 && token) {
        const refreshed = await this.refreshCustomerToken();
        if (refreshed) {
          // Retry with new token
          const newToken = this.getAuthToken();
          if (newToken) {
            config.headers = {
              ...config.headers,
              Authorization: `Bearer ${newToken}`,
            } as Record<string, string>;
          }
          response = await fetch(url, config);
        } else {
          sessionExpiredEvent.emit();
          throw new SessionExpiredError();
        }
      }

      if (!response.ok) {
        if (response.status === 401 && token) {
          sessionExpiredEvent.emit();
          throw new SessionExpiredError();
        }
        const errorText = await response.text();
        throw new Error(`API Error (${response.status}): ${errorText}`);
      }

      // Handle empty responses gracefully
      const text = await response.text();
      if (!text || text.trim() === "") {
        // Return empty object/null for empty responses - caller should handle
        return {} as T;
      }

      try {
        return JSON.parse(text) as T;
      } catch (parseError) {
        log.warn("Failed to parse JSON response:", text.substring(0, 100));
        return {} as T;
      }
    } catch (error) {
      // Silently handle network errors (backend unavailable)
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        throw new Error("Backend unavailable");
      }
      throw error;
    }
  }

  // Auth endpoints
  async login(email: string, password: string): Promise<{ access_token: string }> {
    const result = await this.request<{ access_token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    this.setToken(result.access_token);
    return result;
  }

  // RFQ endpoints
  async calculateStraightPipe(
    data: CreateStraightPipeRfqDto,
  ): Promise<StraightPipeCalculationResult> {
    // Normalize schedule format before sending to backend
    const normalizedData = {
      ...data,
      scheduleNumber: this.normalizeScheduleNumber(data.scheduleNumber),
    };

    return this.request<StraightPipeCalculationResult>("/rfq/straight-pipe/calculate", {
      method: "POST",
      body: JSON.stringify(normalizedData),
    });
  }

  // Helper function to normalize schedule numbers
  private normalizeScheduleNumber(scheduleNumber?: string): string | undefined {
    if (!scheduleNumber) return scheduleNumber;

    // Convert "Sch40" -> "40", "Sch80" -> "80", etc.
    const schMatch = scheduleNumber.match(/^[Ss]ch(\d+)$/);
    if (schMatch) {
      return schMatch[1];
    }

    // Return as-is for other formats (STD, XS, XXS, MEDIUM, HEAVY, etc.)
    return scheduleNumber;
  }

  async createStraightPipeRfq(
    data: CreateStraightPipeRfqWithItemDto,
  ): Promise<{ rfq: any; calculation: StraightPipeCalculationResult }> {
    // Normalize schedule format in straightPipe data
    const normalizedData = {
      ...data,
      straightPipe: {
        ...data.straightPipe,
        scheduleNumber: this.normalizeScheduleNumber(data.straightPipe.scheduleNumber),
      },
    };

    return this.request("/rfq/straight-pipe", {
      method: "POST",
      body: JSON.stringify(normalizedData),
    });
  }

  async calculateBendRfq(data: CreateBendRfqDto): Promise<BendCalculationResult> {
    return this.request("/rfq/bend/calculate", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async createBendRfq(
    data: CreateBendRfqWithItemDto,
  ): Promise<{ rfq: any; calculation: BendCalculationResult }> {
    return this.request("/rfq/bend", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async createUnifiedRfq(data: CreateUnifiedRfqDto): Promise<{ rfq: any; itemsCreated: number }> {
    return this.request("/rfq/unified", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateUnifiedRfq(
    id: number,
    data: CreateUnifiedRfqDto,
  ): Promise<{ rfq: any; itemsUpdated: number }> {
    return this.request(`/rfq/unified/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async getRfqs(): Promise<RfqResponse[]> {
    return this.request<RfqResponse[]>("/rfq");
  }

  async getRfqById(id: number): Promise<any> {
    return this.request(`/rfq/${id}`);
  }

  // RFQ Document endpoints
  async uploadRfqDocument(rfqId: number, file: File): Promise<RfqDocument> {
    const url = `${this.baseURL}/rfq/${rfqId}/documents`;
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(url, {
      method: "POST",
      body: formData,
      // Don't set Content-Type header - browser will set it with boundary for multipart
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }

    // Handle empty responses gracefully
    const text = await response.text();
    if (!text || text.trim() === "") {
      return {} as RfqDocument;
    }

    try {
      return JSON.parse(text) as RfqDocument;
    } catch {
      log.warn("Failed to parse JSON response:", text.substring(0, 100));
      return {} as RfqDocument;
    }
  }

  async getRfqDocuments(rfqId: number): Promise<RfqDocument[]> {
    return this.request<RfqDocument[]>(`/rfq/${rfqId}/documents`);
  }

  async downloadRfqDocument(documentId: number): Promise<Blob> {
    const url = `${this.baseURL}/rfq/documents/${documentId}/download`;
    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }

    return response.blob();
  }

  async deleteRfqDocument(documentId: number): Promise<void> {
    await this.request(`/rfq/documents/${documentId}`, {
      method: "DELETE",
    });
  }

  // Master data endpoints
  async getSteelSpecifications(): Promise<SteelSpecification[]> {
    return this.request<SteelSpecification[]>("/steel-specification");
  }

  async getFlangeStandards(): Promise<FlangeStandard[]> {
    return this.request<FlangeStandard[]>("/flange-standard");
  }

  async getFlangePressureClasses(): Promise<FlangePressureClass[]> {
    return this.request<FlangePressureClass[]>("/flange-pressure-class");
  }

  async getFlangePressureClassesByStandard(standardId: number): Promise<FlangePressureClass[]> {
    return this.request<FlangePressureClass[]>(`/flange-pressure-class/standard/${standardId}`);
  }

  async getFlangeTypes(): Promise<FlangeType[]> {
    return this.request<FlangeType[]>("/flange-types");
  }

  async getFlangeTypeByCode(code: string): Promise<FlangeType | null> {
    return this.request<FlangeType | null>(`/flange-types/code/${encodeURIComponent(code)}`);
  }

  async lookupFlangeDimension(
    nominalBoreMm: number,
    standardId: number,
    pressureClassId: number,
    flangeTypeId?: number,
  ): Promise<FlangeDimensionLookup | null> {
    const params = new URLSearchParams({
      nominalBoreMm: nominalBoreMm.toString(),
      standardId: standardId.toString(),
      pressureClassId: pressureClassId.toString(),
    });
    if (flangeTypeId) {
      params.append("flangeTypeId", flangeTypeId.toString());
    }
    return this.request<FlangeDimensionLookup | null>(
      `/flange-dimension/lookup?${params.toString()}`,
    );
  }

  // Pipe data endpoints
  async getPipeDimensions(
    nominalBore?: number,
    steelSpecId?: number,
    minPressure?: number,
    temperature?: number,
  ): Promise<PipeDimension[]> {
    const params = new URLSearchParams();
    if (nominalBore) params.append("nominalBore", nominalBore.toString());
    if (steelSpecId) params.append("steelSpecId", steelSpecId.toString());
    if (minPressure) params.append("minPressure", minPressure.toString());
    if (temperature) params.append("temperature", temperature.toString());

    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<PipeDimension[]>(`/pipe-dimensions${query}`);
  }

  /**
   * Get all pipe-dimensions for a given steel specification and nominal outside diameter id.
   * This calls the backend route: /pipe-dimensions/all/:steelSpecId/:nominalId
   */
  async getPipeDimensionsAll(steelSpecId: number, nominalId: number): Promise<PipeDimension[]> {
    return this.request<PipeDimension[]>(`/pipe-dimensions/all/${steelSpecId}/${nominalId}`);
  }

  async getNominalBores(steelSpecId?: number): Promise<NominalOutsideDiameter[]> {
    const query = steelSpecId ? `?steelSpecId=${steelSpecId}` : "";
    return this.request<NominalOutsideDiameter[]>(`/nominal-outside-diameter-mm${query}`);
  }

  async getRecommendedSpecs(
    nominalBore: number,
    workingPressure: number,
    temperature?: number,
    steelSpecId?: number,
  ): Promise<{
    pipeDimension: PipeDimension;
    schedule?: string;
    wallThickness: number;
    maxPressure: number;
    availableUpgrades?: PipeDimension[];
  }> {
    return this.request("/pipe-dimensions/recommend", {
      method: "POST",
      body: JSON.stringify({
        nominalBore,
        workingPressure,
        temperature: temperature || 20,
        steelSpecId,
      }),
    });
  }

  async getHigherSchedules(
    nominalBore: number,
    currentWallThickness: number,
    workingPressure: number,
    temperature: number = 20,
    steelSpecId?: number,
  ): Promise<PipeDimension[]> {
    const params = new URLSearchParams({
      nominalBore: nominalBore.toString(),
      currentWallThickness: currentWallThickness.toString(),
      workingPressure: workingPressure.toString(),
      temperature: temperature.toString(),
    });

    if (steelSpecId) {
      params.append("steelSpecId", steelSpecId.toString());
    }

    return this.request<PipeDimension[]>(`/pipe-dimensions/higher-schedules?${params}`);
  }

  // Pipe end configuration endpoints
  async getPipeEndConfigurations(): Promise<PipeEndConfiguration[]> {
    return this.request<PipeEndConfiguration[]>("/pipe-end-configurations");
  }

  async getPipeEndConfigurationByCode(configCode: string): Promise<PipeEndConfiguration> {
    return this.request<PipeEndConfiguration>(`/pipe-end-configurations/${configCode}`);
  }

  // Bend calculations
  async calculateBendSpecifications(params: {
    nominalBoreMm: number;
    wallThicknessMm: number;
    scheduleNumber?: string;
    bendType: string;
    bendDegrees: number;
    numberOfTangents?: number;
    tangentLengths?: number[];
    quantity?: number;
    steelSpecificationId?: number;
    flangeStandardId?: number;
    flangePressureClassId?: number;
  }): Promise<{
    centerToFaceDimension: number;
    bendRadius: number;
    totalBendWeight: number;
    totalTangentWeight: number;
    totalSystemWeight: number;
    numberOfFlanges: number;
    numberOfFlangeWelds: number;
    numberOfButtWelds: number;
    totalFlangeWeldLength: number;
    totalButtWeldLength: number;
  }> {
    return this.request("/bend-center-to-face/calculate", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async getBendTypes(): Promise<string[]> {
    return this.request<string[]>("/bend-center-to-face/bend-types");
  }

  async getNominalBoresForBendType(bendType: string): Promise<number[]> {
    return this.request<number[]>(`/bend-center-to-face/nominal-bores/${bendType}`);
  }

  async getDegreesForBendType(bendType: string, nominalBoreMm?: number): Promise<number[]> {
    const query = nominalBoreMm ? `?nominalBoreMm=${nominalBoreMm}` : "";
    return this.request<number[]>(`/bend-center-to-face/degrees/${bendType}${query}`);
  }

  async getBendOptions(bendType: string): Promise<{ nominalBores: number[]; degrees: number[] }> {
    return this.request<{ nominalBores: number[]; degrees: number[] }>(
      `/bend-center-to-face/options/${bendType}`,
    );
  }

  async getBendCenterToFace(
    bendType: string,
    nominalBoreMm: number,
    degrees: number,
  ): Promise<any> {
    return this.request(
      `/bend-center-to-face/lookup?bendType=${bendType}&nominalBoreMm=${nominalBoreMm}&degrees=${degrees}`,
    );
  }

  // Sweep tee dimension endpoints
  async getSweepTeeDimension(
    nominalBoreMm: number,
    radiusType: string,
  ): Promise<{
    id: number;
    nominalBoreMm: number;
    outsideDiameterMm: number;
    radiusType: string;
    bendRadiusMm: number;
    pipeALengthMm: number;
    elbowEMm: number | null;
  } | null> {
    return this.request(
      `/sweep-tee-dimension/lookup?nominalBoreMm=${nominalBoreMm}&radiusType=${radiusType}`,
    );
  }

  // Weld type endpoints
  async getWeldTypes(): Promise<WeldType[]> {
    return this.request<WeldType[]>("/weld-type");
  }

  async getWeldTypeById(id: number): Promise<WeldType> {
    return this.request<WeldType>(`/weld-type/${id}`);
  }

  // Fitting endpoints
  async getFittingDimensions(
    standard: "SABS62" | "SABS719",
    fittingType: string,
    nominalDiameterMm: number,
    angleRange?: string,
  ): Promise<any> {
    const params = new URLSearchParams({
      standard,
      fittingType,
      nominalDiameterMm: nominalDiameterMm.toString(),
    });
    if (angleRange) {
      params.append("angleRange", angleRange);
    }
    return this.request(`/fittings/dimensions?${params.toString()}`);
  }

  async getAvailableFittingTypes(standard: "SABS62" | "SABS719"): Promise<string[]> {
    return this.request<string[]>(`/fittings/types?standard=${standard}`);
  }

  async getAvailableFittingSizes(
    standard: "SABS62" | "SABS719",
    fittingType: string,
  ): Promise<number[]> {
    return this.request<number[]>(
      `/fittings/sizes?standard=${standard}&fittingType=${fittingType}`,
    );
  }

  async getAvailableAngleRanges(fittingType: string, nominalDiameterMm: number): Promise<string[]> {
    return this.request<string[]>(
      `/fittings/angle-ranges?fittingType=${fittingType}&nominalDiameterMm=${nominalDiameterMm}`,
    );
  }

  // Mines endpoints
  async getCommodities(): Promise<Commodity[]> {
    return this.request<Commodity[]>("/mines/commodities");
  }

  async getProvinces(): Promise<string[]> {
    return this.request<string[]>("/mines/provinces");
  }

  async getMines(commodityId?: number, province?: string, status?: string): Promise<SaMine[]> {
    const params = new URLSearchParams();
    if (commodityId) params.append("commodityId", commodityId.toString());
    if (province) params.append("province", province);
    if (status) params.append("status", status);
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<SaMine[]>(`/mines${query}`);
  }

  async getActiveMines(): Promise<SaMine[]> {
    return this.request<SaMine[]>("/mines/active");
  }

  async getMineById(id: number): Promise<SaMine> {
    return this.request<SaMine>(`/mines/${id}`);
  }

  async getMineWithEnvironmentalData(id: number): Promise<MineWithEnvironmentalData> {
    return this.request<MineWithEnvironmentalData>(`/mines/${id}/environmental-data`);
  }

  async getSlurryProfiles(): Promise<SlurryProfile[]> {
    return this.request<SlurryProfile[]>("/mines/slurry-profiles");
  }

  async getLiningRules(): Promise<LiningCoatingRule[]> {
    return this.request<LiningCoatingRule[]>("/mines/lining-rules");
  }

  async createMine(mineData: CreateSaMineDto): Promise<SaMine> {
    return this.request<SaMine>("/mines", {
      method: "POST",
      body: JSON.stringify(mineData),
    });
  }

  async calculateFitting(data: {
    fittingStandard: "SABS62" | "SABS719";
    fittingType: string;
    nominalDiameterMm: number;
    angleRange?: string;
    pipeLengthAMm?: number;
    pipeLengthBMm?: number;
    steelSpecificationId?: number;
    flangeStandardId?: number;
    flangePressureClassId?: number;
    quantityValue: number;
    scheduleNumber?: string;
    workingPressureBar?: number;
    workingTemperatureC?: number;
  }): Promise<{
    totalWeight: number;
    fittingWeight: number;
    pipeWeight: number;
    flangeWeight: number;
    boltWeight: number;
    nutWeight: number;
    weldWeight: number;
    numberOfFlanges: number;
    numberOfFlangeWelds: number;
    totalFlangeWeldLength: number;
    numberOfTeeWelds: number;
    totalTeeWeldLength: number;
    outsideDiameterMm: number;
    wallThicknessMm: number;
    gussetWeight?: number;
    gussetSectionMm?: number;
    gussetWeldLength?: number;
  }> {
    return this.request("/fittings/calculate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  }

  // Reducer Calculator API
  async calculateReducerMass(data: {
    largeDiameterMm: number;
    smallDiameterMm: number;
    lengthMm: number;
    wallThicknessMm: number;
    densityKgM3?: number;
    reducerType?: "CONCENTRIC" | "ECCENTRIC";
    quantity?: number;
  }): Promise<{
    largeDiameterMm: number;
    smallDiameterMm: number;
    largeInnerDiameterMm: number;
    smallInnerDiameterMm: number;
    lengthMm: number;
    wallThicknessMm: number;
    densityKgM3: number;
    outerVolumeM3: number;
    innerVolumeM3: number;
    steelVolumeM3: number;
    massPerUnitKg: number;
    totalMassKg: number;
    quantity: number;
    reducerType: "CONCENTRIC" | "ECCENTRIC";
  }> {
    return this.request("/reducer-calculator/mass", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async calculateReducerArea(data: {
    largeDiameterMm: number;
    smallDiameterMm: number;
    lengthMm: number;
    wallThicknessMm: number;
    densityKgM3?: number;
    reducerType?: "CONCENTRIC" | "ECCENTRIC";
    quantity?: number;
    extensionLargeMm?: number;
    extensionSmallMm?: number;
    extensionLargeWallThicknessMm?: number;
    extensionSmallWallThicknessMm?: number;
  }): Promise<{
    largeDiameterMm: number;
    smallDiameterMm: number;
    largeInnerDiameterMm: number;
    smallInnerDiameterMm: number;
    lengthMm: number;
    slantHeightMm: number;
    coneAngleDegrees: number;
    reducerExternalAreaM2: number;
    reducerInternalAreaM2: number;
    extensionLargeExternalAreaM2: number;
    extensionLargeInternalAreaM2: number;
    extensionSmallExternalAreaM2: number;
    extensionSmallInternalAreaM2: number;
    totalExternalAreaM2: number;
    totalInternalAreaM2: number;
    totalCombinedAreaM2: number;
    areaPerUnitM2: number;
    quantity: number;
    reducerType: "CONCENTRIC" | "ECCENTRIC";
  }> {
    return this.request("/reducer-calculator/area", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async calculateReducerFull(data: {
    largeDiameterMm: number;
    smallDiameterMm: number;
    lengthMm: number;
    wallThicknessMm: number;
    densityKgM3?: number;
    reducerType?: "CONCENTRIC" | "ECCENTRIC";
    quantity?: number;
    extensionLargeMm?: number;
    extensionSmallMm?: number;
    coatingRatePerM2?: number;
  }): Promise<{
    mass: {
      largeDiameterMm: number;
      smallDiameterMm: number;
      largeInnerDiameterMm: number;
      smallInnerDiameterMm: number;
      lengthMm: number;
      wallThicknessMm: number;
      densityKgM3: number;
      outerVolumeM3: number;
      innerVolumeM3: number;
      steelVolumeM3: number;
      massPerUnitKg: number;
      totalMassKg: number;
      quantity: number;
      reducerType: "CONCENTRIC" | "ECCENTRIC";
    };
    area: {
      largeDiameterMm: number;
      smallDiameterMm: number;
      largeInnerDiameterMm: number;
      smallInnerDiameterMm: number;
      lengthMm: number;
      slantHeightMm: number;
      coneAngleDegrees: number;
      reducerExternalAreaM2: number;
      reducerInternalAreaM2: number;
      totalExternalAreaM2: number;
      totalInternalAreaM2: number;
      totalCombinedAreaM2: number;
      areaPerUnitM2: number;
      quantity: number;
      reducerType: "CONCENTRIC" | "ECCENTRIC";
    };
    externalCoatingCost?: number;
    internalCoatingCost?: number;
    totalCoatingCost?: number;
  }> {
    return this.request("/reducer-calculator/full", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async getStandardReducerLength(
    largeNbMm: number,
    smallNbMm: number,
  ): Promise<{
    largeNbMm: number;
    smallNbMm: number;
    standardLengthMm: number;
  }> {
    return this.request(
      `/reducer-calculator/standard-length?largeNbMm=${largeNbMm}&smallNbMm=${smallNbMm}`,
    );
  }

  // Pipe Schedule API - For ASME B31.3 pressure-based schedule recommendation
  async recommendPipeSchedule(params: {
    nbMm: number;
    pressureBar: number;
    temperatureCelsius: number;
    materialCode?: string;
    corrosionAllowanceMm?: number;
  }): Promise<{
    minRequiredThicknessMm: number;
    recommendedSchedule: string;
    recommendedWallMm: number;
    allowableStressMpa: number;
    warnings: string[];
    availableSchedules?: Array<{ schedule: string; wallMm: number }>;
  }> {
    const queryParams = new URLSearchParams();

    const nps = NB_MM_TO_NPS[params.nbMm] || `${Math.round(params.nbMm / 25.4)}`;

    queryParams.append("nps", nps);
    queryParams.append("pressureBar", params.pressureBar.toString());
    queryParams.append("temperatureCelsius", params.temperatureCelsius.toString());
    queryParams.append("materialCode", params.materialCode || "ASTM_A106_Grade_B");
    if (params.corrosionAllowanceMm) {
      queryParams.append("corrosionAllowanceMm", params.corrosionAllowanceMm.toString());
    }

    return this.request(`/pipe-schedules/recommend?${queryParams.toString()}`);
  }

  // Get available schedules for a given NB
  async getSchedulesByNb(nbMm: number): Promise<
    Array<{
      id: number;
      nps: string;
      nbMm: number;
      schedule: string;
      wallThicknessInch: number;
      wallThicknessMm: number;
      outsideDiameterInch: number;
      standardCode: string;
    }>
  > {
    return this.request(`/pipe-schedules/by-nb?nbMm=${nbMm}`);
  }

  // ==================== Draft Methods ====================

  async saveDraft(dto: SaveRfqDraftDto): Promise<RfqDraftResponse> {
    return this.request("/rfq/drafts", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }

  async getDrafts(): Promise<RfqDraftResponse[]> {
    return this.request("/rfq/drafts");
  }

  async getDraftById(id: number): Promise<RfqDraftFullResponse> {
    return this.request(`/rfq/drafts/${id}`);
  }

  async getDraftByNumber(draftNumber: string): Promise<RfqDraftFullResponse> {
    return this.request(`/rfq/drafts/number/${encodeURIComponent(draftNumber)}`);
  }

  async deleteDraft(id: number): Promise<void> {
    return this.request(`/rfq/drafts/${id}`, {
      method: "DELETE",
    });
  }

  // ==================== Material Validation Methods ====================

  async getAllMaterialLimits(): Promise<MaterialLimit[]> {
    return this.request("/material-validation");
  }

  async getMaterialLimitsBySpecName(specName: string): Promise<MaterialLimit | null> {
    return this.request(`/material-validation/by-spec-name/${encodeURIComponent(specName)}`);
  }

  async checkMaterialSuitability(
    specName: string,
    temperature?: number,
    pressure?: number,
  ): Promise<MaterialSuitabilityResult> {
    const params = new URLSearchParams({ specName });
    if (temperature !== undefined) params.append("temperature", temperature.toString());
    if (pressure !== undefined) params.append("pressure", pressure.toString());
    return this.request(`/material-validation/check-suitability?${params.toString()}`);
  }

  async getSuitableMaterials(temperature?: number, pressure?: number): Promise<string[]> {
    const params = new URLSearchParams();
    if (temperature !== undefined) params.append("temperature", temperature.toString());
    if (pressure !== undefined) params.append("pressure", pressure.toString());
    return this.request(`/material-validation/suitable-materials?${params.toString()}`);
  }

  // ==================== Weld Thickness Methods ====================

  async getWeldThickness(
    dn: number,
    schedule: string,
    temperature?: number,
  ): Promise<WeldThicknessResult> {
    const params = new URLSearchParams({
      dn: dn.toString(),
      schedule,
    });
    if (temperature !== undefined) params.append("temperature", temperature.toString());
    return this.request(`/weld-thickness/lookup?${params.toString()}`);
  }

  async getRecommendedWeldThickness(
    dn: number,
    pressure: number,
    temperature?: number,
  ): Promise<WeldThicknessResult> {
    const params = new URLSearchParams({
      dn: dn.toString(),
      pressure: pressure.toString(),
    });
    if (temperature !== undefined) params.append("temperature", temperature.toString());
    return this.request(`/weld-thickness/recommend?${params.toString()}`);
  }

  async getAllWeldThicknessesForDn(
    dn: number,
    temperature?: number,
  ): Promise<WeldThicknessResult[]> {
    const params = new URLSearchParams({ dn: dn.toString() });
    if (temperature !== undefined) params.append("temperature", temperature.toString());
    return this.request(`/weld-thickness/all-for-dn?${params.toString()}`);
  }

  async getPipeWallThickness(
    dn: number,
    schedule: string,
    temperature?: number,
  ): Promise<PipeWallThicknessResult> {
    const params = new URLSearchParams({
      dn: dn.toString(),
      schedule,
    });
    if (temperature !== undefined) params.append("temperature", temperature.toString());
    return this.request(`/weld-thickness/pipe-wall?${params.toString()}`);
  }

  // ==================== Flange Type Weight Methods ====================

  async flangeTypeWeight(
    nominalBoreMm: number,
    pressureClass: string,
    flangeStandardCode: string | null,
    flangeTypeCode: string,
  ): Promise<FlangeTypeWeightResult> {
    const params = new URLSearchParams({
      nominalBoreMm: nominalBoreMm.toString(),
      pressureClass,
      flangeTypeCode,
    });
    if (flangeStandardCode) {
      params.append("flangeStandardCode", flangeStandardCode);
    }
    return this.request(`/flange-type-weight/lookup?${params.toString()}`);
  }

  async blankFlangeWeight(
    nominalBoreMm: number,
    pressureClass: string,
  ): Promise<FlangeTypeWeightResult> {
    const params = new URLSearchParams({
      nominalBoreMm: nominalBoreMm.toString(),
      pressureClass,
    });
    return this.request(`/flange-type-weight/blank?${params.toString()}`);
  }

  async bnwSetInfo(nominalBoreMm: number, pressureClass: string): Promise<BnwSetInfoResult> {
    const params = new URLSearchParams({
      nominalBoreMm: nominalBoreMm.toString(),
      pressureClass,
    });
    return this.request(`/bnw-set-weight/lookup?${params.toString()}`);
  }

  async retainingRingWeight(nominalBoreMm: number): Promise<RetainingRingWeightResult> {
    return this.request(`/retaining-ring-weight/${nominalBoreMm}`);
  }

  async nbToOd(nominalBoreMm: number): Promise<NbOdLookupResult> {
    return this.request(`/nb-od-lookup/${nominalBoreMm}`);
  }

  async allFlangeTypeWeights(): Promise<FlangeTypeWeightRecord[]> {
    return this.request<FlangeTypeWeightRecord[]>("/flange-type-weight");
  }

  async allBnwSetWeights(): Promise<BnwSetWeightRecord[]> {
    return this.request<BnwSetWeightRecord[]>("/bnw-set-weight");
  }

  async allNbToOd(): Promise<NbOdLookupRecord[]> {
    return this.request<NbOdLookupRecord[]>("/nb-od-lookup");
  }

  async allRetainingRingWeights(): Promise<RetainingRingWeightRecord[]> {
    return this.request<RetainingRingWeightRecord[]>("/retaining-ring-weight");
  }

  async allGasketWeights(): Promise<GasketWeightRecord[]> {
    return this.request<GasketWeightRecord[]>("/gasket-weight");
  }
}

// Create and export the API client instance
export const apiClient = new ApiClient();

// Export individual API functions for convenience
export const rfqApi = {
  calculate: (data: CreateStraightPipeRfqDto) => apiClient.calculateStraightPipe(data),
  create: (data: CreateStraightPipeRfqWithItemDto) => apiClient.createStraightPipeRfq(data),
  getAll: () => apiClient.getRfqs(),
  getById: (id: number) => apiClient.getRfqById(id),
};

export const bendRfqApi = {
  calculate: (data: CreateBendRfqDto) => apiClient.calculateBendRfq(data),
  create: (data: CreateBendRfqWithItemDto) => apiClient.createBendRfq(data),
};

export const unifiedRfqApi = {
  create: (data: CreateUnifiedRfqDto) => apiClient.createUnifiedRfq(data),
  update: (id: number, data: CreateUnifiedRfqDto) => apiClient.updateUnifiedRfq(id, data),
};

export const masterDataApi = {
  getSteelSpecifications: () => apiClient.getSteelSpecifications(),
  getFlangeStandards: () => apiClient.getFlangeStandards(),
  getFlangePressureClasses: () => apiClient.getFlangePressureClasses(),
  getFlangePressureClassesByStandard: (standardId: number) =>
    apiClient.getFlangePressureClassesByStandard(standardId),
  getFlangeTypes: () => apiClient.getFlangeTypes(),
  getFlangeTypeByCode: (code: string) => apiClient.getFlangeTypeByCode(code),
  lookupFlangeDimension: (
    nominalBoreMm: number,
    standardId: number,
    pressureClassId: number,
    flangeTypeId?: number,
  ) => apiClient.lookupFlangeDimension(nominalBoreMm, standardId, pressureClassId, flangeTypeId),
  getPipeDimensions: (
    nominalBore?: number,
    steelSpecId?: number,
    minPressure?: number,
    temperature?: number,
  ) => apiClient.getPipeDimensions(nominalBore, steelSpecId, minPressure, temperature),
  getNominalBores: (steelSpecId?: number) => apiClient.getNominalBores(steelSpecId),
  getRecommendedSpecs: (
    nominalBore: number,
    workingPressure: number,
    temperature?: number,
    steelSpecId?: number,
  ) => apiClient.getRecommendedSpecs(nominalBore, workingPressure, temperature, steelSpecId),
  getHigherSchedules: (
    nominalBore: number,
    currentWallThickness: number,
    workingPressure: number,
    temperature?: number,
    steelSpecId?: number,
  ) =>
    apiClient.getHigherSchedules(
      nominalBore,
      currentWallThickness,
      workingPressure,
      temperature,
      steelSpecId,
    ),
  getPipeEndConfigurations: () => apiClient.getPipeEndConfigurations(),
  getPipeEndConfigurationByCode: (configCode: string) =>
    apiClient.getPipeEndConfigurationByCode(configCode),
  getPipeDimensionsAll: (steelSpecId: number, nominalId: number) =>
    apiClient.getPipeDimensionsAll(steelSpecId, nominalId),

  // Bend calculations
  calculateBendSpecifications: (params: any) => apiClient.calculateBendSpecifications(params),
  getBendTypes: () => apiClient.getBendTypes(),
  getBendNominalBores: (bendType: string) => apiClient.getNominalBoresForBendType(bendType),
  getBendDegrees: (bendType: string, nominalBoreMm?: number) =>
    apiClient.getDegreesForBendType(bendType, nominalBoreMm),
  getBendOptions: (bendType: string) => apiClient.getBendOptions(bendType),
  getBendCenterToFace: (bendType: string, nominalBoreMm: number, degrees: number) =>
    apiClient.getBendCenterToFace(bendType, nominalBoreMm, degrees),
  getSweepTeeDimension: (nominalBoreMm: number, radiusType: string) =>
    apiClient.getSweepTeeDimension(nominalBoreMm, radiusType),
  getWeldTypes: () => apiClient.getWeldTypes(),
  getWeldTypeById: (id: number) => apiClient.getWeldTypeById(id),

  // Fitting API
  getFittingDimensions: (
    standard: "SABS62" | "SABS719",
    fittingType: string,
    nominalDiameterMm: number,
    angleRange?: string,
  ) => apiClient.getFittingDimensions(standard, fittingType, nominalDiameterMm, angleRange),
  getAvailableFittingTypes: (standard: "SABS62" | "SABS719") =>
    apiClient.getAvailableFittingTypes(standard),
  getAvailableFittingSizes: (standard: "SABS62" | "SABS719", fittingType: string) =>
    apiClient.getAvailableFittingSizes(standard, fittingType),
  getAvailableAngleRanges: (fittingType: string, nominalDiameterMm: number) =>
    apiClient.getAvailableAngleRanges(fittingType, nominalDiameterMm),
  calculateFitting: (data: Parameters<typeof apiClient.calculateFitting>[0]) =>
    apiClient.calculateFitting(data),

  // Reducer Calculator API
  calculateReducerMass: (data: Parameters<typeof apiClient.calculateReducerMass>[0]) =>
    apiClient.calculateReducerMass(data),
  calculateReducerArea: (data: Parameters<typeof apiClient.calculateReducerArea>[0]) =>
    apiClient.calculateReducerArea(data),
  calculateReducerFull: (data: Parameters<typeof apiClient.calculateReducerFull>[0]) =>
    apiClient.calculateReducerFull(data),
  getStandardReducerLength: (largeNbMm: number, smallNbMm: number) =>
    apiClient.getStandardReducerLength(largeNbMm, smallNbMm),
};

export const authApi = {
  login: (email: string, password: string) => apiClient.login(email, password),
  logout: () => apiClient.clearToken(),
};

export const pipeScheduleApi = {
  recommend: (params: Parameters<typeof apiClient.recommendPipeSchedule>[0]) =>
    apiClient.recommendPipeSchedule(params),
  getSchedulesByNb: (nbMm: number) => apiClient.getSchedulesByNb(nbMm),
};

export const materialValidationApi = {
  getAllMaterialLimits: () => apiClient.getAllMaterialLimits(),
  getMaterialLimitsBySpecName: (specName: string) =>
    apiClient.getMaterialLimitsBySpecName(specName),
  checkMaterialSuitability: (specName: string, temperature?: number, pressure?: number) =>
    apiClient.checkMaterialSuitability(specName, temperature, pressure),
  getSuitableMaterials: (temperature?: number, pressure?: number) =>
    apiClient.getSuitableMaterials(temperature, pressure),
};

export const weldThicknessApi = {
  getWeldThickness: (dn: number, schedule: string, temperature?: number) =>
    apiClient.getWeldThickness(dn, schedule, temperature),
  getRecommendedWeldThickness: (dn: number, pressure: number, temperature?: number) =>
    apiClient.getRecommendedWeldThickness(dn, pressure, temperature),
  getAllWeldThicknessesForDn: (dn: number, temperature?: number) =>
    apiClient.getAllWeldThicknessesForDn(dn, temperature),
  getPipeWallThickness: (dn: number, schedule: string, temperature?: number) =>
    apiClient.getPipeWallThickness(dn, schedule, temperature),
};

export const flangeWeightApi = {
  flangeTypeWeight: (
    nominalBoreMm: number,
    pressureClass: string,
    flangeStandardCode: string | null,
    flangeTypeCode: string,
  ) => apiClient.flangeTypeWeight(nominalBoreMm, pressureClass, flangeStandardCode, flangeTypeCode),
  blankFlangeWeight: (nominalBoreMm: number, pressureClass: string) =>
    apiClient.blankFlangeWeight(nominalBoreMm, pressureClass),
  bnwSetInfo: (nominalBoreMm: number, pressureClass: string) =>
    apiClient.bnwSetInfo(nominalBoreMm, pressureClass),
  retainingRingWeight: (nominalBoreMm: number) => apiClient.retainingRingWeight(nominalBoreMm),
  nbToOd: (nominalBoreMm: number) => apiClient.nbToOd(nominalBoreMm),
  allFlangeTypeWeights: () => apiClient.allFlangeTypeWeights(),
  allBnwSetWeights: () => apiClient.allBnwSetWeights(),
  allNbToOd: () => apiClient.allNbToOd(),
  allRetainingRingWeights: () => apiClient.allRetainingRingWeights(),
  allGasketWeights: () => apiClient.allGasketWeights(),
};

export const coatingSpecificationApi = {
  getCorrosivityCategories: async (): Promise<{ category: string; description: string }[]> => {
    const response = await fetch(`${API_BASE_URL}/coating-specifications/corrosivity-categories`);
    if (!response.ok) throw new Error("Failed to fetch corrosivity categories");
    return response.json();
  },

  systemsByDurability: async (
    category: string,
    durability: "L" | "M" | "H" | "VH",
  ): Promise<ISO12944SystemsByDurabilityResult> => {
    const response = await fetch(
      `${API_BASE_URL}/coating-specifications/iso12944/systems-by-durability?category=${category}&durability=${durability}`,
    );
    if (!response.ok) throw new Error("Failed to fetch systems by durability");
    return response.json();
  },

  systemsByCategory: async (category: string): Promise<ISO12944System[]> => {
    const response = await fetch(
      `${API_BASE_URL}/coating-specifications/iso12944/systems-by-category?category=${category}`,
    );
    if (!response.ok) throw new Error("Failed to fetch systems by category");
    return response.json();
  },

  availableDurabilities: async (category: string): Promise<ISO12944DurabilityOption[]> => {
    const response = await fetch(
      `${API_BASE_URL}/coating-specifications/iso12944/durabilities?category=${category}`,
    );
    if (!response.ok) throw new Error("Failed to fetch available durabilities");
    return response.json();
  },

  systemByCode: async (systemCode: string): Promise<ISO12944System | null> => {
    const response = await fetch(
      `${API_BASE_URL}/coating-specifications/iso12944/system-by-code?systemCode=${systemCode}`,
    );
    if (!response.ok) throw new Error("Failed to fetch system by code");
    return response.json();
  },
};

export const rfqDocumentApi = {
  upload: (rfqId: number, file: File) => apiClient.uploadRfqDocument(rfqId, file),
  getByRfqId: (rfqId: number) => apiClient.getRfqDocuments(rfqId),
  download: (documentId: number) => apiClient.downloadRfqDocument(documentId),
  delete: (documentId: number) => apiClient.deleteRfqDocument(documentId),
};

export const minesApi = {
  getCommodities: () => apiClient.getCommodities(),
  getProvinces: () => apiClient.getProvinces(),
  getMines: (commodityId?: number, province?: string, status?: string) =>
    apiClient.getMines(commodityId, province, status),
  getActiveMines: () => apiClient.getActiveMines(),
  getMineById: (id: number) => apiClient.getMineById(id),
  getMineWithEnvironmentalData: (id: number) => apiClient.getMineWithEnvironmentalData(id),
  getSlurryProfiles: () => apiClient.getSlurryProfiles(),
  getLiningRules: () => apiClient.getLiningRules(),
  createMine: (mineData: CreateSaMineDto) => apiClient.createMine(mineData),
};

export const draftsApi = {
  save: (dto: SaveRfqDraftDto) => apiClient.saveDraft(dto),
  getAll: () => apiClient.getDrafts(),
  getById: (id: number) => apiClient.getDraftById(id),
  getByNumber: (draftNumber: string) => apiClient.getDraftByNumber(draftNumber),
  delete: (id: number) => apiClient.deleteDraft(id),
  markAsConverted: async (draftId: number, rfqId: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/rfq/drafts/${draftId}/convert`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({ rfqId }),
    });
    if (!response.ok) {
      throw new Error("Failed to mark draft as converted");
    }
  },
};

export const anonymousDraftsApi = {
  save: async (dto: SaveAnonymousDraftDto): Promise<AnonymousDraftResponse> => {
    const response = await fetch(`${API_BASE_URL}/rfq/anonymous-drafts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dto),
    });
    if (!response.ok) {
      throw new Error("Failed to save anonymous draft");
    }
    return response.json();
  },

  getByToken: async (token: string): Promise<AnonymousDraftFullResponse> => {
    const response = await fetch(`${API_BASE_URL}/rfq/anonymous-drafts/token/${token}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Draft not found or expired");
      }
      throw new Error("Failed to retrieve anonymous draft");
    }
    return response.json();
  },

  requestRecoveryEmail: async (customerEmail: string): Promise<RecoveryEmailResponse> => {
    const response = await fetch(`${API_BASE_URL}/rfq/anonymous-drafts/request-recovery`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ customerEmail }),
    });
    if (!response.ok) {
      throw new Error("Failed to request recovery email");
    }
    return response.json();
  },

  claimDraft: async (
    token: string,
    userId: number,
  ): Promise<{ message: string; draftId: number }> => {
    const response = await fetch(
      `${API_BASE_URL}/rfq/anonymous-drafts/token/${token}/claim/${userId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
    if (!response.ok) {
      throw new Error("Failed to claim draft");
    }
    return response.json();
  },
};

export const boqApi = {
  create: async (dto: CreateBoqDto): Promise<BoqResponse> => {
    const response = await fetch(`${API_BASE_URL}/boq`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(dto),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create BOQ: ${errorText}`);
    }

    return response.json();
  },

  submitForQuotation: async (boqId: number, dto: SubmitBoqDto): Promise<SubmitBoqResponseDto> => {
    const response = await fetch(`${API_BASE_URL}/boq/${boqId}/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(dto),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to submit BOQ: ${errorText}`);
    }

    return response.json();
  },

  updateSubmittedBoq: async (boqId: number, dto: SubmitBoqDto): Promise<SubmitBoqResponseDto> => {
    const response = await fetch(`${API_BASE_URL}/boq/${boqId}/update-submitted`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(dto),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update BOQ: ${errorText}`);
    }

    return response.json();
  },

  getByRfqId: async (rfqId: number): Promise<BoqResponse | null> => {
    const response = await fetch(`${API_BASE_URL}/boq?rfqId=${rfqId}&limit=1`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get BOQ by RFQ ID: ${errorText}`);
    }

    const result = await response.json();
    return result.data && result.data.length > 0 ? result.data[0] : null;
  },
};

export const ptRatingApi = {
  recommendations: async (params: {
    standardId: number;
    workingPressureBar: number;
    temperatureCelsius: number;
    materialGroup?: string;
    currentPressureClassId?: number;
  }): Promise<PtRecommendationResult> => {
    const queryParams = new URLSearchParams({
      standardId: params.standardId.toString(),
      workingPressureBar: params.workingPressureBar.toString(),
      temperatureCelsius: params.temperatureCelsius.toString(),
    });

    if (params.materialGroup) {
      queryParams.append("materialGroup", params.materialGroup);
    }
    if (params.currentPressureClassId) {
      queryParams.append("currentPressureClassId", params.currentPressureClassId.toString());
    }

    const response = await fetch(
      `${API_BASE_URL}/flange-pt-ratings/recommendations?${queryParams.toString()}`,
    );

    if (!response.ok) {
      throw new Error("Failed to fetch P-T recommendations");
    }

    return response.json();
  },
};

export const pumpProductApi = {
  list: async (params?: PumpProductListParams): Promise<PumpProductListResponse> => {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.search) queryParams.append("search", params.search);
    if (params?.category) queryParams.append("category", params.category);
    if (params?.manufacturer) queryParams.append("manufacturer", params.manufacturer);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.minFlowRate) queryParams.append("minFlowRate", params.minFlowRate.toString());
    if (params?.maxFlowRate) queryParams.append("maxFlowRate", params.maxFlowRate.toString());
    if (params?.minHead) queryParams.append("minHead", params.minHead.toString());
    if (params?.maxHead) queryParams.append("maxHead", params.maxHead.toString());

    const url = queryParams.toString()
      ? `${API_BASE_URL}/pump-products?${queryParams.toString()}`
      : `${API_BASE_URL}/pump-products`;

    const response = await fetch(url, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch pump products");
    }

    return response.json();
  },

  findById: async (id: number): Promise<PumpProduct> => {
    const response = await fetch(`${API_BASE_URL}/pump-products/${id}`, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch pump product");
    }

    return response.json();
  },

  findBySku: async (sku: string): Promise<PumpProduct | null> => {
    const response = await fetch(`${API_BASE_URL}/pump-products/sku/${encodeURIComponent(sku)}`, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  },

  manufacturers: async (): Promise<string[]> => {
    const response = await fetch(`${API_BASE_URL}/pump-products/manufacturers`, {
      headers: authHeaders(),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch manufacturers");
    }

    return response.json();
  },

  byCategory: async (category: string): Promise<PumpProduct[]> => {
    const response = await fetch(
      `${API_BASE_URL}/pump-products/category/${encodeURIComponent(category)}`,
      {
        headers: authHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch products by category");
    }

    return response.json();
  },

  calculate: async (params: PumpCalculationParams): Promise<PumpCalculationResult> => {
    const response = await fetch(`${API_BASE_URL}/rfq/pump/calculate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error("Failed to calculate pump requirements");
    }

    return response.json();
  },
};
