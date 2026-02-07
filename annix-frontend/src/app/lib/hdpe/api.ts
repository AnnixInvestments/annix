import { API_BASE_URL } from "@/lib/api-config";
import type {
  CalculateFittingCostDto,
  CalculatePipeCostDto,
  FittingCostResponse,
  HdpeFittingType,
  HdpeFittingWeight,
  HdpeItemInput,
  HdpePipeSpecification,
  HdpeStandard,
  PipeCostResponse,
  TransportWeightResponse,
} from "./types";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HDPE API Error (${response.status}): ${errorText}`);
  }

  return response.json();
}

export const hdpeApi = {
  standards: {
    getAll: (): Promise<HdpeStandard[]> => fetchJson(`${API_BASE_URL}/hdpe/standards`),

    getByCode: (code: string): Promise<HdpeStandard> =>
      fetchJson(`${API_BASE_URL}/hdpe/standards/${code}`),
  },

  pipeSpecifications: {
    getAll: (): Promise<HdpePipeSpecification[]> =>
      fetchJson(`${API_BASE_URL}/hdpe/pipe-specifications`),

    getByNominalBore: (nominalBore: number): Promise<HdpePipeSpecification[]> =>
      fetchJson(`${API_BASE_URL}/hdpe/pipe-specifications/nb/${nominalBore}`),

    getByNominalBoreAndSdr: (nominalBore: number, sdr: number): Promise<HdpePipeSpecification> =>
      fetchJson(`${API_BASE_URL}/hdpe/pipe-specifications/nb/${nominalBore}/sdr/${sdr}`),
  },

  fittingTypes: {
    getAll: (): Promise<HdpeFittingType[]> => fetchJson(`${API_BASE_URL}/hdpe/fitting-types`),

    getByCode: (code: string): Promise<HdpeFittingType> =>
      fetchJson(`${API_BASE_URL}/hdpe/fitting-types/${code}`),
  },

  fittingWeights: {
    getByFittingType: (fittingTypeId: number): Promise<HdpeFittingWeight[]> =>
      fetchJson(`${API_BASE_URL}/hdpe/fitting-weights/${fittingTypeId}`),

    getByCodeAndNb: (fittingTypeCode: string, nominalBore: number): Promise<HdpeFittingWeight> =>
      fetchJson(`${API_BASE_URL}/hdpe/fitting-weights/${fittingTypeCode}/nb/${nominalBore}`),
  },

  calculations: {
    calculatePipeCost: (dto: CalculatePipeCostDto): Promise<PipeCostResponse> =>
      fetchJson(`${API_BASE_URL}/hdpe/calculate/pipe`, {
        method: "POST",
        body: JSON.stringify(dto),
      }),

    calculatePipeCostGet: (
      nominalBore: number,
      sdr: number,
      length: number,
      pricePerKg: number,
      buttweldPrice?: number,
    ): Promise<PipeCostResponse> => {
      const params = new URLSearchParams({
        nominalBore: nominalBore.toString(),
        sdr: sdr.toString(),
        length: length.toString(),
        pricePerKg: pricePerKg.toString(),
      });
      if (buttweldPrice !== undefined) {
        params.append("buttweldPrice", buttweldPrice.toString());
      }
      return fetchJson(`${API_BASE_URL}/hdpe/calculate/pipe?${params}`);
    },

    calculateFittingCost: (dto: CalculateFittingCostDto): Promise<FittingCostResponse> =>
      fetchJson(`${API_BASE_URL}/hdpe/calculate/fitting`, {
        method: "POST",
        body: JSON.stringify(dto),
      }),

    calculateFittingCostGet: (
      fittingTypeCode: string,
      nominalBore: number,
      pricePerKg: number,
      buttweldPrice?: number,
      stubPrice?: number,
    ): Promise<FittingCostResponse> => {
      const params = new URLSearchParams({
        fittingTypeCode,
        nominalBore: nominalBore.toString(),
        pricePerKg: pricePerKg.toString(),
      });
      if (buttweldPrice !== undefined) {
        params.append("buttweldPrice", buttweldPrice.toString());
      }
      if (stubPrice !== undefined) {
        params.append("stubPrice", stubPrice.toString());
      }
      return fetchJson(`${API_BASE_URL}/hdpe/calculate/fitting?${params}`);
    },

    calculateTransportWeight: (items: HdpeItemInput[]): Promise<TransportWeightResponse> =>
      fetchJson(`${API_BASE_URL}/hdpe/calculate/transport-weight`, {
        method: "POST",
        body: JSON.stringify({ items }),
      }),
  },

  metadata: {
    getNominalBores: (): Promise<number[]> => fetchJson(`${API_BASE_URL}/hdpe/nominal-bores`),

    getSdrsByNominalBore: (nominalBore: number): Promise<number[]> =>
      fetchJson(`${API_BASE_URL}/hdpe/sdrs/${nominalBore}`),
  },
};

export default hdpeApi;
