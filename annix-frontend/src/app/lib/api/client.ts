import { API_BASE_URL, browserBaseUrl } from '@/lib/api-config';
import { sessionExpiredEvent } from '@/app/components/SessionExpiredModal';

export class SessionExpiredError extends Error {
  constructor() {
    super('Session expired');
    this.name = 'SessionExpiredError';
  }
}

// Types based on our backend DTOs
export interface CreateRfqDto {
  projectName: string;
  description?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  requiredDate?: string;
  status?: 'draft' | 'submitted' | 'pending' | 'quoted' | 'accepted' | 'rejected' | 'cancelled';
  notes?: string;
}

export interface CreateStraightPipeRfqDto {
  nominalBoreMm: number;
  scheduleType: 'schedule' | 'wall_thickness';
  scheduleNumber?: string;
  wallThicknessMm?: number;
  pipeEndConfiguration?: 'FBE' | 'FOE' | 'PE' | 'FOE_LF' | 'FOE_RF' | '2X_RF'; // NEW FIELD
  individualPipeLength: number;
  lengthUnit: 'meters' | 'feet';
  quantityType: 'total_length' | 'number_of_pipes';
  quantityValue: number;
  workingPressureBar: number;
  workingTemperatureC?: number;
  steelSpecificationId?: number;
  flangeStandardId?: number;
  flangePressureClassId?: number;
}

export interface PipeEndConfiguration {
  id: number;
  configCode: string;
  configName: string;
  description: string;
  weldCount: number;
}

export interface WeldType {
  id: number;
  weldCode: string;
  weldName: string;
  category: string;
  description: string;
}

export interface CreateStraightPipeRfqWithItemDto {
  rfq: CreateRfqDto;
  straightPipe: CreateStraightPipeRfqDto;
  itemDescription: string;
  itemNotes?: string;
}

export interface CreateBendRfqDto {
  nominalBoreMm: number;
  scheduleNumber: string;
  wallThicknessMm?: number;
  bendType: string;
  bendDegrees: number;
  centerToFaceMm?: number;
  bendRadiusMm?: number;
  numberOfTangents: number;
  tangentLengths: number[];
  quantityValue: number;
  quantityType: 'number_of_items';
  workingPressureBar: number;
  workingTemperatureC: number;
  steelSpecificationId: number;
}

export interface CreateBendRfqWithItemDto {
  rfq: CreateRfqDto;
  bend: CreateBendRfqDto;
  itemDescription: string;
  itemNotes?: string;
}

export interface UnifiedRfqItemDto {
  itemType: 'straight_pipe' | 'bend' | 'fitting';
  description: string;
  notes?: string;
  totalWeightKg?: number;
  straightPipe?: CreateStraightPipeRfqDto;
  bend?: Omit<CreateBendRfqDto, 'workingPressureBar' | 'workingTemperatureC' | 'steelSpecificationId'> & {
    workingPressureBar?: number;
    workingTemperatureC?: number;
    steelSpecificationId?: number;
    useGlobalFlangeSpecs?: boolean;
    flangeStandardId?: number;
    flangePressureClassId?: number;
  };
  fitting?: {
    nominalDiameterMm: number;
    scheduleNumber: string;
    wallThicknessMm?: number;
    fittingType: string;
    fittingStandard?: string;
    pipeLengthAMm?: number;
    pipeLengthBMm?: number;
    pipeEndConfiguration?: string;
    addBlankFlange?: boolean;
    blankFlangeCount?: number;
    blankFlangePositions?: string[];
    quantityType?: string;
    quantityValue?: number;
    workingPressureBar?: number;
    workingTemperatureC?: number;
    calculationData?: Record<string, any>;
  };
}

export interface CreateUnifiedRfqDto {
  rfq: CreateRfqDto;
  items: UnifiedRfqItemDto[];
}

export interface StraightPipeCalculationResult {
  outsideDiameterMm: number;
  wallThicknessMm: number;
  pipeWeightPerMeter: number;
  totalPipeWeight: number;
  totalFlangeWeight: number;
  totalBoltWeight: number;
  totalNutWeight: number;
  totalSystemWeight: number;
  calculatedPipeCount: number;
  calculatedTotalLength: number;
  numberOfFlanges: number;
  numberOfButtWelds: number;
  totalButtWeldLength: number;
  numberOfFlangeWelds: number;
  totalFlangeWeldLength: number;
}

export interface BendCalculationResult {
  totalWeight: number;
  centerToFaceDimension: number;
  bendWeight: number;
  tangentWeight: number;
  flangeWeight: number;
  numberOfFlanges: number;
  numberOfFlangeWelds: number;
  totalFlangeWeldLength: number;
  numberOfButtWelds: number;
  totalButtWeldLength: number;
  outsideDiameterMm: number;
  wallThicknessMm: number;
}

export interface RfqResponse {
  id: number;
  rfqNumber: string;
  projectName: string;
  description?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  requiredDate?: Date;
  status: string;
  notes?: string;
  totalWeightKg?: number;
  totalCost?: number;
  createdAt: Date;
  updatedAt: Date;
  itemCount: number;
}

// RFQ Draft Types
export interface SaveRfqDraftDto {
  draftId?: number;
  projectName?: string;
  currentStep: number;
  formData: Record<string, any>;
  globalSpecs?: Record<string, any>;
  requiredProducts?: string[];
  straightPipeEntries?: Record<string, any>[];
  pendingDocuments?: Record<string, any>[];
}

export type RfqDraftStatus = 'draft' | 'submitted' | 'pending' | 'in_review' | 'quoted' | 'accepted' | 'rejected' | 'cancelled';

export interface SupplierCounts {
  pending: number;
  declined: number;
  intendToQuote: number;
  quoted: number;
}

export interface RfqDraftResponse {
  id: number;
  draftNumber: string;
  rfqNumber?: string;
  projectName?: string;
  currentStep: number;
  completionPercentage: number;
  status: RfqDraftStatus;
  createdAt: Date;
  updatedAt: Date;
  isConverted: boolean;
  convertedRfqId?: number;
  supplierCounts?: SupplierCounts;
}

export interface RfqDraftFullResponse extends RfqDraftResponse {
  formData: Record<string, any>;
  globalSpecs?: Record<string, any>;
  requiredProducts?: string[];
  straightPipeEntries?: Record<string, any>[];
  pendingDocuments?: Record<string, any>[];
}

export interface RfqDocument {
  id: number;
  rfqId: number;
  filename: string;
  mimeType: string;
  fileSizeBytes: number;
  downloadUrl: string;
  uploadedBy?: string;
  createdAt: Date;
}

export interface SteelSpecification {
  id: number;
  steelSpecName: string;
}

export interface FlangeStandard {
  id: number;
  code: string;
}

export interface FlangePressureClass {
  id: number;
  designation: string;
  standard?: FlangeStandard;
}

export interface NominalOutsideDiameter {
  id: number;
  nominal_diameter_mm: number;
  outside_diameter_mm: number;
}

export interface PipeDimension {
  id: number;
  wallThicknessMm: number;
  internalDiameterMm?: number;
  massKgm: number;
  scheduleDesignation?: string;
  scheduleNumber?: number;
  nominalOutsideDiameter: NominalOutsideDiameter;
  steelSpecification: SteelSpecification;
}

export interface PipePressure {
  id: number;
  temperatureC?: number;
  maxWorkingPressureMpa?: number;
  allowableStressMpa: number;
}

// SA Mines types
export interface Commodity {
  id: number;
  commodityName: string;
  typicalProcessRoute: string | null;
  applicationNotes: string | null;
}

export interface SaMine {
  id: number;
  mineName: string;
  operatingCompany: string;
  commodityId: number;
  commodityName?: string;
  province: string;
  district: string | null;
  physicalAddress: string | null;
  mineType: 'Underground' | 'Open Cast' | 'Both';
  operationalStatus: 'Active' | 'Care and Maintenance' | 'Closed';
  latitude: number | null;
  longitude: number | null;
}

export interface SlurryProfile {
  id: number;
  commodityId: number;
  commodityName?: string;
  profileName: string | null;
  typicalSgMin: number;
  typicalSgMax: number;
  solidsConcentrationMin: number;
  solidsConcentrationMax: number;
  phMin: number;
  phMax: number;
  tempMin: number;
  tempMax: number;
  abrasionRisk: 'Low' | 'Medium' | 'High' | 'Very High';
  corrosionRisk: 'Low' | 'Medium' | 'High' | 'Very High';
  primaryFailureMode: string | null;
  notes: string | null;
}

export interface LiningCoatingRule {
  id: number;
  abrasionLevel: 'Low' | 'Medium' | 'High' | 'Very High';
  corrosionLevel: 'Low' | 'Medium' | 'High' | 'Very High';
  recommendedLining: string;
  recommendedCoating: string | null;
  applicationNotes: string | null;
  priority: number;
}

export interface MineWithEnvironmentalData {
  mine: SaMine;
  slurryProfile: SlurryProfile | null;
  liningRecommendation: LiningCoatingRule | null;
}

export interface CreateSaMineDto {
  mineName: string;
  operatingCompany: string;
  commodityId: number;
  province: string;
  district?: string;
  physicalAddress?: string;
  mineType?: 'Underground' | 'Open Cast' | 'Both';
  operationalStatus?: 'Active' | 'Care and Maintenance' | 'Closed';
  latitude?: number;
  longitude?: number;
}

// Material Validation Types
export interface MaterialLimit {
  id: number;
  steelSpecificationId: number | null;
  steelSpecName: string;
  minTemperatureCelsius: number;
  maxTemperatureCelsius: number;
  maxPressureBar: number;
  materialType: string;
  recommendedForSourService: boolean;
  notes: string | null;
}

export interface MaterialSuitabilityResult {
  isSuitable: boolean;
  warnings: string[];
  recommendation?: string;
  limits?: {
    minTempC: number;
    maxTempC: number;
    maxPressureBar: number;
    materialType: string;
    notes?: string;
  };
}

// Weld Thickness Types
export interface WeldThicknessResult {
  found: boolean;
  weldThicknessMm: number | null;
  fittingClass: string | null;
  dn: number;
  odMm: number | null;
  maxPressureBar: number | null;
  temperatureC: number;
  schedule: string;
  notes?: string;
}

export interface PipeWallThicknessResult {
  found: boolean;
  wallThicknessMm: number | null;
  maxPressureBar: number | null;
  schedule: string;
  dn: number;
  temperatureC: number;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  // Get the current auth token - checks customer, supplier, and admin tokens
  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;

    // Check for customer token first (most common for RFQ)
    const customerToken = localStorage.getItem('customerAccessToken');
    if (customerToken) return customerToken;

    // Check for supplier token
    const supplierToken = localStorage.getItem('supplierAccessToken');
    if (supplierToken) return supplierToken;

    // Check for admin token
    const adminToken = localStorage.getItem('adminAccessToken');
    if (adminToken) return adminToken;

    // Fallback to generic auth token
    return localStorage.getItem('authToken');
  }

  setToken(token: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', token);
    }
  }

  clearToken() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
    }
  }

  // Attempt to refresh the customer access token using the refresh token
  private async refreshCustomerToken(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    const refreshToken = localStorage.getItem('customerRefreshToken');
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseURL}/customer/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        // Refresh failed - clear tokens
        localStorage.removeItem('customerAccessToken');
        localStorage.removeItem('customerRefreshToken');
        return false;
      }

      const data = await response.json();
      if (data.access_token && data.refresh_token) {
        localStorage.setItem('customerAccessToken', data.access_token);
        localStorage.setItem('customerRefreshToken', data.refresh_token);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Include auth token if available
    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      let response = await fetch(url, config);

      // Handle 401 by attempting token refresh
      if (response.status === 401) {
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
        if (response.status === 401) {
          sessionExpiredEvent.emit();
          throw new SessionExpiredError();
        }
        const errorText = await response.text();
        throw new Error(`API Error (${response.status}): ${errorText}`);
      }

      // Handle empty responses gracefully
      const text = await response.text();
      if (!text || text.trim() === '') {
        // Return empty object/null for empty responses - caller should handle
        return {} as T;
      }

      try {
        return JSON.parse(text) as T;
      } catch (parseError) {
        console.warn('Failed to parse JSON response:', text.substring(0, 100));
        return {} as T;
      }
    } catch (error) {
      // Silently handle network errors (backend unavailable)
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Backend unavailable');
      }
      throw error;
    }
  }

  // Auth endpoints
  async login(email: string, password: string): Promise<{ access_token: string }> {
    const result = await this.request<{ access_token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    this.setToken(result.access_token);
    return result;
  }

  // RFQ endpoints
  async calculateStraightPipe(
    data: CreateStraightPipeRfqDto
  ): Promise<StraightPipeCalculationResult> {
    // Normalize schedule format before sending to backend
    const normalizedData = {
      ...data,
      scheduleNumber: this.normalizeScheduleNumber(data.scheduleNumber)
    };
    
    return this.request<StraightPipeCalculationResult>('/rfq/straight-pipe/calculate', {
      method: 'POST',
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
    data: CreateStraightPipeRfqWithItemDto
  ): Promise<{ rfq: any; calculation: StraightPipeCalculationResult }> {
    // Normalize schedule format in straightPipe data
    const normalizedData = {
      ...data,
      straightPipe: {
        ...data.straightPipe,
        scheduleNumber: this.normalizeScheduleNumber(data.straightPipe.scheduleNumber)
      }
    };
    
    return this.request('/rfq/straight-pipe', {
      method: 'POST',
      body: JSON.stringify(normalizedData),
    });
  }

  async calculateBendRfq(
    data: CreateBendRfqDto
  ): Promise<BendCalculationResult> {
    return this.request('/rfq/bend/calculate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createBendRfq(
    data: CreateBendRfqWithItemDto
  ): Promise<{ rfq: any; calculation: BendCalculationResult }> {
    return this.request('/rfq/bend', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createUnifiedRfq(
    data: CreateUnifiedRfqDto
  ): Promise<{ rfq: any; itemsCreated: number }> {
    return this.request('/rfq/unified', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUnifiedRfq(
    id: number,
    data: CreateUnifiedRfqDto
  ): Promise<{ rfq: any; itemsUpdated: number }> {
    return this.request(`/rfq/unified/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getRfqs(): Promise<RfqResponse[]> {
    return this.request<RfqResponse[]>('/rfq');
  }

  async getRfqById(id: number): Promise<any> {
    return this.request(`/rfq/${id}`);
  }

  // RFQ Document endpoints
  async uploadRfqDocument(rfqId: number, file: File): Promise<RfqDocument> {
    const url = `${this.baseURL}/rfq/${rfqId}/documents`;
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - browser will set it with boundary for multipart
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }

    // Handle empty responses gracefully
    const text = await response.text();
    if (!text || text.trim() === '') {
      return {} as RfqDocument;
    }

    try {
      return JSON.parse(text) as RfqDocument;
    } catch {
      console.warn('Failed to parse JSON response:', text.substring(0, 100));
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
      method: 'DELETE',
    });
  }

  // Master data endpoints
  async getSteelSpecifications(): Promise<SteelSpecification[]> {
    return this.request<SteelSpecification[]>('/steel-specification');
  }

  async getFlangeStandards(): Promise<FlangeStandard[]> {
    return this.request<FlangeStandard[]>('/flange-standard');
  }

  async getFlangePressureClasses(): Promise<FlangePressureClass[]> {
    return this.request<FlangePressureClass[]>('/flange-pressure-class');
  }

  async getFlangePressureClassesByStandard(standardId: number): Promise<FlangePressureClass[]> {
    return this.request<FlangePressureClass[]>(`/flange-pressure-class/standard/${standardId}`);
  }

  // Pipe data endpoints
  async getPipeDimensions(
    nominalBore?: number,
    steelSpecId?: number,
    minPressure?: number,
    temperature?: number
  ): Promise<PipeDimension[]> {
    const params = new URLSearchParams();
    if (nominalBore) params.append('nominalBore', nominalBore.toString());
    if (steelSpecId) params.append('steelSpecId', steelSpecId.toString());
    if (minPressure) params.append('minPressure', minPressure.toString());
    if (temperature) params.append('temperature', temperature.toString());
    
    const query = params.toString() ? `?${params.toString()}` : '';
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
    const query = steelSpecId ? `?steelSpecId=${steelSpecId}` : '';
    return this.request<NominalOutsideDiameter[]>(`/nominal-outside-diameter-mm${query}`);
  }

  async getRecommendedSpecs(
    nominalBore: number,
    workingPressure: number,
    temperature?: number,
    steelSpecId?: number
  ): Promise<{
    pipeDimension: PipeDimension;
    schedule?: string;
    wallThickness: number;
    maxPressure: number;
    availableUpgrades?: PipeDimension[];
  }> {
    return this.request('/pipe-dimensions/recommend', {
      method: 'POST',
      body: JSON.stringify({
        nominalBore,
        workingPressure,
        temperature: temperature || 20,
        steelSpecId
      }),
    });
  }

  async getHigherSchedules(
    nominalBore: number,
    currentWallThickness: number,
    workingPressure: number,
    temperature: number = 20,
    steelSpecId?: number
  ): Promise<PipeDimension[]> {
    const params = new URLSearchParams({
      nominalBore: nominalBore.toString(),
      currentWallThickness: currentWallThickness.toString(),
      workingPressure: workingPressure.toString(),
      temperature: temperature.toString(),
    });
    
    if (steelSpecId) {
      params.append('steelSpecId', steelSpecId.toString());
    }

    return this.request<PipeDimension[]>(`/pipe-dimensions/higher-schedules?${params}`);
  }

  // Pipe end configuration endpoints
  async getPipeEndConfigurations(): Promise<PipeEndConfiguration[]> {
    return this.request<PipeEndConfiguration[]>('/pipe-end-configurations');
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
    return this.request('/bend-center-to-face/calculate', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  async getBendTypes(): Promise<string[]> {
    return this.request<string[]>('/bend-center-to-face/bend-types');
  }

  async getNominalBoresForBendType(bendType: string): Promise<number[]> {
    return this.request<number[]>(`/bend-center-to-face/nominal-bores/${bendType}`);
  }

  async getDegreesForBendType(bendType: string, nominalBoreMm?: number): Promise<number[]> {
    const query = nominalBoreMm ? `?nominalBoreMm=${nominalBoreMm}` : '';
    return this.request<number[]>(`/bend-center-to-face/degrees/${bendType}${query}`);
  }

  async getBendOptions(bendType: string): Promise<{ nominalBores: number[]; degrees: number[] }> {
    return this.request<{ nominalBores: number[]; degrees: number[] }>(`/bend-center-to-face/options/${bendType}`);
  }

  async getBendCenterToFace(bendType: string, nominalBoreMm: number, degrees: number): Promise<any> {
    return this.request(`/bend-center-to-face/lookup?bendType=${bendType}&nominalBoreMm=${nominalBoreMm}&degrees=${degrees}`);
  }

  // Weld type endpoints
  async getWeldTypes(): Promise<WeldType[]> {
    return this.request<WeldType[]>('/weld-type');
  }

  async getWeldTypeById(id: number): Promise<WeldType> {
    return this.request<WeldType>(`/weld-type/${id}`);
  }

  // Fitting endpoints
  async getFittingDimensions(
    standard: 'SABS62' | 'SABS719',
    fittingType: string,
    nominalDiameterMm: number,
    angleRange?: string
  ): Promise<any> {
    const params = new URLSearchParams({
      standard,
      fittingType,
      nominalDiameterMm: nominalDiameterMm.toString(),
    });
    if (angleRange) {
      params.append('angleRange', angleRange);
    }
    return this.request(`/fittings/dimensions?${params.toString()}`);
  }

  async getAvailableFittingTypes(standard: 'SABS62' | 'SABS719'): Promise<string[]> {
    return this.request<string[]>(`/fittings/types?standard=${standard}`);
  }

  async getAvailableFittingSizes(standard: 'SABS62' | 'SABS719', fittingType: string): Promise<number[]> {
    return this.request<number[]>(`/fittings/sizes?standard=${standard}&fittingType=${fittingType}`);
  }

  async getAvailableAngleRanges(fittingType: string, nominalDiameterMm: number): Promise<string[]> {
    return this.request<string[]>(`/fittings/angle-ranges?fittingType=${fittingType}&nominalDiameterMm=${nominalDiameterMm}`);
  }

  // Mines endpoints
  async getCommodities(): Promise<Commodity[]> {
    return this.request<Commodity[]>('/mines/commodities');
  }

  async getProvinces(): Promise<string[]> {
    return this.request<string[]>('/mines/provinces');
  }

  async getMines(commodityId?: number, province?: string, status?: string): Promise<SaMine[]> {
    const params = new URLSearchParams();
    if (commodityId) params.append('commodityId', commodityId.toString());
    if (province) params.append('province', province);
    if (status) params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<SaMine[]>(`/mines${query}`);
  }

  async getActiveMines(): Promise<SaMine[]> {
    return this.request<SaMine[]>('/mines/active');
  }

  async getMineById(id: number): Promise<SaMine> {
    return this.request<SaMine>(`/mines/${id}`);
  }

  async getMineWithEnvironmentalData(id: number): Promise<MineWithEnvironmentalData> {
    return this.request<MineWithEnvironmentalData>(`/mines/${id}/environmental-data`);
  }

  async getSlurryProfiles(): Promise<SlurryProfile[]> {
    return this.request<SlurryProfile[]>('/mines/slurry-profiles');
  }

  async getLiningRules(): Promise<LiningCoatingRule[]> {
    return this.request<LiningCoatingRule[]>('/mines/lining-rules');
  }

  async createMine(mineData: CreateSaMineDto): Promise<SaMine> {
    return this.request<SaMine>('/mines', {
      method: 'POST',
      body: JSON.stringify(mineData),
    });
  }

  async calculateFitting(data: {
    fittingStandard: 'SABS62' | 'SABS719';
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
  }> {
    return this.request('/fittings/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
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

    // Convert NB mm to NPS (approximate)
    const nbToNps: { [key: number]: string } = {
      15: '1/2', 20: '3/4', 25: '1', 32: '1-1/4', 40: '1-1/2',
      50: '2', 65: '2-1/2', 80: '3', 100: '4', 125: '5', 150: '6',
      200: '8', 250: '10', 300: '12', 350: '14', 400: '16',
      450: '18', 500: '20', 600: '24', 700: '28', 750: '30',
      800: '32', 900: '36', 1000: '40', 1050: '42', 1200: '48'
    };

    const nps = nbToNps[params.nbMm] || `${Math.round(params.nbMm / 25.4)}`;

    queryParams.append('nps', nps);
    queryParams.append('pressureBar', params.pressureBar.toString());
    queryParams.append('temperatureCelsius', params.temperatureCelsius.toString());
    queryParams.append('materialCode', params.materialCode || 'ASTM_A106_Grade_B');
    if (params.corrosionAllowanceMm) {
      queryParams.append('corrosionAllowanceMm', params.corrosionAllowanceMm.toString());
    }

    return this.request(`/pipe-schedules/recommend?${queryParams.toString()}`);
  }

  // Get available schedules for a given NB
  async getSchedulesByNb(nbMm: number): Promise<Array<{
    id: number;
    nps: string;
    nbMm: number;
    schedule: string;
    wallThicknessInch: number;
    wallThicknessMm: number;
    outsideDiameterInch: number;
    standardCode: string;
  }>> {
    return this.request(`/pipe-schedules/by-nb?nbMm=${nbMm}`);
  }

  // ==================== Draft Methods ====================

  async saveDraft(dto: SaveRfqDraftDto): Promise<RfqDraftResponse> {
    return this.request('/rfq/drafts', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async getDrafts(): Promise<RfqDraftResponse[]> {
    return this.request('/rfq/drafts');
  }

  async getDraftById(id: number): Promise<RfqDraftFullResponse> {
    return this.request(`/rfq/drafts/${id}`);
  }

  async getDraftByNumber(draftNumber: string): Promise<RfqDraftFullResponse> {
    return this.request(`/rfq/drafts/number/${encodeURIComponent(draftNumber)}`);
  }

  async deleteDraft(id: number): Promise<void> {
    return this.request(`/rfq/drafts/${id}`, {
      method: 'DELETE',
    });
  }

  // ==================== Material Validation Methods ====================

  async getAllMaterialLimits(): Promise<MaterialLimit[]> {
    return this.request('/material-validation');
  }

  async getMaterialLimitsBySpecName(specName: string): Promise<MaterialLimit | null> {
    return this.request(`/material-validation/by-spec-name/${encodeURIComponent(specName)}`);
  }

  async checkMaterialSuitability(
    specName: string,
    temperature?: number,
    pressure?: number
  ): Promise<MaterialSuitabilityResult> {
    const params = new URLSearchParams({ specName });
    if (temperature !== undefined) params.append('temperature', temperature.toString());
    if (pressure !== undefined) params.append('pressure', pressure.toString());
    return this.request(`/material-validation/check-suitability?${params.toString()}`);
  }

  async getSuitableMaterials(temperature?: number, pressure?: number): Promise<string[]> {
    const params = new URLSearchParams();
    if (temperature !== undefined) params.append('temperature', temperature.toString());
    if (pressure !== undefined) params.append('pressure', pressure.toString());
    return this.request(`/material-validation/suitable-materials?${params.toString()}`);
  }

  // ==================== Weld Thickness Methods ====================

  async getWeldThickness(
    dn: number,
    schedule: string,
    temperature?: number
  ): Promise<WeldThicknessResult> {
    const params = new URLSearchParams({
      dn: dn.toString(),
      schedule,
    });
    if (temperature !== undefined) params.append('temperature', temperature.toString());
    return this.request(`/weld-thickness/lookup?${params.toString()}`);
  }

  async getRecommendedWeldThickness(
    dn: number,
    pressure: number,
    temperature?: number
  ): Promise<WeldThicknessResult> {
    const params = new URLSearchParams({
      dn: dn.toString(),
      pressure: pressure.toString(),
    });
    if (temperature !== undefined) params.append('temperature', temperature.toString());
    return this.request(`/weld-thickness/recommend?${params.toString()}`);
  }

  async getAllWeldThicknessesForDn(dn: number, temperature?: number): Promise<WeldThicknessResult[]> {
    const params = new URLSearchParams({ dn: dn.toString() });
    if (temperature !== undefined) params.append('temperature', temperature.toString());
    return this.request(`/weld-thickness/all-for-dn?${params.toString()}`);
  }

  async getPipeWallThickness(
    dn: number,
    schedule: string,
    temperature?: number
  ): Promise<PipeWallThicknessResult> {
    const params = new URLSearchParams({
      dn: dn.toString(),
      schedule,
    });
    if (temperature !== undefined) params.append('temperature', temperature.toString());
    return this.request(`/weld-thickness/pipe-wall?${params.toString()}`);
  }
}

// Create and export the API client instance
export const apiClient = new ApiClient();

// Export individual API functions for convenience
export const rfqApi = {
  calculate: (data: CreateStraightPipeRfqDto) => 
    apiClient.calculateStraightPipe(data),
  create: (data: CreateStraightPipeRfqWithItemDto) => 
    apiClient.createStraightPipeRfq(data),
  getAll: () => apiClient.getRfqs(),
  getById: (id: number) => apiClient.getRfqById(id),
};

export const bendRfqApi = {
  calculate: (data: CreateBendRfqDto) =>
    apiClient.calculateBendRfq(data),
  create: (data: CreateBendRfqWithItemDto) =>
    apiClient.createBendRfq(data),
};

export const unifiedRfqApi = {
  create: (data: CreateUnifiedRfqDto) =>
    apiClient.createUnifiedRfq(data),
  update: (id: number, data: CreateUnifiedRfqDto) =>
    apiClient.updateUnifiedRfq(id, data),
};

export const masterDataApi = {
  getSteelSpecifications: () => apiClient.getSteelSpecifications(),
  getFlangeStandards: () => apiClient.getFlangeStandards(),
  getFlangePressureClasses: () => apiClient.getFlangePressureClasses(),
  getFlangePressureClassesByStandard: (standardId: number) => apiClient.getFlangePressureClassesByStandard(standardId),
  getPipeDimensions: (nominalBore?: number, steelSpecId?: number, minPressure?: number, temperature?: number) => 
    apiClient.getPipeDimensions(nominalBore, steelSpecId, minPressure, temperature),
  getNominalBores: (steelSpecId?: number) => apiClient.getNominalBores(steelSpecId),
  getRecommendedSpecs: (nominalBore: number, workingPressure: number, temperature?: number, steelSpecId?: number) =>
    apiClient.getRecommendedSpecs(nominalBore, workingPressure, temperature, steelSpecId),
  getHigherSchedules: (nominalBore: number, currentWallThickness: number, workingPressure: number, temperature?: number, steelSpecId?: number) =>
    apiClient.getHigherSchedules(nominalBore, currentWallThickness, workingPressure, temperature, steelSpecId),
  getPipeEndConfigurations: () => apiClient.getPipeEndConfigurations(),
  getPipeEndConfigurationByCode: (configCode: string) => apiClient.getPipeEndConfigurationByCode(configCode),
  getPipeDimensionsAll: (steelSpecId: number, nominalId: number) => apiClient.getPipeDimensionsAll(steelSpecId, nominalId),

  // Bend calculations  
  calculateBendSpecifications: (params: any) => apiClient.calculateBendSpecifications(params),
  getBendTypes: () => apiClient.getBendTypes(),
  getBendNominalBores: (bendType: string) => apiClient.getNominalBoresForBendType(bendType),
  getBendDegrees: (bendType: string, nominalBoreMm?: number) => apiClient.getDegreesForBendType(bendType, nominalBoreMm),
  getBendOptions: (bendType: string) => apiClient.getBendOptions(bendType),
  getBendCenterToFace: (bendType: string, nominalBoreMm: number, degrees: number) => 
    apiClient.getBendCenterToFace(bendType, nominalBoreMm, degrees),
  getWeldTypes: () => apiClient.getWeldTypes(),
  getWeldTypeById: (id: number) => apiClient.getWeldTypeById(id),

  // Fitting API
  getFittingDimensions: (standard: 'SABS62' | 'SABS719', fittingType: string, nominalDiameterMm: number, angleRange?: string) =>
    apiClient.getFittingDimensions(standard, fittingType, nominalDiameterMm, angleRange),
  getAvailableFittingTypes: (standard: 'SABS62' | 'SABS719') => apiClient.getAvailableFittingTypes(standard),
  getAvailableFittingSizes: (standard: 'SABS62' | 'SABS719', fittingType: string) => 
    apiClient.getAvailableFittingSizes(standard, fittingType),
  getAvailableAngleRanges: (fittingType: string, nominalDiameterMm: number) => 
    apiClient.getAvailableAngleRanges(fittingType, nominalDiameterMm),
  calculateFitting: (data: Parameters<typeof apiClient.calculateFitting>[0]) => 
    apiClient.calculateFitting(data),
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
  getMaterialLimitsBySpecName: (specName: string) => apiClient.getMaterialLimitsBySpecName(specName),
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

// ISO 12944-5 Coating Specification Types
export interface ISO12944System {
  id: number;
  systemCode: string | null;
  binderType: string | null;
  primerType: string | null;
  primerNdftUm: string | null;
  subsequentBinder: string | null;
  system: string;
  coats: string;
  totalDftUmRange: string;
  supportedDurabilities: string | null;
  isRecommended: boolean;
  applications: string;
}

export interface ISO12944SystemsByDurabilityResult {
  recommended: ISO12944System | null;
  alternatives: ISO12944System[];
}

export interface ISO12944DurabilityOption {
  code: string;
  label: string;
  years: string;
}

export const coatingSpecificationApi = {
  getCorrosivityCategories: async (): Promise<{ category: string; description: string }[]> => {
    const response = await fetch(`${API_BASE_URL}/coating-specifications/corrosivity-categories`);
    if (!response.ok) throw new Error('Failed to fetch corrosivity categories');
    return response.json();
  },

  systemsByDurability: async (
    category: string,
    durability: 'L' | 'M' | 'H' | 'VH'
  ): Promise<ISO12944SystemsByDurabilityResult> => {
    const response = await fetch(
      `${API_BASE_URL}/coating-specifications/iso12944/systems-by-durability?category=${category}&durability=${durability}`
    );
    if (!response.ok) throw new Error('Failed to fetch systems by durability');
    return response.json();
  },

  systemsByCategory: async (category: string): Promise<ISO12944System[]> => {
    const response = await fetch(
      `${API_BASE_URL}/coating-specifications/iso12944/systems-by-category?category=${category}`
    );
    if (!response.ok) throw new Error('Failed to fetch systems by category');
    return response.json();
  },

  availableDurabilities: async (category: string): Promise<ISO12944DurabilityOption[]> => {
    const response = await fetch(
      `${API_BASE_URL}/coating-specifications/iso12944/durabilities?category=${category}`
    );
    if (!response.ok) throw new Error('Failed to fetch available durabilities');
    return response.json();
  },

  systemByCode: async (systemCode: string): Promise<ISO12944System | null> => {
    const response = await fetch(
      `${API_BASE_URL}/coating-specifications/iso12944/system-by-code?systemCode=${systemCode}`
    );
    if (!response.ok) throw new Error('Failed to fetch system by code');
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
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const response = await fetch(`${API_BASE_URL}/rfq/drafts/${draftId}/convert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ rfqId }),
    });
    if (!response.ok) {
      throw new Error('Failed to mark draft as converted');
    }
  },
};

// BOQ Distribution API types
export interface ConsolidatedBoqDataDto {
  straightPipes?: ConsolidatedItemDto[];
  bends?: ConsolidatedItemDto[];
  tees?: ConsolidatedItemDto[];
  reducers?: ConsolidatedItemDto[];
  flanges?: ConsolidatedItemDto[];
  blankFlanges?: ConsolidatedItemDto[];
  bnwSets?: ConsolidatedItemDto[];
  gaskets?: ConsolidatedItemDto[];
  surfaceProtection?: ConsolidatedItemDto[];
}

export interface ConsolidatedItemDto {
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
  };
  areas?: {
    intAreaM2?: number;
    extAreaM2?: number;
  };
}

export interface SubmitBoqDto {
  boqData: ConsolidatedBoqDataDto;
  customerInfo?: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
  };
  projectInfo?: {
    name: string;
    description?: string;
    requiredDate?: string;
  };
}

export interface SubmitBoqResponseDto {
  boqId: number;
  boqNumber: string;
  sectionsCreated: number;
  suppliersNotified: number;
  sectionsSummary: {
    sectionType: string;
    sectionTitle: string;
    itemCount: number;
    totalWeightKg: number;
  }[];
}

export interface CreateBoqDto {
  title: string;
  description?: string;
  rfqId?: number;
}

export interface BoqResponse {
  id: number;
  boqNumber: string;
  title: string;
  status: string;
}

export const boqApi = {
  create: async (dto: CreateBoqDto): Promise<BoqResponse> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const response = await fetch(`${API_BASE_URL}/boq`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
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
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const response = await fetch(`${API_BASE_URL}/boq/${boqId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
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
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const response = await fetch(`${API_BASE_URL}/boq/${boqId}/update-submitted`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
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
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const response = await fetch(`${API_BASE_URL}/boq?rfqId=${rfqId}&limit=1`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
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

export interface NixExtractedItem {
  rowNumber: number;
  itemNumber: string;
  description: string;
  itemType: 'pipe' | 'bend' | 'reducer' | 'tee' | 'flange' | 'expansion_joint' | 'unknown';
  material: string | null;
  materialGrade: string | null;
  diameter: number | null;
  diameterUnit: 'mm' | 'inch';
  secondaryDiameter: number | null;
  length: number | null;
  wallThickness: number | null;
  schedule: string | null;
  angle: number | null;
  flangeConfig: 'none' | 'one_end' | 'both_ends' | 'puddle' | 'blind' | null;
  quantity: number;
  unit: string;
  confidence: number;
  needsClarification: boolean;
  clarificationReason: string | null;
}

export interface NixClarificationDto {
  id: number;
  question: string;
  context: {
    rowNumber?: number;
    itemNumber?: string;
    itemDescription?: string;
    itemType?: string;
    extractedMaterial?: string | null;
    extractedDiameter?: number | null;
    extractedLength?: number | null;
    extractedAngle?: number | null;
    extractedFlangeConfig?: string | null;
    extractedQuantity?: number;
    confidence?: number;
    clarificationReason?: string | null;
  };
}

export interface NixProcessResponse {
  extractionId: number;
  status: string;
  items?: NixExtractedItem[];
  pendingClarifications?: NixClarificationDto[];
  error?: string;
}

export const nixApi = {
  uploadAndProcess: async (file: File, userId?: number, rfqId?: number): Promise<NixProcessResponse> => {
    if (!file || !(file instanceof File)) {
      throw new Error('Invalid file object provided to Nix upload');
    }

    if (file.size === 0) {
      throw new Error('Cannot upload empty file to Nix');
    }

    let fileData: ArrayBuffer;
    try {
      fileData = await file.arrayBuffer();
    } catch {
      throw new Error(
        `Cannot read "${file.name}". The file may be open in another application (like Excel). Please close it and try again.`
      );
    }

    const blob = new Blob([fileData], { type: file.type });
    const formData = new FormData();
    formData.append('file', blob, file.name);
    if (userId) formData.append('userId', userId.toString());
    if (rfqId) formData.append('rfqId', rfqId.toString());

    const uploadUrl = '/api/nix/upload';
    console.log('[Nix] Uploading via API route:', uploadUrl, 'File:', file.name, 'Size:', file.size);

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to process document: ${errorText}`);
    }

    return response.json();
  },

  getExtraction: async (extractionId: number): Promise<NixProcessResponse> => {
    const baseUrl = browserBaseUrl();
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const response = await fetch(`${baseUrl}/nix/extraction/${extractionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get extraction: ${errorText}`);
    }

    return response.json();
  },

  getPendingClarifications: async (extractionId: number): Promise<NixClarificationDto[]> => {
    const baseUrl = browserBaseUrl();
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const response = await fetch(`${baseUrl}/nix/extraction/${extractionId}/clarifications`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get clarifications: ${errorText}`);
    }

    return response.json();
  },

  submitClarification: async (
    clarificationId: number,
    responseText: string,
    allowLearning: boolean = true
  ): Promise<{ success: boolean; remainingClarifications: number }> => {
    const baseUrl = browserBaseUrl();
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const response = await fetch(`${baseUrl}/nix/clarification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        clarificationId,
        responseType: 'text',
        responseText,
        allowLearning,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to submit clarification: ${errorText}`);
    }

    return response.json();
  },

  skipClarification: async (clarificationId: number): Promise<{ success: boolean }> => {
    const baseUrl = browserBaseUrl();
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const response = await fetch(`${baseUrl}/nix/clarification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        clarificationId,
        responseType: 'text',
        responseText: '[SKIPPED]',
        allowLearning: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to skip clarification: ${errorText}`);
    }

    return response.json();
  },
};
