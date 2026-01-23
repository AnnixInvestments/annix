import { API_BASE_URL } from '@/lib/api-config';
import type {
  SupportSpacingRequest,
  SupportSpacingResponse,
  ReinforcementPadRequest,
  ReinforcementPadResponse,
  BracketTypeResponse,
  BracketDimensionResponse,
  PadStandardResponse,
  ThermalExpansionRequest,
  ThermalExpansionResponse,
  CalculationRequest,
  CalculationResponse,
  ValidateBracketRequest,
  BracketCompatibilityResponse,
  BatchCalculationRequest,
  BatchCalculationResponse,
  MultiStandardSpacingRequest,
  MultiStandardSpacingResponse,
  ReinforcementPadWithDeratingRequest,
  ReinforcementPadWithDeratingResponse,
  VibrationAnalysisRequest,
  VibrationAnalysisResponse,
  StressAnalysisRequest,
  StressAnalysisResponse,
  MaterialCompatibilityRequest,
  MaterialCompatibilityResponse,
  ExportReportRequest,
  ExportReportResponse,
  ConfigValue,
  StandardPlateSize,
  GasketMaterial,
  GasketCompatibilityRequest,
  GasketCompatibilityResponse,
  HeatTreatment,
  HeatTreatmentRequirementRequest,
  HeatTreatmentRequirementResponse,
} from './types';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pipe Steel Work API Error (${response.status}): ${errorText}`);
  }

  return response.json();
}

export const pipeSteelWorkApi = {
  supportSpacing: (dto: SupportSpacingRequest): Promise<SupportSpacingResponse> =>
    fetchJson(`${API_BASE_URL}/pipe-steel-work/support-spacing`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  reinforcementPad: (dto: ReinforcementPadRequest): Promise<ReinforcementPadResponse> =>
    fetchJson(`${API_BASE_URL}/pipe-steel-work/reinforcement-pad`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  bracketTypes: (nominalDiameterMm?: number): Promise<BracketTypeResponse[]> => {
    const params = nominalDiameterMm
      ? `?nominalDiameterMm=${nominalDiameterMm}`
      : '';
    return fetchJson(`${API_BASE_URL}/pipe-steel-work/bracket-types${params}`);
  },

  padStandard: (branchNbMm: number, headerNbMm: number): Promise<PadStandardResponse | null> =>
    fetchJson(`${API_BASE_URL}/pipe-steel-work/pad-standard?branchNbMm=${branchNbMm}&headerNbMm=${headerNbMm}`),

  bracketDimensions: (bracketTypeCode: string, nbMm?: number): Promise<BracketDimensionResponse | BracketDimensionResponse[]> => {
    const params = nbMm
      ? `?bracketTypeCode=${bracketTypeCode}&nbMm=${nbMm}`
      : `?bracketTypeCode=${bracketTypeCode}`;
    return fetchJson(`${API_BASE_URL}/pipe-steel-work/bracket-dimensions${params}`);
  },

  thermalExpansion: (dto: ThermalExpansionRequest): Promise<ThermalExpansionResponse> =>
    fetchJson(`${API_BASE_URL}/pipe-steel-work/thermal-expansion`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  calculate: (dto: CalculationRequest): Promise<CalculationResponse> =>
    fetchJson(`${API_BASE_URL}/pipe-steel-work/calculate`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  validateBracket: (dto: ValidateBracketRequest): Promise<BracketCompatibilityResponse> =>
    fetchJson(`${API_BASE_URL}/pipe-steel-work/validate-bracket`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  batchCalculate: (dto: BatchCalculationRequest): Promise<BatchCalculationResponse> =>
    fetchJson(`${API_BASE_URL}/pipe-steel-work/batch-calculate`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  supportSpacingMultiStandard: (dto: MultiStandardSpacingRequest): Promise<MultiStandardSpacingResponse> =>
    fetchJson(`${API_BASE_URL}/pipe-steel-work/support-spacing/multi-standard`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  reinforcementPadWithDerating: (dto: ReinforcementPadWithDeratingRequest): Promise<ReinforcementPadWithDeratingResponse> =>
    fetchJson(`${API_BASE_URL}/pipe-steel-work/reinforcement-pad/with-derating`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  vibrationAnalysis: (dto: VibrationAnalysisRequest): Promise<VibrationAnalysisResponse> =>
    fetchJson(`${API_BASE_URL}/pipe-steel-work/vibration-analysis`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  stressAnalysis: (dto: StressAnalysisRequest): Promise<StressAnalysisResponse> =>
    fetchJson(`${API_BASE_URL}/pipe-steel-work/stress-analysis`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  materialCompatibility: (dto: MaterialCompatibilityRequest): Promise<MaterialCompatibilityResponse> =>
    fetchJson(`${API_BASE_URL}/pipe-steel-work/material-compatibility`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  exportReport: (dto: ExportReportRequest): Promise<ExportReportResponse> =>
    fetchJson(`${API_BASE_URL}/pipe-steel-work/export`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  configs: (category?: string): Promise<ConfigValue[]> => {
    const params = category ? `?category=${category}` : '';
    return fetchJson(`${API_BASE_URL}/pipe-steel-work/config${params}`);
  },

  config: (key: string): Promise<{ key: string; value: string | null }> =>
    fetchJson(`${API_BASE_URL}/pipe-steel-work/config/${key}`),

  updateConfig: (key: string, value: string): Promise<{ success: boolean; config?: ConfigValue; message?: string }> =>
    fetchJson(`${API_BASE_URL}/pipe-steel-work/config/${key}`, {
      method: 'POST',
      body: JSON.stringify({ value }),
    }),

  standardPlateSizes: (category?: string): Promise<StandardPlateSize[]> => {
    const params = category ? `?category=${category}` : '';
    return fetchJson(`${API_BASE_URL}/pipe-steel-work/standard-plate-sizes${params}`);
  },

  gasketMaterials: (type?: string): Promise<GasketMaterial[]> => {
    const params = type ? `?type=${type}` : '';
    return fetchJson(`${API_BASE_URL}/pipe-steel-work/gasket-materials${params}`);
  },

  gasketCompatibility: (dto: GasketCompatibilityRequest): Promise<GasketCompatibilityResponse> =>
    fetchJson(`${API_BASE_URL}/pipe-steel-work/gasket-compatibility`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  heatTreatments: (): Promise<HeatTreatment[]> =>
    fetchJson(`${API_BASE_URL}/pipe-steel-work/heat-treatments`),

  heatTreatmentRequirement: (dto: HeatTreatmentRequirementRequest): Promise<HeatTreatmentRequirementResponse> =>
    fetchJson(`${API_BASE_URL}/pipe-steel-work/heat-treatment-requirement`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
};

export default pipeSteelWorkApi;
