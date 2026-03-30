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
    gussetTeeWeld?: number;
    latWeld45Plus?: number;
    latWeldUnder45?: number;
  };
  areas?: {
    intAreaM2?: number;
    extAreaM2?: number;
  };
}

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
  hdpePipes?: ConsolidatedItemDto[];
  pvcPipes?: ConsolidatedItemDto[];
  structuralSteel?: ConsolidatedItemDto[];
  valves?: ConsolidatedItemDto[];
  instruments?: ConsolidatedItemDto[];
  actuators?: ConsolidatedItemDto[];
  flowMeters?: ConsolidatedItemDto[];
  pressureInstruments?: ConsolidatedItemDto[];
  levelInstruments?: ConsolidatedItemDto[];
  temperatureInstruments?: ConsolidatedItemDto[];
  pumps?: ConsolidatedItemDto[];
  pumpParts?: ConsolidatedItemDto[];
  pumpSpares?: ConsolidatedItemDto[];
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
