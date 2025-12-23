import { API_BASE_URL } from '@/lib/api-config';
  
// Types based on our backend DTOs
export interface CreateRfqDto {
  projectName: string;
  description?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  requiredDate?: string;
  status?: 'draft' | 'pending' | 'quoted' | 'accepted' | 'rejected' | 'cancelled';
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
  bendType: string;
  bendDegrees: number;
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

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    
    // Try to get token from localStorage if available
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('authToken');
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    console.log(`API Request: ${url}`);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Skip authentication for now
    // if (this.token) {
    //   headers['Authorization'] = `Bearer ${this.token}`;
    // }

    const config: RequestInit = {
      ...options,
      headers,
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }

    return response.json();
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

    return response.json();
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
