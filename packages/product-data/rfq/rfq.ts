import type { CreateBendRfqDto } from "./bend";
import type { CreateStraightPipeRfqDto } from "./straight-pipe";
import type { UnifiedTankChuteDto } from "./tank-chute";

export type RfqStatus =
  | "draft"
  | "submitted"
  | "pending"
  | "quoted"
  | "accepted"
  | "rejected"
  | "cancelled";

export interface CreateRfqDto {
  projectName: string;
  description?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  requiredDate?: string;
  status?: RfqStatus;
  notes?: string;
}

export interface CreateStraightPipeRfqWithItemDto {
  rfq: CreateRfqDto;
  straightPipe: CreateStraightPipeRfqDto;
  itemDescription: string;
  itemNotes?: string;
}

export interface CreateBendRfqWithItemDto {
  rfq: CreateRfqDto;
  bend: CreateBendRfqDto;
  itemDescription: string;
  itemNotes?: string;
}

export interface UnifiedRfqItemDto {
  itemType: "straight_pipe" | "bend" | "fitting" | "tank_chute" | "fastener";
  description: string;
  notes?: string;
  totalWeightKg?: number;
  straightPipe?: CreateStraightPipeRfqDto;
  bend?: Omit<
    CreateBendRfqDto,
    "workingPressureBar" | "workingTemperatureC" | "steelSpecificationId"
  > & {
    workingPressureBar?: number;
    workingTemperatureC?: number;
    steelSpecificationId?: number;
    useGlobalFlangeSpecs?: boolean;
    flangeStandardId?: number;
    flangePressureClassId?: number;
    pslLevel?: "PSL1" | "PSL2" | null;
    cvnTestTemperatureC?: number;
    cvnAverageJoules?: number;
    cvnMinimumJoules?: number;
    heatNumber?: string;
    mtcReference?: string;
    ndtCoveragePct?: number;
    lotNumber?: string;
    naceCompliant?: boolean;
    h2sZone?: 1 | 2 | 3 | null;
    maxHardnessHrc?: number;
    sscTested?: boolean;
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
    pslLevel?: "PSL1" | "PSL2" | null;
    cvnTestTemperatureC?: number;
    cvnAverageJoules?: number;
    cvnMinimumJoules?: number;
    heatNumber?: string;
    mtcReference?: string;
    ndtCoveragePct?: number;
    lotNumber?: string;
    naceCompliant?: boolean;
    h2sZone?: 1 | 2 | 3 | null;
    maxHardnessHrc?: number;
    sscTested?: boolean;
  };
  tankChute?: UnifiedTankChuteDto;
  fastener?: UnifiedFastenerDto;
}

export interface UnifiedFastenerDto {
  fastenerCategory: "bolt" | "nut" | "washer" | "insert";
  specificType: string;
  size: string;
  grade?: string;
  material?: string;
  finish?: string;
  threadType?: string;
  standard?: string;
  lengthMm?: number;
  quantityValue: number;
  notes?: string;
}

export interface CreateUnifiedRfqDto {
  rfq: CreateRfqDto;
  items: UnifiedRfqItemDto[];
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
