import { useQuery } from "@tanstack/react-query";
import { browserBaseUrl, getAuthHeaders } from "@/lib/api-config";
import { type RfqQueryParams, rfqKeys } from "../../keys";

interface Rfq {
  id: number;
  rfqNumber: string;
  projectName: string;
  description?: string;
  customerName?: string;
  status: string;
  totalWeightKg?: number;
  totalCost?: number;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

async function fetchRfqs(): Promise<Rfq[]> {
  const response = await fetch(`${browserBaseUrl()}/rfq`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Failed to fetch RFQs (${response.status}: ${body || response.statusText})`);
  }

  return response.json();
}

export function useRfqs(params?: RfqQueryParams) {
  return useQuery<Rfq[]>({
    queryKey: rfqKeys.list(params),
    queryFn: fetchRfqs,
  });
}

interface RfqDetailDrawing {
  id: number;
  drawingNumber: string;
  title: string;
  status: string;
  fileType: string;
  currentVersion: number;
  createdAt: string;
}

interface RfqDetailBoq {
  id: number;
  boqNumber: string;
  title: string;
  status: string;
  totalQuantity?: number;
  totalWeightKg?: number;
  totalEstimatedCost?: number;
  createdAt: string;
}

interface RfqItem {
  id: number;
  lineNumber: number;
  description: string;
  itemType: string;
  quantity: number;
  weightPerUnitKg?: number;
  totalWeightKg?: number;
  totalPrice?: number;
  notes?: string;
}

interface RfqDetail {
  id: number;
  rfqNumber: string;
  projectName: string;
  description?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  requiredDate?: string;
  status: string;
  notes?: string;
  totalWeightKg?: number;
  totalCost?: number;
  createdAt: string;
  updatedAt: string;
  items: RfqItem[];
  drawings: RfqDetailDrawing[];
  boqs: RfqDetailBoq[];
}

async function fetchRfqDetail(id: number): Promise<RfqDetail> {
  const response = await fetch(`${browserBaseUrl()}/rfq/${id}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Failed to fetch RFQ (${response.status}: ${body || response.statusText})`);
  }

  return response.json();
}

export function useRfqDetail(id: number) {
  return useQuery<RfqDetail>({
    queryKey: rfqKeys.detail(id),
    queryFn: () => fetchRfqDetail(id),
    enabled: id > 0,
  });
}

interface SteelSpecification {
  id: number;
  steel_spec_name: string;
}

interface StraightPipeDetails {
  id: number;
  nominalBoreMm: number;
  scheduleType: string;
  scheduleNumber?: string;
  wallThicknessMm?: number;
  pipeEndConfiguration?: string;
  individualPipeLength: number;
  lengthUnit: string;
  quantityType: string;
  quantityValue: number;
  workingPressureBar: number;
  workingTemperatureC?: number;
  calculatedOdMm?: number;
  calculatedWtMm?: number;
  pipeWeightPerMeterKg?: number;
  totalPipeWeightKg?: number;
  calculatedPipeCount?: number;
  calculatedTotalLengthM?: number;
  numberOfFlanges?: number;
  numberOfButtWelds?: number;
  totalButtWeldLengthM?: number;
  numberOfFlangeWelds?: number;
  totalFlangeWeldLengthM?: number;
  steelSpecification?: SteelSpecification;
}

interface RfqPublicItem {
  id: number;
  lineNumber: number;
  description: string;
  itemType: string;
  quantity: number;
  weightPerUnitKg?: number;
  totalWeightKg?: number;
  unitPrice?: number;
  totalPrice?: number;
  notes?: string;
  straightPipeDetails?: StraightPipeDetails;
}

interface RfqPublicDetail {
  id: number;
  rfqNumber: string;
  projectName: string;
  description?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  requiredDate?: string;
  status: string;
  notes?: string;
  totalWeightKg?: number;
  totalCost?: number;
  createdAt: string;
  updatedAt: string;
  items: RfqPublicItem[];
}

async function fetchPublicRfqDetail(id: number): Promise<RfqPublicDetail> {
  const response = await fetch(`${browserBaseUrl()}/rfq/${id}`);

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Failed to fetch RFQ (${response.status}: ${body || response.statusText})`);
  }

  return response.json();
}

export function usePublicRfqDetail(id: number) {
  return useQuery<RfqPublicDetail>({
    queryKey: [...rfqKeys.all, "public-detail", id] as const,
    queryFn: () => fetchPublicRfqDetail(id),
    enabled: id > 0,
  });
}

export type {
  Rfq,
  RfqDetail,
  RfqItem,
  RfqDetailDrawing,
  RfqDetailBoq,
  RfqPublicDetail,
  RfqPublicItem,
  StraightPipeDetails,
};
