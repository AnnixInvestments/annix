import { API_BASE_URL } from "@/lib/api-config";
import type {
  CalculatePvcFittingCostDto,
  CalculatePvcPipeCostDto,
  PvcFittingCostResponse,
  PvcFittingType,
  PvcFittingWeight,
  PvcItemInput,
  PvcPipeCostResponse,
  PvcPipeSpecification,
  PvcStandard,
  PvcTransportWeightResponse,
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
    throw new Error(`PVC API Error (${response.status}): ${errorText}`);
  }

  return response.json();
}

export const pvcApi = {
  standards: {
    getAll: (): Promise<PvcStandard[]> => fetchJson(`${API_BASE_URL}/pvc/standards`),

    getByCode: (code: string): Promise<PvcStandard> =>
      fetchJson(`${API_BASE_URL}/pvc/standards/${code}`),
  },

  en1452: {
    getAllSpecifications: (): Promise<PvcPipeSpecification[]> =>
      fetchJson(`${API_BASE_URL}/pvc/en1452/specifications`),

    getSpecification: (dn: number, pn: number): Promise<PvcPipeSpecification> =>
      fetchJson(`${API_BASE_URL}/pvc/en1452/specifications/${dn}/${pn}`),
  },

  pipeSpecifications: {
    getAll: (): Promise<PvcPipeSpecification[]> =>
      fetchJson(`${API_BASE_URL}/pvc/pipe-specifications`),

    getByNominalDiameter: (nominalDiameter: number): Promise<PvcPipeSpecification[]> =>
      fetchJson(`${API_BASE_URL}/pvc/pipe-specifications/dn/${nominalDiameter}`),

    getByDnAndPn: (
      nominalDiameter: number,
      pressureRating: number,
      pvcType?: string,
    ): Promise<PvcPipeSpecification> => {
      const url = `${API_BASE_URL}/pvc/pipe-specifications/dn/${nominalDiameter}/pn/${pressureRating}`;
      return fetchJson(pvcType ? `${url}?pvcType=${pvcType}` : url);
    },
  },

  fittingTypes: {
    getAll: (): Promise<PvcFittingType[]> => fetchJson(`${API_BASE_URL}/pvc/fitting-types`),

    getByCode: (code: string): Promise<PvcFittingType> =>
      fetchJson(`${API_BASE_URL}/pvc/fitting-types/${code}`),
  },

  fittingWeights: {
    getByFittingType: (fittingTypeId: number): Promise<PvcFittingWeight[]> =>
      fetchJson(`${API_BASE_URL}/pvc/fitting-weights/${fittingTypeId}`),

    getByCodeAndDn: (
      fittingTypeCode: string,
      nominalDiameter: number,
      pressureRating?: number,
    ): Promise<PvcFittingWeight> => {
      const url = `${API_BASE_URL}/pvc/fitting-weights/${fittingTypeCode}/dn/${nominalDiameter}`;
      return fetchJson(pressureRating ? `${url}?pressureRating=${pressureRating}` : url);
    },
  },

  calculations: {
    calculatePipeCost: (dto: CalculatePvcPipeCostDto): Promise<PvcPipeCostResponse> =>
      fetchJson(`${API_BASE_URL}/pvc/calculate/pipe`, {
        method: "POST",
        body: JSON.stringify(dto),
      }),

    calculatePipeCostGet: (
      nominalDiameter: number,
      pressureRating: number,
      length: number,
      pricePerKg: number,
      pvcType?: string,
      cementJointPrice?: number,
    ): Promise<PvcPipeCostResponse> => {
      const params = new URLSearchParams({
        nominalDiameter: nominalDiameter.toString(),
        pressureRating: pressureRating.toString(),
        length: length.toString(),
        pricePerKg: pricePerKg.toString(),
      });
      if (pvcType) {
        params.append("pvcType", pvcType);
      }
      if (cementJointPrice !== undefined) {
        params.append("cementJointPrice", cementJointPrice.toString());
      }
      return fetchJson(`${API_BASE_URL}/pvc/calculate/pipe?${params}`);
    },

    calculateFittingCost: (dto: CalculatePvcFittingCostDto): Promise<PvcFittingCostResponse> =>
      fetchJson(`${API_BASE_URL}/pvc/calculate/fitting`, {
        method: "POST",
        body: JSON.stringify(dto),
      }),

    calculateFittingCostGet: (
      fittingTypeCode: string,
      nominalDiameter: number,
      pricePerKg: number,
      pressureRating?: number,
      cementJointPrice?: number,
    ): Promise<PvcFittingCostResponse> => {
      const params = new URLSearchParams({
        fittingTypeCode,
        nominalDiameter: nominalDiameter.toString(),
        pricePerKg: pricePerKg.toString(),
      });
      if (pressureRating !== undefined) {
        params.append("pressureRating", pressureRating.toString());
      }
      if (cementJointPrice !== undefined) {
        params.append("cementJointPrice", cementJointPrice.toString());
      }
      return fetchJson(`${API_BASE_URL}/pvc/calculate/fitting?${params}`);
    },

    calculateTransportWeight: (items: PvcItemInput[]): Promise<PvcTransportWeightResponse> =>
      fetchJson(`${API_BASE_URL}/pvc/calculate/transport-weight`, {
        method: "POST",
        body: JSON.stringify({ items }),
      }),
  },

  metadata: {
    getNominalDiameters: (): Promise<number[]> =>
      fetchJson(`${API_BASE_URL}/pvc/nominal-diameters`),

    getPressureRatings: (nominalDiameter: number): Promise<number[]> =>
      fetchJson(`${API_BASE_URL}/pvc/pressure-ratings/${nominalDiameter}`),
  },
};

export default pvcApi;
